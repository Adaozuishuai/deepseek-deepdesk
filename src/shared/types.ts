import type { AgentSession } from './agent-types'

export type Theme = 'dark' | 'light' | 'system'

export type AgentPermissionMode = 'ask' | 'auto' | 'full'

export type ProviderType = 'openai'

export interface ModelConfig {
  id: string
  name?: string
  contextWindow?: number
  supportsReasoning?: boolean
}

export interface ProviderConfig {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  models: ModelConfig[]
  isBuiltIn?: boolean
  createdAt: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  createdAt: number
  error?: boolean
  model?: string
  streaming?: boolean
  feedback?: 'positive' | 'negative'
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  providerId: string
  modelId: string
  temperature: number
  messages: ChatMessage[]
}

export interface AppSettings {
  version: number
  defaultProviderId: string
  defaultModelId: string
  temperature: number
  theme: Theme
  enterToSend: boolean
  agentWorkdir: string
  agentPermissionMode: AgentPermissionMode
}

export interface AppState {
  settings: AppSettings
  providers: ProviderConfig[]
  conversations: Conversation[]
  agentSessions: AgentSession[]
}

export type ChatChunkType = 'start' | 'content' | 'reasoning' | 'done' | 'error'

export interface ChatChunkPayload {
  runId: string
  conversationId: string
  type: ChatChunkType
  text?: string
  message?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  model?: string
}

export interface ChatStartRequest {
  runId: string
  conversationId: string
  providerId: string
  modelId: string
  temperature: number
  messages: Array<{ role: string; content: string }>
}

export interface ProviderTestResult {
  ok: boolean
  message: string
  models?: ModelConfig[]
}

export interface Usage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}
