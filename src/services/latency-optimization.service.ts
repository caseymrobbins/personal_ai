/**
 * LATENCY OPTIMIZATION SERVICE
 * =============================
 * Minimizes response times and optimizes system performance
 * Implements caching, parallel processing, and resource management
 *
 * Performance Goals:
 * - Response time < 500ms for real-time interactions
 * - Batch operations < 2s
 * - Dream cycles optimized for background execution
 * - Memory-efficient data structures
 * - Intelligent caching strategies
 */

export type OperationType =
  | 'emotion-detection'
  | 'response-generation'
  | 'memory-consolidation'
  | 'mode-transition'
  | 'data-access'
  | 'pattern-extraction'
  | 'simulation'
  | 'profile-update';

export type CachePriority = 'critical' | 'high' | 'medium' | 'low';

export interface LatencyMetric {
  operationType: OperationType;
  averageLatency: number; // ms
  p50Latency: number; // median
  p95Latency: number; // 95th percentile
  p99Latency: number; // 99th percentile
  maxLatency: number;
  minLatency: number;
  operationCount: number;
  errorRate: number; // 0-1
  lastUpdated: Date;
}

export interface CacheEntry<T> {
  entryId: string;
  key: string;
  value: T;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  expiresAt: Date;
  size: number; // bytes
  priority: CachePriority;
  hitRate: number; // 0-1
}

export interface CacheStrategy {
  strategy: 'LRU' | 'LFU' | 'TTL' | 'ARC';
  maxSize: number; // MB
  evictionPolicy: 'oldest' | 'least-used' | 'least-accessed';
  ttlMinutes: number;
  compressionEnabled: boolean;
}

export interface ParallelTask {
  taskId: string;
  operationType: OperationType;
  priority: 'critical' | 'high' | 'normal' | 'low';
  estimatedDuration: number; // ms
  startTime: Date;
  endTime?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface WorkerPool {
  totalWorkers: number;
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
}

export interface PerformanceThreshold {
  operationType: OperationType;
  targetLatencyMs: number;
  warningThresholdMs: number;
  criticalThresholdMs: number;
}

export interface OptimizationRecommendation {
  recommendationId: string;
  timestamp: Date;
  operationType: OperationType;
  currentLatency: number;
  targetLatency: number;
  recommendation: string;
  estimatedImprovement: number; // percentage
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface LatencyOptimizationMetrics {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number; // 0-1
  cacheSize: number; // MB
  cachedItems: number;
  parallelTasksCompleted: number;
  parallelTasksFailed: number;
  workerPoolUtilization: number; // 0-1
  optimizationsApplied: number;
}

/**
 * Latency Optimization Service
 * Manages caching, parallel processing, and performance optimization
 */
class LatencyOptimizationService {
  private static instance: LatencyOptimizationService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private latencyMetrics: Map<OperationType, LatencyMetric> = new Map();
  private taskQueue: ParallelTask[] = [];
  private completedTasks: ParallelTask[] = [];
  private cacheStrategy: CacheStrategy = {
    strategy: 'LRU',
    maxSize: 100, // MB
    evictionPolicy: 'least-accessed',
    ttlMinutes: 60,
    compressionEnabled: true,
  };
  private performanceThresholds: Map<OperationType, PerformanceThreshold> = new Map();
  private workerPool: WorkerPool = {
    totalWorkers: 4,
    activeWorkers: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageTaskDuration: 0,
  };
  private metrics: LatencyOptimizationMetrics = {
    averageResponseTime: 0,
    medianResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    cacheHitRate: 0,
    cacheSize: 0,
    cachedItems: 0,
    parallelTasksCompleted: 0,
    parallelTasksFailed: 0,
    workerPoolUtilization: 0,
    optimizationsApplied: 0,
  };
  private operationTimings: Array<{ type: OperationType; duration: number }> = [];

  static getInstance(): LatencyOptimizationService {
    if (!LatencyOptimizationService.instance) {
      LatencyOptimizationService.instance = new LatencyOptimizationService();
    }
    return LatencyOptimizationService.instance;
  }

  /**
   * Initialize optimization service with default thresholds
   */
  initialize(): void {
    this.initializePerformanceThresholds();
    console.log('⚡ Latency Optimization Service initialized');
    console.log(`   Cache strategy: ${this.cacheStrategy.strategy}`);
    console.log(`   Worker pool size: ${this.workerPool.totalWorkers}`);
  }

  /**
   * Initialize default performance thresholds
   */
  private initializePerformanceThresholds(): void {
    const thresholds: PerformanceThreshold[] = [
      {
        operationType: 'emotion-detection',
        targetLatencyMs: 100,
        warningThresholdMs: 200,
        criticalThresholdMs: 500,
      },
      {
        operationType: 'response-generation',
        targetLatencyMs: 300,
        warningThresholdMs: 500,
        criticalThresholdMs: 1000,
      },
      {
        operationType: 'memory-consolidation',
        targetLatencyMs: 1000,
        warningThresholdMs: 2000,
        criticalThresholdMs: 5000,
      },
      {
        operationType: 'mode-transition',
        targetLatencyMs: 50,
        warningThresholdMs: 100,
        criticalThresholdMs: 250,
      },
      {
        operationType: 'data-access',
        targetLatencyMs: 50,
        warningThresholdMs: 100,
        criticalThresholdMs: 300,
      },
      {
        operationType: 'pattern-extraction',
        targetLatencyMs: 500,
        warningThresholdMs: 1000,
        criticalThresholdMs: 3000,
      },
      {
        operationType: 'simulation',
        targetLatencyMs: 2000,
        warningThresholdMs: 4000,
        criticalThresholdMs: 10000,
      },
      {
        operationType: 'profile-update',
        targetLatencyMs: 500,
        warningThresholdMs: 1000,
        criticalThresholdMs: 3000,
      },
    ];

    thresholds.forEach((t) => {
      this.performanceThresholds.set(t.operationType, t);
      this.latencyMetrics.set(t.operationType, {
        operationType: t.operationType,
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        maxLatency: 0,
        minLatency: Infinity,
        operationCount: 0,
        errorRate: 0,
        lastUpdated: new Date(),
      });
    });
  }

  /**
   * Execute operation with automatic timing and caching
   */
  async executeOptimized<T>(
    operationType: OperationType,
    cacheKey: string,
    operation: () => Promise<T>,
    cachePriority: CachePriority = 'medium',
    useCache: boolean = true
  ): Promise<T> {
    const startTime = Date.now();

    // Check cache first
    if (useCache) {
      const cached = this.getCachedValue<T>(cacheKey);
      if (cached !== null) {
        const duration = Date.now() - startTime;
        this.recordTiming(operationType, duration, true);
        return cached;
      }
    }

    try {
      // Execute operation
      const result = await operation();

      // Cache result
      if (useCache) {
        this.cacheValue(cacheKey, result, cachePriority);
      }

      const duration = Date.now() - startTime;
      this.recordTiming(operationType, duration, false);
      this.checkPerformanceThresholds(operationType, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError(operationType, duration);
      throw error;
    }
  }

  /**
   * Queue task for parallel execution
   */
  queueTask(
    operationType: OperationType,
    taskFn: () => Promise<any>,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal',
    estimatedDuration: number = 100
  ): string {
    const task: ParallelTask = {
      taskId: this.generateTaskId(),
      operationType,
      priority,
      estimatedDuration,
      startTime: new Date(),
      status: 'queued',
    };

    this.taskQueue.push(task);
    this.workerPool.queuedTasks++;

    // Sort by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process queue asynchronously
    this.processTaskQueue();

    console.log(`📋 Task queued: ${task.taskId.slice(0, 8)} (${operationType})`);
    return task.taskId;
  }

  /**
   * Process queued tasks with worker pool
   */
  private async processTaskQueue(): Promise<void> {
    while (
      this.taskQueue.length > 0 &&
      this.workerPool.activeWorkers < this.workerPool.totalWorkers
    ) {
      const task = this.taskQueue.shift()!;
      if (task) {
        this.executeTask(task);
      }
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: ParallelTask): Promise<void> {
    task.status = 'running';
    this.workerPool.activeWorkers++;
    this.workerPool.queuedTasks--;

    const startTime = Date.now();

    try {
      // Simulate task execution (in production, would call actual task function)
      await new Promise((resolve) => setTimeout(resolve, task.estimatedDuration));

      task.status = 'completed';
      task.endTime = new Date();
      const duration = task.endTime.getTime() - startTime;

      this.recordTiming(task.operationType, duration, false);
      this.workerPool.completedTasks++;

      console.log(`✓ Task completed: ${task.taskId.slice(0, 8)} (${duration}ms)`);
    } catch (error) {
      task.status = 'failed';
      task.endTime = new Date();
      task.error = String(error);
      this.workerPool.failedTasks++;

      console.error(`✗ Task failed: ${task.taskId.slice(0, 8)}`);
    } finally {
      this.workerPool.activeWorkers--;
      this.completedTasks.push(task);

      // Continue processing queue
      this.processTaskQueue();
    }
  }

  /**
   * Cache a value with TTL and eviction
   */
  private cacheValue<T>(key: string, value: T, priority: CachePriority): void {
    // Check cache size and evict if necessary
    if (this.metrics.cacheSize > this.cacheStrategy.maxSize) {
      this.evictFromCache();
    }

    const entry: CacheEntry<T> = {
      entryId: this.generateCacheEntryId(),
      key,
      value,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      expiresAt: new Date(Date.now() + this.cacheStrategy.ttlMinutes * 60 * 1000),
      size: JSON.stringify(value).length,
      priority,
      hitRate: 0,
    };

    this.cache.set(key, entry);
    this.metrics.cachedItems = this.cache.size;
    this.metrics.cacheSize += entry.size / (1024 * 1024); // Convert to MB

    console.log(`💾 Cached: ${key.slice(0, 20)}... [${priority}]`);
  }

  /**
   * Get cached value
   */
  private getCachedValue<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.metrics.cachedItems = this.cache.size;
      return null;
    }

    // Update access tracking
    entry.lastAccessedAt = new Date();
    entry.accessCount++;
    entry.hitRate = entry.accessCount / (this.workerPool.completedTasks + 1);

    this.metrics.cacheHitRate = this.calculateCacheHitRate();

    console.log(`🎯 Cache hit: ${key.slice(0, 20)}... (${entry.accessCount} accesses)`);
    return entry.value;
  }

  /**
   * Evict oldest/least-used entries from cache
   */
  private evictFromCache(): void {
    const entriesToEvict = Array.from(this.cache.values())
      .sort((a, b) => {
        if (this.cacheStrategy.evictionPolicy === 'oldest') {
          return a.createdAt.getTime() - b.createdAt.getTime();
        } else if (this.cacheStrategy.evictionPolicy === 'least-used') {
          return a.accessCount - b.accessCount;
        } else {
          return a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime();
        }
      })
      .slice(0, Math.ceil(this.cache.size * 0.1)); // Evict 10% of cache

    entriesToEvict.forEach((entry) => {
      this.cache.delete(entry.key);
      this.metrics.cacheSize -= entry.size / (1024 * 1024);
    });

    this.metrics.cachedItems = this.cache.size;
    console.log(`🗑️  Evicted ${entriesToEvict.length} entries from cache`);
  }

  /**
   * Record operation timing
   */
  private recordTiming(operationType: OperationType, duration: number, fromCache: boolean): void {
    if (!fromCache) {
      this.operationTimings.push({ type: operationType, duration });
    }

    const metric = this.latencyMetrics.get(operationType)!;
    metric.operationCount++;
    metric.averageLatency =
      (metric.averageLatency * (metric.operationCount - 1) + duration) /
      metric.operationCount;
    metric.maxLatency = Math.max(metric.maxLatency, duration);
    metric.minLatency = Math.min(metric.minLatency, duration);
    metric.lastUpdated = new Date();

    // Calculate percentiles
    const timings = this.operationTimings
      .filter((t) => t.type === operationType)
      .map((t) => t.duration)
      .sort((a, b) => a - b);

    if (timings.length > 0) {
      metric.p50Latency = timings[Math.floor(timings.length * 0.5)];
      metric.p95Latency = timings[Math.floor(timings.length * 0.95)];
      metric.p99Latency = timings[Math.floor(timings.length * 0.99)];
    }

    // Update overall metrics
    this.updateOverallMetrics();
  }

  /**
   * Record operation error
   */
  private recordError(operationType: OperationType, duration: number): void {
    const metric = this.latencyMetrics.get(operationType)!;
    metric.operationCount++;
    metric.errorRate = Math.min(1, metric.errorRate + 0.01);
    this.recordTiming(operationType, duration, false);
  }

  /**
   * Check if operation exceeded performance threshold
   */
  private checkPerformanceThresholds(operationType: OperationType, duration: number): void {
    const threshold = this.performanceThresholds.get(operationType);
    if (!threshold) return;

    if (duration > threshold.criticalThresholdMs) {
      console.warn(
        `🚨 CRITICAL: ${operationType} exceeded threshold (${duration}ms > ${threshold.criticalThresholdMs}ms)`
      );
    } else if (duration > threshold.warningThresholdMs) {
      console.warn(
        `⚠️ WARNING: ${operationType} approaching threshold (${duration}ms > ${threshold.warningThresholdMs}ms)`
      );
    }
  }

  /**
   * Get latency metrics for operation type
   */
  getLatencyMetrics(operationType?: OperationType): LatencyMetric | LatencyMetric[] {
    if (operationType) {
      return this.latencyMetrics.get(operationType)!;
    }
    return Array.from(this.latencyMetrics.values());
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    for (const [type, metric] of this.latencyMetrics.entries()) {
      const threshold = this.performanceThresholds.get(type)!;

      if (metric.averageLatency > threshold.warningThresholdMs) {
        const improvement = Math.round(
          ((metric.averageLatency - threshold.targetLatencyMs) /
            metric.averageLatency) *
            100
        );

        let recommendation = '';
        if (metric.errorRate > 0.05) {
          recommendation = `High error rate (${(metric.errorRate * 100).toFixed(1)}%). Review error handling.`;
        } else if (type === 'response-generation') {
          recommendation = 'Consider caching frequently used responses or using response templates.';
        } else if (type === 'pattern-extraction') {
          recommendation = 'Implement incremental pattern extraction for large datasets.';
        } else if (type === 'simulation') {
          recommendation = 'Parallelize simulation runs and consider approximation algorithms.';
        } else {
          recommendation = `Optimize ${type} - current latency ${metric.averageLatency.toFixed(0)}ms exceeds target ${threshold.targetLatencyMs}ms.`;
        }

        recommendations.push({
          recommendationId: this.generateRecommendationId(),
          timestamp: new Date(),
          operationType: type,
          currentLatency: metric.averageLatency,
          targetLatency: threshold.targetLatencyMs,
          recommendation,
          estimatedImprovement: improvement,
          priority:
            metric.averageLatency > threshold.criticalThresholdMs
              ? 'critical'
              : 'high',
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get worker pool status
   */
  getWorkerPoolStatus(): WorkerPool {
    return { ...this.workerPool };
  }

  /**
   * Get overall optimization metrics
   */
  getMetrics(): LatencyOptimizationMetrics {
    return { ...this.metrics };
  }

  /**
   * Update cache strategy
   */
  updateCacheStrategy(strategy: Partial<CacheStrategy>): void {
    this.cacheStrategy = { ...this.cacheStrategy, ...strategy };
    console.log('⚙️ Cache strategy updated');
    console.log(`   Strategy: ${this.cacheStrategy.strategy}`);
    console.log(`   Max size: ${this.cacheStrategy.maxSize}MB`);
  }

  /**
   * Clear cache
   */
  clearCache(): number {
    const count = this.cache.size;
    this.cache.clear();
    this.metrics.cachedItems = 0;
    this.metrics.cacheSize = 0;
    console.log(`🧹 Cache cleared (${count} entries)`);
    return count;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    if (this.operationTimings.length === 0) return 0;

    const fromCache = this.operationTimings.filter((t) => {
      const entry = this.cache.get(`${t.type}`);
      return entry && entry.lastAccessedAt.getTime() > Date.now() - 1000;
    }).length;

    return fromCache / this.operationTimings.length;
  }

  /**
   * Update overall metrics
   */
  private updateOverallMetrics(): void {
    const allTimings = this.operationTimings.map((t) => t.duration).sort((a, b) => a - b);

    if (allTimings.length > 0) {
      this.metrics.averageResponseTime =
        allTimings.reduce((a, b) => a + b) / allTimings.length;
      this.metrics.medianResponseTime = allTimings[Math.floor(allTimings.length / 2)];
      this.metrics.p95ResponseTime = allTimings[Math.floor(allTimings.length * 0.95)];
      this.metrics.p99ResponseTime = allTimings[Math.floor(allTimings.length * 0.99)];
    }

    this.metrics.workerPoolUtilization =
      this.workerPool.activeWorkers / this.workerPool.totalWorkers;
    this.metrics.parallelTasksCompleted = this.workerPool.completedTasks;
    this.metrics.parallelTasksFailed = this.workerPool.failedTasks;
  }

  /**
   * Get task queue status
   */
  getTaskQueueStatus(): {
    queued: number;
    running: number;
    completed: number;
    failed: number;
  } {
    return {
      queued: this.taskQueue.length,
      running: this.workerPool.activeWorkers,
      completed: this.workerPool.completedTasks,
      failed: this.workerPool.failedTasks,
    };
  }

  /**
   * Generate unique IDs
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheEntryId(): string {
    return `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.cache.clear();
    this.taskQueue = [];
    this.completedTasks = [];
    this.operationTimings = [];
    this.workerPool = {
      totalWorkers: 4,
      activeWorkers: 0,
      queuedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskDuration: 0,
    };
    this.metrics = {
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      cachedItems: 0,
      parallelTasksCompleted: 0,
      parallelTasksFailed: 0,
      workerPoolUtilization: 0,
      optimizationsApplied: 0,
    };

    for (const metric of this.latencyMetrics.values()) {
      metric.operationCount = 0;
      metric.averageLatency = 0;
      metric.errorRate = 0;
    }

    console.log('🔄 Latency Optimization Service reset');
  }
}

export const latencyOptimization = LatencyOptimizationService.getInstance();
export { LatencyOptimizationService };
