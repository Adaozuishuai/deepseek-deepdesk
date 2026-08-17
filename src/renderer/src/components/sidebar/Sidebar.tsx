import { useMemo, useState } from 'react'
import { Plus, Settings, Search, Trash2, MessageSquare } from 'lucide-react'
import { useChatStore } from '../../stores/useChatStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { formatTime } from '../../lib/format'
import clsx from 'clsx'

export default function Sidebar({ view, agentMode, onOpenChat, onOpenSettings, onAgentModeChange }: { view: string; agentMode: boolean; onOpenChat: () => void; onOpenSettings: () => void; onAgentModeChange: (v: boolean) => void }) {
  const conversations = useChatStore(s => s.conversations)
  const activeId = useChatStore(s => s.activeId)
  const selectConversation = useChatStore(s => s.selectConversation)
  const deleteConversation = useChatStore(s => s.deleteConversation)
  const createConversation = useChatStore(s => s.createConversation)
  const providers = useSettingsStore(s => s.providers)
  const settings = useSettingsStore(s => s.settings)
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => c.title.toLowerCase().includes(q))
  }, [conversations, query])

  const currentProvider = providers.find(p => p.id === (settings?.defaultProviderId ?? ''))
  const configured = currentProvider ? currentProvider.apiKey.length > 0 : false

  return (
    <aside className='sidebar'>
      <div className='sidebar-header'>
        <div className='brand'>
          <div className='brand-logo'><MessageSquare size={14} /></div>
          DeepDesk
        </div>
        <button className='new-chat-btn' title='新建对话 (Ctrl+N)' onClick={() => createConversation()}>
          <Plus size={16} />
        </button>
      </div>
      <div className='sidebar-modes'>
        <button className={clsx('mode-tab', !agentMode && 'active')} onClick={() => onAgentModeChange(false)}>对话</button>
        <button className={clsx('mode-tab', agentMode && 'active')} onClick={() => onAgentModeChange(true)}>Agent</button>
      </div>
      <div style={{ padding: '0 12px 10px' }}>
        <div className='input-wrap'>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className='input' style={{ paddingLeft: 28 }} placeholder='搜索对话…' value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>
      <div className='sidebar-label'>最近对话</div>
      <div className='sidebar-scroll'>
        {filtered.length === 0 && (
          <div className='muted text-xs' style={{ textAlign: 'center', padding: '24px 8px' }}>
            {conversations.length === 0 ? '还没有对话，开始你的第一段对话吧' : '没有匹配的对话'}
          </div>
        )}
        {filtered.map(c => (
          <div key={c.id} className={clsx('conv-item', activeId === c.id && view === 'chat' && !agentMode && 'active')} onClick={() => { selectConversation(c.id); onOpenChat() }}>
            <div className='conv-title'>{c.title}</div>
            <div className='conv-time'>{formatTime(c.updatedAt)}</div>
            {confirmId === c.id ? (
              <div className='conv-del confirm' onClick={e => { e.stopPropagation(); void deleteConversation(c.id); setConfirmId(null) }}>确认</div>
            ) : (
              <div className='conv-del' onClick={e => { e.stopPropagation(); setConfirmId(confirmId === c.id ? null : c.id) }} title='删除'>
                <Trash2 size={13} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className='sidebar-footer'>
        <div className='model-chip' onClick={onOpenSettings} title='当前默认模型服务，点击进入设置'>
          <span className={clsx('dot', !configured && 'off')} />
          <span className='name'>{currentProvider ? currentProvider.name : '未配置'}</span>
          {configured && settings && <span className='muted mono text-2xs'>{settings.defaultModelId}</span>}
        </div>
        <button className='icon-btn' title='设置 (Ctrl+,)' onClick={onOpenSettings}><Settings size={15} /></button>
      </div>
    </aside>
  )
}
