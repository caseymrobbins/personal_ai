/**
 * Test Setup
 *
 * Global test configuration and polyfills
 */

import { vi } from 'vitest';

// Mock crypto.randomUUID for Node environment
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  } as Crypto;
}

// Mock IndexedDB
globalThis.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  databases: vi.fn(),
  cmp: vi.fn(),
} as any;

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
// };
