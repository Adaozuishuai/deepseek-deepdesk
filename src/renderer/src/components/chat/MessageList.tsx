import type { Conversation } from '@shared/types'
import MessageItem from './MessageItem'
import { useAutoScroll } from '../../hooks'

export default function MessageList({ conversation }: { conversation: Conversation }) {
  const lastMsg = conversation.messages[conversation.messages.length - 1]
  const dep = conversation.id + '-' + (lastMsg?.content ?? '')
  const [ref] = useAutoScroll(dep, 140)
  return (
    <div className='chat-scroll' ref={ref}>
      <div className='chat-inner'>
        {conversation.messages.map(m => <MessageItem key={m.id} message={m} />)}
      </div>
    </div>
  )
}
