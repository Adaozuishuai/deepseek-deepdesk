import { create } from 'zustand'
import type { AgentEvent, AgentSession, AgentStep } from '@shared/agent-types'
import { useSettingsStore } from './useSettingsStore'

interface AgentState {
  initialized: boolean
  workdir: string
  running: boolean
  currentRunId: string | null
  currentTask: string
  currentModelId: string
  currentSessionId: string
  steps: AgentStep[]
  sessions: AgentSession[]
  activeSessionId: string | null
  pendingApproval: { callId: string; command: string; cwd: string; target: string; reason: string } | null
  error: string | null
  init: () => void
  start: (task: string) => Promise<void>
  stop: () => void
  approve: (approved: boolean) => void
  pickDirectory: () => Promise<void>
  loadSession: (id: string) => void
  deleteSession: (id: string) => Promise<void>
  clear: () => void
}

export const useAgentStore = create<AgentState>()((set, get) => {
  function append(step: AgentStep): void {
    set(s => {
      const steps = [...s.steps]
      if (step.kind !== 'thinking' && steps.length > 0 && steps[steps.length - 1].kind === 'thinking') {
        steps.pop()
      }
      if (step.kind === 'thinking' && steps.length > 0 && steps[steps.length - 1].kind === 'thinking') {
        return { steps }
      }
      steps.push(step)
      return { steps }
    })
  }
  function updateTool(callId: string, patch: Partial<AgentStep>): void {
    set(s => ({ steps: s.steps.map(st => (st.callId === callId ? { ...st, ...patch } : st)) }))
  }
  function saveCurrentSession(): void {
    const s = get()
    if (!s.currentTask || s.steps.length === 0) return
    const session: AgentSession = {
      id: s.currentSessionId,
      task: s.currentTask,
      workdir: s.workdir,
      modelId: s.currentModelId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: s.steps
    }
    void window.api.agent.saveSession(session).then(() => {
      void window.api.agent.listSessions().then(sessions => set({ sessions }))
    })
  }
  function handleEvent(ev: AgentEvent): void {
    switch (ev.type) {
      case 'thinking': append({ kind: 'thinking' }); break
      case 'text': append({ kind: 'text', text: ev.text ?? '' }); break
      case 'tool_call': append({ kind: 'tool', callId: ev.call?.id, name: ev.call?.name, args: JSON.stringify(ev.call?.args ?? {}, null, 2), status: 'running' }); break
      case 'approval_request': set({ pendingApproval: { callId: ev.callId ?? '', command: ev.command ?? '', cwd: ev.cwd ?? '', target: ev.target ?? '', reason: ev.reason ?? '' } }); break
      case 'tool_result': updateTool(ev.callId ?? '', { status: ev.ok ? 'ok' : 'error', summary: ev.summary ?? '', result: ev.output ?? '' }); break
      case 'done': set({ running: false, currentRunId: null, pendingApproval: null }); saveCurrentSession(); break
      case 'error': append({ kind: 'error', message: ev.message ?? '未知错误' }); set({ running: false, currentRunId: null, pendingApproval: null }); saveCurrentSession(); break
    }
  }
  return {
    initialized: false,
    workdir: '',
    running: false,
    currentRunId: null,
    currentTask: '',
    currentModelId: '',
    currentSessionId: '',
    steps: [],
    sessions: [],
    activeSessionId: null,
    pendingApproval: null,
    error: null,
    init: () => {
      if (get().initialized) return
      window.api.agent.onChunk(handleEvent)
      const settings = useSettingsStore.getState().settings
      set({ initialized: true, workdir: settings?.agentWorkdir ?? '' })
      void window.api.agent.listSessions().then(sessions => set({ sessions }))
    },
    start: async (task) => {
      const t = task.trim()
      if (!t || get().running) return
      const ss = useSettingsStore.getState()
      const providerId = ss.settings?.defaultProviderId ?? 'deepseek'
      const modelId = ss.settings?.defaultModelId ?? 'deepseek-v4-pro'
      const provider = ss.providers.find(p => p.id === providerId)
      if (!provider || !provider.apiKey) {
        set({ error: '请先在「设置 → 模型服务」中配置 API Key' })
        return
      }
      const runId = 'agent-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
      const sessionId = 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
      set({ running: true, currentRunId: runId, currentTask: t, currentModelId: modelId, currentSessionId: sessionId, activeSessionId: null, error: null, steps: [{ kind: 'task', text: t }], pendingApproval: null })
      const res = await window.api.agent.start({ runId, providerId, modelId, workdir: get().workdir, task: t, temperature: ss.settings?.temperature ?? 1 })
      if (!res.ok) {
        append({ kind: 'error', message: res.message ?? '启动失败' })
        set({ running: false, currentRunId: null })
      }
    },
    stop: () => {
      const id = get().currentRunId
      if (id) void window.api.agent.cancel(id)
    },
    approve: (approved) => {
      const p = get().pendingApproval
      if (!p) return
      void window.api.agent.approve(p.callId, approved)
      set({ pendingApproval: null })
    },
    pickDirectory: async () => {
      const dir = await window.api.agent.pickDirectory()
      if (dir) {
        set({ workdir: dir })
        await useSettingsStore.getState().updateSettings({ agentWorkdir: dir })
      }
    },
    loadSession: (id) => {
      const s = get().sessions.find(x => x.id === id)
      if (!s) return
      set({ steps: s.steps, currentTask: s.task, workdir: s.workdir, currentSessionId: '', activeSessionId: id, running: false, currentRunId: null, pendingApproval: null, error: null })
    },
    deleteSession: async (id) => {
      await window.api.agent.deleteSession(id)
      set({ sessions: get().sessions.filter(x => x.id !== id) })
    },
    clear: () => {
      if (get().running) get().stop()
      set({ steps: [], error: null, pendingApproval: null, currentTask: '', currentSessionId: '', activeSessionId: null })
    }
  }
})
