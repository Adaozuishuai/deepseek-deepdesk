import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { AppState, AppSettings, ProviderConfig, Conversation } from '../shared/types'
import { BUILTIN_PROVIDERS } from '../shared/llm/providers'

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  defaultProviderId: 'deepseek',
  defaultModelId: 'deepseek-chat',
  temperature: 1,
  theme: 'dark',
  enterToSend: true
}

function cloneProviders(): ProviderConfig[] {
  return BUILTIN_PROVIDERS.map(p => ({
    ...p,
    models: p.models.map(m => ({ ...m }))
  }))
}

export class AppStore {
  private file: string
  private data: AppState
  private writing: Promise<void> = Promise.resolve()

  constructor(storageDir?: string) {
    const dir = storageDir ?? app.getPath('userData')
    this.file = path.join(dir, 'deepdesk.json')
    this.data = {
      settings: { ...DEFAULT_SETTINGS },
      providers: cloneProviders(),
      conversations: []
    }
  }

  async init(): Promise<void> {
    try {
      const raw = await fs.readFile(this.file, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppState>
      this.data = this.migrate(parsed)
    } catch {
      // 首次启动，使用默认数据
    }
    if (!this.data.providers || this.data.providers.length === 0) {
      this.data.providers = cloneProviders()
    }
    if (!this.data.settings) this.data.settings = { ...DEFAULT_SETTINGS }
    if (!this.data.conversations) this.data.conversations = []
    await this.persist()
  }

  private migrate(parsed: Partial<AppState>): AppState {
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) }
    const providers = Array.isArray(parsed.providers) ? parsed.providers : []
    const conversations = Array.isArray(parsed.conversations) ? parsed.conversations : []
    return { settings, providers, conversations }
  }

  getSnapshot(): AppState {
    return structuredClone(this.data)
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...patch }
    this.persist()
    return structuredClone(this.data.settings)
  }

  upsertProvider(provider: ProviderConfig): void {
    const idx = this.data.providers.findIndex(p => p.id === provider.id)
    if (idx >= 0) this.data.providers[idx] = structuredClone(provider)
    else this.data.providers.push(structuredClone(provider))
    this.persist()
  }

  deleteProvider(id: string): void {
    this.data.providers = this.data.providers.filter(p => p.id !== id)
    const settings = this.data.settings
    if (settings.defaultProviderId === id && this.data.providers.length > 0) {
      settings.defaultProviderId = this.data.providers[0].id
    }
    this.persist()
  }

  getConversation(id: string): Conversation | null {
    const found = this.data.conversations.find(c => c.id === id)
    return found ? structuredClone(found) : null
  }

  upsertConversation(conversation: Conversation): void {
    const idx = this.data.conversations.findIndex(c => c.id === conversation.id)
    if (idx >= 0) this.data.conversations[idx] = structuredClone(conversation)
    else this.data.conversations.push(structuredClone(conversation))
    this.persist()
  }

  deleteConversation(id: string): void {
    this.data.conversations = this.data.conversations.filter(c => c.id !== id)
    this.persist()
  }

  clearConversations(): void {
    this.data.conversations = []
    this.persist()
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2)
    const write = this.writing
      .then(async () => {
        const tmp = this.file + '.tmp'
        await fs.writeFile(tmp, snapshot, 'utf-8')
        await fs.rename(tmp, this.file)
      })
      .catch(err => {
        console.error('[store] 持久化失败:', err)
      })
    this.writing = write
    return write
  }

  flush(): Promise<void> {
    return this.writing
  }
}
