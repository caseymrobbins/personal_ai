/**
 * Working Memory Service (Phase 1)
 *
 * Manages short-term working memory (scratchpad) for the cognitive loop.
 * This is the agent's "inner monologue" - reasoning, planning, and thoughts.
 *
 * Key characteristics:
 * - Short-lived (temporary reasoning buffers)
 * - Task-focused (one working memory per active task)
 * - Chain-of-thought tracking
 * - Temporal decay (older items fade)
 * - Consolidation trigger (→ LTM when complete)
 */

import { dbService } from './db.service';

export type MemoryItemType = 'reasoning' | 'plan' | 'observation' | 'decision' | 'insight';

export type MemoryItemStatus = 'active' | 'consolidating' | 'consolidated' | 'discarded';

export interface WorkingMemoryItem {
  id: string;
  taskId: string; // Which task this memory belongs to
  type: MemoryItemType;
  content: string;
  timestamp: number;
  status: MemoryItemStatus;
  confidence?: number; // 0.0-1.0 importance score
  relatedItems?: string[]; // Links to other memory items
  metadata?: Record<string, unknown>;
}

export interface WorkingMemoryTask {
  id: string;
  description: string;
  startTime: number;
  status: 'active' | 'completed' | 'abandoned';
  items: WorkingMemoryItem[];
  chainOfThought: string; // Summary of reasoning
  conclusions: string[];
}

export interface MemoryConsolidationResult {
  itemsConsolidated: number;
  insightsGenerated: string[];
  timestamp: number;
}

/**
 * WorkingMemoryService
 *
 * Manages the agent's temporary reasoning buffer
 */
class WorkingMemoryService {
  private tasks: Map<string, WorkingMemoryTask> = new Map();
  private maxTasksInMemory = 10; // Keep only recent tasks
  private itemDecayTimeMs = 15 * 60 * 1000; // 15 minutes decay
  private minConfidenceForConsolidation = 0.6;

  /**
   * Initialize working memory (create DB schema if needed)
   */
  async initialize(): Promise<void> {
    try {
      // Create tables for working memory storage
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS working_memory_tasks (
          id TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          status TEXT NOT NULL,
          chain_of_thought TEXT,
          conclusions TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      dbService.exec(`
        CREATE TABLE IF NOT EXISTS working_memory_items (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          status TEXT NOT NULL,
          confidence REAL,
          related_items TEXT,
          metadata TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES working_memory_tasks(id)
        )
      `);

      await dbService.save();

      console.log('[WorkingMemory] ✅ Service initialized');
    } catch (error) {
      console.error('[WorkingMemory] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new working memory task
   */
  createTask(taskId: string, description: string): WorkingMemoryTask {
    const task: WorkingMemoryTask = {
      id: taskId,
      description,
      startTime: Date.now(),
      status: 'active',
      items: [],
      chainOfThought: '',
      conclusions: [],
    };

    this.tasks.set(taskId, task);

    // Store in database
    dbService.exec(
      `INSERT INTO working_memory_tasks (id, description, start_time, status)
       VALUES ('${taskId}', '${description}', ${task.startTime}, '${task.status}')`
    );

    if (this.tasks.size > this.maxTasksInMemory) {
      // Remove oldest task
      const oldestId = Array.from(this.tasks.keys())[0];
      if (oldestId) {
        this.tasks.delete(oldestId);
      }
    }

    console.log(`[WorkingMemory] 📝 Task created: ${taskId}`);
    return task;
  }

  /**
   * Add an item to working memory
   */
  addMemoryItem(
    taskId: string,
    type: MemoryItemType,
    content: string,
    confidence?: number
  ): WorkingMemoryItem {
    const item: WorkingMemoryItem = {
      id: `mem-${taskId}-${Date.now()}`,
      taskId,
      type,
      content,
      timestamp: Date.now(),
      status: 'active',
      confidence,
    };

    // Add to in-memory task
    const task = this.tasks.get(taskId);
    if (task) {
      task.items.push(item);

      // Update chain of thought
      task.chainOfThought += `[${type}] ${content}\n`;
    }

    // Store in database
    dbService.exec(
      `INSERT INTO working_memory_items
       (id, task_id, type, content, timestamp, status, confidence)
       VALUES ('${item.id}', '${taskId}', '${type}', '${content}', ${item.timestamp}, '${item.status}', ${confidence || 'NULL'})`
    );

    console.log(
      `[WorkingMemory] 💭 Memory item added: ${type} (confidence: ${confidence || 'N/A'})`
    );
    return item;
  }

  /**
   * Add a decision/conclusion to a task
   */
  addConclusion(taskId: string, conclusion: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.conclusions.push(conclusion);

      // Update database
      const conclusions = JSON.stringify(task.conclusions);
      dbService.exec(
        `UPDATE working_memory_tasks SET conclusions = '${conclusions}' WHERE id = '${taskId}'`
      );

      console.log(`[WorkingMemory] ✅ Conclusion added: ${conclusion}`);
    }
  }

  /**
   * Get working memory task
   */
  getTask(taskId: string): WorkingMemoryTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all active tasks
   */
  getActiveTasks(): WorkingMemoryTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'active');
  }

  /**
   * Complete a task (mark for consolidation)
   */
  completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'completed';

      dbService.exec(
        `UPDATE working_memory_tasks SET status = 'completed' WHERE id = '${taskId}'`
      );

      // Mark items for consolidation
      task.items.forEach((item) => {
        if (item.confidence && item.confidence >= this.minConfidenceForConsolidation) {
          item.status = 'consolidating';
        }
      });

      console.log(`[WorkingMemory] ✅ Task completed: ${taskId}`);
    }
  }

  /**
   * Apply temporal decay to working memory
   * Items fade if not recently accessed
   */
  applyTemporalDecay(): void {
    const now = Date.now();
    let decayedCount = 0;

    this.tasks.forEach((task) => {
      task.items = task.items.filter((item) => {
        const age = now - item.timestamp;
        if (age > this.itemDecayTimeMs && item.status === 'active') {
          decayedCount++;
          return false; // Remove this item
        }
        return true;
      });
    });

    if (decayedCount > 0) {
      console.log(`[WorkingMemory] 🌫️ Temporal decay: ${decayedCount} items faded`);
    }
  }

  /**
   * Get candidates for consolidation to LTM
   */
  getConsolidationCandidates(): WorkingMemoryItem[] {
    const candidates: WorkingMemoryItem[] = [];

    this.tasks.forEach((task) => {
      if (task.status === 'completed') {
        const important = task.items.filter(
          (item) =>
            item.confidence !== undefined &&
            item.confidence >= this.minConfidenceForConsolidation
        );
        candidates.push(...important);
      }
    });

    return candidates;
  }

  /**
   * Clear a completed task
   */
  clearTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'completed') {
      this.tasks.delete(taskId);

      // Remove from database
      dbService.exec(
        `DELETE FROM working_memory_items WHERE task_id = '${taskId}'`
      );

      dbService.exec(
        `DELETE FROM working_memory_tasks WHERE id = '${taskId}'`
      );

      console.log(`[WorkingMemory] 🗑️ Task cleared: ${taskId}`);
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalTasks: number;
    activeTasks: number;
    totalItems: number;
    avgItemsPerTask: number;
  } {
    const totalTasks = this.tasks.size;
    const activeTasks = this.getActiveTasks().length;
    const totalItems = Array.from(this.tasks.values()).reduce(
      (sum, task) => sum + task.items.length,
      0
    );
    const avgItemsPerTask = totalTasks > 0 ? totalItems / totalTasks : 0;

    return {
      totalTasks,
      activeTasks,
      totalItems,
      avgItemsPerTask,
    };
  }

  /**
   * Clear all working memory (dangerous - use with caution)
   */
  clearAll(): void {
    this.tasks.clear();
    dbService.exec('DELETE FROM working_memory_items');
    dbService.exec('DELETE FROM working_memory_tasks');
    console.log('[WorkingMemory] ⚠️ All working memory cleared');
  }
}

// Export singleton instance
export const workingMemoryService = new WorkingMemoryService();
