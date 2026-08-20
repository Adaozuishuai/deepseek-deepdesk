import { useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'
import { Check, Copy, Download } from 'lucide-react'
import { copyText, downloadTextFile } from '../../lib/utils'

const languageExtensions: Record<string, string> = {
  bash: 'sh',
  css: 'css',
  html: 'html',
  javascript: 'js',
  json: 'json',
  jsx: 'jsx',
  markdown: 'md',
  python: 'py',
  shell: 'sh',
  sql: 'sql',
  ts: 'ts',
  tsx: 'tsx',
  typescript: 'ts',
  xml: 'xml',
  yaml: 'yml',
  yml: 'yml'
}

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
  const onDownload = (): void => {
    const code = preRef.current?.textContent ?? ''
    const extension = languageExtensions[lang.toLowerCase()] ?? 'txt'
    downloadTextFile('deepdesk-code.' + extension, code)
  }
  return (
    <div className='codeblock'>
      <div className='codeblock-header'>
        <span className='codeblock-lang'>{lang || 'code'}</span>
        <button type='button' className='codeblock-action' aria-label='复制代码' title='复制代码' onClick={() => void onCopy()}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? '已复制' : '复制'}
        </button>
        <button type='button' className='codeblock-action' aria-label='下载代码' title='下载代码' onClick={onDownload}>
          <Download size={12} />
          下载
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
    const lang = /(?:^|\s)language-([^\s]+)/.exec(cls)?.[1] ?? ''
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
