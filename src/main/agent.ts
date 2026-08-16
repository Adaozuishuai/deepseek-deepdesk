import type { BrowserWindow } from 'electron'
import { IPC } from '../shared/ipc-channels'
import { chatCompletionWithTools } from '../shared/llm/toolcall'
import { AGENT_TOOLS } from './agent-tools'
import { executeTool, isDangerousCommand } from './tools'
import type { AgentEvent, AgentRunRequest, AgentToolCall, AgentToolName, AgentToolResult } from '../shared/agent-types'
import type { AppSettings, ProviderConfig } from '../shared/types'

const MAX_TURNS = 25
const pendingApprovals = new Map<string, { resolve: (v: boolean) => void }>()
const controllers = new Map<string, AbortController>()

function buildSystemPrompt(workdir: string, platform: string): string {
  return [
    '你是 DeepDesk Agent，一个运行在用户电脑上的编程与操作助手。'
    , '你可以通过工具调用来完成真实操作：执行命令、读写编辑文件、列目录、搜索内容。'
    , ''
    , '规则：'
    , '1. 文件操作一律限定在工作目录内，不要访问工作目录之外的敏感路径。'
    , '2. 执行命令前先想清楚；优先用只读命令了解现状（如 Get-ChildItem、git status、Get-Content），再动手修改。'
    , '3. 修改文件优先用 edit_file 做精准替换，而不是整体重写。'
    , '4. 命令在 PowerShell 中执行（Windows）。'
    , '5. 边做边用简短的话向用户汇报进度；最终给出总结。'
    , '6. 如果任务无法完成或信息不足，直接说明，不要编造。'
    , ''
    , '工作目录：' + workdir
    , '操作系统：' + platform
  ].join('\n')
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
  const autoApprove = settings.agentAutoApprove === true
  void (async () => {
    try {
      const messages: Array<Record<string, unknown>> = [
        { role: 'system', content: buildSystemPrompt(req.workdir, process.platform) },
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
            let result: AgentToolResult
            if (call.name === 'run_command') {
              const command = String(call.args.command ?? '')
              const cwdRaw = call.args.cwd ? String(call.args.cwd) : req.workdir
              const needApproval = !autoApprove || isDangerousCommand(command)
              if (needApproval) {
                send({ runId: req.runId, type: 'approval_request', callId: call.id, command, cwd: cwdRaw })
                const approved = await waitApproval(call.id)
                if (!approved) {
                  result = { ok: false, content: '用户拒绝了该命令的执行', summary: '已拒绝: ' + command }
                } else {
                  result = await executeTool(call, req.workdir)
                }
              } else {
                result = await executeTool(call, req.workdir)
              }
            } else {
              result = await executeTool(call, req.workdir)
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
