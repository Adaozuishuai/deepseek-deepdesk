import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import ProvidersTab from './ProvidersTab'
import GeneralTab from './GeneralTab'
import clsx from 'clsx'

export default function SettingsView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'providers' | 'general'>('providers')
  return (
    <div className='settings-view'>
      <div className='settings-header'>
        <button className='icon-btn' onClick={onBack} title='返回'><ChevronLeft size={17} /></button>
        <div className='settings-title'>设置</div>
        <div className='tabs' style={{ marginLeft: 'auto' }}>
          <button className={clsx('tab', tab === 'providers' && 'active')} onClick={() => setTab('providers')}>模型服务</button>
          <button className={clsx('tab', tab === 'general' && 'active')} onClick={() => setTab('general')}>常规</button>
        </div>
      </div>
      <div className='settings-scroll'>
        <div className='settings-inner'>
          {tab === 'providers' ? <ProvidersTab /> : <GeneralTab />}
        </div>
      </div>
    </div>
  )
}
