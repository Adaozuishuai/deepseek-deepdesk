export const IPC = {
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  ProvidersList: 'providers:list',
  ProviderUpsert: 'providers:upsert',
  ProviderDelete: 'providers:delete',
  ProviderTest: 'providers:test',
  ConversationsList: 'conversations:list',
  ConversationGet: 'conversations:get',
  ConversationUpsert: 'conversations:upsert',
  ConversationDelete: 'conversations:delete',
  ChatStart: 'chat:start',
  ChatCancel: 'chat:cancel',
  ChatChunk: 'chat:chunk',
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggle-maximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:is-maximized',
  WindowMaximizedChanged: 'window:maximized-changed',
  OpenExternal: 'app:open-external',
  AppVersion: 'app:version'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
