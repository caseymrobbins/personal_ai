/**
 * Goal Evaluation Trigger Service
 *
 * Integrates goal evaluation into the cognitive cycle.
 * Runs during periodic wake cycles to:
 * - Evaluate goal progress
 * - Link conversation insights to goal updates
 * - Detect completed or stalled goals
 * - Recommend new goal actions
 * - Update autonomy levels based on progress
 */

import { dbService } from './db.service';
import { goalManagementService, Goal } from './goal-management.service';
import { workingMemoryService } from './working-memory.service';
import { longTermMemoryService } from './long-term-memory.service';
import { userModelService } from './user-model.service';
import { cognitiveSchedulerService } from './cognitive-scheduler.service';
import { autonomousTaskHandlersService } from './autonomous-task-handlers.service';
// Phase 4: Autonomous Decision Making
import { taskBudgetManagerService, type TaskCost } from './task-budget-manager.service';
import { riskAssessmentService, type RiskAssessment } from './risk-assessment.service';
import { taskPrioritySchedulerService, type AutonomousTask } from './task-priority-scheduler.service';

export interface GoalEvaluationTriggerResult {
  evaluatedAt: number;
  cycleId: string;
  goalsEvaluated: number;
  goalsCompleted: number;
  goalsStalled: number;
  progressUpdates: number;
  // Phase 4: Autonomous Decision Making metrics
  autonomousTasksCandidates: number;
  autonomousTasksExecuted: number;
  autonomousTasksFailed: number;
  budgetAllocated: number;
  budgetUsed: number;
  budgetUtilization: number;
  tasksSkippedDueToRisk: number;
  risksAssessed: number;
  riskSummary: string;
  //
  newTasksCreated: number;
  recommendations: string[];
  autonomyAdjustments: number;
}

export interface GoalProgressInsight {
  goalId: string;
  progressIncrease: number;
  evidenceCount: number;
  evidenceType: string[];
  confidence: number;
  relatedMemories: string[];
  recommendation?: string;
}

/**
 * GoalEvaluationTriggerService
 *
 * Triggers goal evaluation during cognitive cycles
 */
class GoalEvaluationTriggerService {
  private lastEvaluationTime: number = 0;
  private evaluationHistory: GoalEvaluationTriggerResult[] = [];
  private readonly evaluationIntervalMs = 5 * 60 * 1000; // 5 minutes (matches wake cycle)

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[GoalEvaluationTrigger] ✅ Service initialized');
  }

  /**
   * Main evaluation trigger - called during cognitive cycles
   */
  async evaluateCycle(): Promise<GoalEvaluationTriggerResult> {
    const cycleStartTime = Date.now();
    const cycleId = `cycle-${cycleStartTime}`;

    const result: GoalEvaluationTriggerResult = {
      evaluatedAt: cycleStartTime,
      cycleId,
      goalsEvaluated: 0,
      goalsCompleted: 0,
      goalsStalled: 0,
      progressUpdates: 0,
      // Phase 4
      autonomousTasksCandidates: 0,
      autonomousTasksExecuted: 0,
      autonomousTasksFailed: 0,
      budgetAllocated: 0,
      budgetUsed: 0,
      budgetUtilization: 0,
      tasksSkippedDueToRisk: 0,
      risksAssessed: 0,
      riskSummary: '',
      //
      newTasksCreated: 0,
      recommendations: [],
      autonomyAdjustments: 0,
    };

    try {
      console.log('[GoalEvaluationTrigger] 🔄 Starting goal evaluation cycle');

      // Step 1: Get all active goals
      const activeGoals = goalManagementService.getGoals('active');
      result.goalsEvaluated = activeGoals.length;

      // Step 2: Evaluate each goal
      for (const goal of activeGoals) {
        try {
          const progressInsight = await this.evaluateGoalProgress(goal);

          if (progressInsight) {
            // Step 3: Update goal progress if evidence found
            if (progressInsight.progressIncrease > 0) {
              const newProgress = Math.min(1, goal.progress + progressInsight.progressIncrease);
              goalManagementService.updateProgress(goal.id, newProgress, progressInsight.recommendation);
              result.progressUpdates++;

              console.log(
                `[GoalEvaluationTrigger] 📈 Goal progress updated: ${goal.title} (${(goal.progress * 100).toFixed(1)}% → ${(newProgress * 100).toFixed(1)}%)`
              );
            }

            // Step 4: Check completion
            if (progressInsight.confidence >= 0.9 && goal.progress >= 0.95) {
              goalManagementService.completeGoal(goal.id, progressInsight.recommendation);
              result.goalsCompleted++;
              result.recommendations.push(`✅ Goal completed: ${goal.title}`);
            }
          }
        } catch (error) {
          console.warn(
            `[GoalEvaluationTrigger] ⚠️ Failed to evaluate goal ${goal.id}:`,
            error
          );
        }
      }

      // Step 5: Evaluate for stalled goals
      const stalledEvaluation = goalManagementService.evaluateAllGoals();
      result.goalsStalled = stalledEvaluation.stalledGoals.length;
      result.recommendations.push(...stalledEvaluation.recommendations);

      // Step 6: Adjust autonomy levels based on progress
      const autonomyAdjustments = await this.adjustAutonomyLevels(activeGoals);
      result.autonomyAdjustments = autonomyAdjustments;

      // Step 7: Phase 4 - Generate and execute autonomous tasks with intelligent decision making
      const taskExecutionResult = await this.executeAutonomousTasksWithDecisionMaking(
        activeGoals,
        cycleId,
        result
      );
      result.autonomousTasksCandidates = taskExecutionResult.candidates;
      result.autonomousTasksExecuted = taskExecutionResult.executed;
      result.autonomousTasksFailed = taskExecutionResult.failed;
      result.budgetAllocated = taskExecutionResult.budgetAllocated;
      result.budgetUsed = taskExecutionResult.budgetUsed;
      result.budgetUtilization = taskExecutionResult.budgetUtilization;
      result.tasksSkippedDueToRisk = taskExecutionResult.skippedDueToRisk;
      result.risksAssessed = taskExecutionResult.risksAssessed;
      result.riskSummary = taskExecutionResult.riskSummary;
      result.newTasksCreated = taskExecutionResult.executed;

      // Close out the budget cycle
      taskBudgetManagerService.closeCycle(cycleId);

      // Step 8: Store evaluation result
      this.evaluationHistory.push(result);
      this.lastEvaluationTime = cycleStartTime;

      console.log(
        `[GoalEvaluationTrigger] ✅ Evaluation complete: ${result.goalsEvaluated} goals evaluated, ` +
        `${result.progressUpdates} progress updates, ${result.autonomousTasksExecuted} tasks executed ` +
        `(budget: ${result.budgetUtilization.toFixed(0)}%)`
      );

      return result;
    } catch (error) {
      console.error('[GoalEvaluationTrigger] ❌ Evaluation cycle failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate a single goal's progress
   */
  private async evaluateGoalProgress(goal: Goal): Promise<GoalProgressInsight | null> {
    try {
      // Search for related memories that indicate progress
      const relatedMemoryQueries = [
        goal.title,
        goal.description,
        ...goal.successCriteria.slice(0, 3),
      ].filter(Boolean);

      let totalProgressEvidence = 0;
      let totalEvidenceCount = 0;
      const evidenceTypes: Set<string> = new Set();
      const relatedMemories: string[] = [];

      // Search long-term memory for relevant memories
      for (const query of relatedMemoryQueries) {
        try {
          const memories = await longTermMemoryService.searchMemories(query, 10, 0.5);

          if (memories.length > 0) {
            totalEvidenceCount += memories.length;
            totalProgressEvidence += memories.reduce((sum, m) => sum + m.similarity, 0);
            relatedMemories.push(...memories.map((m) => m.id));
            evidenceTypes.add('semantic_search');
          }
        } catch (error) {
          console.warn(
            `[GoalEvaluationTrigger] Memory search failed for query "${query}":`,
            error
          );
        }
      }

      // If goal has related entities, check frequency of mentions
      if (goal.relatedEntities.length > 0) {
        // Count recent working memory mentions of related entities
        const activeTasks = workingMemoryService.getActiveTasks();
        let entityMentions = 0;

        for (const task of activeTasks) {
          for (const item of task.items) {
            for (const entityId of goal.relatedEntities) {
              if (item.content.toLowerCase().includes(entityId.toLowerCase())) {
                entityMentions++;
              }
            }
          }
        }

        if (entityMentions > 0) {
          totalEvidenceCount += entityMentions;
          totalProgressEvidence += entityMentions * 0.3; // Lower weight for mentions
          evidenceTypes.add('entity_mention');
        }
      }

      // Calculate progress increase based on evidence
      let progressIncrease = 0;
      let confidence = 0;

      if (totalEvidenceCount > 0) {
        // Average similarity/confidence from memories
        const avgEvidence = totalProgressEvidence / totalEvidenceCount;

        // Progress increase scales with evidence: more evidence → more progress
        // Cap at 0.15 per cycle (15 percentage points max)
        progressIncrease = Math.min(0.15, avgEvidence * 0.1 + (totalEvidenceCount * 0.01));
        confidence = Math.min(1, avgEvidence);
      }

      // Check for user interactions that indicate progress
      if (goal.source === 'user') {
        // User goals may have explicit progress indicators from preferences
        const userProgressPref = userModelService.getPreference(`goal_${goal.id}_progress`);
        if (userProgressPref) {
          const prefValue = typeof userProgressPref.value === 'number' ? userProgressPref.value : 0;
          progressIncrease = Math.max(progressIncrease, prefValue);
        }
      }

      if (progressIncrease > 0 || totalEvidenceCount > 0) {
        return {
          goalId: goal.id,
          progressIncrease,
          evidenceCount: totalEvidenceCount,
          evidenceType: Array.from(evidenceTypes),
          confidence,
          relatedMemories: [...new Set(relatedMemories)],
          recommendation: this.generateRecommendation(goal, progressIncrease, totalEvidenceCount),
        };
      }

      return null;
    } catch (error) {
      console.warn(
        `[GoalEvaluationTrigger] Failed to evaluate goal progress for ${goal.id}:`,
        error
      );
      return null;
    }
  }

  /**
   * Generate recommendation text based on evaluation
   */
  private generateRecommendation(
    goal: Goal,
    progressIncrease: number,
    evidenceCount: number
  ): string {
    if (progressIncrease >= 0.1) {
      return `Significant progress on "${goal.title}" (${evidenceCount} supporting memories)`;
    } else if (evidenceCount > 0) {
      return `Some progress on "${goal.title}" (${evidenceCount} related memories)`;
    }
    return `Continuing progress on "${goal.title}"`;
  }

  /**
   * Adjust autonomy levels based on progress
   */
  private async adjustAutonomyLevels(goals: Goal[]): Promise<number> {
    let adjustments = 0;

    for (const goal of goals) {
      const evaluation = goalManagementService.getEvaluationHistory(goal.id, 5);

      if (evaluation.length >= 3) {
        // Increase autonomy if consistent progress
        const recentProgress = evaluation.slice(-3).map((e) => e.currentProgress);
        const isProgressing = recentProgress.every(
          (p, i) => i === 0 || p >= recentProgress[i - 1]
        );

        const newAutonomy = isProgressing
          ? Math.min(1, goal.autonomyLevel + 0.05)
          : Math.max(0, goal.autonomyLevel - 0.05);

        if (newAutonomy !== goal.autonomyLevel) {
          goal.autonomyLevel = newAutonomy;
          adjustments++;

          console.log(
            `[GoalEvaluationTrigger] 🤖 Autonomy adjusted for "${goal.title}": ${(goal.autonomyLevel * 100).toFixed(0)}%`
          );
        }
      }
    }

    return adjustments;
  }

  /**
   * Phase 4: Execute autonomous tasks with intelligent decision making
   * Integrates budget management, risk assessment, and task prioritization
   */
  private async executeAutonomousTasksWithDecisionMaking(
    goals: Goal[],
    cycleId: string,
    result: GoalEvaluationTriggerResult
  ): Promise<{
    candidates: number;
    executed: number;
    failed: number;
    budgetAllocated: number;
    budgetUsed: number;
    budgetUtilization: number;
    skippedDueToRisk: number;
    risksAssessed: number;
    riskSummary: string;
  }> {
    // PHASE 4 STEP 1: Allocate budget for this cycle
    const budget = taskBudgetManagerService.allocateBudget(cycleId);

    console.log(
      `[GoalEvaluationTrigger] 💰 Phase 4 Step 1: Budget allocated - ` +
      `Total: ${budget.totalBudget}ms, Available: ${budget.availableBudget}ms`
    );

    // PHASE 4 STEP 2: Generate candidate autonomous tasks
    const taskCandidates = this.generateTaskCandidates(goals);
    console.log(`[GoalEvaluationTrigger] 📋 Phase 4 Step 2: Generated ${taskCandidates.length} task candidates`);

    // PHASE 4 STEP 3: Assess risk for each candidate
    const riskAssessments = new Map<string, RiskAssessment>();
    for (const task of taskCandidates) {
      const assessment = riskAssessmentService.assessTask(task.taskType, task.payload);
      riskAssessments.set(task.taskType, assessment);
    }
    console.log(`[GoalEvaluationTrigger] 🔍 Phase 4 Step 3: Assessed risks for ${riskAssessments.size} task types`);

    // PHASE 4 STEP 4: Score and prioritize tasks
    const scoredTasks = taskPrioritySchedulerService.scoreTasks(taskCandidates, {
      activeGoalCount: goals.length,
      stalledGoalCount: goals.filter(g => {
        const daysSinceUpdate = (Date.now() - (g.updatedAt || 0)) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > 7;
      }).length,
      budgetAvailable: budget.availableBudget,
      riskAssessments,
    });

    // PHASE 4 STEP 5: Build execution queue respecting budget and risk
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scoredTasks, budget.availableBudget);
    console.log(
      `[GoalEvaluationTrigger] 🎯 Phase 4 Step 5: Built execution queue with ${queue.tasks.length} tasks ` +
      `(${queue.estimatedTotalTime}ms of ${budget.availableBudget}ms)`
    );

    // PHASE 4 STEP 6: Execute tasks in priority order
    let tasksExecuted = 0;
    let tasksFailed = 0;
    const skippedDueToRisk = queue.tasksSkipped.length;

    for (const task of queue.tasks) {
      // Check if we still have budget
      if (!taskBudgetManagerService.shouldContinueExecuting(cycleId)) {
        console.log(`[GoalEvaluationTrigger] ⏸️ Budget exhausted, stopping task execution`);
        break;
      }

      const startTime = Date.now();
      try {
        console.log(`[GoalEvaluationTrigger] ▶️ Executing task: ${task.taskType} (priority: ${task.score.toFixed(2)})`);

        const execResult = await autonomousTaskHandlersService.executeTask(
          task.taskId,
          task.taskType as any,
          task.payload
        );

        const executionTime = Date.now() - startTime;
        const cost: TaskCost = {
          taskId: task.taskId,
          taskType: task.taskType,
          executionTime,
          memoryPeakMB: 0, // Will be calculated by task handler
          dbQueriesCount: 0, // Will be calculated by task handler
          serviceCallsCount: 0, // Will be calculated by task handler
          success: execResult.success,
        };

        taskBudgetManagerService.recordTaskCost(cycleId, cost);
        tasksExecuted++;

        // Update success rate based on execution
        taskPrioritySchedulerService.updateSuccessRate(task.taskType, execResult.success);

        if (execResult.success) {
          riskAssessmentService.recordSuccess(task.taskType);
          console.log(
            `[GoalEvaluationTrigger] ✅ Task ${task.taskType} succeeded ` +
            `(${executionTime}ms, insights: ${execResult.insightsGenerated.length})`
          );
        } else {
          riskAssessmentService.recordFailure(task.taskType, new Error(execResult.errors?.join(', ') || 'Unknown error'));
          tasksFailed++;
          console.warn(
            `[GoalEvaluationTrigger] ❌ Task ${task.taskType} failed: ` +
            `${execResult.errors?.join(', ') || 'Unknown error'}`
          );
        }
      } catch (error) {
        tasksFailed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        riskAssessmentService.recordFailure(task.taskType, new Error(errorMsg));
        console.error(`[GoalEvaluationTrigger] ❌ Failed to execute task ${task.taskType}:`, error);
      }
    }

    // PHASE 4 STEP 7: Gather final statistics
    const finalStats = taskBudgetManagerService.getCycleStats(cycleId);
    const systemHealth = riskAssessmentService.getSystemHealth();

    const utilization = finalStats ? finalStats.utilizationPercent : 0;

    console.log(
      `[GoalEvaluationTrigger] 📊 Phase 4 Step 7: Execution summary - ` +
      `${tasksExecuted} executed, ${tasksFailed} failed, ${skippedDueToRisk} skipped (risk), ` +
      `Budget utilization: ${utilization.toFixed(0)}%`
    );

    return {
      candidates: taskCandidates.length,
      executed: tasksExecuted,
      failed: tasksFailed,
      budgetAllocated: budget.availableBudget,
      budgetUsed: finalStats?.budgetUsed || 0,
      budgetUtilization: utilization,
      skippedDueToRisk,
      risksAssessed: riskAssessments.size,
      riskSummary: queue.riskSummary,
    };
  }

  /**
   * Generate candidate autonomous tasks from active goals
   */
  private generateTaskCandidates(goals: Goal[]): AutonomousTask[] {
    const candidates: AutonomousTask[] = [];

    // Get goals that are urgent or have low progress
    const urgentGoals = goalManagementService.getUrgentGoals();
    const lowProgressGoals = goals.filter((g) => g.progress > 0 && g.progress < 0.3);
    const candidateGoals = [...new Set([...urgentGoals, ...lowProgressGoals])];

    for (const goal of candidateGoals) {
      // Only create autonomous tasks if agent has sufficient autonomy
      if (goal.autonomyLevel >= 0.4) {
        const taskType = goal.source === 'user' ? 'goal_research' : 'goal_analysis';

        candidates.push({
          taskId: `task-${goal.id}-${Date.now()}`,
          taskType,
          dependsOn: [],
          payload: {
            goalId: goal.id,
            goalTitle: goal.title,
            progressTarget: Math.min(goal.progress + 0.1, 1),
            priority: goal.priority === 'critical' ? 'critical' : 'high',
          },
        });
      }
    }

    return candidates;
  }

  /**
   * Check if evaluation should run
   */
  shouldEvaluate(): boolean {
    const timeSinceLastEvaluation = Date.now() - this.lastEvaluationTime;
    return timeSinceLastEvaluation >= this.evaluationIntervalMs;
  }

  /**
   * Get evaluation history
   */
  getEvaluationHistory(limit: number = 20): GoalEvaluationTriggerResult[] {
    return this.evaluationHistory.slice(-limit);
  }

  /**
   * Get last evaluation
   */
  getLastEvaluation(): GoalEvaluationTriggerResult | undefined {
    return this.evaluationHistory[this.evaluationHistory.length - 1];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvaluations: number;
    lastEvaluationTime: number | null;
    totalGoalsCompleted: number;
    totalGoalsStalled: number;
    totalTasksCreated: number;
    averageProgressUpdatesPerCycle: number;
  } {
    const totalCompleted = this.evaluationHistory.reduce(
      (sum, e) => sum + e.goalsCompleted,
      0
    );
    const totalStalled = this.evaluationHistory.reduce((sum, e) => sum + e.goalsStalled, 0);
    const totalTasks = this.evaluationHistory.reduce((sum, e) => sum + e.newTasksCreated, 0);
    const avgUpdates =
      this.evaluationHistory.length > 0
        ? this.evaluationHistory.reduce((sum, e) => sum + e.progressUpdates, 0) /
          this.evaluationHistory.length
        : 0;

    return {
      totalEvaluations: this.evaluationHistory.length,
      lastEvaluationTime:
        this.evaluationHistory.length > 0
          ? this.evaluationHistory[this.evaluationHistory.length - 1].evaluatedAt
          : null,
      totalGoalsCompleted: totalCompleted,
      totalGoalsStalled: totalStalled,
      totalTasksCreated: totalTasks,
      averageProgressUpdatesPerCycle: avgUpdates,
    };
  }

  /**
   * Clear history
   */
  clear(): void {
    this.evaluationHistory = [];
    this.lastEvaluationTime = 0;
    console.log('[GoalEvaluationTrigger] ⚠️ History cleared');
  }
}

// Export singleton instance
export const goalEvaluationTriggerService = new GoalEvaluationTriggerService();
