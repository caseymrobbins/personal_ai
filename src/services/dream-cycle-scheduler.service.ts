/**
 * DREAM CYCLE SCHEDULER SERVICE
 * =============================
 * Manages scheduled dream cycles for Agent 3 (The Optimizer)
 * Orchestrates periodic self-reflection, memory consolidation, and profile evolution
 *
 * The "Dream Cycle" is inspired by biological sleep cycles:
 * - REM sleep for memory consolidation
 * - Deep sleep for emotional processing
 * - Light sleep for pattern recognition
 *
 * This service schedules these operations and manages their execution
 */

export interface DreamCycleConfig {
  enabled: boolean;
  scheduleType: 'idle-time' | 'hourly' | 'daily' | 'weekly' | 'custom';
  idleThresholdMinutes?: number; // For idle-time schedule (default: 60 minutes)
  timeOfDay?: string; // HH:MM format for daily cycles
  dayOfWeek?: number; // 0-6 for weekly cycles
  intervalMinutes?: number; // For custom schedules
  maxCycleDurationMs: number;
  minInteractionsSinceLastCycle: number;
  enableAutoTrigger: boolean; // Trigger on significant emotional events
}

export interface DreamCycleSchedule {
  cycleId: string;
  scheduledTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  phasesDuration: {
    consolidation: number;
    counterfactual: number;
    evolution: number;
  };
  phasesCompleted: string[];
  insights: string[];
  evolutionDetected: boolean;
  memoryConsolidated: number; // Number of memories consolidated
  nextScheduledTime?: Date;
}

export interface CyclePhase {
  name: 'consolidation' | 'counterfactual' | 'evolution' | 'summary';
  startTime: Date;
  endTime?: Date;
  durationMs: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  metrics?: {
    memoryRecallAccuracy: number;
    patternIdentification: number;
    insightGeneration: number;
  };
}

export interface DreamCycleMetrics {
  totalCyclesScheduled: number;
  totalCyclesCompleted: number;
  totalCyclesFailed: number;
  averageCycleDuration: number;
  lastCycleTime: Date | null;
  nextCycleTime: Date | null;
  totalMemoriesConsolidated: number;
  totalInsightsGenerated: number;
  evolutionEventsTriggered: number;
}

/**
 * Dream Cycle Scheduler Service
 * Coordinates periodic self-reflection and optimization cycles
 */
class DreamCycleSchedulerService {
  private static instance: DreamCycleSchedulerService;
  private config: DreamCycleConfig;
  private currentSchedule: DreamCycleSchedule | null = null;
  private scheduleHistory: DreamCycleSchedule[] = [];
  private currentPhase: CyclePhase | null = null;
  private isSchedulerRunning = false;
  private schedulerIntervalId: NodeJS.Timeout | null = null;
  private idleCheckIntervalId: NodeJS.Timeout | null = null;
  private nextScheduledTime: Date | null = null;
  private lastCycleTime: Date | null = null;
  private lastInteractionTime: Date = new Date();
  private interactionsSinceLastCycle = 0;
  private metrics: DreamCycleMetrics = {
    totalCyclesScheduled: 0,
    totalCyclesCompleted: 0,
    totalCyclesFailed: 0,
    averageCycleDuration: 0,
    lastCycleTime: null,
    nextCycleTime: null,
    totalMemoriesConsolidated: 0,
    totalInsightsGenerated: 0,
    evolutionEventsTriggered: 0,
  };

  static getInstance(): DreamCycleSchedulerService {
    if (!DreamCycleSchedulerService.instance) {
      DreamCycleSchedulerService.instance = new DreamCycleSchedulerService();
    }
    return DreamCycleSchedulerService.instance;
  }

  /**
   * Initialize the dream cycle scheduler
   */
  initialize(config?: Partial<DreamCycleConfig>): void {
    this.config = {
      enabled: true,
      scheduleType: 'idle-time',
      idleThresholdMinutes: 60, // 60 minutes idle before dream cycle
      maxCycleDurationMs: 60000, // 60 seconds
      minInteractionsSinceLastCycle: 10,
      enableAutoTrigger: true,
      ...config,
    };

    console.log('🌙 Dream Cycle Scheduler initialized');
    console.log(`   Schedule Type: ${this.config.scheduleType}`);
    if (this.config.scheduleType === 'idle-time') {
      console.log(`   Idle Threshold: ${this.config.idleThresholdMinutes} minutes`);
    }
    console.log(`   Auto-trigger: ${this.config.enableAutoTrigger}`);
  }

  /**
   * Start the scheduler - begins monitoring for dream cycle opportunities
   */
  startScheduler(): void {
    if (this.isSchedulerRunning) {
      console.warn('⚠️ Scheduler already running');
      return;
    }

    this.isSchedulerRunning = true;

    if (this.config.scheduleType === 'idle-time') {
      // Start idle-time monitoring
      this.startIdleTimeMonitoring();
    } else {
      // Use time-based scheduling
      this.scheduleNextCycle();
    }

    console.log('✓ Dream Cycle Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.schedulerIntervalId) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    if (this.idleCheckIntervalId) {
      clearInterval(this.idleCheckIntervalId);
      this.idleCheckIntervalId = null;
    }
    this.isSchedulerRunning = false;
    console.log('✓ Dream Cycle Scheduler stopped');
  }

  /**
   * Calculate next scheduled cycle time based on config
   */
  private calculateNextScheduleTime(): Date {
    const now = new Date();
    let nextTime = new Date(now);

    switch (this.config.scheduleType) {
      case 'hourly':
        nextTime.setHours(nextTime.getHours() + 1);
        nextTime.setMinutes(0);
        nextTime.setSeconds(0);
        break;

      case 'daily':
        if (this.config.timeOfDay) {
          const [hours, minutes] = this.config.timeOfDay.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);

          // If time has passed today, schedule for tomorrow
          if (nextTime <= now) {
            nextTime.setDate(nextTime.getDate() + 1);
          }
        }
        break;

      case 'weekly':
        const targetDay = this.config.dayOfWeek || 0; // Sunday default
        nextTime.setDate(nextTime.getDate() + ((targetDay + 7 - nextTime.getDay()) % 7));
        if (this.config.timeOfDay) {
          const [hours, minutes] = this.config.timeOfDay.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
        }
        if (nextTime <= now) {
          nextTime.setDate(nextTime.getDate() + 7);
        }
        break;

      case 'custom':
        if (this.config.intervalMinutes) {
          nextTime = new Date(now.getTime() + this.config.intervalMinutes * 60000);
        }
        break;
    }

    return nextTime;
  }

  /**
   * Start idle-time monitoring - checks if system has been idle and triggers cycle
   */
  private startIdleTimeMonitoring(): void {
    if (!this.config.enabled || !this.isSchedulerRunning) {
      return;
    }

    const idleThresholdMs = (this.config.idleThresholdMinutes || 60) * 60 * 1000;

    console.log(`⏰ Idle-time monitoring started (threshold: ${this.config.idleThresholdMinutes} minutes)`);

    // Check every 30 seconds if idle threshold has been reached
    this.idleCheckIntervalId = setInterval(() => {
      const now = new Date();
      const timeSinceLastInteraction = now.getTime() - this.lastInteractionTime.getTime();

      if (timeSinceLastInteraction >= idleThresholdMs) {
        console.log(`😴 System idle for ${this.config.idleThresholdMinutes} minutes, triggering dream cycle`);
        this.triggerDreamCycle('idle-triggered');
        // Reset the interaction timer after cycle trigger
        this.lastInteractionTime = new Date();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Record user interaction to reset idle timer
   */
  recordUserInteraction(): void {
    this.lastInteractionTime = new Date();
    this.interactionsSinceLastCycle++;

    if (this.config.scheduleType === 'idle-time') {
      const idleThresholdMs = (this.config.idleThresholdMinutes || 60) * 60 * 1000;
      const timeSinceLastInteraction = new Date().getTime() - this.lastInteractionTime.getTime();
      console.log(
        `👤 User interaction recorded (idle timer reset: ${Math.round(idleThresholdMs / 60000)} minutes until next dream cycle)`
      );
    }
  }

  /**
   * Get current idle time in minutes
   */
  getCurrentIdleTimeMinutes(): number {
    const now = new Date();
    return Math.round((now.getTime() - this.lastInteractionTime.getTime()) / 60000);
  }

  /**
   * Schedule the next dream cycle (for time-based scheduling)
   */
  private scheduleNextCycle(): void {
    if (!this.config.enabled || !this.isSchedulerRunning) {
      return;
    }

    const nextTime = this.calculateNextScheduleTime();
    this.nextScheduledTime = nextTime;
    this.metrics.nextCycleTime = nextTime;

    const now = new Date();
    const delayMs = nextTime.getTime() - now.getTime();

    console.log(`⏰ Next dream cycle scheduled for: ${nextTime.toLocaleTimeString()}`);
    console.log(`   Time until cycle: ${Math.round(delayMs / 1000)}s`);

    // Clear existing interval
    if (this.schedulerIntervalId) {
      clearInterval(this.schedulerIntervalId);
    }

    // Set new interval
    this.schedulerIntervalId = setTimeout(() => {
      this.triggerDreamCycle('scheduled');
      this.scheduleNextCycle(); // Reschedule for next cycle
    }, delayMs);
  }

  /**
   * Trigger a dream cycle (scheduled, idle-triggered, manual, or auto-trigger)
   */
  async triggerDreamCycle(
    triggerType: 'scheduled' | 'idle-triggered' | 'manual' | 'auto-trigger' = 'manual'
  ): Promise<DreamCycleSchedule | null> {
    if (this.currentSchedule && this.currentSchedule.status === 'running') {
      console.warn('⚠️ Dream cycle already running');
      return null;
    }

    // Check if enough interactions since last cycle
    if (
      triggerType === 'auto-trigger' &&
      this.interactionsSinceLastCycle < this.config.minInteractionsSinceLastCycle
    ) {
      console.log('ℹ️ Not enough interactions since last cycle, skipping auto-trigger');
      return null;
    }

    return this.beginDreamCycle(triggerType);
  }

  /**
   * Begin execution of a new dream cycle
   */
  private async beginDreamCycle(triggerType: string): Promise<DreamCycleSchedule> {
    const cycleId = this.generateCycleId();
    const now = new Date();

    this.currentSchedule = {
      cycleId,
      scheduledTime: this.nextScheduledTime || now,
      actualStartTime: now,
      status: 'running',
      phasesDuration: {
        consolidation: 0,
        counterfactual: 0,
        evolution: 0,
      },
      phasesCompleted: [],
      insights: [],
      evolutionDetected: false,
      memoryConsolidated: 0,
    };

    this.metrics.totalCyclesScheduled++;
    this.lastCycleTime = now;
    this.metrics.lastCycleTime = now;
    this.interactionsSinceLastCycle = 0;

    console.log(`🌙 Dream Cycle ${cycleId.slice(0, 8)} starting (${triggerType})`);
    console.log(`   Max duration: ${this.config.maxCycleDurationMs}ms`);

    // Phase 1: Memory Consolidation
    await this.executePhase('consolidation', 'consolidation');

    // Phase 2: Counterfactual Simulation
    await this.executePhase('counterfactual', 'counterfactual');

    // Phase 3: Profile Evolution
    await this.executePhase('evolution', 'evolution');

    // Phase 4: Summary & Integration
    await this.completeDreamCycle();

    return this.currentSchedule;
  }

  /**
   * Execute a specific dream cycle phase
   */
  private async executePhase(
    phaseName: 'consolidation' | 'counterfactual' | 'evolution',
    categoryKey: keyof DreamCycleSchedule['phasesDuration']
  ): Promise<void> {
    if (!this.currentSchedule) {
      return;
    }

    const phaseStartTime = Date.now();

    this.currentPhase = {
      name: phaseName as CyclePhase['name'],
      startTime: new Date(),
      durationMs: 0,
      status: 'running',
    };

    console.log(`  ▶️  Phase: ${phaseName.toUpperCase()}`);

    // Simulate phase execution (in production, this would call actual services)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000 + 2000));

    const phaseDuration = Date.now() - phaseStartTime;
    this.currentPhase.endTime = new Date();
    this.currentPhase.durationMs = phaseDuration;
    this.currentPhase.status = 'completed';

    if (this.currentSchedule) {
      this.currentSchedule.phasesDuration[categoryKey] = phaseDuration;
      this.currentSchedule.phasesCompleted.push(phaseName);
    }

    console.log(`     ✓ Completed in ${phaseDuration}ms`);
  }

  /**
   * Complete the dream cycle and summarize insights
   */
  private async completeDreamCycle(): Promise<void> {
    if (!this.currentSchedule) {
      return;
    }

    const endTime = new Date();
    this.currentSchedule.actualEndTime = endTime;

    const totalDuration =
      endTime.getTime() - (this.currentSchedule.actualStartTime?.getTime() || 0);

    // Generate insights
    const insights = this.generateDreamInsights();
    this.currentSchedule.insights = insights;

    // Check for evolution
    const evolutionDetected = Math.random() > 0.6; // 40% chance in demo
    this.currentSchedule.evolutionDetected = evolutionDetected;

    if (evolutionDetected) {
      this.metrics.evolutionEventsTriggered++;
    }

    // Simulate memory consolidation
    const memoriesConsolidated = Math.floor(Math.random() * 20) + 5;
    this.currentSchedule.memoryConsolidated = memoriesConsolidated;
    this.metrics.totalMemoriesConsolidated += memoriesConsolidated;

    // Update metrics
    this.metrics.totalInsightsGenerated += insights.length;
    this.currentSchedule.status = 'completed';
    this.metrics.totalCyclesCompleted++;

    const avgDuration =
      (this.metrics.averageCycleDuration * (this.metrics.totalCyclesCompleted - 1) +
        totalDuration) /
      this.metrics.totalCyclesCompleted;
    this.metrics.averageCycleDuration = avgDuration;

    // Archive schedule
    this.scheduleHistory.push(this.currentSchedule);

    console.log(`✨ Dream Cycle ${this.currentSchedule.cycleId.slice(0, 8)} completed`);
    console.log(`   Total duration: ${totalDuration}ms`);
    console.log(`   Memories consolidated: ${memoriesConsolidated}`);
    console.log(`   Insights generated: ${insights.length}`);
    if (evolutionDetected) {
      console.log(`   🚀 EVOLUTION DETECTED`);
    }
  }

  /**
   * Generate insights from the dream cycle
   */
  private generateDreamInsights(): string[] {
    const insightTemplates = [
      'Identified pattern in user emotion responses',
      'Discovered new connection between concepts',
      'Optimized response strategy effectiveness',
      'Detected evolution in user preferences',
      'Consolidated memory of successful interactions',
      'Identified potential improvements in support strategies',
      'Found alignment between multiple user goals',
      'Recognized recurring emotional triggers',
      'Consolidated learning from challenging interactions',
      'Identified opportunity for personalization',
    ];

    const numInsights = Math.floor(Math.random() * 3) + 2; // 2-4 insights
    const insights: string[] = [];

    for (let i = 0; i < numInsights; i++) {
      const randomIndex = Math.floor(Math.random() * insightTemplates.length);
      insights.push(insightTemplates[randomIndex]);
    }

    return insights;
  }

  /**
   * Check for auto-trigger conditions
   * Called when significant emotional events occur
   */
  checkAutoTriggerConditions(
    emotionalIntensity: number,
    emotionalShift: number
  ): boolean {
    if (!this.config.enableAutoTrigger) {
      return false;
    }

    // Auto-trigger if:
    // 1. User recovered from significant emotional distress (high shift, low current intensity)
    // 2. Major emotional event just occurred
    const shouldTrigger =
      (emotionalShift > 0.5 && emotionalIntensity < 0.3) || emotionalIntensity > 0.85;

    if (shouldTrigger) {
      this.interactionsSinceLastCycle++;
      if (this.interactionsSinceLastCycle >= this.config.minInteractionsSinceLastCycle) {
        console.log('🌙 Auto-trigger conditions met, initiating dream cycle');
        return true;
      }
    }

    return false;
  }

  /**
   * Record user interaction for cycle trigger tracking
   */
  recordInteraction(userId: string): void {
    this.interactionsSinceLastCycle++;

    if (
      this.config.enableAutoTrigger &&
      this.interactionsSinceLastCycle >= this.config.minInteractionsSinceLastCycle
    ) {
      // Could trigger here, but we'll let the scheduler manage it
    }
  }

  /**
   * Get current schedule information
   */
  getCurrentSchedule(): DreamCycleSchedule | null {
    return this.currentSchedule;
  }

  /**
   * Get schedule history
   */
  getScheduleHistory(limit: number = 10): DreamCycleSchedule[] {
    return this.scheduleHistory.slice(-limit);
  }

  /**
   * Get next scheduled cycle time
   */
  getNextScheduledTime(): Date | null {
    return this.nextScheduledTime;
  }

  /**
   * Get metrics
   */
  getMetrics(): DreamCycleMetrics {
    return { ...this.metrics };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<DreamCycleConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.isSchedulerRunning) {
      this.scheduleNextCycle();
    }
    console.log('⚙️ Dream Cycle Scheduler config updated');
  }

  /**
   * Generate unique cycle ID
   */
  private generateCycleId(): string {
    return `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.stopScheduler();
    this.currentSchedule = null;
    this.scheduleHistory = [];
    this.currentPhase = null;
    this.nextScheduledTime = null;
    this.lastCycleTime = null;
    this.lastInteractionTime = new Date();
    this.interactionsSinceLastCycle = 0;
    this.metrics = {
      totalCyclesScheduled: 0,
      totalCyclesCompleted: 0,
      totalCyclesFailed: 0,
      averageCycleDuration: 0,
      lastCycleTime: null,
      nextCycleTime: null,
      totalMemoriesConsolidated: 0,
      totalInsightsGenerated: 0,
      evolutionEventsTriggered: 0,
    };
    console.log('🔄 Dream Cycle Scheduler reset');
  }
}

export const dreamCycleScheduler = DreamCycleSchedulerService.getInstance();
export { DreamCycleSchedulerService };
