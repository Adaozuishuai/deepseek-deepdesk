import { useState } from 'react'
import { Blocks, ChevronDown, MoreHorizontal, Plus, Settings, Trash2, Pencil, PanelLeftClose, PanelLeftOpen, UserRound, PlugZap } from 'lucide-react'
import DeepSeekLogo from '../DeepSeekLogo'
import { useAgentStore } from '../../stores/useAgentStore'
import { formatTime } from '../../lib/format'
import { APP_VERSION } from '@shared/app-meta'
import clsx from 'clsx'

type AppView = 'chat' | 'settings' | 'connectors' | 'skills' | 'more'
type SettingsTab = 'general' | 'providers'

export default function Sidebar({
  view,
  onNavigate,
  onNewTask,
  onOpenSettings,
  collapsed,
  onToggleCollapsed
}: {
  view: AppView
  onNavigate: (view: AppView) => void
  onNewTask: () => void
  onOpenSettings: (tab?: SettingsTab) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const sessions = useAgentStore(s => s.sessions)
  const activeSessionId = useAgentStore(s => s.activeSessionId)
  const loadSession = useAgentStore(s => s.loadSession)
  const deleteSession = useAgentStore(s => s.deleteSession)
  const renameSession = useAgentStore(s => s.renameSession)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [tasksOpen, setTasksOpen] = useState(true)

  const commitRename = (id: string): void => {
    const t = renameText.trim()
    if (t) void renameSession(id, t)
    setRenamingId(null)
  }

  const openSession = (id: string): void => {
    loadSession(id)
    onNavigate('chat')
  }

  return (
    <aside className={clsx('sidebar', collapsed && 'collapsed')}>
      {collapsed ? (
        <div className='sidebar-rail'>
          <button className='icon-btn' onClick={onToggleCollapsed} title='展开侧边栏'><PanelLeftOpen size={16} /></button>
          <button className='icon-btn' onClick={onNewTask} title='新建任务'><Plus size={16} /></button>
          <button className='icon-btn' onClick={() => onNavigate('connectors')} title='连接器'><PlugZap size={15} /></button>
          <button className='icon-btn' onClick={() => onNavigate('skills')} title='技能广场'><Blocks size={15} /></button>
          <button className='icon-btn' onClick={() => onNavigate('more')} title='更多'><MoreHorizontal size={16} /></button>
          <button className='icon-btn' onClick={() => onOpenSettings('general')} title='设置'><Settings size={15} /></button>
        </div>
      ) : (
        <>
          <div className='sidebar-header'>
            <div className='brand'>
              <div className='brand-logo'><DeepSeekLogo width={22} height={22} /></div>
              <span className='brand-copy'>
                <span className='brand-name'>DeepDesk</span>
                <span className='brand-version'>v{APP_VERSION}</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className='new-chat-btn' title='新建任务 (Ctrl+N)' onClick={onNewTask}><Plus size={16} /></button>
              <button className='new-chat-btn' title='收起侧边栏' onClick={onToggleCollapsed}><PanelLeftClose size={15} /></button>
            </div>
          </div>
          <div className='sidebar-nav'>
            <button className={clsx('sidebar-nav-item', view === 'chat' && !activeSessionId && 'active')} onClick={onNewTask}><Plus size={16} /> 新建任务</button>
            <button className={clsx('sidebar-nav-item', view === 'connectors' && 'active')} onClick={() => onNavigate('connectors')}><PlugZap size={16} /> 连接器</button>
            <button className={clsx('sidebar-nav-item', view === 'skills' && 'active')} onClick={() => onNavigate('skills')}><Blocks size={16} /> 技能广场</button>
            <button className={clsx('sidebar-nav-item', view === 'more' && 'active')} onClick={() => onNavigate('more')}><MoreHorizontal size={16} /> 更多</button>
          </div>
          <button className='sidebar-section-toggle' aria-expanded={tasksOpen} onClick={() => setTasksOpen(open => !open)}>
            <span>最近任务 ({sessions.length})</span>
            <ChevronDown size={13} className={clsx('section-chevron', !tasksOpen && 'collapsed')} />
          </button>
          {tasksOpen && (
            <div className='sidebar-scroll'>
              {sessions.length === 0 && (
                <div className='muted fs-xs' style={{ textAlign: 'center', padding: '24px 8px' }}>
                  还没有任务，点击新建任务开始
                </div>
              )}
              {sessions.map(s => (
                <div key={s.id} className={clsx('conv-item', activeSessionId === s.id && view === 'chat' && 'active')} onClick={() => openSession(s.id)}>
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
          )}
          {!tasksOpen && <div className='sidebar-spacer' />}
          <div className='sidebar-footer'>
            <div className='account-chip' title='个人账户'>
              <span className='account-avatar'><UserRound size={15} /></span>
              <span className='account-meta'>
                <span className='account-name'>个人账户</span>
              </span>
            </div>
            <button className='icon-btn' title='设置 (Ctrl+,)' onClick={() => onOpenSettings('general')}><Settings size={15} /></button>
          </div>
        </>
      )}
    </aside>
  )
}
