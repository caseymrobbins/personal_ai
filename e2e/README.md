# E2E Tests - Playwright

Comprehensive end-to-end tests for SML Guardian using Playwright.

## Test Coverage

### Chat Application (`chat.spec.ts`)
- ✅ Application loads and displays initial UI
- ✅ Create new conversations
- ✅ Send messages
- ✅ Display conversations in sidebar
- ✅ Navigate between pages
- ✅ Handle errors gracefully
- ✅ Manage multiple conversations
- ✅ Persist conversations on reload
- ✅ Responsive design (mobile & desktop)

### Settings Management (`settings.spec.ts`)
- ✅ Navigate to settings
- ✅ Display settings options
- ✅ Handle settings changes
- ✅ Persist settings after reload
- ✅ Manage API keys

### Search Functionality (`search.spec.ts`)
- ✅ Display search interface
- ✅ Perform search queries
- ✅ Filter conversations by search
- ✅ Clear search results
- ✅ Search within conversations
- ✅ Support search filters
- ✅ Display search suggestions

### Analytics Dashboard (`analytics.spec.ts`)
- ✅ Navigate to analytics dashboard
- ✅ Display analytics charts
- ✅ Display metrics summary
- ✅ Filter analytics by date range
- ✅ Export analytics
- ✅ Display ARI (Autonomy Retention Index) metrics
- ✅ Display RDI (Reality Drift Index) metrics
- ✅ Provide export options (CSV, JSON, PDF)

### Export Operations (`export.spec.ts`)
- ✅ Provide export options in menu
- ✅ Export conversation as JSON
- ✅ Export conversation as markdown
- ✅ Export with timestamps
- ✅ Handle bulk export
- ✅ Provide backup/export option
- ✅ Handle export without errors
- ✅ Handle export of empty conversations
- ✅ Show success message on export

## Running Tests

### Run all E2E tests
```bash
npm run e2e
```

### Run tests in UI mode (interactive)
```bash
npm run e2e:ui
```

### Run tests in headed mode (visible browser)
```bash
npm run e2e:headed
```

### Run tests in debug mode
```bash
npm run e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/chat.spec.ts
```

### Run tests matching pattern
```bash
npx playwright test --grep "should send a message"
```

## Configuration

- **Base URL**: http://localhost:5173
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12

The dev server will automatically start before running tests.

## Test Design

Tests use flexible selectors to work with the actual DOM structure:
- Text-based selectors: `text=Label`
- Class-based selectors: `[class*="keyword"]`
- Role-based selectors: `[role="button"]`
- Placeholder selectors: `input[placeholder*="Search"]`

This approach ensures tests work even if implementation details change slightly.

## Debugging

### View test traces
```bash
npx playwright show-trace trace.zip
```

### Screenshot on failure
Playwright automatically captures screenshots of failed tests in `test-results/`.

### View HTML report
```bash
npx playwright show-report
```

## Best Practices

1. **Use fixtures** - Page loads via `authenticatedPage` fixture
2. **Wait for stability** - Use `waitForLoadState('networkidle')`
3. **Flexible selectors** - Allow for DOM variations
4. **Graceful fallbacks** - Test for visibility before interaction
5. **Timeout handling** - Use `.catch(() => false)` for optional elements

## CI/CD Integration

Tests run automatically on:
- PR creation
- Push to main/develop
- Scheduled nightly runs

See `.github/workflows/` for CI configuration.

## Adding New Tests

1. Create new `.spec.ts` file in `e2e/` directory
2. Import fixtures: `import { test, expect } from './fixtures'`
3. Follow test structure:
   ```typescript
   test.describe('Feature Name', () => {
     test.beforeEach(async ({ page }) => {
       await page.goto('/');
       await page.waitForLoadState('networkidle');
     });

     test('should do something', async ({ page }) => {
       // Test implementation
     });
   });
   ```

## Troubleshooting

### Tests timeout
- Check if dev server is running: `npm run dev`
- Increase timeout: `test.setTimeout(60000)`
- Check browser console for JavaScript errors

### Element not found
- Use `isVisible({ timeout: 2000 }).catch(() => false)` for optional elements
- Check actual DOM structure in DevTools
- Add fallback selectors

### Flaky tests
- Add `await page.waitForTimeout(500)` between actions
- Use `waitForLoadState('networkidle')` for page loads
- Avoid hard-coded waits, prefer event-based waits
