import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('electron', () => ({
  app: { getPath: () => join(tmpdir(), 'deepdesk-app') }
}))

import { AppStore } from '../src/main/store'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'deepdesk-test-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('AppStore', () => {
  it('首次启动内置 DeepSeek 与默认模型', async () => {
    const store = new AppStore(dir)
    await store.init()
    const snap = store.getSnapshot()
    expect(snap.providers.find(p => p.id === 'deepseek')).toBeTruthy()
    expect(snap.settings.defaultModelId).toBe('deepseek-chat')
    expect(snap.conversations).toEqual([])
  })

  it('设置持久化并可重新加载', async () => {
    const store = new AppStore(dir)
    await store.init()
    store.updateSettings({ defaultModelId: 'deepseek-reasoner', temperature: 0.5 })
    await store.flush()
    const store2 = new AppStore(dir)
    await store2.init()
    expect(store2.getSnapshot().settings.defaultModelId).toBe('deepseek-reasoner')
    expect(store2.getSnapshot().settings.temperature).toBe(0.5)
  })

  it('upsert / delete 提供商', async () => {
    const store = new AppStore(dir)
    await store.init()
    store.upsertProvider({ id: 'x', name: 'X', type: 'openai', baseUrl: 'https://x.com', apiKey: 'k', models: [], createdAt: 1 })
    expect(store.getSnapshot().providers.some(p => p.id === 'x')).toBe(true)
    store.deleteProvider('x')
    expect(store.getSnapshot().providers.some(p => p.id === 'x')).toBe(false)
  })

  it('会话增删查', async () => {
    const store = new AppStore(dir)
    await store.init()
    store.upsertConversation({ id: 'c1', title: 't', createdAt: 1, updatedAt: 1, providerId: 'deepseek', modelId: 'deepseek-chat', temperature: 1, messages: [] })
    expect(store.getConversation('c1')?.title).toBe('t')
    store.deleteConversation('c1')
    expect(store.getConversation('c1')).toBeNull()
  })

  it('删除默认提供商后回退到首个', async () => {
    const store = new AppStore(dir)
    await store.init()
    store.deleteProvider('deepseek')
    const snap = store.getSnapshot()
    expect(snap.settings.defaultProviderId).not.toBe('deepseek')
    expect(snap.settings.defaultProviderId).toBe(snap.providers[0].id)
  })
})
