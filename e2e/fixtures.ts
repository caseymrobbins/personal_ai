import { test as base } from '@playwright/test';

type TestFixtures = {
  authenticatedPage: void;
};

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to app
    await page.goto('/');

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Use the page in the test
    await use();
  },
});

export { expect } from '@playwright/test';
