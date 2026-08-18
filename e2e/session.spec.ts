import { test, expect } from '@playwright/test'
import { closeDeepDesk, expectAppShell, goBackToChat, launchDeepDesk, openSettings } from './helpers'

test('runs local acceptance flow in one Electron window', async () => {
  const ctx = await launchDeepDesk()
  const { app, page } = ctx

  try {
    await test.step('load app shell', async () => {
      await expectAppShell(page)
    })

    await test.step('verify titlebar drag markers and settings navigation', async () => {
      await expect(page.locator('.titlebar')).toHaveClass(/drag/)
      await expect(page.locator('.titlebar-title')).toHaveClass(/no-drag/)
      await expect(page.locator('.win-controls')).toHaveClass(/no-drag/)

      await openSettings(page)
      await expect(page.locator('.titlebar-title', { hasText: 'DeepDesk · 设置' })).toBeVisible()
      await goBackToChat(page)
    })

    await test.step('collapse and expand sidebar', async () => {
      await page.getByTitle('收起侧边栏').click()
      await expect(page.locator('.sidebar.collapsed')).toBeVisible()

      await page.getByTitle('新对话').click()
      await expect(page.getByPlaceholder('发消息，或让我帮你做点事…')).toBeVisible()

      await page.getByTitle('展开侧边栏').click()
      await expect(page.locator('.sidebar:not(.collapsed)')).toBeVisible()
    })

    await test.step('cycle composer permission mode', async () => {
      const permissionButton = page.getByTitle('权限模式（点击切换）')
      await expect(permissionButton).toContainText('每次询问')

      await permissionButton.click()
      await expect(permissionButton).toContainText('替我审批')

      await permissionButton.click()
      await expect(permissionButton).toContainText('完全访问')

      await permissionButton.click()
      await expect(permissionButton).toContainText('每次询问')
    })

    await test.step('update general settings', async () => {
      await openSettings(page)
      await page.getByRole('button', { name: '常规' }).click()

      await page.getByRole('button', { name: '浅色' }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

      await page.getByRole('button', { name: '深色' }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

      await page.getByRole('button', { name: '替我审批' }).click()
      await goBackToChat(page)
      await expect(page.getByTitle('权限模式（点击切换）')).toContainText('替我审批')
    })

    await test.step('validate provider modal', async () => {
      await openSettings(page)
      await page.getByRole('button', { name: '模型服务' }).click()
      await page.getByRole('button', { name: '添加服务' }).click()

      const modal = page.locator('.modal')
      await expect(modal.locator('.modal-title', { hasText: '添加模型服务' })).toBeVisible()

      await modal.getByRole('button', { name: '保存' }).click()
      await expect(page.getByText('请填写服务名称')).toBeVisible()

      await modal.getByRole('button', { name: '取消' }).click()
      await expect(page.locator('.modal-title', { hasText: '添加模型服务' })).toBeHidden()
    })

    await test.step('toggle maximize window control', async () => {
      await page.getByTitle('最大化').click()
      await expect.poll(async () => app.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false
      })).toBe(true)

      await page.getByTitle('最大化').click()
      await expect.poll(async () => app.evaluate(({ BrowserWindow }) => {
        return BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false
      })).toBe(false)
    })
  } finally {
    await closeDeepDesk(ctx)
  }
})
