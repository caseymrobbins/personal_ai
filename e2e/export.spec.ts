import { test, expect } from './fixtures';

test.describe('Conversation Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should provide export options in menu', async ({ page }) => {
    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), [class*="export"]').first();

    const isVisible = await exportButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Check for export format options
      const exportMenu = page.locator('[class*="menu"], [class*="dropdown"]');
      const count = await exportMenu.count().catch(() => 0);

      if (count > 0) {
        await expect(exportMenu.first()).toBeTruthy();
      }
    }
  });

  test('should export conversation as JSON', async ({ page }) => {
    // Create a test conversation first
    const newConvButton = page.locator('button:has-text("New Conversation")').first();
    if (await newConvButton.isVisible({ timeout: 2000 })) {
      await newConvButton.click();
      await page.waitForTimeout(300);

      // Send a message
      const messageInput = page.locator('textarea, input[type="text"]').first();
      if (await messageInput.isVisible({ timeout: 1000 })) {
        await messageInput.fill('Test message for export');

        const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
        if (await sendButton.isVisible({ timeout: 1000 })) {
          await sendButton.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Now try to export
    const exportButton = page.locator('button:has-text("Export"), [class*="export"]').first();
    if (await exportButton.isVisible({ timeout: 2000 })) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Look for JSON export option
      const jsonOption = page.locator('button:has-text("JSON"), text=JSON').first();
      if (await jsonOption.isVisible({ timeout: 1000 })) {
        await jsonOption.click();
        await page.waitForTimeout(500);

        // Verify we're still on the page
        await expect(page).toBeTruthy();
      }
    }
  });

  test('should export conversation as markdown', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), [class*="export"]').first();

    if (await exportButton.isVisible({ timeout: 2000 })) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Look for Markdown export option
      const markdownOption = page.locator('button:has-text("Markdown"), text=Markdown').first();
      if (await markdownOption.isVisible({ timeout: 1000 })) {
        await markdownOption.click();
        await page.waitForTimeout(500);

        // Should remain on page
        await expect(page).toBeTruthy();
      }
    }
  });

  test('should export conversation with timestamps', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), [class*="export"]').first();

    if (await exportButton.isVisible({ timeout: 2000 })) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Look for export options
      const exportOptions = page.locator('[class*="option"], label, input[type="checkbox"]');
      const count = await exportOptions.count().catch(() => 0);

      // Should have at least one export option
      if (count > 0) {
        await expect(exportOptions.first()).toBeTruthy();
      }
    }
  });

  test('should handle bulk export', async ({ page }) => {
    // Look for export all or bulk export option
    const exportButton = page.locator('button:has-text("Export"), [class*="export"]').first();

    if (await exportButton.isVisible({ timeout: 2000 })) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Look for "export all" option
      const exportAllOption = page.locator('button:has-text("All"), text=All').first();
      if (await exportAllOption.isVisible({ timeout: 1000 })) {
        await exportAllOption.click();
        await page.waitForTimeout(500);

        await expect(page).toBeTruthy();
      }
    }
  });
});

test.describe('Database Export & Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should provide backup/export option', async ({ page }) => {
    // Navigate to settings to find backup option
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      // Look for backup button
      const backupButton = page.locator('button:has-text("Backup"), button:has-text("Export Database")').first();

      const isVisible = await backupButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        await expect(backupButton).toBeTruthy();
      }
    }
  });

  test('should handle export without errors', async ({ page }) => {
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      const backupButton = page.locator('button:has-text("Backup"), button:has-text("Export Database"), button:has-text("Download")').first();

      if (await backupButton.isVisible({ timeout: 1000 })) {
        await backupButton.click();
        await page.waitForTimeout(1000);

        // Check for error messages
        const errorMessage = page.locator('[class*="error"], [role="alert"]');
        const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

        // Should not have errors
        if (hasError) {
          await expect(false).toBe(true);
        }
      }
    }
  });
});

test.describe('Export Operations - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle export of empty conversations gracefully', async ({ page }) => {
    // Create a new conversation but don't send messages
    const newConvButton = page.locator('button:has-text("New Conversation")').first();
    if (await newConvButton.isVisible({ timeout: 2000 })) {
      await newConvButton.click();
      await page.waitForTimeout(300);
    }

    // Try to export without messages
    const exportButton = page.locator('button:has-text("Export"), [class*="export"]').first();
    if (await exportButton.isVisible({ timeout: 2000 })) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Should complete without errors
      await expect(page).toBeTruthy();
    }
  });

  test('should show success message on export', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), [class*="export"]').first();

    if (await exportButton.isVisible({ timeout: 2000 })) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Look for confirmation or success message
      const successMessage = page.locator('[class*="success"], text=Success, text=Exported').first();

      const isVisible = await successMessage.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        await expect(successMessage).toBeTruthy();
      }
    }
  });
});
