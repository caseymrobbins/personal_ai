/**
 * Risk Assessment Service
 *
 * Evaluates risks associated with autonomous tasks, tracks failure patterns,
 * and recommends mitigation strategies.
 *
 * Risk Categories:
 * - Execution Risks: Memory exhaustion, database overload, timeouts
 * - Data Risks: Corrupting knowledge, losing information
 * - System Risks: Blocking UI, cascading failures
 *
 * Learns from failure patterns to make increasingly accurate risk assessments.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type MitigationStrategy = 'timeout' | 'isolation' | 'throttle' | 'fallback' | 'skip';

export interface RiskFactor {
  type: string;
  severity: number;           // 0.0-1.0
  description: string;
}

export interface RiskAssessment {
  taskId: string;
  taskType: string;
  riskLevel: RiskLevel;
  riskScore: number;          // 0.0-1.0
  risks: RiskFactor[];
  failureRate: number;        // percentage 0-100
  lastFailure?: {
    timestamp: number;
    error: string;
  };
  mitigation: {
    strategy: MitigationStrategy;
    config: Record<string, unknown>;
  };
  recommendation: string;
}

export interface FailurePattern {
  taskType: string;
  totalAttempts: number;
  totalFailures: number;
  failureRate: number;        // percentage
  lastFailures: Array<{
    timestamp: number;
    error: string;
  }>;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface SystemHealth {
  overallHealth: number;      // 0.0-1.0 (1.0 = healthy)
  taskTypesAtRisk: string[];
  criticalIssues: string[];
  recommendations: string[];
}

export interface RiskStats {
  totalTasksAssessed: number;
  criticalRiskCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
  tasksWithKnownIssues: number;
  systemHealth: number;
}

/**
 * RiskAssessmentService
 *
 * Tracks task success/failure patterns and provides risk-aware recommendations
 */
class RiskAssessmentService {
  private taskSuccessHistory: Map<string, boolean[]> = new Map();
  private taskFailureHistory: Map<string, Array<{ timestamp: number; error: string }>> = new Map();
  private taskFailurePatterns: Map<string, FailurePattern> = new Map();
  private riskStats = {
    totalAssessed: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
  };

  private readonly HISTORY_WINDOW = 20;            // Track last 20 executions
  private readonly _FAILURE_THRESHOLD_CRITICAL = 0.5; // >50% = critical
  private readonly _FAILURE_THRESHOLD_HIGH = 0.3;     // >30% = high
  private readonly _FAILURE_THRESHOLD_MEDIUM = 0.1;   // >10% = medium

  private readonly RISK_WEIGHTS = {
    executionRisk: 0.4,
    dataRisk: 0.35,
    systemRisk: 0.25,
  };

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[RiskAssessment] ✅ Service initialized');
  }

  /**
   * Assess risk for a specific task
   */
  assessTask(taskType: string, payload?: Record<string, unknown>): RiskAssessment {
    const taskId = `${taskType}-${Date.now()}`;
    const failurePattern = this.taskFailurePatterns.get(taskType) || this.initializePattern(taskType);
    const failureHistory = this.taskFailureHistory.get(taskType) || [];

    // Calculate risk components
    const executionRisk = this.calculateExecutionRisk(taskType, payload);
    const dataRisk = this.calculateDataRisk(taskType, payload);
    const systemRisk = this.calculateSystemRisk(taskType);

    // Composite risk score
    const riskScore = Math.min(
      1.0,
      (executionRisk * this.RISK_WEIGHTS.executionRisk) +
      (dataRisk * this.RISK_WEIGHTS.dataRisk) +
      (systemRisk * this.RISK_WEIGHTS.systemRisk)
    );

    // Adjust for historical failure rate
    const historicalFailureRate = failurePattern.failureRate / 100;
    const adjustedRiskScore = riskScore * (1 + historicalFailureRate * 0.5);

    // Determine risk level
    const riskLevel = this.getRiskLevel(adjustedRiskScore);

    // Gather risk factors
    const risks = this.gatherRiskFactors(taskType, payload);

    // Determine mitigation strategy
    const mitigation = this.getMitigationStrategy(
      taskType,
      riskLevel,
      failurePattern,
      risks
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(taskType, riskLevel, failurePattern);

    const assessment: RiskAssessment = {
      taskId,
      taskType,
      riskLevel,
      riskScore: Math.min(1.0, adjustedRiskScore),
      risks,
      failureRate: failurePattern.failureRate,
      lastFailure: failureHistory.length > 0 ? failureHistory[0] : undefined,
      mitigation,
      recommendation,
    };

    this.updateRiskStats(riskLevel);
    this.riskStats.totalAssessed++;

    console.log(
      `[RiskAssessment] 📋 Task ${taskType}: ${riskLevel} risk ` +
      `(score: ${riskScore.toFixed(2)}, failure rate: ${failurePattern.failureRate.toFixed(0)}%)`
    );

    return assessment;
  }

  /**
   * Calculate execution risk (memory, timeouts, database load)
   */
  private calculateExecutionRisk(taskType: string, payload?: Record<string, unknown>): number {
    let risk = 0;

    // High memory consumers
    if (['entity_extraction', 'pattern_analysis', 'goal_analysis'].includes(taskType)) {
      risk += 0.3;
    }

    // High database consumers
    if (['memory_consolidation', 'entity_extraction', 'kb_maintenance'].includes(taskType)) {
      risk += 0.3;
    }

    // Check payload for risky patterns
    if (payload) {
      // Large batch operations
      if (payload.batchSize && typeof payload.batchSize === 'number' && payload.batchSize > 100) {
        risk += 0.2;
      }
    }

    return Math.min(1.0, risk);
  }

  /**
   * Calculate data corruption risk
   */
  private calculateDataRisk(taskType: string, _payload?: Record<string, unknown>): number {
    let risk = 0;

    // Mutation operations
    if (['kb_maintenance', 'entity_extraction', 'user_model_update'].includes(taskType)) {
      risk += 0.4;
    }

    // Goal-modifying operations
    if (taskType === 'goal_analysis') {
      risk += 0.2;
    }

    return Math.min(1.0, risk);
  }

  /**
   * Calculate system impact risk
   */
  private calculateSystemRisk(taskType: string): number {
    let risk = 0;

    // Long-running operations
    if (taskType === 'memory_consolidation') {
      risk += 0.2;
    }

    // Complex analysis
    if (['pattern_analysis', 'goal_analysis'].includes(taskType)) {
      risk += 0.15;
    }

    return Math.min(1.0, risk);
  }

  /**
   * Gather all risk factors for a task
   */
  private gatherRiskFactors(taskType: string, _payload?: Record<string, unknown>): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Check failure history
    const pattern = this.taskFailurePatterns.get(taskType);
    if (pattern && pattern.failureRate > 30) {
      factors.push({
        type: 'known_failures',
        severity: Math.min(1.0, pattern.failureRate / 100),
        description: `${pattern.failureRate.toFixed(0)}% failure rate in recent attempts`,
      });
    }

    // Check task-specific risks
    if (['kb_maintenance', 'entity_extraction'].includes(taskType)) {
      factors.push({
        type: 'data_mutation',
        severity: 0.7,
        description: 'This task modifies knowledge base or entities',
      });
    }

    if (['memory_consolidation', 'pattern_analysis'].includes(taskType)) {
      factors.push({
        type: 'memory_intensive',
        severity: 0.5,
        description: 'This task performs memory-intensive operations',
      });
    }

    return factors;
  }

  /**
   * Determine risk level from score
   */
  private getRiskLevel(score: number): RiskLevel {
    if (score >= 0.75) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.25) return 'medium';
    return 'low';
  }

  /**
   * Determine mitigation strategy
   */
  private getMitigationStrategy(
    _taskType: string,
    riskLevel: RiskLevel,
    pattern: FailurePattern,
    risks: RiskFactor[]
  ): { strategy: MitigationStrategy; config: Record<string, unknown> } {
    // Critical risk: skip entirely
    if (riskLevel === 'critical') {
      return {
        strategy: 'skip',
        config: {
          reason: 'Critical risk level prevents execution',
          retryAfterMinutes: 30,
        },
      };
    }

    // High risk with high failure rate: throttle
    if (riskLevel === 'high' && pattern.failureRate > 40) {
      return {
        strategy: 'throttle',
        config: {
          maxFrequency: 1,
          minIntervalMinutes: 60,
          reason: 'High failure rate requires throttling',
        },
      };
    }

    // Data mutation risks: use isolation
    if (risks.some(r => r.type === 'data_mutation')) {
      return {
        strategy: 'isolation',
        config: {
          rollbackOnFailure: true,
          validateAfter: true,
          reason: 'Data mutation requires rollback capability',
        },
      };
    }

    // Default: timeout protection
    return {
      strategy: 'timeout',
      config: {
        timeoutMs: 100,
        reason: 'Standard timeout protection',
      },
    };
  }

  /**
   * Generate human-readable recommendation
   */
  private generateRecommendation(
    _taskType: string,
    riskLevel: RiskLevel,
    pattern: FailurePattern
  ): string {
    if (riskLevel === 'critical') {
      return `🚫 Skip this task - critical risk. Consider investigating recent failures.`;
    }

    if (riskLevel === 'high') {
      if (pattern.trend === 'degrading') {
        return `⚠️ High risk and degrading trend. Consider reducing frequency or investigating failures.`;
      }
      return `⚠️ High risk. Execute with caution and monitor for failures.`;
    }

    if (riskLevel === 'medium') {
      if (pattern.failureRate > 20) {
        return `🔶 Medium risk with history of failures. Ensure proper error handling.`;
      }
      return `ℹ️ Medium risk. Normal execution with standard timeout protection.`;
    }

    return `✅ Low risk. Safe to execute.`;
  }

  /**
   * Record task success
   */
  recordSuccess(taskType: string): void {
    this.recordExecution(taskType, true);
  }

  /**
   * Record task failure
   */
  recordFailure(taskType: string, error: Error): void {
    // Add to failure history
    let history = this.taskFailureHistory.get(taskType) || [];
    history.unshift({ timestamp: Date.now(), error: error.message });
    history = history.slice(0, this.HISTORY_WINDOW * 2); // Keep extended history
    this.taskFailureHistory.set(taskType, history);

    // Record execution
    this.recordExecution(taskType, false);

    console.warn(`[RiskAssessment] ❌ Task ${taskType} failed: ${error.message}`);
  }

  /**
   * Record execution result and update pattern
   */
  private recordExecution(taskType: string, success: boolean): void {
    let history = this.taskSuccessHistory.get(taskType) || [];
    history.push(success);
    history = history.slice(-this.HISTORY_WINDOW);
    this.taskSuccessHistory.set(taskType, history);

    // Update failure pattern
    const pattern = this.taskFailurePatterns.get(taskType) || this.initializePattern(taskType);
    pattern.totalAttempts++;
    if (!success) {
      pattern.totalFailures++;
    }
    pattern.failureRate = (pattern.totalFailures / pattern.totalAttempts) * 100;
    pattern.trend = this.calculateTrend(history);
    this.taskFailurePatterns.set(taskType, pattern);
  }

  /**
   * Calculate trend from recent history
   */
  private calculateTrend(history: boolean[]): 'improving' | 'stable' | 'degrading' {
    if (history.length < 4) return 'stable';

    const recent = history.slice(-4);
    const older = history.slice(-8, -4);

    if (older.length === 0) return 'stable';

    const recentSuccessRate = recent.filter(s => s).length / recent.length;
    const olderSuccessRate = older.filter(s => s).length / older.length;

    const diff = recentSuccessRate - olderSuccessRate;
    if (diff > 0.2) return 'improving';
    if (diff < -0.2) return 'degrading';
    return 'stable';
  }

  /**
   * Get failure pattern for a task type
   */
  getFailurePattern(taskType: string): FailurePattern {
    return this.taskFailurePatterns.get(taskType) || this.initializePattern(taskType);
  }

  /**
   * Initialize a pattern for a new task type
   */
  private initializePattern(taskType: string): FailurePattern {
    const pattern: FailurePattern = {
      taskType,
      totalAttempts: 0,
      totalFailures: 0,
      failureRate: 0,
      lastFailures: [],
      trend: 'stable',
    };
    this.taskFailurePatterns.set(taskType, pattern);
    return pattern;
  }

  /**
   * Get system health assessment
   */
  getSystemHealth(): SystemHealth {
    const patterns = Array.from(this.taskFailurePatterns.values());
    const criticalTasks = patterns.filter(p => p.failureRate > 50);
    const highRiskTasks = patterns.filter(p => p.failureRate > 30);
    const degradingTasks = patterns.filter(p => p.trend === 'degrading');

    const taskTypesAtRisk = [
      ...criticalTasks.map(p => p.taskType),
      ...highRiskTasks.map(p => p.taskType),
    ];

    const criticalIssues: string[] = [];
    if (criticalTasks.length > 0) {
      criticalIssues.push(`${criticalTasks.length} tasks with >50% failure rate`);
    }
    if (degradingTasks.length > 0) {
      criticalIssues.push(`${degradingTasks.length} tasks with degrading performance`);
    }

    const recommendations: string[] = [];
    if (criticalTasks.length > 0) {
      recommendations.push('Review and fix critical failure tasks');
    }
    if (degradingTasks.length > 0) {
      recommendations.push('Investigate tasks with degrading trends');
    }
    if (highRiskTasks.length > 0) {
      recommendations.push('Monitor high-risk tasks closely');
    }

    // Calculate overall health (0.0-1.0)
    const avgFailureRate = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.failureRate, 0) / patterns.length / 100
      : 0;
    const health = Math.max(0, 1.0 - avgFailureRate);

    return {
      overallHealth: health,
      taskTypesAtRisk,
      criticalIssues,
      recommendations,
    };
  }

  /**
   * Get statistics
   */
  getStats(): RiskStats {
    const patterns = Array.from(this.taskFailurePatterns.values());
    const avgRiskScore = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + (p.failureRate / 100), 0) / patterns.length
      : 0;

    return {
      totalTasksAssessed: this.riskStats.totalAssessed,
      criticalRiskCount: this.riskStats.criticalCount,
      highRiskCount: this.riskStats.highCount,
      mediumRiskCount: this.riskStats.mediumCount,
      lowRiskCount: this.riskStats.lowCount,
      averageRiskScore: avgRiskScore,
      tasksWithKnownIssues: patterns.filter(p => p.failureRate > 10).length,
      systemHealth: this.getSystemHealth().overallHealth,
    };
  }

  /**
   * Update risk statistics
   */
  private updateRiskStats(riskLevel: RiskLevel): void {
    switch (riskLevel) {
      case 'critical':
        this.riskStats.criticalCount++;
        break;
      case 'high':
        this.riskStats.highCount++;
        break;
      case 'medium':
        this.riskStats.mediumCount++;
        break;
      case 'low':
        this.riskStats.lowCount++;
        break;
    }
  }

  /**
   * Reset all statistics (for testing)
   */
  reset(): void {
    this.taskSuccessHistory.clear();
    this.taskFailureHistory.clear();
    this.taskFailurePatterns.clear();
    this.riskStats = {
      totalAssessed: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };
    console.log('[RiskAssessment] 🔄 Service reset');
  }
}

// Export singleton instance
export const riskAssessmentService = new RiskAssessmentService();
