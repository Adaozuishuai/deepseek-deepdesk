import { test, expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { DeepDeskE2EApp } from './helpers'
import {
  closeDeepDesk,
  closeDeepDeskWithoutRemovingData,
  createLongAgentSessionUserData,
  expectAppShell,
  expectComposerReady,
  goBackToChat,
  isMainWindowMaximized,
  launchDeepDesk,
  openSettings
} from './helpers'

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
  await expectComposerReady(page)

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

test('supports global settings shortcuts and sidebar model entry', async () => {
  await page.locator('.app-shell').click()
  await page.keyboard.down('Control')
  await page.keyboard.press(',')
  await page.keyboard.up('Control')
  await expect(page.locator('.settings-title', { hasText: '设置' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.titlebar-title', { hasText: 'DeepDesk · 对话' })).toBeVisible()

  await page.locator('.model-chip').click()
  await expect(page.locator('.settings-title', { hasText: '设置' })).toBeVisible()

  await page.keyboard.down('Control')
  await page.keyboard.press(',')
  await page.keyboard.up('Control')
  await expect(page.locator('.titlebar-title', { hasText: 'DeepDesk · 对话' })).toBeVisible()
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

test('selects a mock agent work directory without opening a native dialog', async () => {
  const directoryPicker = page.getByTitle('选择工作目录')

  await directoryPicker.click()

  await expect(directoryPicker).toContainText(ctx!.userDataDir)
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
  const maximize = page.getByRole('button', { name: '最大化' })
  const initiallyMaximized = await isMainWindowMaximized(app)

  await maximize.click()
  await expect.poll(() => isMainWindowMaximized(app)).not.toBe(initiallyMaximized)
  await expect(maximize).toHaveAttribute('aria-pressed', String(!initiallyMaximized))

  await expect(maximize).toBeVisible()

  await maximize.click()
  await expect.poll(() => isMainWindowMaximized(app)).toBe(initiallyMaximized)
  await expect(maximize).toHaveAttribute('aria-pressed', String(initiallyMaximized))
})

test('validates composer send button and missing api key error', async () => {
  const textarea = page.getByPlaceholder('发消息，或让我帮你做点事…')
  const sendButton = page.locator('.send-btn')

  await expect(sendButton).toBeDisabled()

  await textarea.fill('帮我介绍一下 DeepDesk')
  await expect(sendButton).toBeEnabled()

  await sendButton.click()

  await expect(page.getByText('请先在「设置 → 模型服务」中配置 API Key')).toBeVisible()
  await expect(textarea).toHaveValue('')
})

test('supports multiline composer input and context meter panel', async () => {
  const textarea = page.getByPlaceholder('发消息，或让我帮你做点事…')

  await textarea.fill('第一行')
  await textarea.press('Shift+Enter')
  await textarea.pressSequentially('第二行')

  await expect(textarea).toHaveValue('第一行\n第二行')

  await page.locator('.ctx-trigger').click()
  await expect(page.locator('.ctx-panel')).toBeVisible()
  await expect(page.locator('.ctx-panel', { hasText: '上下文已用' })).toBeVisible()
})

test('adds, edits, adds model, and deletes a custom provider without network calls', async () => {
  await openSettings(page)
  await page.getByRole('button', { name: '添加服务' }).click()

  const modal = page.locator('.modal')
  await modal.getByPlaceholder('例如：智谱 GLM / Kimi / 本地 Ollama').fill('Mock Local')
  await modal.getByPlaceholder('https://api.deepseek.com').fill('http://127.0.0.1:11434/v1')
  await modal.getByPlaceholder('sk-…').fill('sk-test-e2e')
  await modal.getByRole('button', { name: '保存' }).click()

  const card = page.locator('.provider-card').filter({ hasText: 'Mock Local' })
  await expect(card).toBeVisible()
  await expect(card.getByText('自定义')).toBeVisible()
  await expect(card.getByText('已配置')).toBeVisible()

  const apiKeyInput = card.getByPlaceholder('sk-…')
  await expect(apiKeyInput).toHaveAttribute('type', 'password')
  await card.locator('.input-wrap').locator('.icon-btn').click()
  await expect(apiKeyInput).toHaveAttribute('type', 'text')

  await card.locator('input').first().fill('Mock Local Updated')
  await card.getByRole('button', { name: '保存' }).click()

  const updatedCard = page.locator('.provider-card').filter({ hasText: 'Mock Local Updated' })
  await expect(updatedCard).toBeVisible()

  await updatedCard.getByPlaceholder('添加模型 ID，如 deepseek-v4-flash').fill('mock-chat')
  await updatedCard.getByRole('button', { name: '添加' }).click()
  await expect(updatedCard.locator('.model-chip-item', { hasText: 'mock-chat' })).toBeVisible()

  await updatedCard.getByRole('button', { name: '删除' }).click()
  await expect(page.locator('.provider-card').filter({ hasText: 'Mock Local Updated' })).toBeHidden()
})

test('persists general settings after app restart with the same user data directory', async () => {
  await openSettings(page)
  await page.getByRole('button', { name: '常规' }).click()
  await page.getByRole('button', { name: '浅色' }).click()
  await page.getByRole('button', { name: '完全访问' }).click()

  const userDataDir = ctx!.userDataDir
  await closeDeepDeskWithoutRemovingData(ctx)
  ctx = await launchDeepDesk(userDataDir)
  app = ctx.app
  page = ctx.page

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByTitle('权限模式（点击切换）')).toContainText('完全访问')
})

test('places the scroll-to-bottom control above the composer in a long agent session', async () => {
  await closeDeepDesk(ctx)
  ctx = await launchDeepDesk(createLongAgentSessionUserData())
  app = ctx.app
  page = ctx.page

  const session = page.locator('.conv-item', { hasText: '长对话视觉回归' })
  await session.click()

  const scroll = page.locator('.agent-scroll')
  await expect(scroll).toBeVisible()
  await scroll.evaluate(element => {
    element.scrollTop = 0
    element.dispatchEvent(new Event('scroll'))
  })

  const scrollButton = page.getByTitle('回到底部')
  await expect(scrollButton).toBeVisible()

  const [buttonBox, composerBox] = await Promise.all([scrollButton.boundingBox(), page.locator('.agent-composer').boundingBox()])
  expect(buttonBox).not.toBeNull()
  expect(composerBox).not.toBeNull()
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(composerBox!.y - 8)

  await scrollButton.click()
  await expect.poll(async () => scroll.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2)
})
