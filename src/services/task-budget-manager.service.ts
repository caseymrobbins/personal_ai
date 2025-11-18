/**
 * Task Budget Manager Service
 *
 * Manages CPU and memory budgets for autonomous task execution.
 * Ensures tasks don't monopolize system resources during cognitive cycles.
 *
 * Budget Model:
 * - Total CPU budget per cycle: 500ms
 * - Reserved (20%): 100ms for monitoring/overhead
 * - Available (80%): 400ms for task execution
 * - Per-task limit: 100ms maximum
 *
 * Prevents overallocation and ensures fair resource distribution.
 */

export interface BudgetAllocation {
  cycleId: string;
  totalBudget: number;        // milliseconds available for this cycle
  reservedBudget: number;     // 20% reserved for overhead
  availableBudget: number;    // 80% available for tasks
  taskBudgetLimit: number;    // maximum milliseconds per task
  startTime: number;
  endTime?: number;
}

export interface TaskCost {
  taskId: string;
  taskType: string;
  executionTime: number;      // milliseconds
  memoryPeakMB: number;       // peak memory used
  dbQueriesCount: number;     // database queries executed
  serviceCallsCount: number;  // service calls made
  success: boolean;
}

export interface BudgetStats {
  totalCycles: number;
  totalAllocated: number;
  totalUsed: number;
  averageUtilization: number; // percentage
  peakUtilization: number;    // percentage
  tasksExecutedTotal: number;
  tasksBudgetExceeded: number;
  memoryPeakTotal: number;
  dbQueriesTotal: number;
}

/**
 * TaskBudgetManagerService
 *
 * Allocates and tracks resource budgets for autonomous task cycles
 */
class TaskBudgetManagerService {
  private activeBudgets: Map<string, BudgetAllocation> = new Map();
  private taskCosts: Map<string, TaskCost[]> = new Map();
  private cycleStats: {
    totalCycles: number;
    totalAllocated: number;
    totalUsed: number;
    peakUtilization: number;
    tasksExecutedTotal: number;
    tasksBudgetExceeded: number;
    memoryPeakTotal: number;
    dbQueriesTotal: number;
  } = {
    totalCycles: 0,
    totalAllocated: 0,
    totalUsed: 0,
    peakUtilization: 0,
    tasksExecutedTotal: 0,
    tasksBudgetExceeded: 0,
    memoryPeakTotal: 0,
    dbQueriesTotal: 0,
  };

  private readonly TOTAL_BUDGET = 500;      // 500ms per cycle
  private readonly RESERVED_PERCENT = 0.20; // 20% reserved
  private readonly TASK_LIMIT = 100;        // 100ms max per task
  private readonly WARN_THRESHOLD = 0.70;   // Warn at 70% usage
  private readonly ABORT_THRESHOLD = 0.90;  // Abort at 90% usage

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[TaskBudgetManager] ✅ Service initialized');
  }

  /**
   * Allocate budget for a new cognitive cycle
   */
  allocateBudget(cycleId: string): BudgetAllocation {
    const reserved = this.TOTAL_BUDGET * this.RESERVED_PERCENT;
    const available = this.TOTAL_BUDGET - reserved;

    const allocation: BudgetAllocation = {
      cycleId,
      totalBudget: this.TOTAL_BUDGET,
      reservedBudget: reserved,
      availableBudget: available,
      taskBudgetLimit: this.TASK_LIMIT,
      startTime: Date.now(),
    };

    this.activeBudgets.set(cycleId, allocation);
    this.taskCosts.set(cycleId, []);
    this.cycleStats.totalCycles++;
    this.cycleStats.totalAllocated += this.TOTAL_BUDGET;

    console.log(`[TaskBudgetManager] 💰 Allocated budget for cycle ${cycleId}: ${available}ms available`);

    return allocation;
  }

  /**
   * Record the cost of a task execution
   */
  recordTaskCost(cycleId: string, cost: TaskCost): void {
    const costs = this.taskCosts.get(cycleId);
    if (!costs) {
      console.warn(`[TaskBudgetManager] Unknown cycle: ${cycleId}`);
      return;
    }

    costs.push(cost);
    this.cycleStats.totalUsed += cost.executionTime;
    this.cycleStats.tasksExecutedTotal++;
    this.cycleStats.memoryPeakTotal += cost.memoryPeakMB;
    this.cycleStats.dbQueriesTotal += cost.dbQueriesCount;

    if (cost.executionTime > this.TASK_LIMIT) {
      this.cycleStats.tasksBudgetExceeded++;
    }

    const utilization = this.getUtilizationPercent(cycleId);
    if (utilization > this.cycleStats.peakUtilization) {
      this.cycleStats.peakUtilization = utilization;
    }

    console.log(
      `[TaskBudgetManager] 📊 Task ${cost.taskType}: ${cost.executionTime}ms, Memory: ${cost.memoryPeakMB}MB, Queries: ${cost.dbQueriesCount}`,
      `(Cycle ${utilization.toFixed(0)}% utilized)`
    );
  }

  /**
   * Get remaining budget for a cycle
   */
  getRemainingBudget(cycleId: string): number {
    const budget = this.activeBudgets.get(cycleId);
    if (!budget) {
      console.warn(`[TaskBudgetManager] Unknown cycle: ${cycleId}`);
      return 0;
    }

    const costs = this.taskCosts.get(cycleId) || [];
    const totalUsed = costs.reduce((sum, cost) => sum + cost.executionTime, 0);
    const remaining = budget.availableBudget - totalUsed;

    return Math.max(0, remaining);
  }

  /**
   * Get utilization percentage (0-100)
   */
  getUtilizationPercent(cycleId: string): number {
    const budget = this.activeBudgets.get(cycleId);
    if (!budget) {
      return 0;
    }

    const remaining = this.getRemainingBudget(cycleId);
    const used = budget.availableBudget - remaining;
    const percent = (used / budget.availableBudget) * 100;

    return Math.min(100, percent);
  }

  /**
   * Check if we should continue executing tasks
   */
  shouldContinueExecuting(cycleId: string): boolean {
    const utilization = this.getUtilizationPercent(cycleId);

    if (utilization >= this.ABORT_THRESHOLD) {
      console.log(`[TaskBudgetManager] ⚠️ Budget exhausted (${utilization.toFixed(0)}%), aborting new tasks`);
      return false;
    }

    if (utilization >= this.WARN_THRESHOLD) {
      console.log(`[TaskBudgetManager] 🔶 Budget running low (${utilization.toFixed(0)}%), be selective`);
    }

    return true;
  }

  /**
   * Check if a task fits within budget (can be executed)
   */
  canFitTask(cycleId: string, estimatedDuration: number): boolean {
    const remaining = this.getRemainingBudget(cycleId);
    return estimatedDuration <= remaining;
  }

  /**
   * Get detailed budget stats for a cycle
   */
  getCycleStats(cycleId: string) {
    const budget = this.activeBudgets.get(cycleId);
    const costs = this.taskCosts.get(cycleId) || [];

    if (!budget) {
      return null;
    }

    const totalExecutionTime = costs.reduce((sum, cost) => sum + cost.executionTime, 0);
    const avgTaskTime = costs.length > 0 ? totalExecutionTime / costs.length : 0;
    const maxTaskTime = costs.length > 0 ? Math.max(...costs.map(c => c.executionTime)) : 0;
    const failedTasks = costs.filter(c => !c.success).length;

    return {
      cycleId,
      budgetAllocated: budget.availableBudget,
      budgetUsed: totalExecutionTime,
      budgetRemaining: this.getRemainingBudget(cycleId),
      utilizationPercent: this.getUtilizationPercent(cycleId),
      tasksExecuted: costs.length,
      tasksFailedCount: failedTasks,
      successRate: costs.length > 0 ? ((costs.length - failedTasks) / costs.length) * 100 : 0,
      avgTaskTime,
      maxTaskTime,
      memoryPeak: Math.max(...costs.map(c => c.memoryPeakMB), 0),
      totalQueries: costs.reduce((sum, cost) => sum + cost.dbQueriesCount, 0),
      totalServiceCalls: costs.reduce((sum, cost) => sum + cost.serviceCallsCount, 0),
    };
  }

  /**
   * Get overall statistics
   */
  getStats(): BudgetStats {
    const totalCycles = this.cycleStats.totalCycles;
    const avgUtilization = totalCycles > 0
      ? (this.cycleStats.totalUsed / this.cycleStats.totalAllocated) * 100
      : 0;

    return {
      totalCycles,
      totalAllocated: this.cycleStats.totalAllocated,
      totalUsed: this.cycleStats.totalUsed,
      averageUtilization: avgUtilization,
      peakUtilization: this.cycleStats.peakUtilization,
      tasksExecutedTotal: this.cycleStats.tasksExecutedTotal,
      tasksBudgetExceeded: this.cycleStats.tasksBudgetExceeded,
      memoryPeakTotal: this.cycleStats.memoryPeakTotal,
      dbQueriesTotal: this.cycleStats.dbQueriesTotal,
    };
  }

  /**
   * Close out a cycle and clean up
   */
  closeCycle(cycleId: string): void {
    const budget = this.activeBudgets.get(cycleId);
    if (budget) {
      budget.endTime = Date.now();
      const duration = budget.endTime - budget.startTime;
      console.log(`[TaskBudgetManager] ✅ Cycle ${cycleId} closed (${duration}ms total)`);
    }
    // Keep data for history, but mark as closed
  }

  /**
   * Clear old cycles to free memory
   */
  clearOldCycles(keepLastN: number = 10): void {
    const cycles = Array.from(this.activeBudgets.keys());
    const toDelete = cycles.slice(0, Math.max(0, cycles.length - keepLastN));

    for (const cycleId of toDelete) {
      this.activeBudgets.delete(cycleId);
      this.taskCosts.delete(cycleId);
    }

    if (toDelete.length > 0) {
      console.log(`[TaskBudgetManager] 🗑️ Cleared ${toDelete.length} old cycles`);
    }
  }

  /**
   * Reset all statistics (for testing)
   */
  reset(): void {
    this.activeBudgets.clear();
    this.taskCosts.clear();
    this.cycleStats = {
      totalCycles: 0,
      totalAllocated: 0,
      totalUsed: 0,
      peakUtilization: 0,
      tasksExecutedTotal: 0,
      tasksBudgetExceeded: 0,
      memoryPeakTotal: 0,
      dbQueriesTotal: 0,
    };
    console.log('[TaskBudgetManager] 🔄 Service reset');
  }
}

// Export singleton instance
export const taskBudgetManagerService = new TaskBudgetManagerService();
