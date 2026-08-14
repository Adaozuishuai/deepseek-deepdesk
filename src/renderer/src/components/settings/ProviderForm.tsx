import { useState } from 'react'
import type { ProviderConfig } from '@shared/types'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { Button, Input, Modal } from '../ui'
import { uid } from '../../lib/utils'

export default function ProviderForm({ onClose }: { onClose: () => void }) {
  const saveProvider = useSettingsStore(s => s.saveProvider)
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (): Promise<void> => {
    if (!name.trim()) { setError('请填写服务名称'); return }
    if (!baseUrl.trim()) { setError('请填写 Base URL'); return }
    setSaving(true)
    const provider: ProviderConfig = {
      id: uid(),
      name: name.trim(),
      type: 'openai',
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      models: [],
      createdAt: Date.now()
    }
    await saveProvider(provider)
    setSaving(false)
    onClose()
  }

  return (
    <Modal title='添加模型服务' onClose={onClose} width={480} footer={
      <>
        <Button onClick={onClose}>取消</Button>
        <Button variant='primary' onClick={() => void submit()} disabled={saving}>保存</Button>
      </>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className='field-label'>服务名称</label>
          <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder='例如：智谱 GLM / Kimi / 本地 Ollama' />
        </div>
        <div>
          <label className='field-label'>Base URL（OpenAI 兼容接口地址）</label>
          <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder='https://api.deepseek.com' />
          <div className='field-hint'>支持任意 OpenAI 兼容服务：DeepSeek / 智谱 / Kimi / OpenAI / Ollama（http://localhost:11434/v1）等。</div>
        </div>
        <div>
          <label className='field-label'>API Key</label>
          <Input type='password' value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder='sk-…' />
        </div>
        {error && <div className='key-status bad'>✕ {error}</div>}
      </div>
    </Modal>
  )
}
