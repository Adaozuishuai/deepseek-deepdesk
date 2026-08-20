import { useEffect, useState } from 'react'
import TitleBar from './components/titlebar/TitleBar'
import Sidebar from './components/sidebar/Sidebar'
import AgentView from './components/agent/AgentView'
import SettingsView from './components/settings/SettingsView'
import DeepSeekLogo from './components/DeepSeekLogo'
import { useSettingsStore } from './stores/useSettingsStore'
import { useAgentStore } from './stores/useAgentStore'
import { Loader2 } from 'lucide-react'

type View = 'chat' | 'settings'
type SettingsTab = 'general' | 'providers'

export default function App() {
  const ready = useSettingsStore(s => s.loaded)
  const [view, setView] = useState<View>('chat')
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    void useSettingsStore.getState().load()
  }, [])

  useEffect(() => {
    if (!ready) return
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
        useAgentStore.getState().clear()
      } else if (mod && e.key === ',') {
        e.preventDefault()
        setView(v => {
          if (v === 'settings') return 'chat'
          setSettingsTab('general')
          return 'settings'
        })
      } else if (e.key === 'Escape') {
        const agent = useAgentStore.getState()
        if (agent.running) agent.stop()
        else setView(v => (v === 'settings' ? 'chat' : v))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ready) {
    return (
      <div className='splash'>
        <div className='splash-logo'>
          <div className='brand-logo'><DeepSeekLogo width={18} height={18} /></div>
          DeepDesk
        </div>
        <Loader2 className='spin' size={18} />
      </div>
    )
  }

  const openSettings = (tab: SettingsTab = 'general'): void => {
    setSettingsTab(tab)
    setView('settings')
  }

  return (
    <div className='app-shell'>
      <TitleBar view={view} />
      <div className='app-body'>
        {view === 'chat' && <Sidebar view={view} onOpenSettings={openSettings} collapsed={collapsed} onToggleCollapsed={() => setCollapsed(c => !c)} />}
        <main className={view === 'settings' ? 'app-main settings-main' : 'app-main'}>
          {view === 'chat' ? <AgentView onOpenSettings={() => openSettings('providers')} /> : <SettingsView onBack={() => setView('chat')} tab={settingsTab} onTabChange={setSettingsTab} />}
        </main>
      </div>
    </div>
  )
}
