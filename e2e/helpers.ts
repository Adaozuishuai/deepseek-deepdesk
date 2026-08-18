import { _electron as electron, expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface DeepDeskE2EApp {
  app: ElectronApplication
  page: Page
  userDataDir: string
}

export async function launchDeepDesk(userDataDir = mkdtempSync(join(tmpdir(), 'deepdesk-e2e-'))): Promise<DeepDeskE2EApp> {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      DEEPDESK_USER_DATA_DIR: userDataDir
    }
  })
  const page = await app.firstWindow()
  return { app, page, userDataDir }
}

export async function closeDeepDesk(ctx: DeepDeskE2EApp | null): Promise<void> {
  if (!ctx) return
  await ctx.app.close()
  rmSync(ctx.userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
}

export async function closeDeepDeskWithoutRemovingData(ctx: DeepDeskE2EApp | null): Promise<void> {
  if (!ctx) return
  await ctx.app.close()
}

export async function expectAppShell(page: Page): Promise<void> {
  await expect(page.locator('.brand', { hasText: 'DeepDesk' })).toBeVisible()
  await expect(page.getByPlaceholder('发消息，或让我帮你做点事…')).toBeVisible()
  await expect(page.getByText('你好，我是 DeepDesk')).toBeVisible()
}

export async function openSettings(page: Page): Promise<void> {
  await page.getByTitle('设置 (Ctrl+,)').click()
  await expect(page.locator('.settings-title', { hasText: '设置' })).toBeVisible()
}

export async function goBackToChat(page: Page): Promise<void> {
  await page.getByTitle('返回').click()
  await expect(page.locator('.titlebar-title', { hasText: 'DeepDesk · 对话' })).toBeVisible()
}

export async function expectComposerReady(page: Page): Promise<void> {
  await expect(page.getByPlaceholder('发消息，或让我帮你做点事…')).toBeVisible()
  await expect(page.locator('.composer-select')).toBeVisible()
  await expect(page.locator('.ctx-trigger')).toBeVisible()
}
