/**
 * A/B Testing Service
 *
 * Framework for comparing different orchestration configurations to determine
 * which performs best across various metrics (cost, latency, quality, etc.).
 *
 * Features:
 * - Multi-variant testing (A/B/n)
 * - Random traffic allocation
 * - Statistical significance calculation
 * - Per-variant metrics tracking
 * - Winner detection with confidence intervals
 */

import type { OrchestrationPreferences } from './local-slm-orchestrator.service';

export interface ABTestVariant {
  id: string;
  name: string;
  config: OrchestrationPreferences;
  trafficAllocation: number; // 0.0-1.0 (percentage of traffic)
  isControl: boolean;
}

export interface ABTestMetrics {
  totalQueries: number;
  localHandled: number;
  averageLatency: number;
  averageCost: number;
  averageQuality: number;
  escalations: number;
  errors: number;
  cacheHits: number;
}

export interface ABTestResult {
  variantId: string;
  variantName: string;
  metrics: ABTestMetrics;
  confidence: number; // Statistical confidence (0.0-1.0)
  isWinner: boolean;
  improvement: {
    cost: number; // % improvement vs control
    latency: number;
    quality: number;
  };
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  startTime: number;
  endTime?: number;
  status: 'running' | 'paused' | 'completed';
  results: Map<string, ABTestResult>;
  minimumSampleSize: number;
  targetSignificance: number; // p-value threshold (e.g., 0.05)
}

export class ABTestingService {
  private static instance: ABTestingService;
  private currentTest: ABTest | null = null;
  private variantMetrics: Map<string, ABTestMetrics> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }

  /**
   * Start a new A/B test
   */
  public startTest(
    name: string,
    description: string,
    variants: ABTestVariant[],
    minimumSampleSize: number = 50,
    targetSignificance: number = 0.05
  ): ABTest {
    // Validate traffic allocation sums to 1.0
    const totalAllocation = variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      throw new Error(`Traffic allocation must sum to 1.0, got ${totalAllocation}`);
    }

    // Ensure exactly one control variant
    const controlCount = variants.filter((v) => v.isControl).length;
    if (controlCount !== 1) {
      throw new Error('Must have exactly one control variant');
    }

    const test: ABTest = {
      id: `ab-test-${Date.now()}`,
      name,
      description,
      variants,
      startTime: Date.now(),
      status: 'running',
      results: new Map(),
      minimumSampleSize,
      targetSignificance,
    };

    // Initialize metrics for each variant
    variants.forEach((variant) => {
      this.variantMetrics.set(variant.id, this.initializeMetrics());
      test.results.set(variant.id, {
        variantId: variant.id,
        variantName: variant.name,
        metrics: this.initializeMetrics(),
        confidence: 0,
        isWinner: false,
        improvement: { cost: 0, latency: 0, quality: 0 },
      });
    });

    this.currentTest = test;
    this.saveToStorage();

    console.log(`[ABTesting] Started test "${name}" with ${variants.length} variants`);
    return test;
  }

  /**
   * Get the current active test
   */
  public getCurrentTest(): ABTest | null {
    return this.currentTest;
  }

  /**
   * Select a variant for the current query using weighted random selection
   */
  public selectVariant(): ABTestVariant | null {
    if (!this.currentTest || this.currentTest.status !== 'running') {
      return null;
    }

    const random = Math.random();
    let cumulative = 0;

    for (const variant of this.currentTest.variants) {
      cumulative += variant.trafficAllocation;
      if (random <= cumulative) {
        return variant;
      }
    }

    // Fallback to control variant
    return this.currentTest.variants.find((v) => v.isControl) || this.currentTest.variants[0];
  }

  /**
   * Record metrics for a variant after query execution
   */
  public recordResult(
    variantId: string,
    latency: number,
    cost: number,
    quality: number,
    wasEscalated: boolean,
    wasError: boolean,
    wasCacheHit: boolean,
    wasLocalHandled: boolean
  ): void {
    if (!this.currentTest) return;

    const metrics = this.variantMetrics.get(variantId);
    if (!metrics) return;

    // Update metrics
    metrics.totalQueries++;
    if (wasLocalHandled) metrics.localHandled++;
    if (wasEscalated) metrics.escalations++;
    if (wasError) metrics.errors++;
    if (wasCacheHit) metrics.cacheHits++;

    // Update averages (running average)
    const n = metrics.totalQueries;
    metrics.averageLatency = ((metrics.averageLatency * (n - 1)) + latency) / n;
    metrics.averageCost = ((metrics.averageCost * (n - 1)) + cost) / n;
    metrics.averageQuality = ((metrics.averageQuality * (n - 1)) + quality) / n;

    this.variantMetrics.set(variantId, metrics);

    // Update test results
    this.updateTestResults();
    this.saveToStorage();
  }

  /**
   * Update test results with statistical analysis
   */
  private updateTestResults(): void {
    if (!this.currentTest) return;

    const controlVariant = this.currentTest.variants.find((v) => v.isControl);
    if (!controlVariant) return;

    const controlMetrics = this.variantMetrics.get(controlVariant.id);
    if (!controlMetrics || controlMetrics.totalQueries === 0) return;

    // Calculate results for each variant
    this.currentTest.variants.forEach((variant) => {
      const metrics = this.variantMetrics.get(variant.id);
      if (!metrics) return;

      const result = this.currentTest!.results.get(variant.id);
      if (!result) return;

      // Update metrics
      result.metrics = { ...metrics };

      // Calculate statistical confidence
      if (metrics.totalQueries >= this.currentTest!.minimumSampleSize) {
        result.confidence = this.calculateConfidence(metrics, controlMetrics);
      }

      // Calculate improvement vs control
      if (!variant.isControl && controlMetrics.totalQueries > 0) {
        result.improvement = {
          cost: this.calculateImprovement(controlMetrics.averageCost, metrics.averageCost),
          latency: this.calculateImprovement(controlMetrics.averageLatency, metrics.averageLatency),
          quality: this.calculateImprovement(metrics.averageQuality, controlMetrics.averageQuality),
        };
      }

      this.currentTest!.results.set(variant.id, result);
    });

    // Determine winner if sample size met and significant difference found
    this.determineWinner();
  }

  /**
   * Calculate statistical confidence using t-test approximation
   */
  private calculateConfidence(metrics: ABTestMetrics, control: ABTestMetrics): number {
    const n1 = metrics.totalQueries;
    const n2 = control.totalQueries;

    if (n1 < 30 || n2 < 30) return 0; // Need minimum sample size

    // Simple z-test approximation for conversion rates
    const p1 = metrics.localHandled / n1;
    const p2 = control.localHandled / n2;
    const pPool = (metrics.localHandled + control.localHandled) / (n1 + n2);

    const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
    const z = Math.abs((p1 - p2) / se);

    // Convert z-score to confidence (approximation)
    // z > 1.96 = ~95% confidence (p < 0.05)
    // z > 2.58 = ~99% confidence (p < 0.01)
    if (z > 2.58) return 0.99;
    if (z > 1.96) return 0.95;
    if (z > 1.65) return 0.90;
    if (z > 1.28) return 0.80;
    return Math.min(0.75, z / 1.96 * 0.75);
  }

  /**
   * Calculate percentage improvement (negative = worse)
   */
  private calculateImprovement(baseline: number, variant: number): number {
    if (baseline === 0) return 0;
    return ((baseline - variant) / baseline) * 100;
  }

  /**
   * Determine winner based on statistical significance
   */
  private determineWinner(): void {
    if (!this.currentTest) return;

    const results = Array.from(this.currentTest.results.values());

    // Reset winner flags
    results.forEach((r) => (r.isWinner = false));

    // Find variants with sufficient confidence
    const significantVariants = results.filter(
      (r) => r.confidence >= (1 - this.currentTest!.targetSignificance) &&
             r.metrics.totalQueries >= this.currentTest!.minimumSampleSize
    );

    if (significantVariants.length === 0) return;

    // Find winner based on composite score
    let bestScore = -Infinity;
    let winner: ABTestResult | null = null;

    significantVariants.forEach((result) => {
      // Composite score: weighted combination of improvements
      // Weights: cost 30%, latency 30%, quality 40%
      const score =
        result.improvement.cost * 0.3 +
        result.improvement.latency * 0.3 +
        result.improvement.quality * 0.4;

      if (score > bestScore) {
        bestScore = score;
        winner = result;
      }
    });

    if (winner && bestScore > 5) { // At least 5% overall improvement
      winner.isWinner = true;
      console.log(`[ABTesting] Winner detected: ${winner.variantName} (${bestScore.toFixed(1)}% improvement)`);
    }
  }

  /**
   * Pause the current test
   */
  public pauseTest(): void {
    if (this.currentTest && this.currentTest.status === 'running') {
      this.currentTest.status = 'paused';
      this.saveToStorage();
      console.log(`[ABTesting] Paused test "${this.currentTest.name}"`);
    }
  }

  /**
   * Resume a paused test
   */
  public resumeTest(): void {
    if (this.currentTest && this.currentTest.status === 'paused') {
      this.currentTest.status = 'running';
      this.saveToStorage();
      console.log(`[ABTesting] Resumed test "${this.currentTest.name}"`);
    }
  }

  /**
   * Complete the current test
   */
  public completeTest(): ABTest | null {
    if (!this.currentTest) return null;

    this.currentTest.status = 'completed';
    this.currentTest.endTime = Date.now();
    this.updateTestResults();
    this.saveToStorage();

    const completedTest = this.currentTest;
    console.log(`[ABTesting] Completed test "${completedTest.name}"`);

    return completedTest;
  }

  /**
   * Get test results summary
   */
  public getResults(): ABTestResult[] {
    if (!this.currentTest) return [];
    return Array.from(this.currentTest.results.values());
  }

  /**
   * Export test results as JSON
   */
  public exportResults(): string {
    if (!this.currentTest) return '{}';

    const exportData = {
      test: {
        id: this.currentTest.id,
        name: this.currentTest.name,
        description: this.currentTest.description,
        startTime: this.currentTest.startTime,
        endTime: this.currentTest.endTime,
        status: this.currentTest.status,
        duration: this.currentTest.endTime
          ? this.currentTest.endTime - this.currentTest.startTime
          : Date.now() - this.currentTest.startTime,
      },
      variants: this.currentTest.variants.map((v) => ({
        id: v.id,
        name: v.name,
        trafficAllocation: v.trafficAllocation,
        isControl: v.isControl,
      })),
      results: Array.from(this.currentTest.results.values()),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Initialize empty metrics
   */
  private initializeMetrics(): ABTestMetrics {
    return {
      totalQueries: 0,
      localHandled: 0,
      averageLatency: 0,
      averageCost: 0,
      averageQuality: 0,
      escalations: 0,
      errors: 0,
      cacheHits: 0,
    };
  }

  /**
   * Save test state to localStorage
   */
  private saveToStorage(): void {
    try {
      if (this.currentTest) {
        const data = {
          test: this.currentTest,
          metrics: Array.from(this.variantMetrics.entries()),
        };
        localStorage.setItem('abTestingState', JSON.stringify(data));
      }
    } catch (error) {
      console.error('[ABTesting] Failed to save state:', error);
    }
  }

  /**
   * Load test state from localStorage
   */
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('abTestingState');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentTest = data.test;
        this.variantMetrics = new Map(data.metrics);

        // Convert results back to Map
        if (this.currentTest && Array.isArray(this.currentTest.results)) {
          this.currentTest.results = new Map(this.currentTest.results as any);
        }

        console.log('[ABTesting] Loaded test from storage:', this.currentTest?.name);
      }
    } catch (error) {
      console.error('[ABTesting] Failed to load state:', error);
    }
  }
}
