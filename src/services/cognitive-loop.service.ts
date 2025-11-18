/**
 * Cognitive Loop Service (Phase 1: Foundation)
 *
 * Manages the persistent background cognitive process that runs independently
 * of user interactions. This enables:
 * - Continuous thought and reasoning
 * - Memory consolidation
 * - Autonomous goal pursuit
 * - Self-improvement tasks
 *
 * Architecture:
 * - Main Thread: Lightweight wrapper for UI integration
 * - Web Worker: Heavy lifting for cognitive processing (non-blocking)
 * - Shared State: Via IndexedDB + postMessage
 */

export type CognitiveLoopState = 'idle' | 'thinking' | 'consolidating' | 'error';

export interface CognitiveWakeCycle {
  id: string;
  timestamp: number;
  duration: number;
  tasksCompleted: number;
  memoryConsolidated: boolean;
  insightsGenerated: string[];
  errors: string[];
}

export interface CognitiveLoopConfig {
  wakeIntervalMs: number; // How often to run cognitive cycle (e.g., 5 minutes)
  maxTasksPerCycle: number; // Max background tasks per wake cycle
  memoryConsolidationThreshold: number; // Items in working memory before consolidation
  enableAutoStart: boolean; // Start on service initialization
  enableLogging: boolean; // Log cognitive processes
}

export interface CognitiveLoopStatus {
  isActive: boolean;
  currentState: CognitiveLoopState;
  lastWakeCycle: CognitiveWakeCycle | null;
  nextWakeTime: number | null;
  totalCycles: number;
  uptime: number; // milliseconds
}

/**
 * CognitiveLoopService
 *
 * Orchestrates the autonomous cognitive process. This runs in the main thread
 * but delegates heavy work to a Web Worker.
 */
class CognitiveLoopService {
  private config: CognitiveLoopConfig;
  private status: CognitiveLoopStatus;
  private worker: Worker | null = null;
  private wakeTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private cycleHistory: CognitiveWakeCycle[] = [];

  constructor(config: Partial<CognitiveLoopConfig> = {}) {
    this.config = {
      wakeIntervalMs: 5 * 60 * 1000, // 5 minutes default
      maxTasksPerCycle: 10,
      memoryConsolidationThreshold: 50,
      enableAutoStart: true,
      enableLogging: true,
      ...config,
    };

    this.status = {
      isActive: false,
      currentState: 'idle',
      lastWakeCycle: null,
      nextWakeTime: null,
      totalCycles: 0,
      uptime: 0,
    };

    this.startTime = Date.now();

    if (this.config.enableAutoStart) {
      this.initialize();
    }
  }

  /**
   * Initialize the Cognitive Loop
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.enableLogging) {
        console.log('[CognitiveLoop] Initializing...');
      }

      // Initialize Web Worker for heavy cognitive work
      try {
        this.worker = new Worker(
          new URL('./cognitive-loop.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event) => this.handleWorkerMessage(event);
        this.worker.onerror = (error) => this.handleWorkerError(error);

        if (this.config.enableLogging) {
          console.log('[CognitiveLoop] ✅ Web Worker initialized');
        }
      } catch (error) {
        console.warn('[CognitiveLoop] ⚠️ Web Worker not available, running in main thread');
        // Fallback: worker optional for browser compatibility
      }

      // Start the wake cycle
      this.startWakeCycles();

      this.status.isActive = true;

      if (this.config.enableLogging) {
        console.log('[CognitiveLoop] ✅ Service initialized');
      }
    } catch (error) {
      console.error('[CognitiveLoop] ❌ Initialization failed:', error);
      this.status.currentState = 'error';
      throw error;
    }
  }

  /**
   * Start periodic wake cycles
   */
  private startWakeCycles(): void {
    if (this.config.enableLogging) {
      console.log(
        `[CognitiveLoop] Starting wake cycles (interval: ${this.config.wakeIntervalMs}ms)`
      );
    }

    // Initial wake after delay
    this.scheduleNextWake();
  }

  /**
   * Schedule the next wake cycle
   */
  private scheduleNextWake(): void {
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
    }

    const nextWakeTime = Date.now() + this.config.wakeIntervalMs;
    this.status.nextWakeTime = nextWakeTime;

    this.wakeTimer = setTimeout(() => {
      this.executeCognitiveCycle();
    }, this.config.wakeIntervalMs);
  }

  /**
   * Execute a cognitive wake cycle
   *
   * This is where the agent:
   * 1. Reviews working memory
   * 2. Consolidates memories into LTM
   * 3. Identifies new insights
   * 4. Generates autonomous tasks
   */
  private async executeCognitiveCycle(): Promise<void> {
    const cycleStartTime = Date.now();
    const cycleId = `cycle-${cycleStartTime}`;

    try {
      if (this.config.enableLogging) {
        console.log(`[CognitiveLoop] 🧠 Starting cognitive cycle ${cycleId}`);
      }

      this.status.currentState = 'thinking';

      // Delegate to worker if available
      if (this.worker) {
        this.worker.postMessage({
          type: 'EXECUTE_CYCLE',
          cycleId,
          config: {
            maxTasks: this.config.maxTasksPerCycle,
            consolidationThreshold: this.config.memoryConsolidationThreshold,
          },
        });
      } else {
        // Fallback: minimal in-thread processing
        await this.executeMinimalCycle(cycleId);
      }

      // Note: Actual cycle results handled in handleWorkerMessage
    } catch (error) {
      console.error(`[CognitiveLoop] ❌ Cycle ${cycleId} failed:`, error);
      this.status.currentState = 'error';
    }

    // Schedule next wake
    this.scheduleNextWake();
  }

  /**
   * Execute minimal cognitive cycle (fallback, no worker)
   */
  private async executeMinimalCycle(cycleId: string): Promise<void> {
    const cycle: CognitiveWakeCycle = {
      id: cycleId,
      timestamp: Date.now(),
      duration: 0,
      tasksCompleted: 0,
      memoryConsolidated: false,
      insightsGenerated: [],
      errors: [],
    };

    const startTime = Date.now();

    // Minimal processing: just log that we're alive
    if (this.config.enableLogging) {
      console.log('[CognitiveLoop] 💭 Minimal cycle (fallback mode)');
    }

    cycle.duration = Date.now() - startTime;
    this.recordCyclCompletion(cycle);
  }

  /**
   * Handle messages from Web Worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'CYCLE_COMPLETE':
        this.recordCyclCompletion(data as CognitiveWakeCycle);
        break;

      case 'INSIGHT_GENERATED':
        this.handleInsight(data);
        break;

      case 'MEMORY_CONSOLIDATED':
        if (this.config.enableLogging) {
          console.log('[CognitiveLoop] 💾 Memory consolidated:', data);
        }
        break;

      case 'TASK_CREATED':
        this.handleAutonomousTaskCreation(data);
        break;

      case 'ERROR':
        console.error('[CognitiveLoop] Worker error:', data);
        break;

      default:
        console.warn('[CognitiveLoop] Unknown worker message type:', type);
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('[CognitiveLoop] ❌ Worker error:', error.message);
    this.status.currentState = 'error';

    if (this.status.lastWakeCycle) {
      this.status.lastWakeCycle.errors.push(error.message);
    }
  }

  /**
   * Record completion of a cognitive cycle
   */
  private recordCyclCompletion(cycle: CognitiveWakeCycle): void {
    this.status.lastWakeCycle = cycle;
    this.status.totalCycles += 1;
    this.status.currentState = 'idle';
    this.cycleHistory.push(cycle);

    // Keep only recent history (last 100 cycles)
    if (this.cycleHistory.length > 100) {
      this.cycleHistory.shift();
    }

    if (this.config.enableLogging) {
      console.log(
        `[CognitiveLoop] ✅ Cycle ${cycle.id} complete (${cycle.duration}ms, ${cycle.tasksCompleted} tasks)`
      );
    }
  }

  /**
   * Handle insight generation
   */
  private handleInsight(insight: { content: string; confidence: number }): void {
    if (this.config.enableLogging) {
      console.log(
        `[CognitiveLoop] 💡 Insight: ${insight.content} (confidence: ${insight.confidence})`
      );
    }

    // Insights are persistent in LTM, handled by worker
  }

  /**
   * Handle autonomous task creation
   */
  private handleAutonomousTaskCreation(task: {
    id: string;
    description: string;
    parentGoal: string;
  }): void {
    if (this.config.enableLogging) {
      console.log(
        `[CognitiveLoop] 🎯 Autonomous task created: ${task.description} (goal: ${task.parentGoal})`
      );
    }

    // Tasks stored in goal database, handled by Goal Management Service
  }

  /**
   * Pause cognitive processing
   */
  pause(): void {
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
      this.wakeTimer = null;
    }

    this.status.isActive = false;

    if (this.config.enableLogging) {
      console.log('[CognitiveLoop] ⏸️ Paused');
    }
  }

  /**
   * Resume cognitive processing
   */
  resume(): void {
    if (!this.status.isActive && !this.wakeTimer) {
      this.status.isActive = true;
      this.scheduleNextWake();

      if (this.config.enableLogging) {
        console.log('[CognitiveLoop] ▶️ Resumed');
      }
    }
  }

  /**
   * Trigger an immediate cognitive cycle (non-blocking)
   */
  wakeNow(): void {
    if (this.config.enableLogging) {
      console.log('[CognitiveLoop] 🔔 Immediate wake triggered');
    }

    // Clear existing timer and execute immediately
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
    }

    this.executeCognitiveCycle();
  }

  /**
   * Get current cognitive loop status
   */
  getStatus(): CognitiveLoopStatus {
    return {
      ...this.status,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get cycle history
   */
  getCycleHistory(limit: number = 20): CognitiveWakeCycle[] {
    return this.cycleHistory.slice(-limit);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CognitiveLoopConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.enableLogging) {
      console.log('[CognitiveLoop] Configuration updated:', config);
    }

    // Restart wake cycles with new interval if enabled
    if (this.status.isActive) {
      this.scheduleNextWake();
    }
  }

  /**
   * Shutdown the cognitive loop
   */
  shutdown(): void {
    this.pause();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.status.isActive = false;

    if (this.config.enableLogging) {
      console.log('[CognitiveLoop] 🛑 Service shutdown');
    }
  }

  /**
   * Get uptime in seconds
   */
  getUptimeSeconds(): number {
    return (Date.now() - this.startTime) / 1000;
  }
}

// Export singleton instance
export const cognitiveLoopService = new CognitiveLoopService({
  wakeIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxTasksPerCycle: 10,
  memoryConsolidationThreshold: 50,
  enableAutoStart: true,
  enableLogging: true,
});
