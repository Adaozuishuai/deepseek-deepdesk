import { KeyRound, Sparkles, ArrowRight } from 'lucide-react'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useChatStore } from '../../stores/useChatStore'

export default function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  const providers = useSettingsStore(s => s.providers)
  const createConversation = useChatStore(s => s.createConversation)
  const deepseek = providers.find(p => p.id === 'deepseek')
  const configured = deepseek ? deepseek.apiKey.length > 0 : false

  return (
    <div className='empty-state'>
      <div className='empty-orb'><Sparkles size={30} /></div>
      <div className='empty-title'>你好，我是 DeepDesk</div>
      <div className='empty-sub'>
        {configured
          ? 'DeepSeek 已就绪。选择下面的模型开始对话，或直接输入你的问题。'
          : '先在设置中添加你的 DeepSeek API Key（也可添加任意 OpenAI 兼容服务），即可开始对话。'}
      </div>
      {configured ? (
        <div className='quick-chips'>
          {deepseek?.models.map(m => (
            <button key={m.id} className='quick-chip' onClick={() => createConversation('deepseek', m.id)}>
              {m.name ?? m.id}
            </button>
          ))}
        </div>
      ) : (
        <div className='quick-chips'>
          <button className='quick-chip' onClick={onOpenSettings}>
            <KeyRound size={13} /> 添加 DeepSeek API Key
          </button>
          <button className='quick-chip' onClick={onOpenSettings}>
            添加其他模型服务 <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
