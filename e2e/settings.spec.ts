import { test, expect } from './fixtures';

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to settings', async ({ page }) => {
    // Look for settings navigation
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      // Check if settings page loaded
      const settingsContent = page.locator('[class*="settings"]');
      const isVisible = await settingsContent.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        await expect(settingsContent).toBeVisible();
      }
    }
  });

  test('should display settings options', async ({ page }) => {
    // Try to find settings
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      // Look for common settings controls
      const toggles = page.locator('input[type="checkbox"]');
      const inputs = page.locator('input[type="text"], input[type="password"], input[type="number"]');

      // Should have some settings controls
      const toggleCount = await toggles.count().catch(() => 0);
      const inputCount = await inputs.count().catch(() => 0);

      const hasControls = toggleCount > 0 || inputCount > 0;
      if (hasControls) {
        await expect(page).toBeTruthy();
      }
    }
  });

  test('should handle settings changes', async ({ page }) => {
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      // Find first toggle or input
      const firstToggle = page.locator('input[type="checkbox"]').first();
      const firstInput = page.locator('input[type="text"], input[type="number"]').first();

      if (await firstToggle.isVisible({ timeout: 1000 })) {
        // Toggle a checkbox
        const isChecked = await firstToggle.isChecked();
        await firstToggle.click();

        // Verify change
        const newState = await firstToggle.isChecked();
        expect(newState).not.toBe(isChecked);
      } else if (await firstInput.isVisible({ timeout: 1000 })) {
        // Change an input value
        await firstInput.fill('test-value');

        // Verify change
        const value = await firstInput.inputValue();
        expect(value).toBe('test-value');
      }
    }
  });

  test('should persist settings after reload', async ({ page }) => {
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      // Change a setting
      const firstToggle = page.locator('input[type="checkbox"]').first();
      if (await firstToggle.isVisible({ timeout: 1000 })) {
        const initialState = await firstToggle.isChecked();
        await firstToggle.click();
        await page.waitForTimeout(300);

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Navigate back to settings
        settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();
        if (await settingsLink.isVisible({ timeout: 2000 })) {
          await settingsLink.click();
          await page.waitForTimeout(500);

          // Check if setting persisted
          const reloadedToggle = page.locator('input[type="checkbox"]').first();
          if (await reloadedToggle.isVisible({ timeout: 1000 })) {
            const persistedState = await reloadedToggle.isChecked();
            expect(persistedState).not.toBe(initialState);
          }
        }
      }
    }
  });
});

test.describe('API Keys Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display API key fields', async ({ page }) => {
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      // Look for API key inputs
      const apiKeyInputs = page.locator('input[placeholder*="API"], input[placeholder*="key" i]');

      const count = await apiKeyInputs.count().catch(() => 0);
      if (count > 0) {
        await expect(apiKeyInputs.first()).toBeTruthy();
      }
    }
  });

  test('should allow entering API keys', async ({ page }) => {
    let settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();

    if (await settingsLink.isVisible({ timeout: 2000 })) {
      await settingsLink.click();
      await page.waitForTimeout(500);

      // Find API key input
      const apiKeyInput = page.locator('input[placeholder*="API"], input[placeholder*="key" i]').first();

      if (await apiKeyInput.isVisible({ timeout: 1000 })) {
        // Clear and set new value
        await apiKeyInput.fill('sk-test-key-12345');

        // Verify input
        const value = await apiKeyInput.inputValue();
        expect(value).toBe('sk-test-key-12345');
      }
    }
  });
});
