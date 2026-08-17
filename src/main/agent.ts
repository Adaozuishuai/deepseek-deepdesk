import type { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { chatCompletionWithTools } from '../shared/llm/toolcall'
import { AGENT_TOOLS } from './agent-tools'
import { executeTool, isDangerousCommand, isReadOnlyCommand, resolvePath, toolTargetPaths } from './tools'
import type { AgentEvent, AgentRunRequest, AgentToolCall, AgentToolName, AgentToolResult } from '../shared/agent-types'
import type { AgentPermissionMode, AppSettings, ProviderConfig } from '../shared/types'

const MAX_TURNS = 25
const pendingApprovals = new Map<string, { resolve: (v: boolean) => void }>()
const controllers = new Map<string, AbortController>()

function buildSystemPrompt(workdir: string, platform: string, mode: AgentPermissionMode): string {
  const modeDesc = mode === 'full'
    ? '完全访问：所有操作直接执行，无需询问'
    : mode === 'auto'
      ? '替我审批：低风险操作（只读命令、工作目录内的读写）自动执行，风险操作会询问用户'
      : '每次询问：执行命令、访问工作目录外的文件都会询问用户'
  return [
    '你是 DeepDesk Agent，一个运行在用户电脑上的编程与操作助手。'
    , '你可以通过工具调用来完成真实操作：执行命令、读写编辑文件、列目录、搜索内容。'
    , ''
    , '规则：'
    , '1. 优先用只读命令了解现状（如 Get-ChildItem、git status、Get-Content），再动手修改。'
    , '2. 修改文件优先用 edit_file 做精准替换，而不是整体重写。'
    , '3. 命令在 PowerShell 中执行（Windows）。'
    , '4. 边做边用简短的话汇报进度；最终给出总结。'
    , '5. 无法完成或信息不足就直说，不要编造。'
    , ''
    , '工作目录：' + workdir
    , '操作系统：' + platform
    , '当前权限模式：' + modeDesc
  ].join('\n')
}

function evaluatePermission(call: AgentToolCall, workdir: string, mode: AgentPermissionMode): { needsApproval: boolean; reason: string; allowOutside: boolean } {
  if (call.name === 'run_command') {
    const command = String(call.args.command ?? '')
    const dangerous = isDangerousCommand(command)
    const readOnly = isReadOnlyCommand(command)
    let needsApproval = false
    if (mode === 'ask') needsApproval = true
    else if (mode === 'auto') needsApproval = dangerous || !readOnly
    else needsApproval = false
    return { needsApproval, reason: dangerous ? '执行危险命令' : '执行命令', allowOutside: true }
  }
  const targets = toolTargetPaths(call)
  const outside = targets.some(p => p.trim() !== '' && !resolvePath(workdir, p).inside)
  let needsApproval = false
  if (mode === 'ask') needsApproval = outside
  else if (mode === 'auto') needsApproval = outside && (call.name === 'write_file' || call.name === 'edit_file')
  else needsApproval = false
  return { needsApproval, reason: '访问工作目录外的文件', allowOutside: outside }
}

function waitApproval(callId: string): Promise<boolean> {
  return new Promise(resolve => pendingApprovals.set(callId, { resolve }))
}

export function approveCommand(callId: string, approved: boolean): void {
  const p = pendingApprovals.get(callId)
  if (p) { pendingApprovals.delete(callId); p.resolve(approved) }
}

function clearPendingApprovals(value: boolean): void {
  for (const [, p] of pendingApprovals) p.resolve(value)
  pendingApprovals.clear()
}

export function cancelAgent(runId: string): void {
  const c = controllers.get(runId)
  if (c) c.abort()
}

export function startAgent(win: BrowserWindow, req: AgentRunRequest, provider: ProviderConfig, settings: AppSettings): void {
  const controller = new AbortController()
  controllers.set(req.runId, controller)
  const send = (ev: AgentEvent): void => { if (!win.isDestroyed()) win.webContents.send(IPC.AgentChunk, ev) }
  const mode: AgentPermissionMode = settings.agentPermissionMode ?? 'ask'
  void (async () => {
    try {
      const messages: Array<Record<string, unknown>> = [
        { role: 'system', content: buildSystemPrompt(req.workdir, process.platform, mode) },
        { role: 'user', content: req.task }
      ]
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        send({ runId: req.runId, type: 'thinking' })
        const res = await chatCompletionWithTools({
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model: req.modelId,
          messages,
          tools: AGENT_TOOLS,
          temperature: req.temperature,
          signal: controller.signal
        })
        if (res.toolCalls.length > 0) {
          messages.push({
            role: 'assistant',
            content: res.content ?? null,
            tool_calls: res.toolCalls.map(c => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args) } }))
          })
          for (const rawCall of res.toolCalls) {
            const call: AgentToolCall = { id: rawCall.id, name: rawCall.name as AgentToolName, args: rawCall.args }
            send({ runId: req.runId, type: 'tool_call', call })
            const perm = evaluatePermission(call, req.workdir, mode)
            let result: AgentToolResult
            if (perm.needsApproval) {
              const approval: AgentEvent = { runId: req.runId, type: 'approval_request', callId: call.id, reason: perm.reason }
              if (call.name === 'run_command') {
                approval.command = String(call.args.command ?? '')
                approval.cwd = call.args.cwd ? String(call.args.cwd) : req.workdir
              } else {
                approval.target = String(call.args.path ?? '')
              }
              send(approval)
              const approved = await waitApproval(call.id)
              if (!approved) {
                result = { ok: false, content: '用户拒绝了该操作', summary: '已拒绝: ' + (approval.command ?? approval.target ?? '') }
              } else {
                result = await executeTool(call, req.workdir, perm.allowOutside)
              }
            } else {
              result = await executeTool(call, req.workdir, perm.allowOutside)
            }
            send({ runId: req.runId, type: 'tool_result', callId: call.id, summary: result.summary, ok: result.ok, output: result.content })
            messages.push({ role: 'tool', tool_call_id: call.id, content: result.content })
          }
        } else {
          const content = res.content ?? ''
          messages.push({ role: 'assistant', content })
          send({ runId: req.runId, type: 'text', text: content })
          send({ runId: req.runId, type: 'done', usage: res.usage })
          return
        }
      }
      send({ runId: req.runId, type: 'error', message: '已达到最大执行步数（' + MAX_TURNS + '），已停止' })
    } catch (err) {
      const e = err as Error
      if (e && e.name === 'AbortError') {
        send({ runId: req.runId, type: 'done', message: '已停止' })
      } else {
        send({ runId: req.runId, type: 'error', message: e && e.message ? e.message : '未知错误' })
      }
    } finally {
      controllers.delete(req.runId)
      clearPendingApprovals(false)
    }
  })()
}
