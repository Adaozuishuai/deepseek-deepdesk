import { describe, expect, it } from 'vitest'
import { makeTitle, normalizeBaseUrl, uid } from '../src/renderer/src/lib/utils'
import { formatTokens } from '../src/renderer/src/lib/format'
import { APP_VERSION } from '../src/shared/app-meta'
import packageJson from '../package.json'

describe('makeTitle', () => {
  it('取首行', () => {
    expect(makeTitle('第一行\n第二行')).toBe('第一行')
  })
  it('超长截断加省略号', () => {
    expect(makeTitle('a'.repeat(50))).toBe('a'.repeat(32) + '…')
  })
  it('空文本回退默认标题', () => {
    expect(makeTitle('   ')).toBe('新对话')
  })
})

describe('normalizeBaseUrl', () => {
  it('去除尾部斜杠与空白', () => {
    expect(normalizeBaseUrl('https://api.deepseek.com///')).toBe('https://api.deepseek.com')
    expect(normalizeBaseUrl(' https://x.com ')).toBe('https://x.com')
  })
})

describe('uid', () => {
  it('批量生成无重复', () => {
    const s = new Set(Array.from({ length: 1000 }, () => uid()))
    expect(s.size).toBe(1000)
  })
})

describe('formatTokens', () => {
  it('千分位格式化', () => {
    expect(formatTokens(500)).toBe('500')
    expect(formatTokens(1500)).toBe('1.5K')
    expect(formatTokens(undefined)).toBe('')
  })
})

describe('APP_VERSION', () => {
  it('与 package.json 版本保持一致', () => {
    expect(APP_VERSION).toBe(packageJson.version)
  })
})
