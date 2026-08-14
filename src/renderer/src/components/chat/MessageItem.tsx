import { useState } from 'react'
import { Bot, User, Pencil, RefreshCw, Check, Copy } from 'lucide-react'
import type { ChatMessage } from '@shared/types'
import Markdown from './Markdown'
import ThinkingBlock from './ThinkingBlock'
import { useThrottledText } from '../../hooks'
import { useChatStore } from '../../stores/useChatStore'
import { copyText } from '../../lib/utils'
import clsx from 'clsx'

export default function MessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const streaming = !!message.streaming
  const editAndResend = useChatStore(s => s.editAndResend)
  const regenerate = useChatStore(s => s.regenerate)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [copied, setCopied] = useState(false)
  const display = useThrottledText(message.content, streaming)

  const onEdit = async (): Promise<void> => {
    const text = draft.trim()
    if (!text) return
    setEditing(false)
    await editAndResend(message.id, text)
  }

  const onCopy = async (): Promise<void> => {
    const ok = await copyText(message.content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className={clsx('msg-row', isUser ? 'user' : 'assistant')}>
      <div className={clsx('msg-avatar', isUser ? 'user' : 'bot')}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className='msg-body'>
        <div className='msg-meta'>
          <span className='msg-role'>{isUser ? '你' : 'DeepDesk'}</span>
          {!isUser && message.model && <span className='mono'>{message.model}</span>}
          {message.error && <span style={{ color: 'var(--danger)' }}>出错</span>}
          {streaming && <span className='muted'>生成中…</span>}
        </div>
        {isUser && editing ? (
          <textarea className='textarea' value={draft} onChange={e => setDraft(e.target.value)} rows={Math.min(8, Math.max(2, draft.split(String.fromCharCode(10)).length))} autoFocus onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void onEdit() } if (e.key === 'Escape') setEditing(false) }} />
        ) : isUser ? (
          <div className='msg-content user'>{message.content}</div>
        ) : (
          <div className='msg-content'>
            {message.reasoning && message.reasoning.trim().length > 0 && <ThinkingBlock text={message.reasoning} streaming={streaming} />}
            {display.length > 0 ? <Markdown text={display} /> : streaming ? (
              <div className='typing-dots'><span /><span /><span /></div>
            ) : null}
            {streaming && display.length > 0 && <span className='stream-cursor' />}
          </div>
        )}
        <div className='msg-actions'>
          {!streaming && isUser && (
            <>
              <button className='icon-btn' title='编辑并重新发送' onClick={() => { setDraft(message.content); setEditing(true) }}><Pencil size={13} /></button>
            </>
          )}
          {!streaming && !isUser && (
            <>
              <button className='icon-btn' title='重新生成' onClick={() => void regenerate()}><RefreshCw size={13} /></button>
              <button className='icon-btn' title='复制' onClick={() => void onCopy()}>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
