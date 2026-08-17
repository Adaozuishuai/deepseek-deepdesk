import { useState } from 'react'
import { ChevronDown, Brain } from 'lucide-react'

export default function ThinkingBlock({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(true)
  const display = text.trim()
  if (!display && !streaming) return null
  return (
    <div className='thinking'>
      <div className='thinking-header' onClick={() => setOpen(o => !o)}>
        {streaming ? <span className='thinking-icon' /> : <Brain size={13} />}
        思考过程
        {display.length > 0 && <span className='muted text-2xs'>{display.length} 字</span>}
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </div>
      {open && <div className='thinking-body'>{display}</div>}
    </div>
  )
}
