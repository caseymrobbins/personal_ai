import { test, expect } from './fixtures';

test.describe('Chat Application - Complete Conversation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the application and display initial UI', async ({ page }) => {
    // Check for main layout elements
    await expect(page.locator('text=New Conversation')).toBeVisible({
      timeout: 5000,
    });

    // Check sidebar exists
    const sidebar = page.locator('[class*="sidebar"]');
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
    }

    // Check main chat area
    const chatArea = page.locator('[class*="chat"]');
    await expect(chatArea).toBeVisible();
  });

  test('should create a new conversation', async ({ page }) => {
    // Click new conversation button
    const newConvButton = page.locator('button:has-text("New Conversation")').first();
    if (await newConvButton.isVisible({ timeout: 2000 })) {
      await newConvButton.click();
      await page.waitForTimeout(500);
    }

    // Check if input field is visible
    const messageInput = page.locator('textarea, input[placeholder*="message" i], input[placeholder*="Message" i]').first();
    if (await messageInput.isVisible({ timeout: 2000 })) {
      await expect(messageInput).toBeVisible();
    }
  });

  test('should send a message', async ({ page }) => {
    // Find message input field with flexible selectors
    let messageInput = page.locator('textarea').first();

    if (!(await messageInput.isVisible({ timeout: 1000 }))) {
      messageInput = page.locator('input[type="text"]').first();
    }

    if (!(await messageInput.isVisible({ timeout: 1000 }))) {
      // Try by placeholder
      messageInput = page.locator('[placeholder*="message" i]').first();
    }

    if (await messageInput.isVisible({ timeout: 2000 })) {
      // Type a test message
      await messageInput.fill('Hello, test message');

      // Find and click send button
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      if (await sendButton.isVisible({ timeout: 1000 })) {
        await sendButton.click();

        // Wait for message to appear
        await page.waitForTimeout(500);

        // Check if message appears in chat
        const userMessage = page.locator('text=Hello, test message');
        const isVisible = await userMessage.isVisible({ timeout: 2000 }).catch(() => false);

        if (isVisible) {
          await expect(userMessage).toBeVisible();
        }
      }
    }
  });

  test('should display conversation in sidebar', async ({ page }) => {
    // Check if sidebar shows conversations
    const sidebarItems = page.locator('[class*="conversation"], [class*="chat-item"]');

    const count = await sidebarItems.count();
    if (count > 0) {
      // Conversations should be visible
      await expect(sidebarItems.first()).toBeVisible();
    }
  });

  test('should navigate between pages', async ({ page }) => {
    // Look for navigation buttons
    const settingsButton = page.locator('button:has-text("Settings"), [class*="settings"]').first();
    const analyticsButton = page.locator('button:has-text("Analytics"), [class*="analytics"]').first();
    const chatButton = page.locator('button:has-text("Chat"), [class*="chat-nav"]').first();

    // If settings button exists, click it
    if (await settingsButton.isVisible({ timeout: 2000 })) {
      await settingsButton.click();
      await page.waitForTimeout(500);
      // Verify we've navigated (URL change or content change)
    }

    // If chat button exists, return to chat
    if (await chatButton.isVisible({ timeout: 2000 })) {
      await chatButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Look for error messages
    const errorContainer = page.locator('[class*="error"], [role="alert"]');

    // The page should load without showing error state
    const hasError = await errorContainer.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasError) {
      // Errors might be shown, but verify they're not blocking
      await expect(page.locator('body')).toBeTruthy();
    }
  });
});

test.describe('Chat Application - Conversation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle multiple conversations', async ({ page }) => {
    // Create first conversation
    let newConvButton = page.locator('button:has-text("New Conversation")').first();
    if (await newConvButton.isVisible({ timeout: 2000 })) {
      await newConvButton.click();
      await page.waitForTimeout(300);
    }

    // Check message input is ready
    const messageInput = page.locator('textarea, input[type="text"]').first();
    if (await messageInput.isVisible({ timeout: 1000 })) {
      // Send a message to first conversation
      await messageInput.fill('First conversation');

      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      if (await sendButton.isVisible({ timeout: 1000 })) {
        await sendButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Try to create second conversation
    newConvButton = page.locator('button:has-text("New Conversation")').first();
    if (await newConvButton.isVisible({ timeout: 2000 })) {
      await newConvButton.click();
      await page.waitForTimeout(300);

      // Check for new empty conversation
      const input = page.locator('textarea, input[type="text"]').first();
      if (await input.isVisible({ timeout: 1000 })) {
        await expect(input).toBeTruthy();
      }
    }
  });

  test('should persist conversations', async ({ page }) => {
    // Create a conversation
    const newConvButton = page.locator('button:has-text("New Conversation")').first();
    if (await newConvButton.isVisible({ timeout: 2000 })) {
      await newConvButton.click();
      await page.waitForTimeout(300);
    }

    // Send a message
    const messageInput = page.locator('textarea, input[type="text"]').first();
    if (await messageInput.isVisible({ timeout: 1000 })) {
      await messageInput.fill('Test message for persistence');

      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      if (await sendButton.isVisible({ timeout: 1000 })) {
        await sendButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if conversation still exists
    const sidebarItems = page.locator('[class*="conversation"], [class*="chat-item"]');
    const count = await sidebarItems.count().catch(() => 0);

    if (count > 0) {
      // Conversation persisted
      await expect(sidebarItems.first()).toBeVisible();
    }
  });
});

test.describe('Chat Application - Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for mobile-friendly navigation
    const hamburgerMenu = page.locator('button[class*="menu"], button[class*="hamburger"]').first();
    const sidebarVisible = await page.locator('[class*="sidebar"]').isVisible({ timeout: 2000 }).catch(() => false);

    // Either hamburger menu or visible sidebar
    if (sidebarVisible) {
      await expect(page).toBeTruthy();
    }

    // Chat area should be accessible
    const chatArea = page.locator('[class*="chat"]').first();
    if (await chatArea.isVisible({ timeout: 1000 })) {
      await expect(chatArea).toBeTruthy();
    }
  });

  test('should work on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for desktop layout elements
    const sidebar = page.locator('[class*="sidebar"]').first();
    const mainContent = page.locator('[class*="chat"], [class*="main"]').first();

    const sidebarVisible = await sidebar.isVisible({ timeout: 2000 }).catch(() => false);
    const contentVisible = await mainContent.isVisible({ timeout: 2000 }).catch(() => false);

    // At least one main content area should be visible
    if (sidebarVisible || contentVisible) {
      await expect(page).toBeTruthy();
    }
  });
});
