import type { ProviderConfig } from '../types'

export const BUILTIN_PROVIDERS: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    isBuiltIn: true,
    createdAt: 0,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3（通用对话）', contextWindow: 128000 },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1（深度推理）', contextWindow: 128000, supportsReasoning: true }
    ]
  },
  {
    id: 'ollama',
    name: 'Ollama（本地模型）',
    type: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    isBuiltIn: true,
    createdAt: 0,
    models: []
  }
]

export function getProviderById(providers: ProviderConfig[], id: string): ProviderConfig | undefined {
  return providers.find(p => p.id === id)
}
