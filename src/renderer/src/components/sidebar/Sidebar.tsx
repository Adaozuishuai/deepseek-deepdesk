import { useMemo, useState } from 'react'
import { Plus, Settings, Search, Trash2, Pencil, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAgentStore } from '../../stores/useAgentStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { formatTime } from '../../lib/format'
import clsx from 'clsx'

export default function Sidebar({ view, onOpenSettings, collapsed, onToggleCollapsed }: { view: string; onOpenSettings: () => void; collapsed: boolean; onToggleCollapsed: () => void }) {
  const sessions = useAgentStore(s => s.sessions)
  const activeSessionId = useAgentStore(s => s.activeSessionId)
  const loadSession = useAgentStore(s => s.loadSession)
  const deleteSession = useAgentStore(s => s.deleteSession)
  const clear = useAgentStore(s => s.clear)
  const renameSession = useAgentStore(s => s.renameSession)
  const providers = useSettingsStore(s => s.providers)
  const settings = useSettingsStore(s => s.settings)
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(s => s.task.toLowerCase().includes(q))
  }, [sessions, query])

  const currentProvider = providers.find(p => p.id === (settings?.defaultProviderId ?? ''))
  const configured = currentProvider ? currentProvider.apiKey.length > 0 : false

  const commitRename = (id: string): void => {
    const t = renameText.trim()
    if (t) void renameSession(id, t)
    setRenamingId(null)
  }

  return (
    <aside className={clsx('sidebar', collapsed && 'collapsed')}>
      {collapsed ? (
        <div className='sidebar-rail'>
          <button className='icon-btn' onClick={onToggleCollapsed} title='展开侧边栏'><PanelLeftOpen size={16} /></button>
          <button className='icon-btn' onClick={() => clear()} title='新对话'><Plus size={16} /></button>
          <button className='icon-btn' onClick={onOpenSettings} title='设置'><Settings size={15} /></button>
        </div>
      ) : (
        <>
          <div className='sidebar-header'>
            <div className='brand'>
              <div className='brand-logo'><MessageSquare size={14} /></div>
              DeepDesk
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className='new-chat-btn' title='新对话 (Ctrl+N)' onClick={() => clear()}><Plus size={16} /></button>
              <button className='new-chat-btn' title='收起侧边栏' onClick={onToggleCollapsed}><PanelLeftClose size={15} /></button>
            </div>
          </div>
          <div style={{ padding: '0 12px 10px' }}>
            <div className='input-wrap'>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className='input' style={{ paddingLeft: 28 }} placeholder='搜索对话…' value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
          <div className='sidebar-label'>对话记录</div>
          <div className='sidebar-scroll'>
            {filtered.length === 0 && (
              <div className='muted fs-xs' style={{ textAlign: 'center', padding: '24px 8px' }}>
                {sessions.length === 0 ? '还没有对话，直接输入即可开始' : '没有匹配的对话'}
              </div>
            )}
            {filtered.map(s => (
              <div key={s.id} className={clsx('conv-item', activeSessionId === s.id && view === 'chat' && 'active')} onClick={() => loadSession(s.id)}>
                {renamingId === s.id ? (
                  <input className='input' style={{ height: 24, padding: '0 6px' }} autoFocus value={renameText} onChange={e => setRenameText(e.target.value)} onClick={e => e.stopPropagation()} onBlur={() => commitRename(s.id)} onKeyDown={e => { if (e.key === 'Enter') commitRename(s.id); if (e.key === 'Escape') setRenamingId(null) }} />
                ) : (
                  <div className='conv-title' title='双击重命名' onDoubleClick={e => { e.stopPropagation(); setRenamingId(s.id); setRenameText(s.task) }}>{s.task}</div>
                )}
                {renamingId !== s.id && <div className='conv-time'>{formatTime(s.updatedAt)}</div>}
                {renamingId !== s.id && (confirmId === s.id ? (
                  <div className='conv-del confirm' onClick={e => { e.stopPropagation(); void deleteSession(s.id); setConfirmId(null) }}>确认</div>
                ) : (
                  <>
                    <div className='conv-del' onClick={e => { e.stopPropagation(); setRenamingId(s.id); setRenameText(s.task) }} title='重命名'><Pencil size={12} /></div>
                    <div className='conv-del' onClick={e => { e.stopPropagation(); setConfirmId(confirmId === s.id ? null : s.id) }} title='删除'><Trash2 size={13} /></div>
                  </>
                ))}
              </div>
            ))}
          </div>
          <div className='sidebar-footer'>
            <div className='model-chip' onClick={onOpenSettings} title='当前默认模型服务，点击进入设置'>
              <span className={clsx('dot', !configured && 'off')} />
              <span className='name'>{currentProvider ? currentProvider.name : '未配置'}</span>
              {configured && settings && <span className='muted mono fs-2xs'>{settings.defaultModelId}</span>}
            </div>
            <button className='icon-btn' title='设置 (Ctrl+,)' onClick={onOpenSettings}><Settings size={15} /></button>
          </div>
        </>
      )}
    </aside>
  )
}
