import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, Sparkles } from 'lucide-react'

export default function TitleBar({ view }: { view: string }) {
  const [maximized, setMaximized] = useState(false)
  useEffect(() => {
    void window.api.window.isMaximized().then(setMaximized)
    return window.api.window.onMaximizedChange(setMaximized)
  }, [])
  const title = view === 'settings' ? '设置' : '对话'
  return (
    <div className='titlebar drag'>
      <div className='titlebar-title no-drag'>
        <Sparkles size={13} />
        DeepDesk · {title}
      </div>
      <div className='win-controls no-drag'>
        <div className='win-btn' onClick={() => void window.api.window.minimize()} title='最小化'><Minus size={15} /></div>
        <div className='win-btn' onClick={() => void window.api.window.toggleMaximize()} title='最大化'>
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </div>
        <div className='win-btn close' onClick={() => void window.api.window.close()} title='关闭'><X size={15} /></div>
      </div>
    </div>
  )
}
