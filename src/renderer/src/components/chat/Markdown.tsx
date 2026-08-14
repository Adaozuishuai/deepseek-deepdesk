import { useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'
import { Check, Copy } from 'lucide-react'
import { copyText } from '../../lib/utils'

function CodeBlock({ lang, children }: { lang: string; children?: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const onCopy = async (): Promise<void> => {
    const code = preRef.current?.textContent ?? ''
    const ok = await copyText(code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <div className='codeblock'>
      <div className='codeblock-header'>
        <span className='codeblock-lang'>{lang || 'code'}</span>
        <button type='button' className='codeblock-copy' onClick={() => void onCopy()}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre ref={preRef}><code>{children}</code></pre>
    </div>
  )
}

const components: Components = {
  pre({ children }) {
    const first = Array.isArray(children) ? children[0] : children
    const el = first as ReactElement | undefined
    const cls = typeof el?.props?.className === 'string' ? el.props.className : ''
    const lang = cls.startsWith('language-') ? cls.slice('language-'.length).split(' ')[0] : ''
    return <CodeBlock lang={lang}>{el?.props?.children}</CodeBlock>
  },
  a({ href, children }) {
    return (
      <a href={href} onClick={e => { e.preventDefault(); if (href) void window.api.openExternal(href) }}>
        {children}
      </a>
    )
  }
}

export default function Markdown({ text }: { text: string }) {
  return (
    <div className='markdown'>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
