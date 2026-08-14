import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useChatStore } from '../../stores/useChatStore'
import EmptyState from './EmptyState'
import MessageList from './MessageList'
import Composer from './Composer'

export default function ChatView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const activeId = useChatStore(s => s.activeId)
  const conversations = useChatStore(s => s.conversations)
  const notice = useChatStore(s => s.notice)
  const dismissNotice = useChatStore(s => s.dismissNotice)
  const conversation = useMemo(() => conversations.find(c => c.id === activeId) ?? null, [conversations, activeId])

  return (
    <div className='chat-view'>
      {notice && (
        <div className='notice-banner'>
          <AlertTriangle size={14} />
          {notice}
          <button onClick={() => { dismissNotice(); onOpenSettings() }}>去配置</button>
        </div>
      )}
      {conversation ? (
        <>
          <MessageList conversation={conversation} />
          <div className='chat-footer'>
            <div className='chat-footer-inner'>
              <Composer onOpenSettings={onOpenSettings} />
            </div>
          </div>
        </>
      ) : (
        <>
          <EmptyState onOpenSettings={onOpenSettings} />
          <div className='chat-footer'>
            <div className='chat-footer-inner'>
              <Composer onOpenSettings={onOpenSettings} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
