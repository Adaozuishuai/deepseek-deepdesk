import { useEffect, useState } from 'react'
import TitleBar from './components/titlebar/TitleBar'
import Sidebar from './components/sidebar/Sidebar'
import ChatView from './components/chat/ChatView'
import AgentView from './components/agent/AgentView'
import SettingsView from './components/settings/SettingsView'
import { useSettingsStore } from './stores/useSettingsStore'
import { useChatStore } from './stores/useChatStore'
import { useAgentStore } from './stores/useAgentStore'
import { Loader2, Sparkles } from 'lucide-react'

type View = 'chat' | 'settings'

export default function App() {
  const ready = useSettingsStore(s => s.loaded)
  const [view, setView] = useState<View>('chat')
  const [agentMode, setAgentMode] = useState(false)

  useEffect(() => {
    void useSettingsStore.getState().load()
  }, [])

  useEffect(() => {
    if (!ready) return
    void useChatStore.getState().init()
    useAgentStore.getState().init()
  }, [ready])

  useEffect(() => {
    const applyTheme = (): void => {
      const t = useSettingsStore.getState().settings?.theme ?? 'dark'
      const real = t === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t
      document.documentElement.setAttribute('data-theme', real)
    }
    applyTheme()
    return useSettingsStore.subscribe(applyTheme)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'n') {
        e.preventDefault()
        useChatStore.getState().createConversation()
      } else if (mod && e.key === ',') {
        e.preventDefault()
        setView(v => (v === 'settings' ? 'chat' : 'settings'))
      } else if (e.key === 'Escape') {
        const chat = useChatStore.getState()
        if (chat.streaming) chat.stopStreaming()
        else {
          const agent = useAgentStore.getState()
          if (agent.running) agent.stop()
          else setView(v => (v === 'settings' ? 'chat' : v))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ready) {
    return (
      <div className='splash'>
        <div className='splash-logo'>
          <div className='brand-logo'><Sparkles size={15} /></div>
          DeepDesk
        </div>
        <Loader2 className='spin' size={18} />
      </div>
    )
  }

  return (
    <div className='app-shell'>
      <TitleBar view={agentMode && view === 'chat' ? 'agent' : view} />
      <div className='app-body'>
        <Sidebar
          view={view}
          agentMode={agentMode}
          onOpenChat={() => { setAgentMode(false); setView('chat') }}
          onOpenSettings={() => setView('settings')}
          onAgentModeChange={v => { setAgentMode(v); setView('chat') }}
        />
        <main className='app-main'>
          {view === 'chat'
            ? (agentMode ? <AgentView /> : <ChatView onOpenSettings={() => setView('settings')} />)
            : <SettingsView onBack={() => setView('chat')} />}
        </main>
      </div>
    </div>
  )
}
