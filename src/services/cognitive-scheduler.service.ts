/**
 * Cognitive Scheduler Service (Phase 1 - Task 5)
 *
 * Manages a priority queue of background tasks executed during cognitive wake cycles.
 * Coordinates memory consolidation, goal evaluation, and insight generation.
 *
 * Key responsibilities:
 * - Task queueing and prioritization
 * - Deadline-aware scheduling
 * - Resource balancing (CPU/memory constraints)
 * - Interrupt handling (pause if user needs responsiveness)
 * - Progress monitoring and failure recovery
 * - Cycle integration with CognitiveLoopService
 */

import { dbService } from './db.service';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskType =
  | 'memory_consolidation'
  | 'pattern_analysis'
  | 'insight_generation'
  | 'goal_evaluation'
  | 'entity_extraction'
  | 'kb_maintenance'
  | 'user_model_update'
  | 'custom';

export interface CognitiveTask {
  id: string;
  type: TaskType;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number;
  deadline?: number; // Milliseconds from epoch
  estimatedDurationMs: number;
  actualDurationMs?: number;
  executedCount: number;
  failureCount: number;
  lastFailureReason?: string;
  payload?: Record<string, unknown>; // Task-specific data
  parentGoalId?: string; // Link to goal if applicable
  dependencies?: string[]; // Task IDs that must complete first
  retryAttempts: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
}

export interface SchedulerStats {
  totalTasks: number;
  queuedTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  successRate: number;
  cyclesExecuted: number;
  lastCycleTime: number | null;
}

export interface SchedulerConfig {
  maxConcurrentTasks: number; // How many tasks can run in parallel
  maxTasksPerCycle: number; // Max tasks per wake cycle
  taskTimeout: number; // Milliseconds before task times out
  defaultMaxRetries: number;
  enableResourceBalancing: boolean;
  cpuThreshold: number; // % threshold before backing off
  memoryThreshold: number; // % threshold before backing off
  interruptSensitivity: 'low' | 'medium' | 'high'; // How responsive to user interrupts
}

/**
 * CognitiveSchedulerService
 *
 * Priority-based task scheduler for cognitive processing
 */
class CognitiveSchedulerService {
  private taskQueue: Map<string, CognitiveTask> = new Map();
  private runningTasks: Set<string> = new Set();
  private completedTasks: Set<string> = new Set();
  private failedTasks: Map<string, string> = new Map(); // taskId -> failure reason
  private cycleHistory: number[] = []; // Timestamps of completed cycles

  private config: SchedulerConfig = {
    maxConcurrentTasks: 3,
    maxTasksPerCycle: 5,
    taskTimeout: 30000, // 30 seconds
    defaultMaxRetries: 3,
    enableResourceBalancing: true,
    cpuThreshold: 80,
    memoryThreshold: 85,
    interruptSensitivity: 'high',
  };

  private isPaused = false;
  private isShuttingDown = false;

  /**
   * Initialize scheduler database
   */
  async initialize(): Promise<void> {
    try {
      // Create task queue table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS cognitive_tasks (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          priority TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          deadline INTEGER,
          estimated_duration_ms INTEGER NOT NULL,
          actual_duration_ms INTEGER,
          executed_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          last_failure_reason TEXT,
          payload TEXT,
          parent_goal_id TEXT,
          dependencies TEXT,
          retry_attempts INTEGER DEFAULT 0,
          max_retries INTEGER NOT NULL,
          metadata TEXT,
          created_timestamp INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create cycle history table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS scheduler_cycles (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          tasks_executed INTEGER NOT NULL,
          tasks_completed INTEGER NOT NULL,
          tasks_failed INTEGER NOT NULL,
          total_duration_ms INTEGER NOT NULL,
          resources_warning TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_status
        ON cognitive_tasks(status)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_priority
        ON cognitive_tasks(priority)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_deadline
        ON cognitive_tasks(deadline)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_created
        ON cognitive_tasks(created_at DESC)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_cycles_timestamp
        ON scheduler_cycles(timestamp DESC)
      `);

      await dbService.save();

      console.log('[CognitiveScheduler] ✅ Service initialized');
    } catch (error) {
      console.error('[CognitiveScheduler] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Add a task to the queue
   */
  addTask(
    type: TaskType,
    description: string,
    priority: TaskPriority = 'medium',
    options?: {
      deadline?: number;
      estimatedDurationMs?: number;
      payload?: Record<string, unknown>;
      parentGoalId?: string;
      dependencies?: string[];
      maxRetries?: number;
      metadata?: Record<string, unknown>;
    }
  ): CognitiveTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const task: CognitiveTask = {
      id,
      type,
      description,
      priority,
      status: 'queued',
      createdAt: Date.now(),
      deadline: options?.deadline,
      estimatedDurationMs: options?.estimatedDurationMs || 5000,
      executedCount: 0,
      failureCount: 0,
      payload: options?.payload,
      parentGoalId: options?.parentGoalId,
      dependencies: options?.dependencies,
      retryAttempts: 0,
      maxRetries: options?.maxRetries ?? this.config.defaultMaxRetries,
      metadata: options?.metadata,
    };

    this.taskQueue.set(id, task);

    // Store in database
    dbService.exec(
      `INSERT INTO cognitive_tasks
       (id, type, description, priority, status, created_at, deadline,
        estimated_duration_ms, payload, parent_goal_id, dependencies, max_retries, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.type,
        task.description,
        task.priority,
        task.status,
        task.createdAt,
        task.deadline || null,
        task.estimatedDurationMs,
        task.payload ? JSON.stringify(task.payload) : null,
        task.parentGoalId || null,
        task.dependencies ? JSON.stringify(task.dependencies) : null,
        task.maxRetries,
        task.metadata ? JSON.stringify(task.metadata) : null,
      ]
    );

    console.log(
      `[CognitiveScheduler] 📝 Task added: ${description} (${priority})`
    );
    return task;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): CognitiveTask | undefined {
    return this.taskQueue.get(taskId);
  }

  /**
   * Get all tasks with optional filtering
   */
  getTasks(status?: TaskStatus, priority?: TaskPriority): CognitiveTask[] {
    return Array.from(this.taskQueue.values()).filter((task) => {
      if (status && task.status !== status) return false;
      if (priority && task.priority !== priority) return false;
      return true;
    });
  }

  /**
   * Execute a cognitive cycle - processes queued tasks
   */
  async executeCycle(): Promise<{
    cycleId: string;
    tasksExecuted: number;
    tasksCompleted: number;
    tasksFailed: number;
    totalDuration: number;
    resourcesWarning?: string;
  }> {
    if (this.isPaused || this.isShuttingDown) {
      console.log('[CognitiveScheduler] ⏸️ Cycle skipped (paused or shutting down)');
      return {
        cycleId: '',
        tasksExecuted: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalDuration: 0,
      };
    }

    const cycleStartTime = Date.now();
    const cycleId = `cycle-${cycleStartTime}`;
    let tasksExecuted = 0;
    let tasksCompleted = 0;
    let tasksFailed = 0;
    let resourcesWarning: string | undefined;

    try {
      console.log('[CognitiveScheduler] 🔄 Starting cycle:', cycleId);

      // Check resource availability
      if (this.config.enableResourceBalancing) {
        const resourceStatus = this.checkResources();
        if (!resourceStatus.ok) {
          resourcesWarning = `Resource warning: ${resourceStatus.reason}`;
          console.warn('[CognitiveScheduler] ⚠️', resourcesWarning);
          // In high interrupt sensitivity, skip cycle
          if (this.config.interruptSensitivity === 'high') {
            return {
              cycleId,
              tasksExecuted: 0,
              tasksCompleted: 0,
              tasksFailed: 0,
              totalDuration: Date.now() - cycleStartTime,
              resourcesWarning,
            };
          }
        }
      }

      // Get ready tasks (respecting dependencies and deadlines)
      const readyTasks = this.getReadyTasks(this.config.maxTasksPerCycle);

      // Execute tasks
      for (const task of readyTasks) {
        if (
          this.runningTasks.size >= this.config.maxConcurrentTasks ||
          tasksExecuted >= this.config.maxTasksPerCycle
        ) {
          break;
        }

        try {
          tasksExecuted++;
          await this.executeTask(task);
          tasksCompleted++;
        } catch (error) {
          tasksFailed++;
          this.handleTaskFailure(
            task,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Record cycle
      const cycleDuration = Date.now() - cycleStartTime;
      this.recordCycle(
        cycleId,
        tasksExecuted,
        tasksCompleted,
        tasksFailed,
        cycleDuration,
        resourcesWarning
      );

      this.cycleHistory.push(cycleStartTime);

      console.log(
        `[CognitiveScheduler] ✅ Cycle complete: ${tasksCompleted}/${tasksExecuted} tasks completed (${cycleDuration}ms)`
      );

      return {
        cycleId,
        tasksExecuted,
        tasksCompleted,
        tasksFailed,
        totalDuration: cycleDuration,
        resourcesWarning,
      };
    } catch (error) {
      console.error('[CognitiveScheduler] ❌ Cycle execution error:', error);
      throw error;
    }
  }

  /**
   * Get tasks that are ready to execute
   */
  private getReadyTasks(limit: number): CognitiveTask[] {
    const readyTasks: CognitiveTask[] = [];
    const now = Date.now();

    // Get queued tasks, sorted by priority
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const queuedTasks = Array.from(this.taskQueue.values())
      .filter(
        (task) =>
          task.status === 'queued' &&
          this.areDependenciesMet(task) &&
          (!task.deadline || task.deadline > now)
      )
      .sort((a, b) => {
        // Sort by priority first
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by deadline if present
        if (a.deadline && b.deadline) {
          return a.deadline - b.deadline;
        }

        // Then by creation time
        return a.createdAt - b.createdAt;
      })
      .slice(0, limit);

    return queuedTasks;
  }

  /**
   * Check if task dependencies are satisfied
   */
  private areDependenciesMet(task: CognitiveTask): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every((depId) => {
      const depTask = this.taskQueue.get(depId);
      return depTask && depTask.status === 'completed';
    });
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: CognitiveTask): Promise<void> {
    const startTime = Date.now();
    task.status = 'running';
    task.executedCount++;
    this.runningTasks.add(task.id);

    try {
      // Update database
      dbService.exec(
        `UPDATE cognitive_tasks SET status = ?, executed_count = ? WHERE id = ?`,
        ['running', task.executedCount, task.id]
      );

      console.log(`[CognitiveScheduler] ▶️ Executing: ${task.description}`);

      // Execute task with timeout
      await Promise.race([
        this.performTask(task),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Task timeout')),
            this.config.taskTimeout
          )
        ),
      ]);

      // Mark complete
      task.status = 'completed';
      task.actualDurationMs = Date.now() - startTime;
      this.completedTasks.add(task.id);
      this.runningTasks.delete(task.id);

      dbService.exec(
        `UPDATE cognitive_tasks
         SET status = ?, actual_duration_ms = ? WHERE id = ?`,
        ['completed', task.actualDurationMs, task.id]
      );

      console.log(
        `[CognitiveScheduler] ✅ Task completed: ${task.description} (${task.actualDurationMs}ms)`
      );
    } catch (error) {
      task.status = 'failed';
      task.failureCount++;
      task.lastFailureReason = error instanceof Error ? error.message : String(error);
      this.runningTasks.delete(task.id);

      dbService.exec(
        `UPDATE cognitive_tasks
         SET status = ?, failure_count = ?, last_failure_reason = ? WHERE id = ?`,
        ['failed', task.failureCount, task.lastFailureReason, task.id]
      );

      throw error;
    }
  }

  /**
   * Perform the actual task work
   * This would be extended with real task handlers
   */
  private async performTask(task: CognitiveTask): Promise<void> {
    // Simulate task execution - in production, route to actual handlers
    switch (task.type) {
      case 'memory_consolidation':
        // Call longTermMemoryService.consolidateMemories()
        break;
      case 'pattern_analysis':
        // Analyze working memory for patterns
        break;
      case 'insight_generation':
        // Generate insights from memories
        break;
      case 'goal_evaluation':
        // Evaluate progress toward goals
        break;
      case 'entity_extraction':
        // Extract entities from conversations
        break;
      case 'kb_maintenance':
        // Clean up knowledge base
        break;
      case 'user_model_update':
        // Update user profile
        break;
      case 'custom':
        // Execute custom payload
        break;
    }

    // Simulate work
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(task.estimatedDurationMs, 100))
    );
  }

  /**
   * Handle task failure with retry logic
   */
  private handleTaskFailure(task: CognitiveTask, reason: string): void {
    task.lastFailureReason = reason;

    if (task.retryAttempts < task.maxRetries) {
      task.retryAttempts++;
      task.status = 'queued'; // Re-queue for retry
      console.log(
        `[CognitiveScheduler] 🔄 Retrying task: ${task.id} (attempt ${task.retryAttempts}/${task.maxRetries})`
      );
    } else {
      task.status = 'failed';
      this.failedTasks.set(task.id, reason);
      console.error(
        `[CognitiveScheduler] ❌ Task failed permanently: ${task.description}`
      );
    }

    dbService.exec(
      `UPDATE cognitive_tasks
       SET status = ?, retry_attempts = ?, last_failure_reason = ? WHERE id = ?`,
      [task.status, task.retryAttempts, reason, task.id]
    );
  }

  /**
   * Check system resources
   */
  private checkResources(): { ok: boolean; reason?: string } {
    // In production, would check actual CPU/memory
    // For now, simulate resource checks
    const cpuUsage = Math.random() * 100;
    const memUsage = Math.random() * 100;

    if (cpuUsage > this.config.cpuThreshold) {
      return { ok: false, reason: `CPU usage high: ${cpuUsage.toFixed(1)}%` };
    }

    if (memUsage > this.config.memoryThreshold) {
      return { ok: false, reason: `Memory usage high: ${memUsage.toFixed(1)}%` };
    }

    return { ok: true };
  }

  /**
   * Record cycle execution
   */
  private recordCycle(
    cycleId: string,
    tasksExecuted: number,
    tasksCompleted: number,
    tasksFailed: number,
    duration: number,
    resourcesWarning?: string
  ): void {
    dbService.exec(
      `INSERT INTO scheduler_cycles
       (id, timestamp, tasks_executed, tasks_completed, tasks_failed, total_duration_ms, resources_warning)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cycleId,
        Date.now(),
        tasksExecuted,
        tasksCompleted,
        tasksFailed,
        duration,
        resourcesWarning || null,
      ]
    );
  }

  /**
   * Pause task execution
   */
  pause(): void {
    this.isPaused = true;
    console.log('[CognitiveScheduler] ⏸️ Scheduler paused');
  }

  /**
   * Resume task execution
   */
  resume(): void {
    this.isPaused = false;
    console.log('[CognitiveScheduler] ▶️ Scheduler resumed');
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.taskQueue.get(taskId);
    if (task && (task.status === 'queued' || task.status === 'paused')) {
      task.status = 'cancelled';
      dbService.exec(`UPDATE cognitive_tasks SET status = ? WHERE id = ?`, [
        'cancelled',
        taskId,
      ]);
      console.log(`[CognitiveScheduler] ❌ Task cancelled: ${taskId}`);
      return true;
    }
    return false;
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(updates: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[CognitiveScheduler] ⚙️ Configuration updated');
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    const queuedTasks = this.getTasks('queued');
    const runningTasks = this.getTasks('running');
    const completedTasks = this.getTasks('completed');
    const failedTasks = this.getTasks('failed');

    const allExecutedTasks = [...completedTasks, ...failedTasks];
    const totalDuration = allExecutedTasks.reduce(
      (sum, task) => sum + (task.actualDurationMs || 0),
      0
    );
    const avgDuration =
      allExecutedTasks.length > 0
        ? totalDuration / allExecutedTasks.length
        : 0;
    const successRate =
      allExecutedTasks.length > 0
        ? (completedTasks.length / allExecutedTasks.length) * 100
        : 0;

    return {
      totalTasks: this.taskQueue.size,
      queuedTasks: queuedTasks.length,
      runningTasks: runningTasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      averageTaskDuration: avgDuration,
      successRate,
      cyclesExecuted: this.cycleHistory.length,
      lastCycleTime:
        this.cycleHistory.length > 0
          ? this.cycleHistory[this.cycleHistory.length - 1]
          : null,
    };
  }

  /**
   * Get cycle history
   */
  getCycleHistory(limit: number = 20): number[] {
    return this.cycleHistory.slice(-limit);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    console.log('[CognitiveScheduler] 🛑 Initiating graceful shutdown...');

    // Wait for running tasks to complete (with timeout)
    const shutdownTimeout = 10000; // 10 seconds
    const shutdownStart = Date.now();

    while (
      this.runningTasks.size > 0 &&
      Date.now() - shutdownStart < shutdownTimeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.runningTasks.size > 0) {
      console.warn(
        `[CognitiveScheduler] ⚠️ ${this.runningTasks.size} tasks still running, forcing shutdown`
      );
    }

    console.log('[CognitiveScheduler] ✅ Graceful shutdown complete');
  }

  /**
   * Clear all tasks (dangerous)
   */
  clearAll(): void {
    this.taskQueue.clear();
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();
    dbService.exec('DELETE FROM cognitive_tasks');
    dbService.exec('DELETE FROM scheduler_cycles');
    console.log('[CognitiveScheduler] ⚠️ All tasks cleared');
  }
}

// Export singleton instance
export const cognitiveSchedulerService = new CognitiveSchedulerService();
