/**
 * Long-Term Memory Service (Phase 1)
 *
 * Manages persistent episodic memories consolidated from working memory.
 * Uses vector embeddings for semantic retrieval and temporal organization.
 *
 * Memory types:
 * - Episodic: "Had conversation about PyTorch on Nov 18"
 * - Contextual: Links between related memories
 * - Temporal: Organized by time
 */

import { dbService } from './db.service';
import { embeddingsService } from './embeddings.service';
import { WorkingMemoryItem } from './working-memory.service';

export interface EpisodicMemory {
  id: string;
  content: string;
  embedding?: Float32Array; // Vector representation
  timestamp: number;
  confidence: number; // 0.0-1.0 importance
  sourceTaskId: string; // Where it came from
  relatedMemories: string[]; // Links to other memories
  retrievalCount: number; // How often recalled
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  similarity: number; // 0.0-1.0 relevance to query
  timestamp: number;
  confidence: number;
}

/**
 * LongTermMemoryService
 *
 * Persists important memories and enables semantic retrieval
 */
class LongTermMemoryService {
  private memoryCache: Map<string, EpisodicMemory> = new Map();
  private readonly minConfidenceForStorage = 0.5;
  private readonly _maxCacheSize = 1000;

  /**
   * Initialize long-term memory database
   */
  async initialize(): Promise<void> {
    try {
      // Create tables for episodic memory
      void dbService.exec(`
        CREATE TABLE IF NOT EXISTS episodic_memory (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          embedding BLOB,
          timestamp INTEGER NOT NULL,
          confidence REAL NOT NULL,
          source_task_id TEXT,
          related_memories TEXT,
          retrieval_count INTEGER DEFAULT 0,
          metadata TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index for temporal queries
      void dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_episodic_timestamp
        ON episodic_memory(timestamp DESC)
      `);

      // Create index for confidence queries
      void dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_episodic_confidence
        ON episodic_memory(confidence DESC)
      `);

      await dbService.save();

      console.log('[LongTermMemory] ✅ Service initialized');
    } catch (error) {
      console.error('[LongTermMemory] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Consolidate working memory item to long-term memory
   */
  async consolidateMemory(item: WorkingMemoryItem): Promise<EpisodicMemory> {
    try {
      // Generate embedding for semantic retrieval
      let embedding: Float32Array | undefined;
      try {
        embedding = await embeddingsService.embed(item.content);
      } catch (error) {
        console.warn('[LongTermMemory] Could not generate embedding:', error);
      }

      const memory: EpisodicMemory = {
        id: `ltm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: item.content,
        embedding,
        timestamp: item.timestamp,
        confidence: item.confidence || 0.7,
        sourceTaskId: item.taskId,
        relatedMemories: item.relatedItems || [],
        retrievalCount: 0,
        metadata: item.metadata,
      };

      // Store in memory cache
      this.memoryCache.set(memory.id, memory);

      // Store in database
      const embeddingData = embedding
        ? embeddingsService.serializeEmbedding(embedding)
        : null;

      void dbService.exec(
        `INSERT INTO episodic_memory
         (id, content, embedding, timestamp, confidence, source_task_id, related_memories)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          memory.id,
          memory.content,
          embeddingData,
          memory.timestamp,
          memory.confidence,
          memory.sourceTaskId,
          JSON.stringify(memory.relatedMemories),
        ]
      );

      await dbService.save();

      console.log(
        `[LongTermMemory] 💾 Memory consolidated: "${memory.content.substring(0, 50)}..."`
      );

      return memory;
    } catch (error) {
      console.error('[LongTermMemory] ❌ Consolidation failed:', error);
      throw error;
    }
  }

  /**
   * Consolidate multiple items at once
   */
  async consolidateMemories(items: WorkingMemoryItem[]): Promise<EpisodicMemory[]> {
    const consolidated: EpisodicMemory[] = [];

    for (const item of items) {
      if (item.confidence && item.confidence >= this.minConfidenceForStorage) {
        try {
          const memory = await this.consolidateMemory(item);
          consolidated.push(memory);
        } catch (error) {
          console.error(`Failed to consolidate memory ${item.id}:`, error);
        }
      }
    }

    console.log(`[LongTermMemory] ✅ Consolidated ${consolidated.length} memories`);
    return consolidated;
  }

  /**
   * Search memories by semantic similarity
   */
  async searchMemories(
    query: string,
    limit: number = 10,
    minSimilarity: number = 0.3
  ): Promise<MemorySearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingsService.embed(query);

      // Get all memories from cache and database
      const memories = await this.getAllMemories();

      // Calculate similarities
      const results: MemorySearchResult[] = [];

      for (const memory of memories) {
        if (!memory.embedding) continue;

        const similarity = embeddingsService.cosineSimilarity(
          queryEmbedding,
          memory.embedding
        );

        if (similarity >= minSimilarity) {
          results.push({
            id: memory.id,
            content: memory.content,
            similarity,
            timestamp: memory.timestamp,
            confidence: memory.confidence,
          });
        }
      }

      // Sort by similarity and limit
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (error) {
      console.error('[LongTermMemory] ❌ Search failed:', error);
      return [];
    }
  }

  /**
   * Get memories by time range
   */
  async getMemoriesByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<EpisodicMemory[]> {
    try {
      const rows = dbService.query<{
        id: string;
        content: string;
        embedding: Uint8Array | null;
        timestamp: number;
        confidence: number;
        source_task_id: string;
        related_memories: string;
      }>(
        `SELECT id, content, embedding, timestamp, confidence, source_task_id, related_memories
         FROM episodic_memory
         WHERE timestamp BETWEEN ? AND ?
         ORDER BY timestamp DESC`,
        [startTime, endTime]
      );

      return rows.map((row) => ({
        id: row.id,
        content: row.content,
        embedding: row.embedding
          ? embeddingsService.deserializeEmbedding(row.embedding)
          : undefined,
        timestamp: row.timestamp,
        confidence: row.confidence,
        sourceTaskId: row.source_task_id,
        relatedMemories: JSON.parse(row.related_memories || '[]'),
        retrievalCount: 0,
      }));
    } catch (error) {
      console.error('[LongTermMemory] ❌ Time range query failed:', error);
      return [];
    }
  }

  /**
   * Get recent memories
   */
  async getRecentMemories(_limit: number = 20): Promise<EpisodicMemory[]> {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    return this.getMemoriesByTimeRange(oneDayAgo, now);
  }

  /**
   * Get high-confidence memories (important events)
   */
  async getHighConfidenceMemories(
    minConfidence: number = 0.8,
    limit: number = 20
  ): Promise<EpisodicMemory[]> {
    try {
      const rows = dbService.query<{
        id: string;
        content: string;
        embedding: Uint8Array | null;
        timestamp: number;
        confidence: number;
        source_task_id: string;
        related_memories: string;
      }>(
        `SELECT id, content, embedding, timestamp, confidence, source_task_id, related_memories
         FROM episodic_memory
         WHERE confidence >= ?
         ORDER BY confidence DESC, timestamp DESC
         LIMIT ?`,
        [minConfidence, limit]
      );

      return rows.map((row) => ({
        id: row.id,
        content: row.content,
        embedding: row.embedding
          ? embeddingsService.deserializeEmbedding(row.embedding)
          : undefined,
        timestamp: row.timestamp,
        confidence: row.confidence,
        sourceTaskId: row.source_task_id,
        relatedMemories: JSON.parse(row.related_memories || '[]'),
        retrievalCount: 0,
      }));
    } catch (error) {
      console.error('[LongTermMemory] ❌ Query failed:', error);
      return [];
    }
  }

  /**
   * Get all memories (expensive - use carefully)
   */
  private async getAllMemories(): Promise<EpisodicMemory[]> {
    try {
      const rows = dbService.query<{
        id: string;
        content: string;
        embedding: Uint8Array | null;
        timestamp: number;
        confidence: number;
        source_task_id: string;
        related_memories: string;
      }>(
        `SELECT id, content, embedding, timestamp, confidence, source_task_id, related_memories
         FROM episodic_memory
         ORDER BY timestamp DESC`
      );

      return rows.map((row) => ({
        id: row.id,
        content: row.content,
        embedding: row.embedding
          ? embeddingsService.deserializeEmbedding(row.embedding)
          : undefined,
        timestamp: row.timestamp,
        confidence: row.confidence,
        sourceTaskId: row.source_task_id,
        relatedMemories: JSON.parse(row.related_memories || '[]'),
        retrievalCount: 0,
      }));
    } catch (error) {
      console.error('[LongTermMemory] ❌ Query failed:', error);
      return [];
    }
  }

  /**
   * Record memory retrieval (for popularity tracking)
   */
  recordRetrieval(memoryId: string): void {
    const memory = this.memoryCache.get(memoryId);
    if (memory) {
      memory.retrievalCount += 1;

      // Update in database
      void dbService.exec(
        `UPDATE episodic_memory SET retrieval_count = retrieval_count + 1 WHERE id = ?`,
        [memoryId]
      );
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalMemories: number;
    avgConfidence: number;
    oldestMemory: number | null;
    newestMemory: number | null;
    cacheSize: number;
  } {
    const memories = Array.from(this.memoryCache.values());
    const timestamps = memories.map((m) => m.timestamp);

    return {
      totalMemories: memories.length,
      avgConfidence:
        memories.length > 0
          ? memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length
          : 0,
      oldestMemory: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestMemory: timestamps.length > 0 ? Math.max(...timestamps) : null,
      cacheSize: this.memoryCache.size,
    };
  }

  /**
   * Clear memories older than specified time
   */
  clearOldMemories(ageMs: number): number {
    const cutoffTime = Date.now() - ageMs;
    let deletedCount = 0;

    // Note: In production, would also delete from database
    this.memoryCache.forEach((memory, id) => {
      if (memory.timestamp < cutoffTime) {
        this.memoryCache.delete(id);
        deletedCount++;
      }
    });

    console.log(`[LongTermMemory] 🗑️ Cleared ${deletedCount} old memories`);
    return deletedCount;
  }
}

// Export singleton instance
export const longTermMemoryService = new LongTermMemoryService();
