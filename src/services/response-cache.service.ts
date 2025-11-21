/**
 * Response Cache Service
 *
 * Implements intelligent caching for AI responses to improve performance:
 * - Cache similar queries using fuzzy matching
 * - Store responses in IndexedDB for persistence
 * - TTL-based cache expiration
 * - Cache statistics and hit rate tracking
 */

interface CacheEntry {
  id: string;
  queryHash: string;
  query: string;
  response: string;
  adapter: string;
  timestamp: number;
  hits: number;
  metadata?: {
    tokenCount?: number;
    responseTime?: number;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  totalEntries: number;
  hitRate: number;
  cacheSize: number;
}

class ResponseCacheService {
  private dbName = 'sml_guardian_cache';
  private storeName = 'responses';
  private db: IDBDatabase | null = null;
  private stats = {
    hits: 0,
    misses: 0
  };

  // Cache configuration
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of entries
  private readonly TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly SIMILARITY_THRESHOLD = 0.85; // 85% similarity for cache hit

  /**
   * Initialize the cache database
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[Cache] Initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('queryHash', 'queryHash', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('adapter', 'adapter', { unique: false });
        }
      };
    });
  }

  /**
   * Get cached response for a query
   */
  async get(query: string, adapter: string): Promise<string | null> {
    if (!this.db) await this.initialize();

    const queryHash = this.hashQuery(query);
    const normalizedQuery = this.normalizeQuery(query);

    try {
      // First, try exact hash match
      const exactMatch = await this.getByHash(queryHash);
      if (exactMatch && this.isValid(exactMatch)) {
        this.stats.hits++;
        await this.incrementHits(exactMatch.id);
        console.log('[Cache] ✓ Hit (exact):', query.substring(0, 50));
        return exactMatch.response;
      }

      // Try fuzzy matching for similar queries
      const similarMatch = await this.findSimilar(normalizedQuery, adapter);
      if (similarMatch && this.isValid(similarMatch)) {
        this.stats.hits++;
        await this.incrementHits(similarMatch.id);
        console.log('[Cache] ✓ Hit (similar):', query.substring(0, 50));
        return similarMatch.response;
      }

      this.stats.misses++;
      console.log('[Cache] ✗ Miss:', query.substring(0, 50));
      return null;
    } catch (error) {
      console.error('[Cache] Error getting cached response:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    query: string,
    response: string,
    adapter: string,
    metadata?: { tokenCount?: number; responseTime?: number }
  ): Promise<void> {
    if (!this.db) await this.initialize();

    const entry: CacheEntry = {
      id: `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queryHash: this.hashQuery(query),
      query: this.normalizeQuery(query),
      response,
      adapter,
      timestamp: Date.now(),
      hits: 0,
      metadata
    };

    try {
      // Check cache size and evict if necessary
      const size = await this.getCacheSize();
      if (size >= this.MAX_CACHE_SIZE) {
        await this.evictOldest();
      }

      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise((resolve, reject) => {
        const request = store.add(entry);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      console.log('[Cache] Stored:', query.substring(0, 50));
    } catch (error) {
      console.error('[Cache] Error storing response:', error);
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<number> {
    if (!this.db) await this.initialize();

    const cutoff = Date.now() - this.TTL;
    let deletedCount = 0;

    try {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);

      const request = index.openCursor(range);

      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(undefined);
          }
        };
        request.onerror = () => reject(request.error);
      });

      console.log(`[Cache] Cleared ${deletedCount} expired entries`);
      return deletedCount;
    } catch (error) {
      console.error('[Cache] Error clearing expired entries:', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      this.stats = { hits: 0, misses: 0 };
      console.log('[Cache] Cleared all entries');
    } catch (error) {
      console.error('[Cache] Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const totalEntries = await this.getCacheSize();
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalEntries,
      hitRate,
      cacheSize: await this.estimateCacheSize()
    };
  }

  // Helper methods

  private async getByHash(hash: string): Promise<CacheEntry | null> {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('queryHash');

      return new Promise((resolve, reject) => {
        const request = index.get(hash);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return null;
    }
  }

  private async findSimilar(query: string, adapter: string): Promise<CacheEntry | null> {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const adapterIndex = store.index('adapter');

      const entries: CacheEntry[] = await new Promise((resolve, reject) => {
        const request = adapterIndex.getAll(adapter);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Find most similar entry
      let bestMatch: CacheEntry | null = null;
      let bestSimilarity = 0;

      for (const entry of entries) {
        const similarity = this.calculateSimilarity(query, entry.query);
        if (similarity > bestSimilarity && similarity >= this.SIMILARITY_THRESHOLD) {
          bestSimilarity = similarity;
          bestMatch = entry;
        }
      }

      return bestMatch;
    } catch (error) {
      return null;
    }
  }

  private isValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.TTL;
  }

  private async incrementHits(id: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const entry = await new Promise<CacheEntry>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (entry) {
        entry.hits++;
        await new Promise((resolve, reject) => {
          const request = store.put(entry);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('[Cache] Error incrementing hits:', error);
    }
  }

  private async evictOldest(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');

      // Get oldest entry
      const request = index.openCursor();
      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            resolve(undefined);
          } else {
            resolve(undefined);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[Cache] Error evicting oldest entry:', error);
    }
  }

  private async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return 0;
    }
  }

  private async estimateCacheSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const entries: CacheEntry[] = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Estimate size in bytes
      let totalSize = 0;
      for (const entry of entries) {
        totalSize += JSON.stringify(entry).length;
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  private hashQuery(query: string): string {
    // Simple hash function for query
    const normalized = this.normalizeQuery(query);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private normalizeQuery(query: string): string {
    // Normalize query for comparison
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, ''); // Remove punctuation
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Singleton instance
export const responseCacheService = new ResponseCacheService();

// Auto-clear expired entries periodically (every hour)
if (typeof window !== 'undefined') {
  setInterval(() => {
    responseCacheService.clearExpired();
  }, 60 * 60 * 1000);
}
