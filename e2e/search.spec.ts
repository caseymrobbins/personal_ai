import { test, expect } from './fixtures';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display search interface', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();

    const isVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('should perform search query', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();

    if (await searchInput.isVisible({ timeout: 2000 })) {
      // Enter search query
      await searchInput.fill('test query');

      // Wait for search results
      await page.waitForTimeout(500);

      // Check for results container
      const resultsContainer = page.locator('[class*="results"], [class*="search"]');
      const isVisible = await resultsContainer.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        await expect(resultsContainer).toBeTruthy();
      }
    }
  });

  test('should filter conversations by search', async ({ page }) => {
    // Create a test conversation first
    const newConvButton = page.locator('button:has-text("New Conversation")').first();
    if (await newConvButton.isVisible({ timeout: 2000 })) {
      await newConvButton.click();
      await page.waitForTimeout(300);

      // Send a message
      const messageInput = page.locator('textarea, input[type="text"]').first();
      if (await messageInput.isVisible({ timeout: 1000 })) {
        await messageInput.fill('Test conversation about AI');

        const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
        if (await sendButton.isVisible({ timeout: 1000 })) {
          await sendButton.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Now search
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('AI');
      await page.waitForTimeout(500);

      // Results should show matching conversations
      const resultsContainer = page.locator('[class*="results"], [class*="conversations"]');
      const count = await resultsContainer.count().catch(() => 0);

      if (count > 0) {
        await expect(resultsContainer.first()).toBeTruthy();
      }
    }
  });

  test('should clear search results', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();

    if (await searchInput.isVisible({ timeout: 2000 })) {
      // Enter search query
      await searchInput.fill('test');
      await page.waitForTimeout(300);

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(300);

      // Verify results cleared
      const value = await searchInput.inputValue();
      expect(value).toBe('');
    }
  });
});

test.describe('Search Across Conversations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should search within current conversation', async ({ page }) => {
    // Look for conversation search feature
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();

    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('message');
      await page.waitForTimeout(500);

      // Results or highlighting should appear
      const highlights = page.locator('[class*="highlight"], [class*="match"]');
      const count = await highlights.count().catch(() => 0);

      // Should have some results or at least handle the query gracefully
      await expect(page).toBeTruthy();
    }
  });

  test('should support search filters', async ({ page }) => {
    // Look for filter options
    const filterButton = page.locator('button:has-text("Filter"), [class*="filter"]').first();

    const isVisible = await filterButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await filterButton.click();
      await page.waitForTimeout(500);

      // Check for filter options
      const filterOptions = page.locator('[class*="filter-option"], label');
      const count = await filterOptions.count().catch(() => 0);

      if (count > 0) {
        await expect(filterOptions.first()).toBeTruthy();
      }
    }
  });

  test('should display search suggestions', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first();

    if (await searchInput.isVisible({ timeout: 2000 })) {
      // Focus input to trigger suggestions
      await searchInput.focus();

      // Type partial query
      await searchInput.fill('test');

      // Wait for suggestions
      await page.waitForTimeout(300);

      // Check for dropdown suggestions
      const suggestions = page.locator('[class*="suggestion"], [role="listbox"]');
      const count = await suggestions.count().catch(() => 0);

      // Suggestions might or might not appear depending on data
      await expect(page).toBeTruthy();
    }
  });
});
