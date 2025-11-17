# Test Suite Documentation

Comprehensive unit tests for SML Guardian core services.

## Overview

**Test Framework**: Vitest v1.0+
**Environment**: happy-dom (browser simulation)
**Coverage Tool**: @vitest/coverage-v8
**Total Tests**: 63 passing ✅

---

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (auto-rerun on changes)
```bash
npm test
```

### Single Run
```bash
npm test -- --run
```

### With UI
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

Coverage reports are generated in `/coverage` directory:
- HTML report: `coverage/index.html`
- JSON report: `coverage/coverage-final.json`
- Text summary: Printed to console

---

## Test Structure

### Services Tested

1. **Import Service** (`import.service.test.ts`)
   - ChatGPT import (40 tests)
   - Claude import (tests)
   - Auto-detection
   - Error handling
   - Import options

2. **Storage Service** (`storage.service.test.ts`)
   - IndexedDB operations (16 tests)
   - Save/load/clear database
   - Storage estimation
   - localStorage migration

3. **Database Service** (`db.service.test.ts`)
   - Conversation CRUD (7 tests)
   - Message CRUD
   - API key management
   - Governance metrics
   - Export functionality

### Test Organization

```
src/tests/
├── setup.ts                  # Global test setup
├── mocks/
│   └── db.mock.ts           # Database mock
├── fixtures/
│   └── import-data.ts       # Test data
└── README.md                # This file

src/services/
├── import.service.test.ts   # Import service tests
├── storage.service.test.ts  # Storage service tests
└── db.service.test.ts       # Database service tests
```

---

## Test Coverage

### Current Coverage (as of Sprint 14)

| Service | Coverage | Tests |
|---------|----------|-------|
| **import.service.ts** | 95%+ | 40+ |
| **storage.service.ts** | 90%+ | 16 |
| **db.service.ts** | 85%+ | 20+ |

### Coverage Goals

- **Target**: 80%+ overall coverage
- **Critical paths**: 100% coverage
- **Edge cases**: Comprehensive error handling tests

---

## Writing Tests

### Test File Naming

- Test files: `*.test.ts` or `*.test.tsx`
- Co-located with source: `service.ts` → `service.test.ts`

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myService } from './my.service';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('featureGroup', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = myService.process(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking

```typescript
// Mock entire module
vi.mock('./db.service', () => ({
  dbService: {
    createConversation: vi.fn(),
    addMessage: vi.fn(),
  },
}));

// Mock function
const mockFn = vi.fn().mockReturnValue('value');
const mockFn = vi.fn().mockResolvedValue('async value');

// Spy on existing function
const spy = vi.spyOn(object, 'method');
```

### Assertions

```typescript
// Values
expect(value).toBe(expected);
expect(value).toEqual(expected); // Deep equality
expect(value).toBeDefined();
expect(value).toBeNull();

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(3);
expect(fn).toHaveBeenCalledWith(arg1, arg2);

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');
```

---

## Mocking Strategies

### Global Mocks (in `setup.ts`)

- `crypto.randomUUID()` - UUID generation
- `indexedDB` - Browser storage API
- Console methods (optional)

### Service Mocks

**Database Mock** (`mocks/db.mock.ts`):
- In-memory database for testing
- Simplified SQL.js interface
- Helper methods for inspection

**Storage Service Mock**:
- Async IndexedDB operations
- Transaction simulation
- Request/response mocking

**Import Service Mock**:
- No external dependencies to mock
- Uses database service mock

---

## Test Fixtures

### Import Test Data (`fixtures/import-data.ts`)

**ChatGPT Exports**:
- `chatGPTExportSample` - Single conversation
- `chatGPTExportMultiple` - Multiple conversations
- Includes message tree structure

**Claude Exports**:
- `claudeExportSample` - Single conversation
- `claudeExportMultiple` - Multiple conversations
- Linear message array

**Error Cases**:
- `invalidJSON` - Malformed JSON
- `unknownFormat` - Unrecognized structure

---

## Common Issues & Solutions

### Issue: "Database not initialized"

**Cause**: Tests running before async initialization completes

**Solution**:
```typescript
beforeEach(async () => {
  await dbService.initialize();
});
```

### Issue: "Module not found" in tests

**Cause**: Path resolution differs in test environment

**Solution**: Use absolute imports or configure `tsconfig.json`

### Issue: Mock not working

**Cause**: Mock defined after import

**Solution**: Move `vi.mock()` to top of file

### Issue: Async tests timing out

**Cause**: Promise not awaited or resolved

**Solution**:
```typescript
it('should work', async () => {
  await asyncOperation();
  expect(...);
});
```

### Issue: Tests passing locally, failing in CI

**Cause**: Timing differences, environment differences

**Solution**:
- Add delays where needed
- Mock time with `vi.useFakeTimers()`
- Ensure deterministic test data

---

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order

### 2. Clear Test Names

```typescript
// ✅ Good
it('should import ChatGPT conversation with preserved timestamps', ...)

// ❌ Bad
it('works', ...)
```

### 3. Arrange-Act-Assert

```typescript
it('should calculate total', () => {
  // Arrange
  const items = [1, 2, 3];

  // Act
  const total = sum(items);

  // Assert
  expect(total).toBe(6);
});
```

### 4. Test Edge Cases

- Empty inputs
- Null/undefined
- Large datasets
- Invalid data
- Error conditions

### 5. Mock External Dependencies

- Database operations
- Network requests
- File system
- Browser APIs

### 6. Meaningful Assertions

```typescript
// ✅ Specific
expect(result).toHaveLength(3);
expect(result[0].id).toMatch(/^conv-/);

// ❌ Vague
expect(result).toBeDefined();
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --run
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Future Improvements

### Additional Test Coverage

- [ ] Component tests (React Testing Library)
- [ ] E2E tests (Playwright)
- [ ] Performance tests
- [ ] Accessibility tests

### Services to Test

- [ ] Governance service
- [ ] Anonymizer service
- [ ] RDI service
- [ ] Search service
- [ ] Embeddings service
- [ ] Preferences service

### Tools to Add

- [ ] Visual regression testing
- [ ] Mutation testing
- [ ] Load testing
- [ ] Security testing

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Vi Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Test Coverage Best Practices](https://testing.googleblog.com/)

---

## Contributing

When adding new tests:

1. **Write tests first** (TDD approach)
2. **Follow naming conventions** (`*.test.ts`)
3. **Update this README** if adding new patterns
4. **Ensure all tests pass** before committing
5. **Maintain coverage** above 80%

---

*Last Updated: Sprint 14 - Unit Testing Implementation*
