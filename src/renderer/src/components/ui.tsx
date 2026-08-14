import { useEffect } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'ghost', size = 'md', className, ...rest }: ButtonProps) {
  return <button className={clsx('btn', variant === 'primary' && 'btn-primary', variant === 'ghost' && 'btn-ghost', variant === 'danger' && 'btn-danger', size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', className)} {...rest} />
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className='input' {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className='textarea' {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className='select' {...props} />
}

interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button type='button' className={clsx('switch', checked && 'on')} onClick={() => onChange(!checked)} aria-label={label ?? '开关'}>
      <span className='switch-thumb' />
    </button>
  )
}

export function Spinner({ size = 14 }: { size?: number }) {
  return <span className='spin' style={{ width: size, height: size, display: 'inline-block', border: '2px solid var(--border-strong)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
}

interface BadgeProps {
  tone: 'builtin' | 'off' | 'ok'
  children: ReactNode
}

export function Badge({ tone, children }: BadgeProps) {
  return <span className={clsx('badge', tone === 'builtin' && 'badge.builtin', tone === 'off' && 'badge.off', tone === 'ok' && 'badge.ok')}>{children}</span>
}

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}

export function Modal({ title, onClose, children, footer, width }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className='modal-overlay' onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className='modal' style={width ? { width } : undefined}>
        <div className='modal-header'>
          <div className='modal-title'>{title}</div>
          <button type='button' className='icon-btn' onClick={onClose}><X size={15} /></button>
        </div>
        <div className='modal-body'>{children}</div>
        {footer && <div className='modal-footer'>{footer}</div>}
      </div>
    </div>
  )
}
