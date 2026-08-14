/// <reference types="vite/client" />
import type { DeepDeskApi } from '@shared/api'

declare global {
  interface Window {
    api: DeepDeskApi
  }
}

export {}
