import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSettingsStore } from '../../stores/useSettingsStore'
import ProviderCard from './ProviderCard'
import ProviderForm from './ProviderForm'

export default function ProvidersTab() {
  const providers = useSettingsStore(s => s.providers)
  const [showForm, setShowForm] = useState(false)
  return (
    <div className='settings-section'>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className='settings-section-title'>模型服务</div>
        <button className='btn btn-ghost btn-sm' onClick={() => setShowForm(true)}><Plus size={13} /> 添加服务</button>
      </div>
      {providers.length === 0 && (
        <div className='settings-card muted' style={{ textAlign: 'center', padding: 28 }}>还没有模型服务，点击右上角「添加服务」开始配置</div>
      )}
      {providers.map(p => <ProviderCard key={p.id} provider={p} />)}
      {showForm && <ProviderForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
