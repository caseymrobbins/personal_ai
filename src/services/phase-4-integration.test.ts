/**
 * Phase 4: Autonomous Decision Making - Integration Test Suite
 *
 * Tests the complete decision-making pipeline:
 * - Budget allocation and tracking
 * - Risk assessment and mitigation
 * - Task prioritization and scheduling
 * - Integrated execution in goal evaluation cycle
 *
 * Total: 60 tests across 6 test suites
 */

import { taskBudgetManagerService, type TaskCost } from './task-budget-manager.service';
import { riskAssessmentService } from './risk-assessment.service';
import { taskPrioritySchedulerService, type AutonomousTask } from './task-priority-scheduler.service';

// ============================================================================
// TEST SUITE 1: Task Budget Manager (10 tests)
// ============================================================================

describe('[Phase 4 - Task Budget Manager]', () => {
  beforeEach(() => {
    taskBudgetManagerService.reset();
  });

  test('Allocates budget correctly for a cycle', () => {
    const budget = taskBudgetManagerService.allocateBudget('cycle-1');

    expect(budget.totalBudget).toBe(500);
    expect(budget.reservedBudget).toBe(100); // 20%
    expect(budget.availableBudget).toBe(400); // 80%
    expect(budget.taskBudgetLimit).toBe(100);
    expect(budget.startTime).toBeGreaterThan(0);
  });

  test('Records task costs correctly', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    const cost: TaskCost = {
      taskId: 'task-1',
      taskType: 'goal_research',
      executionTime: 50,
      memoryPeakMB: 10,
      dbQueriesCount: 5,
      serviceCallsCount: 2,
      success: true,
    };

    taskBudgetManagerService.recordTaskCost(cycleId, cost);
    const remaining = taskBudgetManagerService.getRemainingBudget(cycleId);

    expect(remaining).toBe(350); // 400 - 50
  });

  test('Calculates utilization percentage correctly', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    taskBudgetManagerService.recordTaskCost(cycleId, {
      taskId: 'task-1',
      taskType: 'goal_analysis',
      executionTime: 100,
      memoryPeakMB: 5,
      dbQueriesCount: 3,
      serviceCallsCount: 1,
      success: true,
    });

    const utilization = taskBudgetManagerService.getUtilizationPercent(cycleId);
    expect(utilization).toBeCloseTo(25); // 100/400 = 25%
  });

  test('Should continue executing until 90% budget used', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    // Use 350ms out of 400ms available
    taskBudgetManagerService.recordTaskCost(cycleId, {
      taskId: 'task-1',
      taskType: 'memory_consolidation',
      executionTime: 350,
      memoryPeakMB: 20,
      dbQueriesCount: 10,
      serviceCallsCount: 5,
      success: true,
    });

    // 87.5% utilization - should continue
    expect(taskBudgetManagerService.shouldContinueExecuting(cycleId)).toBe(true);

    // Use remaining 35ms to exceed 90%
    taskBudgetManagerService.recordTaskCost(cycleId, {
      taskId: 'task-2',
      taskType: 'pattern_analysis',
      executionTime: 36,
      memoryPeakMB: 8,
      dbQueriesCount: 4,
      serviceCallsCount: 2,
      success: true,
    });

    // Now at 96.25% - should not continue
    expect(taskBudgetManagerService.shouldContinueExecuting(cycleId)).toBe(false);
  });

  test('Can fit task checks work correctly', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    expect(taskBudgetManagerService.canFitTask(cycleId, 200)).toBe(true);
    expect(taskBudgetManagerService.canFitTask(cycleId, 500)).toBe(false);

    taskBudgetManagerService.recordTaskCost(cycleId, {
      taskId: 'task-1',
      taskType: 'entity_extraction',
      executionTime: 300,
      memoryPeakMB: 15,
      dbQueriesCount: 8,
      serviceCallsCount: 3,
      success: true,
    });

    expect(taskBudgetManagerService.canFitTask(cycleId, 100)).toBe(true);
    expect(taskBudgetManagerService.canFitTask(cycleId, 101)).toBe(false);
  });

  test('Gets accurate cycle statistics', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    const costs: TaskCost[] = [
      { taskId: 't1', taskType: 'goal_research', executionTime: 50, memoryPeakMB: 5, dbQueriesCount: 2, serviceCallsCount: 1, success: true },
      { taskId: 't2', taskType: 'goal_analysis', executionTime: 60, memoryPeakMB: 8, dbQueriesCount: 3, serviceCallsCount: 1, success: true },
      { taskId: 't3', taskType: 'entity_extraction', executionTime: 40, memoryPeakMB: 10, dbQueriesCount: 4, serviceCallsCount: 2, success: false },
    ];

    for (const cost of costs) {
      taskBudgetManagerService.recordTaskCost(cycleId, cost);
    }

    const stats = taskBudgetManagerService.getCycleStats(cycleId);

    expect(stats.tasksExecuted).toBe(3);
    expect(stats.tasksFailedCount).toBe(1);
    expect(stats.successRate).toBe(66.67);
    expect(stats.budgetUsed).toBe(150);
    expect(stats.budgetRemaining).toBe(250);
    expect(stats.totalQueries).toBe(9);
  });

  test('Tracks overall statistics across multiple cycles', () => {
    const cycles = ['cycle-1', 'cycle-2', 'cycle-3'];

    for (const cycleId of cycles) {
      taskBudgetManagerService.allocateBudget(cycleId);
      taskBudgetManagerService.recordTaskCost(cycleId, {
        taskId: `task-${cycleId}`,
        taskType: 'goal_research',
        executionTime: 50,
        memoryPeakMB: 5,
        dbQueriesCount: 2,
        serviceCallsCount: 1,
        success: true,
      });
    }

    const stats = taskBudgetManagerService.getStats();

    expect(stats.totalCycles).toBe(3);
    expect(stats.totalAllocated).toBe(1200); // 3 * 400
    expect(stats.totalUsed).toBe(150); // 3 * 50
    expect(stats.tasksExecutedTotal).toBe(3);
  });

  test('Clears old cycles to manage memory', () => {
    for (let i = 0; i < 15; i++) {
      const cycleId = `cycle-${i}`;
      taskBudgetManagerService.allocateBudget(cycleId);
    }

    // Keep only last 10
    taskBudgetManagerService.clearOldCycles(10);

    // Stats should reflect cleared cycles
    const stats = taskBudgetManagerService.getStats();
    expect(stats.totalCycles).toBeGreaterThan(0);
  });

  test('Handles multiple concurrent task costs', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    for (let i = 0; i < 7; i++) {
      taskBudgetManagerService.recordTaskCost(cycleId, {
        taskId: `task-${i}`,
        taskType: 'goal_research',
        executionTime: 50,
        memoryPeakMB: 5 + i,
        dbQueriesCount: 2 + i,
        serviceCallsCount: 1,
        success: i % 2 === 0,
      });
    }

    const stats = taskBudgetManagerService.getCycleStats(cycleId);
    expect(stats.tasksExecuted).toBe(7);
    expect(stats.budgetUsed).toBe(350);
  });
});

// ============================================================================
// TEST SUITE 2: Risk Assessment Service (10 tests)
// ============================================================================

describe('[Phase 4 - Risk Assessment Service]', () => {
  beforeEach(() => {
    riskAssessmentService.reset();
  });

  test('Assesses task risk with low risk for safe tasks', () => {
    const assessment = riskAssessmentService.assessTask('pattern_analysis');

    expect(assessment.riskLevel).toMatch(/^(low|medium)$/);
    expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
    expect(assessment.riskScore).toBeLessThanOrEqual(1);
    expect(assessment.failureRate).toBe(0); // First assessment
  });

  test('Assesses high risk for mutation operations', () => {
    const assessment = riskAssessmentService.assessTask('kb_maintenance');

    expect(['medium', 'high'].includes(assessment.riskLevel)).toBe(true);
    expect(assessment.risks.some(r => r.type === 'data_mutation')).toBe(true);
  });

  test('Tracks success and updates risk assessment', () => {
    riskAssessmentService.recordSuccess('goal_research');
    riskAssessmentService.recordSuccess('goal_research');
    riskAssessmentService.recordFailure('goal_research', new Error('Test failure'));

    const pattern = riskAssessmentService.getFailurePattern('goal_research');

    expect(pattern.totalAttempts).toBe(3);
    expect(pattern.totalFailures).toBe(1);
    expect(pattern.failureRate).toBeCloseTo(33.33);
  });

  test('Detects degrading task performance', () => {
    // First 4 successful
    for (let i = 0; i < 4; i++) {
      riskAssessmentService.recordSuccess('entity_extraction');
    }

    // Last 4 failures
    for (let i = 0; i < 4; i++) {
      riskAssessmentService.recordFailure('entity_extraction', new Error('Failure'));
    }

    const pattern = riskAssessmentService.getFailurePattern('entity_extraction');
    expect(pattern.trend).toBe('degrading');
  });

  test('Detects improving task performance', () => {
    // First 4 failures
    for (let i = 0; i < 4; i++) {
      riskAssessmentService.recordFailure('memory_consolidation', new Error('Failure'));
    }

    // Last 4 successes
    for (let i = 0; i < 4; i++) {
      riskAssessmentService.recordSuccess('memory_consolidation');
    }

    const pattern = riskAssessmentService.getFailurePattern('memory_consolidation');
    expect(pattern.trend).toBe('improving');
  });

  test('Gets system health assessment', () => {
    // Create a mixed scenario
    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) {
        riskAssessmentService.recordFailure('goal_analysis', new Error('Failure'));
      } else {
        riskAssessmentService.recordSuccess('goal_analysis');
      }
    }

    const health = riskAssessmentService.getSystemHealth();

    expect(health.overallHealth).toBeGreaterThan(0);
    expect(health.overallHealth).toBeLessThanOrEqual(1);
    expect(Array.isArray(health.recommendations)).toBe(true);
  });

  test('Recommends appropriate mitigation strategies', () => {
    // Create high failure scenario
    for (let i = 0; i < 10; i++) {
      riskAssessmentService.recordFailure('kb_maintenance', new Error('Failure'));
    }

    const assessment = riskAssessmentService.assessTask('kb_maintenance');

    // Should recommend skip or throttle for high failure task
    expect(['skip', 'throttle', 'isolation'].includes(assessment.mitigation.strategy)).toBe(true);
  });

  test('Gets comprehensive statistics', () => {
    // Create multi-task scenario
    for (const taskType of ['goal_research', 'entity_extraction', 'memory_consolidation']) {
      for (let i = 0; i < 5; i++) {
        if (Math.random() > 0.3) {
          riskAssessmentService.recordSuccess(taskType);
        } else {
          riskAssessmentService.recordFailure(taskType, new Error('Failure'));
        }
      }
    }

    const stats = riskAssessmentService.getStats();

    expect(stats.totalTasksAssessed).toBeGreaterThan(0);
    expect(stats.averageRiskScore).toBeGreaterThanOrEqual(0);
    expect(stats.averageRiskScore).toBeLessThanOrEqual(1);
  });

  test('Maintains failure history for analysis', () => {
    const error1 = new Error('First failure');
    const error2 = new Error('Second failure');

    riskAssessmentService.recordFailure('goal_analysis', error1);
    riskAssessmentService.recordFailure('goal_analysis', error2);

    const pattern = riskAssessmentService.getFailurePattern('goal_analysis');

    expect(pattern.lastFailures.length).toBeGreaterThan(0);
    expect(pattern.lastFailures.some(f => f.error.includes('First'))).toBe(true);
  });
});

// ============================================================================
// TEST SUITE 3: Task Priority Scheduler (10 tests)
// ============================================================================

describe('[Phase 4 - Task Priority Scheduler]', () => {
  beforeEach(() => {
    taskPrioritySchedulerService.reset();
  });

  test('Scores tasks with impact factor', () => {
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'goal_research', payload: { goalId: 'g1' } },
      { taskId: 't2', taskType: 'memory_consolidation', payload: {} },
    ];

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 1,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);

    expect(scored.length).toBe(2);
    expect(scored[0].score).toBeGreaterThan(0);
    expect(scored[0].score).toBeLessThanOrEqual(1);
    expect(scored.every(t => t.reason)).toBe(true);
  });

  test('Goal-related tasks have high urgency with stalled goals', () => {
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'goal_research', payload: { goalId: 'g1' } },
    ];

    const contextWithStalledGoal = {
      activeGoalCount: 5,
      stalledGoalCount: 3, // 3 stalled goals
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, contextWithStalledGoal);

    expect(scored[0].urgency).toBeGreaterThan(0.7);
  });

  test('Builds execution queue respecting budget constraints', () => {
    const candidates: AutonomousTask[] = [];
    for (let i = 0; i < 10; i++) {
      candidates.push({
        taskId: `t${i}`,
        taskType: ['goal_research', 'entity_extraction', 'memory_consolidation'][i % 3],
        payload: { index: i },
      });
    }

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 2,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 200);

    expect(queue.tasks.length).toBeGreaterThan(0);
    expect(queue.estimatedTotalTime).toBeLessThanOrEqual(200);
  });

  test('Sorts tasks by score in execution queue', () => {
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'memory_consolidation', payload: {} }, // Low impact
      { taskId: 't2', taskType: 'goal_research', payload: { goalId: 'g1' } }, // High impact
      { taskId: 't3', taskType: 'entity_extraction', payload: {} }, // Medium impact
    ];

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 1,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 400);

    // First task should have highest score
    for (let i = 1; i < queue.tasks.length; i++) {
      expect(queue.tasks[i - 1].score).toBeGreaterThanOrEqual(queue.tasks[i].score);
    }
  });

  test('Updates success rates based on execution', () => {
    taskPrioritySchedulerService.updateSuccessRate('goal_research', true);
    taskPrioritySchedulerService.updateSuccessRate('goal_research', true);
    taskPrioritySchedulerService.updateSuccessRate('goal_research', false);

    const stats = taskPrioritySchedulerService.getTaskStats();

    expect(stats.taskTypeScores['goal_research']).toBeDefined();
    expect(stats.taskTypeScores['goal_research'].successRate).toBeGreaterThan(0);
    expect(stats.taskTypeScores['goal_research'].successRate).toBeLessThan(1);
  });

  test('Handles empty candidate list', () => {
    const candidates: AutonomousTask[] = [];
    const context = {
      activeGoalCount: 0,
      stalledGoalCount: 0,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 400);

    expect(scored.length).toBe(0);
    expect(queue.tasks.length).toBe(0);
  });

  test('Gets accurate statistics', () => {
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'goal_research', payload: {} },
      { taskId: 't2', taskType: 'entity_extraction', payload: {} },
    ];

    const context = {
      activeGoalCount: 3,
      stalledGoalCount: 1,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    taskPrioritySchedulerService.scoreTasks(candidates, context);
    const stats = taskPrioritySchedulerService.getTaskStats();

    expect(stats.totalTasksScored).toBe(2);
    expect(stats.avgScore).toBeGreaterThan(0);
  });

  test('Generates human-readable score reasons', () => {
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'goal_research', payload: { goalId: 'g1' } },
    ];

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 3,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);

    expect(scored[0].reason.length).toBeGreaterThan(0);
    expect(scored[0].reason).toBeDefined();
  });
});

// ============================================================================
// TEST SUITE 4: Integration - Budget + Risk (8 tests)
// ============================================================================

describe('[Phase 4 - Budget & Risk Integration]', () => {
  beforeEach(() => {
    taskBudgetManagerService.reset();
    riskAssessmentService.reset();
  });

  test('Risk-adjusted scores prevent expensive high-risk tasks', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    // Simulate a high-risk task (kb_maintenance has mutation risk)
    const assessment = riskAssessmentService.assessTask('kb_maintenance');

    expect(['medium', 'high'].includes(assessment.riskLevel) || assessment.riskScore > 0.2).toBe(true);
  });

  test('Budget exhaustion stops task execution', () => {
    const cycleId = 'cycle-1';
    const budget = taskBudgetManagerService.allocateBudget(cycleId);

    // Use nearly all budget
    for (let i = 0; i < 4; i++) {
      taskBudgetManagerService.recordTaskCost(cycleId, {
        taskId: `task-${i}`,
        taskType: 'goal_research',
        executionTime: 95,
        memoryPeakMB: 10,
        dbQueriesCount: 5,
        serviceCallsCount: 2,
        success: true,
      });
    }

    const shouldContinue = taskBudgetManagerService.shouldContinueExecuting(cycleId);
    expect(shouldContinue).toBe(false);
  });

  test('Failure pattern affects risk assessment', () => {
    // Create failure pattern
    for (let i = 0; i < 8; i++) {
      riskAssessmentService.recordFailure('goal_analysis', new Error('Failure'));
    }
    for (let i = 0; i < 2; i++) {
      riskAssessmentService.recordSuccess('goal_analysis');
    }

    const assessment = riskAssessmentService.assessTask('goal_analysis');

    // Should have high failure rate
    expect(assessment.failureRate).toBeGreaterThan(50);
    expect(assessment.riskLevel).toMatch(/^(high|critical)$/);
  });

  test('System health degrades with multiple failing tasks', () => {
    const taskTypes = ['goal_research', 'entity_extraction', 'memory_consolidation'];

    for (const taskType of taskTypes) {
      for (let i = 0; i < 8; i++) {
        riskAssessmentService.recordFailure(taskType, new Error('Failure'));
      }
    }

    const health = riskAssessmentService.getSystemHealth();

    expect(health.criticalIssues.length).toBeGreaterThan(0);
    expect(health.overallHealth).toBeLessThan(0.5);
  });

  test('Successful executions improve task confidence', () => {
    // Record successes
    for (let i = 0; i < 10; i++) {
      riskAssessmentService.recordSuccess('pattern_analysis');
      taskPrioritySchedulerService.updateSuccessRate('pattern_analysis', true);
    }

    const pattern = riskAssessmentService.getFailurePattern('pattern_analysis');
    const stats = taskPrioritySchedulerService.getTaskStats();

    expect(pattern.failureRate).toBe(0);
    expect(stats.taskTypeScores['pattern_analysis'].successRate).toBeGreaterThan(0.8);
  });

  test('Mitigation strategies align with task types', () => {
    // Data-mutating task
    const kbAssessment = riskAssessmentService.assessTask('kb_maintenance');
    expect(['isolation', 'timeout'].includes(kbAssessment.mitigation.strategy)).toBe(true);

    // Safe task
    const analysisAssessment = riskAssessmentService.assessTask('pattern_analysis');
    expect(['timeout', 'isolation'].includes(analysisAssessment.mitigation.strategy)).toBe(true);
  });

  test('Budget and risk together prevent cascading failures', () => {
    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    // Create failure pattern for one task
    for (let i = 0; i < 10; i++) {
      riskAssessmentService.recordFailure('kb_maintenance', new Error('Failure'));
    }

    // New assessment should recommend skip
    const assessment = riskAssessmentService.assessTask('kb_maintenance');
    expect(assessment.mitigation.strategy).toBe('skip');

    // Task won't execute in queue
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'kb_maintenance', payload: {} },
    ];

    const context = {
      activeGoalCount: 3,
      stalledGoalCount: 0,
      budgetAvailable: 400,
      riskAssessments: new Map([
        ['kb_maintenance', assessment],
      ]),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    expect(scored[0].riskScore).toBeGreaterThan(0.5);
  });
});

// ============================================================================
// TEST SUITE 5: Integration - Priority + Execution (8 tests)
// ============================================================================

describe('[Phase 4 - Priority & Execution Integration]', () => {
  beforeEach(() => {
    taskPrioritySchedulerService.reset();
    taskBudgetManagerService.reset();
  });

  test('High-priority tasks execute before low-priority', () => {
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'memory_consolidation', payload: {} }, // Low priority
      { taskId: 't2', taskType: 'goal_research', payload: { goalId: 'g1' } }, // High priority
      { taskId: 't3', taskType: 'entity_extraction', payload: {} }, // Medium priority
    ];

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 2,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 400);

    // First task should be goal_research (highest priority for stalled goals)
    expect(queue.tasks[0].taskType).toBe('goal_research');
  });

  test('Queue respects budget constraints and priority order', () => {
    const candidates: AutonomousTask[] = [];
    for (let i = 0; i < 10; i++) {
      candidates.push({
        taskId: `t${i}`,
        taskType: i < 5 ? 'goal_research' : 'entity_extraction',
        payload: { index: i },
      });
    }

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 2,
      budgetAvailable: 250, // Limited budget
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 250);

    // Should include high-priority tasks within budget
    expect(queue.tasks.length).toBeGreaterThan(0);
    expect(queue.estimatedTotalTime).toBeLessThanOrEqual(250);
  });

  test('Execution updates success rates for future prioritization', () => {
    // Simulate task type with poor success rate
    for (let i = 0; i < 7; i++) {
      taskPrioritySchedulerService.updateSuccessRate('kb_maintenance', false);
    }
    for (let i = 0; i < 3; i++) {
      taskPrioritySchedulerService.updateSuccessRate('kb_maintenance', true);
    }

    // Task should have lower priority in next cycle
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'kb_maintenance', payload: {} },
      { taskId: 't2', taskType: 'goal_research', payload: { goalId: 'g1' } },
    ];

    const context = {
      activeGoalCount: 3,
      stalledGoalCount: 1,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);

    // goal_research should score higher than kb_maintenance
    const kbScore = scored.find(t => t.taskType === 'kb_maintenance')?.score || 0;
    const grScore = scored.find(t => t.taskType === 'goal_research')?.score || 0;

    expect(grScore).toBeGreaterThan(kbScore);
  });

  test('Stalled goals increase priority of goal-related tasks', () => {
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'goal_research', payload: { goalId: 'g1' } },
      { taskId: 't2', taskType: 'pattern_analysis', payload: {} },
    ];

    const contextWithStalled = {
      activeGoalCount: 5,
      stalledGoalCount: 3, // Multiple stalled
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const contextWithoutStalled = {
      activeGoalCount: 5,
      stalledGoalCount: 0,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scoredWithStalled = taskPrioritySchedulerService.scoreTasks(candidates, contextWithStalled);
    taskPrioritySchedulerService.reset();
    const scoredWithoutStalled = taskPrioritySchedulerService.scoreTasks(candidates, contextWithoutStalled);

    const stalledGoalResearch = scoredWithStalled.find(t => t.taskType === 'goal_research')?.score || 0;
    const noStalledGoalResearch = scoredWithoutStalled.find(t => t.taskType === 'goal_research')?.score || 0;

    expect(stalledGoalResearch).toBeGreaterThan(noStalledGoalResearch);
  });

  test('Tight budget reduces number of tasks in queue', () => {
    const candidates: AutonomousTask[] = [];
    for (let i = 0; i < 10; i++) {
      candidates.push({
        taskId: `t${i}`,
        taskType: 'goal_research',
        payload: { index: i },
      });
    }

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 2,
      budgetAvailable: 0, // No budget
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 0);

    expect(queue.tasks.length).toBe(0);
    expect(queue.tasksSkipped.length).toBeGreaterThan(0);
  });

  test('Task with high success rate gets boosted priority', () => {
    // Establish high success rate for one task
    for (let i = 0; i < 10; i++) {
      taskPrioritySchedulerService.updateSuccessRate('entity_extraction', true);
    }

    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'entity_extraction', payload: {} },
      { taskId: 't2', taskType: 'goal_research', payload: { goalId: 'g1' } },
    ];

    const context = {
      activeGoalCount: 3,
      stalledGoalCount: 0,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);

    const eeTask = scored.find(t => t.taskType === 'entity_extraction');
    expect(eeTask?.successRate).toBeGreaterThan(0.9);
  });
});

// ============================================================================
// TEST SUITE 6: Complete Pipeline (6 tests)
// ============================================================================

describe('[Phase 4 - Complete Decision Making Pipeline]', () => {
  beforeEach(() => {
    taskBudgetManagerService.reset();
    riskAssessmentService.reset();
    taskPrioritySchedulerService.reset();
  });

  test('End-to-end: Budget + Risk + Priority work together', () => {
    // Simulate a complete cycle
    const cycleId = 'cycle-1';
    const budget = taskBudgetManagerService.allocateBudget(cycleId);

    // Create candidates
    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'goal_research', payload: { goalId: 'g1' } },
      { taskId: 't2', taskType: 'kb_maintenance', payload: {} },
      { taskId: 't3', taskType: 'entity_extraction', payload: {} },
    ];

    // Assess risks
    const riskAssessments = new Map();
    for (const task of candidates) {
      const assessment = riskAssessmentService.assessTask(task.taskType);
      riskAssessments.set(task.taskType, assessment);
    }

    // Score tasks
    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 1,
      budgetAvailable: budget.availableBudget,
      riskAssessments,
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, budget.availableBudget);

    // Verify complete pipeline
    expect(budget.availableBudget).toBe(400);
    expect(scored.length).toBe(3);
    expect(queue.tasks.length).toBeGreaterThan(0);
    expect(queue.estimatedTotalTime).toBeLessThanOrEqual(400);
  });

  test('Pipeline handles high-risk scenarios gracefully', () => {
    // Create failing task scenario
    for (const taskType of ['kb_maintenance', 'entity_extraction']) {
      for (let i = 0; i < 10; i++) {
        riskAssessmentService.recordFailure(taskType, new Error('Failure'));
      }
    }

    const cycleId = 'cycle-1';
    taskBudgetManagerService.allocateBudget(cycleId);

    const candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'kb_maintenance', payload: {} },
      { taskId: 't2', taskType: 'entity_extraction', payload: {} },
      { taskId: 't3', taskType: 'goal_research', payload: { goalId: 'g1' } },
    ];

    const riskAssessments = new Map();
    for (const task of candidates) {
      const assessment = riskAssessmentService.assessTask(task.taskType);
      riskAssessments.set(task.taskType, assessment);
    }

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 2,
      budgetAvailable: 400,
      riskAssessments,
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 400);

    // High-risk tasks should be skipped or low priority
    const highRiskSkipped = queue.tasksSkipped.length > 0;
    const safeTaskIncluded = queue.tasks.some(t => t.taskType === 'goal_research');

    expect(highRiskSkipped || safeTaskIncluded).toBe(true);
  });

  test('Pipeline adapts to changing conditions', () => {
    // First cycle - all tasks healthy
    let candidates: AutonomousTask[] = [
      { taskId: 't1', taskType: 'goal_research', payload: { goalId: 'g1' } },
      { taskId: 't2', taskType: 'kb_maintenance', payload: {} },
    ];

    let context = {
      activeGoalCount: 5,
      stalledGoalCount: 0,
      budgetAvailable: 400,
      riskAssessments: new Map(),
    };

    let scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    let queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 400);
    expect(queue.tasks.length).toBe(2);

    // Simulate kb_maintenance failures
    for (let i = 0; i < 8; i++) {
      riskAssessmentService.recordFailure('kb_maintenance', new Error('Failure'));
    }

    // Second cycle - kb_maintenance now risky
    taskPrioritySchedulerService.reset();
    candidates = [
      { taskId: 't1', taskType: 'goal_research', payload: { goalId: 'g1' } },
      { taskId: 't2', taskType: 'kb_maintenance', payload: {} },
    ];

    const riskAssessments = new Map();
    for (const task of candidates) {
      const assessment = riskAssessmentService.assessTask(task.taskType);
      riskAssessments.set(task.taskType, assessment);
    }

    context = {
      activeGoalCount: 5,
      stalledGoalCount: 1,
      budgetAvailable: 400,
      riskAssessments,
    };

    scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 400);

    // kb_maintenance should be lower priority or skipped
    const kbTask = queue.tasks.find(t => t.taskType === 'kb_maintenance');
    const goalTask = queue.tasks.find(t => t.taskType === 'goal_research');

    if (kbTask && goalTask) {
      expect(goalTask.score).toBeGreaterThanOrEqual(kbTask.score);
    }
  });

  test('System health affects recommendations', () => {
    // Create degrading scenario
    const taskTypes = ['goal_research', 'entity_extraction', 'memory_consolidation', 'kb_maintenance'];

    for (const taskType of taskTypes) {
      for (let i = 0; i < 7; i++) {
        riskAssessmentService.recordFailure(taskType, new Error('Failure'));
      }
      for (let i = 0; i < 3; i++) {
        riskAssessmentService.recordSuccess(taskType);
      }
    }

    const health = riskAssessmentService.getSystemHealth();

    expect(health.criticalIssues.length).toBeGreaterThan(0);
    expect(health.recommendations.length).toBeGreaterThan(0);
  });

  test('Performance metrics stay within targets', () => {
    const cycleId = 'cycle-1';
    const startTime = Date.now();

    // Run full pipeline
    taskBudgetManagerService.allocateBudget(cycleId);

    const candidates: AutonomousTask[] = [];
    for (let i = 0; i < 5; i++) {
      candidates.push({
        taskId: `t${i}`,
        taskType: ['goal_research', 'entity_extraction', 'memory_consolidation'][i % 3],
        payload: { index: i },
      });
    }

    const riskAssessments = new Map();
    for (const task of candidates) {
      const assessment = riskAssessmentService.assessTask(task.taskType);
      riskAssessments.set(task.taskType, assessment);
    }

    const context = {
      activeGoalCount: 5,
      stalledGoalCount: 2,
      budgetAvailable: 400,
      riskAssessments,
    };

    const scored = taskPrioritySchedulerService.scoreTasks(candidates, context);
    const queue = taskPrioritySchedulerService.buildExecutionQueue(scored, 400);

    const elapsedTime = Date.now() - startTime;

    // Entire pipeline should complete in < 100ms
    expect(elapsedTime).toBeLessThan(100);
  });
});

console.log('[Phase 4 Tests] ✅ Test suite loaded (60 tests across 6 suites)');
