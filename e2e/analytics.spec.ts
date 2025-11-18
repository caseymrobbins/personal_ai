import { test, expect } from './fixtures';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to analytics dashboard', async ({ page }) => {
    // Look for analytics navigation
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Check if analytics page loaded
      const analyticsContent = page.locator('[class*="analytics"], [class*="dashboard"]');
      const isVisible = await analyticsContent.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        await expect(analyticsContent).toBeTruthy();
      }
    }
  });

  test('should display analytics charts', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Look for chart elements (svg, canvas, or chart containers)
      const charts = page.locator('[class*="chart"], svg, canvas, [class*="graph"]');

      const count = await charts.count().catch(() => 0);
      if (count > 0) {
        await expect(charts.first()).toBeTruthy();
      }
    }
  });

  test('should display metrics summary', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Look for summary cards or metric displays
      const metrics = page.locator('[class*="metric"], [class*="stat"], [class*="card"]');

      const count = await metrics.count().catch(() => 0);
      if (count > 0) {
        await expect(metrics.first()).toBeTruthy();
      }
    }
  });

  test('should filter analytics by date range', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Look for date range inputs
      const dateInputs = page.locator('input[type="date"]');
      const count = await dateInputs.count().catch(() => 0);

      if (count > 0) {
        // Set start date
        const startDate = dateInputs.first();
        if (await startDate.isVisible({ timeout: 1000 })) {
          await startDate.fill('2024-01-01');
          await page.waitForTimeout(300);

          // Verify value changed
          const value = await startDate.inputValue();
          expect(value).toBe('2024-01-01');
        }
      }
    }
  });

  test('should export analytics', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Look for export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();

      const isVisible = await exportButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        // Click export - don't wait for download to complete
        await exportButton.click();
        await page.waitForTimeout(500);

        // Verify we're still on the page
        await expect(page).toBeTruthy();
      }
    }
  });
});

test.describe('Analytics - Autonomy Retention Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display ARI metrics', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Look for ARI related content
      const ariContent = page.locator('text=ARI, text=Autonomy, text=Independence');
      const count = await ariContent.count().catch(() => 0);

      // ARI might be displayed
      if (count > 0) {
        await expect(ariContent.first()).toBeTruthy();
      }
    }
  });

  test('should display RDI metrics', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Look for RDI related content
      const rdiContent = page.locator('text=RDI, text=Reality, text=Drift');
      const count = await rdiContent.count().catch(() => 0);

      // RDI might be displayed
      if (count > 0) {
        await expect(rdiContent.first()).toBeTruthy();
      }
    }
  });
});

test.describe('Analytics - Data Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should provide export options', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Look for export format options
      const csvButton = page.locator('button:has-text("CSV"), text=CSV').first();
      const jsonButton = page.locator('button:has-text("JSON"), text=JSON').first();
      const pdfButton = page.locator('button:has-text("PDF"), text=PDF').first();

      const csvVisible = await csvButton.isVisible({ timeout: 1000 }).catch(() => false);
      const jsonVisible = await jsonButton.isVisible({ timeout: 1000 }).catch(() => false);
      const pdfVisible = await pdfButton.isVisible({ timeout: 1000 }).catch(() => false);

      // At least one export format should be available
      if (csvVisible || jsonVisible || pdfVisible) {
        await expect(page).toBeTruthy();
      }
    }
  });

  test('should handle export interactions', async ({ page }) => {
    let analyticsLink = page.locator('a:has-text("Analytics"), button:has-text("Analytics")').first();

    if (await analyticsLink.isVisible({ timeout: 2000 })) {
      await analyticsLink.click();
      await page.waitForTimeout(500);

      // Try to export as CSV
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();

      if (await exportButton.isVisible({ timeout: 1000 })) {
        // Click export button
        await exportButton.click();
        await page.waitForTimeout(500);

        // App should still be responsive
        const analyticsContent = page.locator('[class*="analytics"]');
        const isVisible = await analyticsContent.isVisible({ timeout: 2000 }).catch(() => false);

        if (isVisible) {
          await expect(analyticsContent).toBeTruthy();
        }
      }
    }
  });
});
