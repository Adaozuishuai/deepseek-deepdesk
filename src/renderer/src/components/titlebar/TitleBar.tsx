import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'
import DeepSeekLogo from '../DeepSeekLogo'

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
        <DeepSeekLogo width={14} height={14} />
        DeepDesk · {title}
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
