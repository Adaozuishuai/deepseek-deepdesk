import { beforeEach, describe, expect, it } from 'vitest'
import type { AgentEvent, AgentSession } from '../src/shared/agent-types'
import { useAgentStore } from '../src/renderer/src/stores/useAgentStore'
import { useSettingsStore } from '../src/renderer/src/stores/useSettingsStore'

let chunkCb: ((ev: AgentEvent) => void) | null = null
let saved: AgentSession[] = []
let startReqs: Array<{ runId: string; modelId: string }> = []

beforeEach(() => {
  chunkCb = null
  saved = []
  startReqs = []
  const api = {
    settings: {
      get: async () => ({ version: 1, defaultProviderId: 'deepseek', defaultModelId: 'deepseek-v4-pro', temperature: 1, theme: 'dark', enterToSend: true, agentWorkdir: '', agentPermissionMode: 'ask' }),
      set: async (patch: Record<string, unknown>) => ({ ...patch })
    },
    providers: { list: async () => [], upsert: async () => {}, remove: async () => {}, test: async () => ({ ok: true, message: '' }) },
    conversations: { list: async () => [], get: async () => null, upsert: async () => {}, remove: async () => {} },
    chat: { start: async () => ({ ok: true }), cancel: async () => {}, onChunk: () => () => {} },
    agent: {
      start: async (req: { runId: string; modelId: string }) => { startReqs.push(req); return { ok: true } },
      cancel: async () => {},
      approve: async () => {},
      pickDirectory: async () => null,
      onChunk: (cb: (ev: AgentEvent) => void) => { chunkCb = cb; return () => { chunkCb = null } },
      listSessions: async () => saved,
      saveSession: async (s: AgentSession) => { const i = saved.findIndex(x => x.id === s.id); if (i >= 0) saved[i] = s; else saved.push(s) },
      deleteSession: async (id: string) => { saved = saved.filter(x => x.id !== id) }
    },
    window: { minimize: async () => {}, toggleMaximize: async () => {}, close: async () => {}, isMaximized: async () => false, onMaximizedChange: () => () => {} },
    openExternal: async () => {},
    appVersion: async () => '1.0.0'
  }
  ;(globalThis as unknown as { window: unknown }).window = { api, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout }
  useSettingsStore.setState({ loaded: true, providers: [{ id: 'deepseek', name: 'DeepSeek', type: 'openai', baseUrl: 'https://api.deepseek.com', apiKey: 'sk', models: [], createdAt: 0 }], settings: { version: 1, defaultProviderId: 'deepseek', defaultModelId: 'deepseek-v4-pro', temperature: 1, theme: 'dark', enterToSend: true, agentWorkdir: '', agentPermissionMode: 'ask' } })
  useAgentStore.setState({ initialized: false, workdir: '', running: false, currentRunId: null, currentTask: '', currentModelId: '', currentSessionId: '', steps: [], sessions: [], pendingApproval: null, error: null })
})

describe('useAgentStore 会话持久化', () => {
  it('任务完成后自动保存会话', async () => {
    useAgentStore.getState().init()
    await useAgentStore.getState().start('写一个文件')
    expect(startReqs.length).toBe(1)
    const req = startReqs[0]
    chunkCb!({ runId: req.runId, type: 'done' })
    await new Promise(r => setTimeout(r, 80))
    expect(saved.length).toBe(1)
    expect(saved[0].task).toBe('写一个文件')
    expect(saved[0].steps[0].kind).toBe('task')
    expect(saved[0].modelId).toBe('deepseek-v4-pro')
  })

  it('loadSession 载入历史步骤', () => {
    useAgentStore.setState({ sessions: [{ id: 's1', task: '旧任务', workdir: '/w', modelId: 'm', createdAt: 1, updatedAt: 1, steps: [{ kind: 'task', text: '旧任务' }, { kind: 'text', text: '结果' }] }] })
    useAgentStore.getState().loadSession('s1')
    const s = useAgentStore.getState()
    expect(s.steps.length).toBe(2)
    expect(s.currentTask).toBe('旧任务')
    expect(s.workdir).toBe('/w')
    expect(s.running).toBe(false)
  })

  it('deleteSession 删除历史', async () => {
    useAgentStore.setState({ sessions: [{ id: 's1', task: 't', workdir: '', modelId: 'm', createdAt: 1, updatedAt: 1, steps: [] }] })
    await useAgentStore.getState().deleteSession('s1')
    expect(useAgentStore.getState().sessions.length).toBe(0)
    expect(saved.length).toBe(0)
  })
})
