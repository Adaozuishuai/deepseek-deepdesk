import { create } from 'zustand'
import type { AppSettings, ProviderConfig, ProviderTestResult } from '@shared/types'

interface SettingsState {
  loaded: boolean
  settings: AppSettings | null
  providers: ProviderConfig[]
  load: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  saveProvider: (provider: ProviderConfig) => Promise<void>
  removeProvider: (id: string) => Promise<void>
  testProvider: (provider: ProviderConfig) => Promise<ProviderTestResult>
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  loaded: false,
  settings: null,
  providers: [],
  load: async () => {
    try {
      const [settings, providers] = await Promise.all([
        window.api.settings.get(),
        window.api.providers.list()
      ])
      set({ settings, providers, loaded: true })
    } catch (err) {
      console.error('加载设置失败', err)
      set({ loaded: true })
    }
  },
  updateSettings: async (patch) => {
    const settings = await window.api.settings.set(patch)
    set({ settings })
  },
  saveProvider: async (provider) => {
    await window.api.providers.upsert(provider)
    const providers = await window.api.providers.list()
    set({ providers })
  },
  removeProvider: async (id) => {
    await window.api.providers.remove(id)
    const providers = await window.api.providers.list()
    set({ providers })
  },
  testProvider: (provider) => window.api.providers.test(provider)
}))
