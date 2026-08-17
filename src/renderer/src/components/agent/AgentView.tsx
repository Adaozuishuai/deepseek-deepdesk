import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Bot, Check, ChevronDown, FolderOpen, Play, Square, Terminal, Trash2, X, Sparkles, ShieldQuestion, ShieldCheck, Unlock } from 'lucide-react'
import { useAgentStore } from '../../stores/useAgentStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type { AgentStep } from '@shared/agent-types'
import clsx from 'clsx'
import '../../assets/agent.css'

function parseArgs(args?: string): Record<string, unknown> {
  if (!args) return {}
  try { return JSON.parse(args) as Record<string, unknown> } catch { return {} }
}

function ToolCard({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false)
  const a = parseArgs(step.args)
  const title = step.name === 'run_command' ? String(a.command ?? '')
    : step.name === 'read_file' ? '读取 ' + String(a.path ?? '')
    : step.name === 'write_file' ? '写入 ' + String(a.path ?? '')
    : step.name === 'edit_file' ? '编辑 ' + String(a.path ?? '')
    : step.name === 'list_files' ? '列出 ' + String(a.path ?? '工作目录')
    : step.name === 'search_content' ? '搜索 ' + String(a.pattern ?? '')
    : step.name === 'search_feishu_user' ? '搜索飞书通讯录 ' + String(a.name ?? '')
    : step.name === 'send_feishu_message' ? '发送飞书消息'
    : String(step.name ?? '工具')
  const statusText = step.status === 'running' ? '运行中…' : step.status === 'ok' ? '完成' : step.status === 'error' ? '出错' : step.status === 'denied' ? '已拒绝' : ''
  return (
    <div className={clsx('agent-tool', step.status)}>
      <div className='agent-tool-head' onClick={() => setOpen(o => !o)}>
        <Terminal size={13} />
        <span className='agent-tool-title mono'>{title}</span>
        <span className='agent-tool-status'>{statusText}</span>
        {step.result && <ChevronDown size={13} className='agent-tool-chev' style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />}
      </div>
      {open && step.result && <pre className='agent-tool-result'>{step.result}</pre>}
    </div>
  )
}

function StepItem({ step }: { step: AgentStep }) {
  switch (step.kind) {
    case 'task': return <div className='agent-task'><Bot size={14} /><span>{step.text}</span></div>
    case 'thinking': return <div className='agent-thinking'><span className='thinking-icon' />思考中…</div>
    case 'text': return <div className='agent-text'>{step.text}</div>
    case 'tool': return <ToolCard step={step} />
    case 'error': return <div className='agent-error'>{step.message}</div>
    default: return null
  }
}

export default function AgentView() {
  const steps = useAgentStore(s => s.steps)
  const running = useAgentStore(s => s.running)
  const workdir = useAgentStore(s => s.workdir)
  const pendingApproval = useAgentStore(s => s.pendingApproval)
  const error = useAgentStore(s => s.error)
  const start = useAgentStore(s => s.start)
  const stop = useAgentStore(s => s.stop)
  const approve = useAgentStore(s => s.approve)
  const pickDirectory = useAgentStore(s => s.pickDirectory)
  const clear = useAgentStore(s => s.clear)
  const settings = useSettingsStore(s => s.settings)
  const providers = useSettingsStore(s => s.providers)
  const updateSettings = useSettingsStore(s => s.updateSettings)
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const provider = providers.find(p => p.id === (settings?.defaultProviderId ?? 'deepseek'))
  const modelLabel = provider?.models.find(m => m.id === (settings?.defaultModelId ?? ''))?.name ?? settings?.defaultModelId ?? ''
  const mode = settings?.agentPermissionMode ?? 'ask'
  const modeLabel = mode === 'full' ? '完全访问' : mode === 'auto' ? '替我审批' : '每次询问'
  const cycleMode = (): void => {
    const order = ['ask', 'auto', 'full'] as const
    const idx = order.indexOf(mode as 'ask' | 'auto' | 'full')
    const next = order[(idx + 1) % order.length]
    void updateSettings({ agentPermissionMode: next })
  }

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [text])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
  }, [steps, pendingApproval])

  const submit = async (): Promise<void> => {
    if (!text.trim() || running) return
    setText('')
    await start(text)
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() }
  }

  return (
    <div className='agent-view'>
      {error && <div className='agent-error' style={{ margin: '10px 24px 0' }}>{error}</div>}
      {pendingApproval && (
        <div className='agent-approval'>
          <div className='agent-approval-title'>{pendingApproval.reason || '等待批准'}</div>
          <pre className='agent-approval-cmd'>{pendingApproval.command || pendingApproval.target}</pre>
          {pendingApproval.command && <div className='agent-approval-cwd'>工作目录：{pendingApproval.cwd}</div>}
          <div className='agent-approval-actions'>
            <button className='btn btn-primary btn-sm' onClick={() => approve(true)}><Check size={13} /> 批准</button>
            <button className='btn btn-danger btn-sm' onClick={() => approve(false)}><X size={13} /> 拒绝</button>
          </div>
        </div>
      )}
      {steps.length === 0 ? (
        <div className='agent-empty'>
          <div className='empty-orb'><Sparkles size={30} /></div>
          <div className='empty-title'>你好，我是 DeepDesk</div>
          <div className='empty-sub'>直接问我问题，或让我帮你写代码、执行命令、读写文件、发飞书消息。先选个工作目录，然后告诉我做什么。</div>
          <div className='quick-chips'>
            <button className='quick-chip' onClick={() => void pickDirectory()}><FolderOpen size={13} /> {workdir || '选择工作目录'}</button>
          </div>
        </div>
      ) : (
        <div className='agent-scroll' ref={scrollRef}>
          <div className='agent-inner'>
            {steps.map((st, i) => <StepItem key={i} step={st} />)}
          </div>
        </div>
      )}
      <div className='agent-footer'>
        <div className='agent-composer'>
          <textarea
            ref={taRef}
            className='composer-textarea'
            placeholder='发消息，或让我帮你做点事…'
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <div className='composer-actions'>
            <button className='model-pill' onClick={cycleMode} title={'权限模式：' + modeLabel + '（点击切换）'}>
              {mode === 'full' ? <Unlock size={13} /> : mode === 'auto' ? <ShieldCheck size={13} /> : <ShieldQuestion size={13} />}
              <span className='name'>{modeLabel}</span>
            </button>
            <button className='model-pill' onClick={() => void pickDirectory()} title='选择工作目录'>
              <FolderOpen size={13} /><span className='name'>{workdir || '选择工作目录'}</span>
            </button>
            <div className='composer-hint'>{modelLabel}</div>
            {steps.length > 0 && !running && (
              <button className='icon-btn' title='清空' onClick={clear}><Trash2 size={14} /></button>
            )}
            {running ? (
              <button className='stop-btn' onClick={stop} title='停止'><Square size={13} /></button>
            ) : (
              <button className='send-btn' disabled={!text.trim()} onClick={() => void submit()} title='发送'><Play size={15} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
