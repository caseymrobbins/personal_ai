/**
 * Goal Management Service (Phase 1 - Task 9)
 *
 * GOCA: Goal Orchestration and Cognitive Architecture
 *
 * Manages both user goals and autonomous agent goals.
 * Goals are organized in a hierarchy and evaluated during cognitive cycles.
 *
 * Goal types:
 * - User Goals: Explicitly set by user
 * - Agent Goals: Derived from user profile and conversation context
 * - Derived Goals: Generated from insights and patterns
 *
 * Goal states:
 * - active: Currently being pursued
 * - paused: Temporarily halted
 * - completed: Successfully finished
 * - abandoned: Gave up or user cancelled
 * - stalled: No progress being made
 */

import { dbService } from './db.service';

export type GoalSource = 'user' | 'agent' | 'derived' | 'inferred';

export type GoalStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'abandoned'
  | 'stalled'
  | 'blocked';

export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  title: string;
  description: string;
  source: GoalSource;
  status: GoalStatus;
  priority: GoalPriority;
  createdAt: number;
  targetCompletion?: number; // Deadline
  parentGoalId?: string; // Hierarchy
  subGoals: string[]; // Child goals
  progress: number; // 0.0-1.0
  progressNotes: string[];
  successCriteria: string[];
  relatedEntities: string[]; // KB entity IDs
  relatedMemories: string[]; // Memory IDs
  autonomyLevel: number; // 0.0-1.0 how much agent can act autonomously
  lastEvaluatedAt?: number;
  evaluationNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface GoalEvaluation {
  goalId: string;
  timestamp: number;
  previousProgress: number;
  currentProgress: number;
  progressMade: boolean;
  notes: string;
  recommendations?: string[];
}

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  abandonedGoals: number;
  stalledGoals: number;
  averageProgress: number;
  goalsBySource: Record<GoalSource, number>;
  goalsByPriority: Record<GoalPriority, number>;
}

/**
 * GoalManagementService
 *
 * Orchestrates goal setting, tracking, and evaluation
 */
class GoalManagementService {
  private goals: Map<string, Goal> = new Map();
  private evaluationHistory: Map<string, GoalEvaluation[]> = new Map();
  private readonly maxSubGoalsPerGoal = 10;
  private readonly stalledThresholdDays = 7;

  /**
   * Initialize goal management database
   */
  async initialize(): Promise<void> {
    try {
      // Create goals table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS agent_goals (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          source TEXT NOT NULL,
          status TEXT NOT NULL,
          priority TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          target_completion INTEGER,
          parent_goal_id TEXT,
          sub_goals TEXT,
          progress REAL NOT NULL DEFAULT 0,
          progress_notes TEXT,
          success_criteria TEXT,
          related_entities TEXT,
          related_memories TEXT,
          autonomy_level REAL NOT NULL DEFAULT 0.5,
          last_evaluated_at INTEGER,
          evaluation_notes TEXT,
          metadata TEXT,
          created_timestamp INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create goal evaluations table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS goal_evaluations (
          id TEXT PRIMARY KEY,
          goal_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          previous_progress REAL NOT NULL,
          current_progress REAL NOT NULL,
          progress_made INTEGER NOT NULL,
          notes TEXT NOT NULL,
          recommendations TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (goal_id) REFERENCES agent_goals(id)
        )
      `);

      // Create goal dependencies table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS goal_dependencies (
          id TEXT PRIMARY KEY,
          goal_id TEXT NOT NULL,
          depends_on_goal_id TEXT NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (goal_id) REFERENCES agent_goals(id),
          FOREIGN KEY (depends_on_goal_id) REFERENCES agent_goals(id)
        )
      `);

      // Create indexes
      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_goals_status
        ON agent_goals(status)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_goals_priority
        ON agent_goals(priority)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_goals_source
        ON agent_goals(source)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_goals_parent
        ON agent_goals(parent_goal_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_evaluations_goal
        ON goal_evaluations(goal_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_evaluations_timestamp
        ON goal_evaluations(timestamp DESC)
      `);

      await dbService.save();

      console.log('[GoalManagement] ✅ Service initialized');
    } catch (error) {
      console.error('[GoalManagement] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new goal
   */
  createGoal(
    title: string,
    description: string,
    source: GoalSource,
    options?: {
      priority?: GoalPriority;
      targetCompletion?: number;
      parentGoalId?: string;
      successCriteria?: string[];
      autonomyLevel?: number;
      metadata?: Record<string, unknown>;
    }
  ): Goal {
    const id = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const goal: Goal = {
      id,
      title,
      description,
      source,
      status: 'active',
      priority: options?.priority || 'medium',
      createdAt: now,
      targetCompletion: options?.targetCompletion,
      parentGoalId: options?.parentGoalId,
      subGoals: [],
      progress: 0,
      progressNotes: [],
      successCriteria: options?.successCriteria || [],
      relatedEntities: [],
      relatedMemories: [],
      autonomyLevel: options?.autonomyLevel || 0.5,
      metadata: options?.metadata,
    };

    this.goals.set(id, goal);
    this.evaluationHistory.set(id, []);

    // Store in database
    dbService.exec(
      `INSERT INTO agent_goals
       (id, title, description, source, status, priority, created_at, target_completion,
        parent_goal_id, sub_goals, progress, success_criteria, autonomy_level, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        goal.id,
        goal.title,
        goal.description,
        goal.source,
        goal.status,
        goal.priority,
        goal.createdAt,
        goal.targetCompletion || null,
        goal.parentGoalId || null,
        JSON.stringify(goal.subGoals),
        goal.progress,
        JSON.stringify(goal.successCriteria),
        goal.autonomyLevel,
        goal.metadata ? JSON.stringify(goal.metadata) : null,
      ]
    );

    console.log(
      `[GoalManagement] 🎯 Goal created: "${title}" (${source}/${goal.priority})`
    );
    return goal;
  }

  /**
   * Get goal by ID
   */
  getGoal(goalId: string): Goal | undefined {
    return this.goals.get(goalId);
  }

  /**
   * Get all goals with optional filtering
   */
  getGoals(
    status?: GoalStatus,
    source?: GoalSource,
    priority?: GoalPriority
  ): Goal[] {
    return Array.from(this.goals.values()).filter((goal) => {
      if (status && goal.status !== status) return false;
      if (source && goal.source !== source) return false;
      if (priority && goal.priority !== priority) return false;
      return true;
    });
  }

  /**
   * Get sub-goals of a parent goal
   */
  getSubGoals(parentGoalId: string): Goal[] {
    return Array.from(this.goals.values()).filter(
      (g) => g.parentGoalId === parentGoalId
    );
  }

  /**
   * Add a sub-goal
   */
  addSubGoal(parentGoalId: string, subGoalId: string): boolean {
    const parentGoal = this.goals.get(parentGoalId);
    const subGoal = this.goals.get(subGoalId);

    if (!parentGoal || !subGoal) return false;
    if (parentGoal.subGoals.length >= this.maxSubGoalsPerGoal) return false;

    if (!parentGoal.subGoals.includes(subGoalId)) {
      parentGoal.subGoals.push(subGoalId);
      subGoal.parentGoalId = parentGoalId;

      dbService.exec(
        `UPDATE agent_goals SET sub_goals = ? WHERE id = ?`,
        [JSON.stringify(parentGoal.subGoals), parentGoalId]
      );

      console.log(
        `[GoalManagement] 🔗 Sub-goal added: ${subGoal.title} → ${parentGoal.title}`
      );
      return true;
    }

    return false;
  }

  /**
   * Update goal progress
   */
  updateProgress(
    goalId: string,
    progress: number,
    note?: string
  ): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    const previousProgress = goal.progress;
    goal.progress = Math.min(1, Math.max(0, progress));

    if (note) {
      goal.progressNotes.push(`${new Date().toISOString()}: ${note}`);
    }

    // Auto-complete if 100% progress
    if (goal.progress >= 1 && goal.status !== 'completed') {
      goal.status = 'completed';
      console.log(`[GoalManagement] ✅ Goal completed: ${goal.title}`);
    }

    dbService.exec(
      `UPDATE agent_goals SET progress = ?, progress_notes = ? WHERE id = ?`,
      [goal.progress, JSON.stringify(goal.progressNotes), goalId]
    );

    // Record evaluation if significant progress
    if (goal.progress - previousProgress >= 0.1) {
      this.recordEvaluation(goalId, previousProgress, goal.progress, true, note || '');
    }

    console.log(
      `[GoalManagement] 📊 Progress updated: ${goal.title} (${(goal.progress * 100).toFixed(1)}%)`
    );
    return true;
  }

  /**
   * Mark goal as complete
   */
  completeGoal(goalId: string, note?: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    goal.status = 'completed';
    goal.progress = 1;

    if (note) {
      goal.progressNotes.push(`COMPLETED: ${note}`);
    }

    dbService.exec(
      `UPDATE agent_goals SET status = ?, progress = ?, progress_notes = ? WHERE id = ?`,
      [goal.status, goal.progress, JSON.stringify(goal.progressNotes), goalId]
    );

    console.log(`[GoalManagement] ✅ Goal marked complete: ${goal.title}`);
    return true;
  }

  /**
   * Mark goal as abandoned
   */
  abandonGoal(goalId: string, reason?: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    goal.status = 'abandoned';

    if (reason) {
      goal.progressNotes.push(`ABANDONED: ${reason}`);
    }

    dbService.exec(
      `UPDATE agent_goals SET status = ?, progress_notes = ? WHERE id = ?`,
      [goal.status, JSON.stringify(goal.progressNotes), goalId]
    );

    console.log(`[GoalManagement] ❌ Goal abandoned: ${goal.title}`);
    return true;
  }

  /**
   * Pause goal
   */
  pauseGoal(goalId: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal || goal.status !== 'active') return false;

    goal.status = 'paused';
    dbService.exec(`UPDATE agent_goals SET status = ? WHERE id = ?`, [
      'paused',
      goalId,
    ]);

    console.log(`[GoalManagement] ⏸️ Goal paused: ${goal.title}`);
    return true;
  }

  /**
   * Resume goal
   */
  resumeGoal(goalId: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal || goal.status !== 'paused') return false;

    goal.status = 'active';
    dbService.exec(`UPDATE agent_goals SET status = ? WHERE id = ?`, [
      'active',
      goalId,
    ]);

    console.log(`[GoalManagement] ▶️ Goal resumed: ${goal.title}`);
    return true;
  }

  /**
   * Evaluate all active goals
   */
  evaluateAllGoals(): {
    evaluated: number;
    stalledGoals: string[];
    recommendations: string[];
  } {
    const activeGoals = this.getGoals('active');
    const now = Date.now();
    const recommendations: string[] = [];
    const stalledGoals: string[] = [];

    for (const goal of activeGoals) {
      // Check if stalled (no progress in threshold)
      const lastEvaluation = this.evaluationHistory.get(goal.id)?.pop();
      if (lastEvaluation) {
        const daysSinceProgress = (now - lastEvaluation.timestamp) / (1000 * 60 * 60 * 24);

        if (
          daysSinceProgress > this.stalledThresholdDays &&
          lastEvaluation.currentProgress === goal.progress
        ) {
          goal.status = 'stalled';
          stalledGoals.push(goal.id);
          recommendations.push(
            `Goal "${goal.title}" is stalled - consider breaking down or abandoning`
          );
        }
      }

      // Check deadlines
      if (goal.targetCompletion && now > goal.targetCompletion && goal.progress < 1) {
        goal.status = 'stalled';
        stalledGoals.push(goal.id);
        recommendations.push(`Goal "${goal.title}" missed deadline`);
      }

      goal.lastEvaluatedAt = now;
      dbService.exec(
        `UPDATE agent_goals SET status = ?, last_evaluated_at = ? WHERE id = ?`,
        [goal.status, goal.lastEvaluatedAt, goal.id]
      );
    }

    console.log(
      `[GoalManagement] 📋 Evaluated ${activeGoals.length} goals (${stalledGoals.length} stalled)`
    );

    return {
      evaluated: activeGoals.length,
      stalledGoals,
      recommendations,
    };
  }

  /**
   * Record goal evaluation
   */
  private recordEvaluation(
    goalId: string,
    previousProgress: number,
    currentProgress: number,
    progressMade: boolean,
    notes: string
  ): void {
    const evaluationId = `eval-${goalId}-${Date.now()}`;
    const evaluation: GoalEvaluation = {
      goalId,
      timestamp: Date.now(),
      previousProgress,
      currentProgress,
      progressMade,
      notes,
    };

    const evals = this.evaluationHistory.get(goalId) || [];
    evals.push(evaluation);
    this.evaluationHistory.set(goalId, evals);

    dbService.exec(
      `INSERT INTO goal_evaluations
       (id, goal_id, timestamp, previous_progress, current_progress, progress_made, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        evaluationId,
        goalId,
        evaluation.timestamp,
        evaluation.previousProgress,
        evaluation.currentProgress,
        evaluation.progressMade ? 1 : 0,
        evaluation.notes,
      ]
    );
  }

  /**
   * Get goal evaluation history
   */
  getEvaluationHistory(goalId: string, limit: number = 20): GoalEvaluation[] {
    return (this.evaluationHistory.get(goalId) || []).slice(-limit);
  }

  /**
   * Link goal to knowledge base entities
   */
  linkToEntities(goalId: string, entityIds: string[]): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    goal.relatedEntities = [...new Set([...goal.relatedEntities, ...entityIds])];

    dbService.exec(
      `UPDATE agent_goals SET related_entities = ? WHERE id = ?`,
      [JSON.stringify(goal.relatedEntities), goalId]
    );

    return true;
  }

  /**
   * Link goal to memories
   */
  linkToMemories(goalId: string, memoryIds: string[]): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    goal.relatedMemories = [...new Set([...goal.relatedMemories, ...memoryIds])];

    dbService.exec(
      `UPDATE agent_goals SET related_memories = ? WHERE id = ?`,
      [JSON.stringify(goal.relatedMemories), goalId]
    );

    return true;
  }

  /**
   * Get goal statistics
   */
  getStats(): GoalStats {
    const allGoals = Array.from(this.goals.values());
    const activeGoals = allGoals.filter((g) => g.status === 'active');
    const completedGoals = allGoals.filter((g) => g.status === 'completed');
    const abandonedGoals = allGoals.filter((g) => g.status === 'abandoned');
    const stalledGoals = allGoals.filter((g) => g.status === 'stalled');

    const avgProgress =
      allGoals.length > 0
        ? allGoals.reduce((sum, g) => sum + g.progress, 0) / allGoals.length
        : 0;

    const goalsBySource: Record<GoalSource, number> = {
      user: 0,
      agent: 0,
      derived: 0,
      inferred: 0,
    };
    allGoals.forEach((g) => {
      goalsBySource[g.source]++;
    });

    const goalsByPriority: Record<GoalPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    allGoals.forEach((g) => {
      goalsByPriority[g.priority]++;
    });

    return {
      totalGoals: allGoals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      abandonedGoals: abandonedGoals.length,
      stalledGoals: stalledGoals.length,
      averageProgress: avgProgress,
      goalsBySource,
      goalsByPriority,
    };
  }

  /**
   * Get goals by urgency (deadline approaching or high priority)
   */
  getUrgentGoals(): Goal[] {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    return Array.from(this.goals.values())
      .filter(
        (g) =>
          g.status === 'active' &&
          (g.priority === 'critical' ||
            (g.targetCompletion && g.targetCompletion - now < oneWeek))
      )
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        const aTime = a.targetCompletion || Infinity;
        const bTime = b.targetCompletion || Infinity;
        return aTime - bTime;
      });
  }

  /**
   * Get recommended next goals
   */
  getRecommendedGoals(): Goal[] {
    const activeGoals = this.getGoals('active');
    const inProgressGoals = activeGoals
      .filter((g) => g.progress > 0 && g.progress < 1)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    return inProgressGoals;
  }

  /**
   * Clear all goals (dangerous)
   */
  clear(): void {
    this.goals.clear();
    this.evaluationHistory.clear();
    dbService.exec('DELETE FROM agent_goals');
    dbService.exec('DELETE FROM goal_evaluations');
    dbService.exec('DELETE FROM goal_dependencies');
    console.log('[GoalManagement] ⚠️ All goals cleared');
  }
}

// Export singleton instance
export const goalManagementService = new GoalManagementService();
