/**
 * Storage Service - IndexedDB persistence for SML Guardian
 *
 * Provides async, high-performance storage for SQLite database
 * Advantages over localStorage:
 * - Asynchronous API (non-blocking)
 * - Much larger storage limits (hundreds of MB)
 * - Native binary data support (no JSON serialization)
 * - Better performance for large datasets
 */

const DB_NAME = 'sml_guardian_storage';
const DB_VERSION = 1;
const STORE_NAME = 'database';
const DB_KEY = 'sqlite_db';

class StorageService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.db) {
      console.log('[Storage] Already initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Storage] ❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Storage] ✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          console.log('[Storage] Created object store');
        }
      };
    });
  }

  /**
   * Save SQLite database to IndexedDB
   * @param data Uint8Array of SQLite database
   */
  async saveDatabase(data: Uint8Array): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, DB_KEY);

      request.onsuccess = () => {
        console.log('[Storage] ✅ Database saved to IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('[Storage] ❌ Failed to save:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Load SQLite database from IndexedDB
   * @returns Uint8Array of SQLite database, or null if not found
   */
  async loadDatabase(): Promise<Uint8Array | null> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DB_KEY);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          console.log('[Storage] ✅ Database loaded from IndexedDB');
          resolve(data as Uint8Array);
        } else {
          console.log('[Storage] No saved database found');
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[Storage] ❌ Failed to load:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete database from IndexedDB
   */
  async clearDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(DB_KEY);

      request.onsuccess = () => {
        console.log('[Storage] ✅ Database cleared from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('[Storage] ❌ Failed to clear:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { usage: 0, quota: 0 };
  }

  /**
   * Migrate from localStorage to IndexedDB
   * This ensures we don't lose data from the old storage method
   */
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      const savedDb = localStorage.getItem('sml_guardian_db');

      if (savedDb) {
        console.log('[Storage] Migrating from localStorage to IndexedDB...');
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        await this.saveDatabase(uint8Array);

        // Clear localStorage after successful migration
        localStorage.removeItem('sml_guardian_db');
        console.log('[Storage] ✅ Migration complete, localStorage cleared');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Storage] ❌ Migration failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
