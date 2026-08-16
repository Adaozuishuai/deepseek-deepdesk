import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({ chatCompletionWithTools: vi.fn() }))

vi.mock('../src/shared/llm/toolcall', () => ({
  chatCompletionWithTools: mocks.chatCompletionWithTools
}))

import { startAgent, approveCommand } from '../src/main/agent'
import type { AgentEvent } from '../src/shared/agent-types'
import type { AppSettings, ProviderConfig } from '../src/shared/types'

const provider: ProviderConfig = { id: 'deepseek', name: 'DeepSeek', type: 'openai', baseUrl: 'https://api.deepseek.com', apiKey: 'sk', models: [], createdAt: 0 }
const baseSettings: AppSettings = { version: 1, defaultProviderId: 'deepseek', defaultModelId: 'deepseek-v4-pro', temperature: 1, theme: 'dark', enterToSend: true, agentWorkdir: '', agentAutoApprove: false }

function makeWin() {
  const events: AgentEvent[] = []
  const win = { isDestroyed: () => false, webContents: { send: (_c: string, ev: AgentEvent) => events.push(ev) } }
  return { events, win }
}

async function runUntilDone(events: AgentEvent[]): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (events.some(e => e.type === 'done' || e.type === 'error')) return
    await new Promise(r => setTimeout(r, 10))
  }
}

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'agent-test-')); mocks.chatCompletionWithTools.mockReset() })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('startAgent', () => {
  it('工具调用循环：写文件后产出最终答案', async () => {
    const target = join(dir, 'hello.txt')
    mocks.chatCompletionWithTools
      .mockResolvedValueOnce({ content: null, toolCalls: [{ id: 'c1', name: 'write_file', args: { path: 'hello.txt', content: 'hello agent' } }] })
      .mockResolvedValueOnce({ content: '已完成', toolCalls: [] })
    const { events, win } = makeWin()
    startAgent(win as never, { runId: 'r1', providerId: 'deepseek', modelId: 'deepseek-v4-pro', workdir: dir, task: '写个文件', temperature: 1 }, provider, baseSettings)
    await runUntilDone(events)
    expect(existsSync(target)).toBe(true)
    expect(readFileSync(target, 'utf-8')).toBe('hello agent')
    expect(events.some(e => e.type === 'tool_call')).toBe(true)
    expect(events.some(e => e.type === 'tool_result' && e.ok === true)).toBe(true)
    expect(events.some(e => e.type === 'text' && e.text === '已完成')).toBe(true)
    expect(events.some(e => e.type === 'done')).toBe(true)
  })

  it('run_command 默认需批准，拒绝后不执行', async () => {
    mocks.chatCompletionWithTools
      .mockResolvedValueOnce({ content: null, toolCalls: [{ id: 'c2', name: 'run_command', args: { command: 'Write-Output should-not-run' } }] })
      .mockResolvedValueOnce({ content: '结束', toolCalls: [] })
    const { events, win } = makeWin()
    startAgent(win as never, { runId: 'r2', providerId: 'deepseek', modelId: 'deepseek-v4-pro', workdir: dir, task: '跑命令', temperature: 1 }, provider, baseSettings)
    let approval: AgentEvent | undefined
    for (let i = 0; i < 100; i++) {
      approval = events.find(e => e.type === 'approval_request')
      if (approval) break
      await new Promise(r => setTimeout(r, 10))
    }
    expect(approval).toBeTruthy()
    approveCommand(approval!.callId!, false)
    await runUntilDone(events)
    const tr = events.find(e => e.type === 'tool_result')
    expect(tr?.ok).toBe(false)
    expect(tr?.summary).toContain('拒绝')
  })

  it('autoApprove 开启时命令直接执行', async () => {
    mocks.chatCompletionWithTools
      .mockResolvedValueOnce({ content: null, toolCalls: [{ id: 'c3', name: 'run_command', args: { command: 'Write-Output auto-run-ok' } }] })
      .mockResolvedValueOnce({ content: '完成', toolCalls: [] })
    const { events, win } = makeWin()
    const autoSettings: AppSettings = { ...baseSettings, agentAutoApprove: true }
    startAgent(win as never, { runId: 'r3', providerId: 'deepseek', modelId: 'deepseek-v4-pro', workdir: dir, task: '跑命令', temperature: 1 }, provider, autoSettings)
    await runUntilDone(events)
    const tr = events.find(e => e.type === 'tool_result')
    expect(tr?.ok).toBe(true)
    expect(tr?.output).toContain('auto-run-ok')
  })
})
