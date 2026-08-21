import { useEffect, useState } from 'react'
import { Copy, Minus, PanelLeftClose, PanelLeftOpen, Square, SquarePen, X } from 'lucide-react'

export default function TitleBar({
  collapsed,
  onNewTask,
  onToggleSidebar
}: {
  collapsed: boolean
  onNewTask: () => void
  onToggleSidebar: () => void
}) {
  const [maximized, setMaximized] = useState(false)
  useEffect(() => {
    void window.api.window.isMaximized().then(setMaximized)
    return window.api.window.onMaximizedChange(setMaximized)
  }, [])

  return (
    <div className='titlebar drag'>
      <div className='titlebar-tools no-drag' aria-label='窗口快捷操作'>
        <button type='button' className='titlebar-tool-btn' onClick={onToggleSidebar} title={collapsed ? '展开侧边栏' : '收起侧边栏'} aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button type='button' className='titlebar-tool-btn' onClick={onNewTask} title='新建任务' aria-label='新建任务'>
          <SquarePen size={16} strokeWidth={1.9} />
        </button>
      </div>
      <div className='win-controls no-drag'>
        <button type='button' className='win-btn' onClick={() => void window.api.window.minimize()} title='最小化' aria-label='最小化'><Minus size={15} /></button>
        <button type='button' className='win-btn' onClick={() => void window.api.window.toggleMaximize()} title='最大化' aria-label='最大化' aria-pressed={maximized}>
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button type='button' className='win-btn close' onClick={() => void window.api.window.close()} title='关闭' aria-label='关闭'><X size={15} /></button>
      </div>
    </div>
  )
}
