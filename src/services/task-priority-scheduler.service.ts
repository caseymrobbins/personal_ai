/**
 * Task Priority Scheduler Service
 *
 * Scores, prioritizes, and sequences autonomous tasks for optimal impact
 * and execution.
 *
 * Scoring Formula:
 * PRIORITY_SCORE = (
 *   (impact * 0.40) +
 *   (urgency * 0.35) +
 *   (dependencies_met * 0.15) +
 *   (success_rate * 0.10)
 * ) * (1 - risk_factor)
 *
 * Factors in task dependencies, success history, and resource constraints.
 */

export interface AutonomousTask {
  taskId: string;
  taskType: string;
  payload?: Record<string, unknown>;
  dependsOn?: string[];
}

export interface ScoredTask {
  taskId: string;
  taskType: string;
  score: number;              // 0.0-1.0
  impact: number;             // 0.0-1.0
  urgency: number;            // 0.0-1.0
  dependenciesMet: boolean;
  riskScore: number;          // 0.0-1.0
  successRate: number;        // 0.0-1.0
  payload?: Record<string, unknown>;
  dependsOn?: string[];
  reason: string;             // Why this score?
}

export interface TaskQueue {
  cycleId: string;
  tasks: ScoredTask[];
  estimatedTotalTime: number; // milliseconds
  tasksSkipped: string[];     // Task IDs skipped
  riskSummary: string;
}

export interface TaskStats {
  totalTasksScored: number;
  avgScore: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  taskTypeScores: Record<string, { score: number; successRate: number }>;
  dependencyIssues: number;
}

interface TaskTypeConfig {
  impact: number;             // How much does this advance goals?
  defaultDuration: number;    // Estimated milliseconds
  hasMutations: boolean;      // Does it modify data?
}

interface TaskContext {
  activeGoalCount: number;
  stalledGoalCount: number;
  budgetAvailable: number;
  riskAssessments: Map<string, any>;
}

/**
 * TaskPrioritySchedulerService
 *
 * Prioritizes and sequences autonomous tasks for execution
 */
class TaskPrioritySchedulerService {
  private taskTypeConfigs: Map<string, TaskTypeConfig> = new Map([
    ['memory_consolidation', { impact: 0.5, defaultDuration: 50, hasMutations: true }],
    ['pattern_analysis', { impact: 0.6, defaultDuration: 60, hasMutations: false }],
    ['entity_extraction', { impact: 0.7, defaultDuration: 40, hasMutations: true }],
    ['goal_research', { impact: 0.9, defaultDuration: 80, hasMutations: false }],
    ['goal_analysis', { impact: 0.9, defaultDuration: 70, hasMutations: true }],
    ['kb_maintenance', { impact: 0.4, defaultDuration: 50, hasMutations: true }],
    ['user_model_update', { impact: 0.8, defaultDuration: 40, hasMutations: true }],
  ]);

  private successRates: Map<string, number> = new Map();
  private taskScoreHistory: ScoredTask[] = [];
  private stats = {
    totalScored: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    dependencyIssues: 0,
  };

  // Weights in priority formula
  private readonly WEIGHTS = {
    impact: 0.40,
    urgency: 0.35,
    dependenciesMet: 0.15,
    successRate: 0.10,
  };

  // Priority thresholds
  private readonly PRIORITY_THRESHOLDS = {
    high: 0.7,
    medium: 0.4,
    low: 0.0,
  };

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[TaskPriorityScheduler] ✅ Service initialized');
  }

  /**
   * Score a list of task candidates
   */
  scoreTasks(
    candidates: AutonomousTask[],
    context: TaskContext
  ): ScoredTask[] {
    const scored: ScoredTask[] = [];

    for (const task of candidates) {
      const scored_task = this.scoreTask(task, context);
      scored.push(scored_task);
      this.taskScoreHistory.push(scored_task);
    }

    // Keep history trimmed
    if (this.taskScoreHistory.length > 100) {
      this.taskScoreHistory = this.taskScoreHistory.slice(-100);
    }

    this.stats.totalScored += scored.length;

    console.log(`[TaskPriorityScheduler] 📊 Scored ${scored.length} tasks`);

    return scored;
  }

  /**
   * Score a single task
   */
  private scoreTask(task: AutonomousTask, context: TaskContext): ScoredTask {
    // Get impact score for this task type
    const impact = this.getImpactScore(task.taskType, context);

    // Get urgency score
    const urgency = this.getUrgencyScore(task.taskType, context);

    // Check if dependencies are met
    const dependenciesMet = this.checkDependencies(task, context);

    // Get success rate
    const successRate = this.getSuccessRate(task.taskType);

    // Get risk score
    const riskAssessment = context.riskAssessments.get(task.taskType);
    const riskScore = riskAssessment?.riskScore || 0.2;

    // Calculate composite score
    const baseScore =
      (impact * this.WEIGHTS.impact) +
      (urgency * this.WEIGHTS.urgency) +
      (dependenciesMet ? 1.0 : 0.0) * this.WEIGHTS.dependenciesMet +
      (successRate * this.WEIGHTS.successRate);

    // Apply risk discount
    const score = Math.min(1.0, Math.max(0.0, baseScore * (1 - riskScore * 0.5)));

    // Generate reason
    const reason = this.generateScoreReason(task.taskType, impact, urgency, dependenciesMet, riskScore);

    return {
      taskId: task.taskId,
      taskType: task.taskType,
      score,
      impact,
      urgency,
      dependenciesMet,
      riskScore,
      successRate,
      payload: task.payload,
      dependsOn: task.dependsOn,
      reason,
    };
  }

  /**
   * Get impact score for a task type
   */
  private getImpactScore(taskType: string, context: TaskContext): number {
    const config = this.taskTypeConfigs.get(taskType);
    if (!config) return 0.5;

    let score = config.impact;

    // Boost goal-related tasks if we have stalled goals
    if ((taskType === 'goal_research' || taskType === 'goal_analysis') && context.stalledGoalCount > 0) {
      score = Math.min(1.0, score + 0.2);
    }

    // Reduce maintenance tasks if budget is tight
    if ((taskType === 'kb_maintenance' || taskType === 'memory_consolidation') && context.budgetAvailable < 150) {
      score = Math.max(0.1, score - 0.2);
    }

    return score;
  }

  /**
   * Get urgency score for a task type
   */
  private getUrgencyScore(taskType: string, context: TaskContext): number {
    // Goal-related tasks are more urgent with stalled goals
    if (taskType === 'goal_research' || taskType === 'goal_analysis') {
      if (context.stalledGoalCount > 0) {
        return 0.9; // Critical urgency
      }
      if (context.activeGoalCount > 0) {
        return 0.6; // Normal urgency
      }
      return 0.3; // Low urgency if no goals
    }

    // Pattern analysis and extraction are moderately urgent
    if (['pattern_analysis', 'entity_extraction'].includes(taskType)) {
      return 0.5;
    }

    // Maintenance tasks are less urgent
    if (['kb_maintenance', 'memory_consolidation'].includes(taskType)) {
      return 0.3;
    }

    // User model updates are moderately important
    if (taskType === 'user_model_update') {
      return 0.6;
    }

    return 0.4;
  }

  /**
   * Check if task dependencies are met
   */
  private checkDependencies(task: AutonomousTask, context: TaskContext): boolean {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return true;
    }

    // In a real system, check if dependencies were executed
    // For now, assume dependencies are met if specified
    return true;
  }

  /**
   * Get success rate for a task type
   */
  private getSuccessRate(taskType: string): number {
    const rate = this.successRates.get(taskType);

    if (rate === undefined) {
      // Initialize new task types with moderate confidence
      return 0.7;
    }

    return rate;
  }

  /**
   * Update success rate for a task type
   */
  updateSuccessRate(taskType: string, success: boolean, historicalRate?: number): void {
    if (historicalRate !== undefined) {
      // Use provided historical rate
      this.successRates.set(taskType, historicalRate);
      return;
    }

    const current = this.successRates.get(taskType) || 0.7;
    const updated = current * 0.9 + (success ? 1.0 : 0.0) * 0.1;
    this.successRates.set(taskType, updated);

    console.log(`[TaskPriorityScheduler] 📈 Updated success rate for ${taskType}: ${updated.toFixed(2)}`);
  }

  /**
   * Generate human-readable score reason
   */
  private generateScoreReason(
    taskType: string,
    impact: number,
    urgency: number,
    dependenciesMet: boolean,
    riskScore: number
  ): string {
    const reasons: string[] = [];

    if (impact > 0.8) {
      reasons.push('high impact on goals');
    } else if (impact < 0.4) {
      reasons.push('low impact');
    }

    if (urgency > 0.8) {
      reasons.push('critical urgency');
    } else if (urgency > 0.5) {
      reasons.push('moderately urgent');
    }

    if (!dependenciesMet) {
      reasons.push('dependencies not met');
    }

    if (riskScore > 0.5) {
      reasons.push('elevated risk');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'standard execution';
  }

  /**
   * Build execution queue from scored tasks within budget
   */
  buildExecutionQueue(
    scored: ScoredTask[],
    budgetMs: number
  ): TaskQueue {
    const cycleId = `queue-${Date.now()}`;

    // Sort by score (descending)
    const sorted = [...scored].sort((a, b) => b.score - a.score);

    const queue: ScoredTask[] = [];
    let totalTime = 0;
    const skipped: string[] = [];
    let highRiskCount = 0;

    for (const task of sorted) {
      const config = this.taskTypeConfigs.get(task.taskType);
      const estimatedTime = config?.defaultDuration || 50;

      // Check if task fits in budget
      if (totalTime + estimatedTime > budgetMs) {
        skipped.push(task.taskId);
        continue;
      }

      // Check if risk is too high
      if (task.riskScore > 0.7) {
        console.log(`[TaskPriorityScheduler] ⚠️ Skipping ${task.taskType} due to high risk (${task.riskScore.toFixed(2)})`);
        skipped.push(task.taskId);
        highRiskCount++;
        continue;
      }

      queue.push(task);
      totalTime += estimatedTime;

      // Count priority levels
      if (task.score >= this.PRIORITY_THRESHOLDS.high) {
        this.stats.highPriority++;
      } else if (task.score >= this.PRIORITY_THRESHOLDS.medium) {
        this.stats.mediumPriority++;
      } else {
        this.stats.lowPriority++;
      }
    }

    const riskSummary = highRiskCount > 0
      ? `⚠️ ${highRiskCount} tasks skipped due to high risk`
      : '✅ All executable tasks included';

    console.log(
      `[TaskPriorityScheduler] 🎯 Built queue with ${queue.length} tasks ` +
      `(${totalTime}ms of ${budgetMs}ms, ${skipped.length} skipped)`
    );

    return {
      cycleId,
      tasks: queue,
      estimatedTotalTime: totalTime,
      tasksSkipped: skipped,
      riskSummary,
    };
  }

  /**
   * Get statistics
   */
  getTaskStats(): TaskStats {
    const scores = this.taskScoreHistory;
    const avgScore = scores.length > 0
      ? scores.reduce((sum, t) => sum + t.score, 0) / scores.length
      : 0;

    const taskTypeScores: Record<string, { score: number; successRate: number }> = {};
    for (const [taskType] of this.taskTypeConfigs) {
      const typeTasks = scores.filter(t => t.taskType === taskType);
      if (typeTasks.length > 0) {
        taskTypeScores[taskType] = {
          score: typeTasks.reduce((sum, t) => sum + t.score, 0) / typeTasks.length,
          successRate: this.successRates.get(taskType) || 0.7,
        };
      }
    }

    return {
      totalTasksScored: this.stats.totalScored,
      avgScore,
      highPriorityCount: this.stats.highPriority,
      mediumPriorityCount: this.stats.mediumPriority,
      lowPriorityCount: this.stats.lowPriority,
      taskTypeScores,
      dependencyIssues: this.stats.dependencyIssues,
    };
  }

  /**
   * Reset all statistics (for testing)
   */
  reset(): void {
    this.successRates.clear();
    this.taskScoreHistory = [];
    this.stats = {
      totalScored: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      dependencyIssues: 0,
    };
    console.log('[TaskPriorityScheduler] 🔄 Service reset');
  }
}

// Export singleton instance
export const taskPrioritySchedulerService = new TaskPrioritySchedulerService();
