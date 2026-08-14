import type { AppSettings, ProviderConfig, ProviderTestResult, Conversation, ChatStartRequest, ChatChunkPayload } from './types'

export interface DeepDeskApi {
  settings: {
    get: () => Promise<AppSettings>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>
  }
  providers: {
    list: () => Promise<ProviderConfig[]>
    upsert: (provider: ProviderConfig) => Promise<void>
    remove: (id: string) => Promise<void>
    test: (provider: ProviderConfig) => Promise<ProviderTestResult>
  }
  conversations: {
    list: () => Promise<Conversation[]>
    get: (id: string) => Promise<Conversation | null>
    upsert: (conversation: Conversation) => Promise<void>
    remove: (id: string) => Promise<void>
  }
  chat: {
    start: (req: ChatStartRequest) => Promise<{ ok: boolean; message?: string }>
    cancel: (runId: string) => Promise<void>
    onChunk: (cb: (payload: ChatChunkPayload) => void) => () => void
  }
  window: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (cb: (maximized: boolean) => void) => () => void
  }
  openExternal: (url: string) => Promise<void>
  appVersion: () => Promise<string>
}
