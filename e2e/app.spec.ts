import { test, expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { DeepDeskE2EApp } from './helpers'
import { closeDeepDesk, expectAppShell, goBackToChat, launchDeepDesk, openSettings } from './helpers'

let app: ElectronApplication
let page: Page
let ctx: DeepDeskE2EApp | null = null

test.beforeEach(async () => {
  ctx = await launchDeepDesk()
  app = ctx.app
  page = ctx.page
})

test.afterEach(async () => {
  await closeDeepDesk(ctx)
  ctx = null
})

test('loads the app shell and opens settings', async () => {
  await expectAppShell(page)

  await openSettings(page)

  await expect(page.getByRole('button', { name: '模型服务' })).toBeVisible()
  await expect(page.getByRole('button', { name: '常规' })).toBeVisible()
})

test('marks titlebar drag regions and supports settings back button', async () => {
  await expect(page.locator('.titlebar')).toHaveClass(/drag/)
  await expect(page.locator('.titlebar-title')).toHaveClass(/no-drag/)
  await expect(page.locator('.win-controls')).toHaveClass(/no-drag/)

  await openSettings(page)

  await expect(page.locator('.titlebar-title', { hasText: 'DeepDesk · 设置' })).toBeVisible()

  await goBackToChat(page)

  await expect(page.getByPlaceholder('发消息，或让我帮你做点事…')).toBeVisible()
})

test('supports sidebar collapse, expand, and new conversation action', async () => {
  await expect(page.locator('.sidebar')).toBeVisible()

  await page.getByTitle('收起侧边栏').click()

  await expect(page.locator('.sidebar.collapsed')).toBeVisible()
  await expect(page.getByTitle('展开侧边栏')).toBeVisible()

  await page.getByTitle('新对话').click()
  await expect(page.getByPlaceholder('发消息，或让我帮你做点事…')).toBeVisible()

  await page.getByTitle('展开侧边栏').click()

  await expect(page.locator('.sidebar:not(.collapsed)')).toBeVisible()
  await expect(page.locator('.brand', { hasText: 'DeepDesk' })).toBeVisible()
})

test('cycles agent permission mode from the composer toolbar', async () => {
  const permissionButton = page.getByTitle('权限模式（点击切换）')

  await expect(permissionButton).toContainText('每次询问')

  await permissionButton.click()
  await expect(permissionButton).toContainText('替我审批')

  await permissionButton.click()
  await expect(permissionButton).toContainText('完全访问')

  await permissionButton.click()
  await expect(permissionButton).toContainText('每次询问')
})

test('updates general settings without calling external services', async () => {
  await page.getByTitle('设置 (Ctrl+,)').click()
  await page.getByRole('button', { name: '常规' }).click()

  await page.getByRole('button', { name: '浅色' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: '深色' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: '替我审批' }).click()
  await page.getByTitle('返回').click()

  await expect(page.getByTitle('权限模式（点击切换）')).toContainText('替我审批')
})

test('opens provider modal, validates required fields, and closes it', async () => {
  await page.getByTitle('设置 (Ctrl+,)').click()
  await page.getByRole('button', { name: '添加服务' }).click()

  const modal = page.locator('.modal')
  await expect(modal.locator('.modal-title', { hasText: '添加模型服务' })).toBeVisible()

  await modal.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('请填写服务名称')).toBeVisible()

  await modal.getByRole('button', { name: '取消' }).click()
  await expect(page.locator('.modal-title', { hasText: '添加模型服务' })).toBeHidden()
})

test('toggles maximize window control and emits UI state', async () => {
  const maximize = page.getByTitle('最大化')

  await maximize.click()
  await expect.poll(async () => app.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false
  })).toBe(true)

  await expect(page.getByTitle('最大化')).toBeVisible()

  await maximize.click()
  await expect.poll(async () => app.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false
  })).toBe(false)
})
