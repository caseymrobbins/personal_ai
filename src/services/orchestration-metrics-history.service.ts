/**
 * Orchestration Metrics History Service
 *
 * Tracks and persists orchestration metrics over time for trend analysis,
 * visualization, and export.
 */

import type { OrchestrationMetrics } from './local-slm-orchestrator.service';

interface MetricsSnapshot {
  timestamp: number;
  metrics: OrchestrationMetrics;
}

interface MetricsSummary {
  hourly: MetricsSnapshot[];
  daily: MetricsSnapshot[];
  weekly: MetricsSnapshot[];
  allTime: OrchestrationMetrics;
}

export class OrchestrationMetricsHistoryService {
  private static instance: OrchestrationMetricsHistoryService;
  private readonly STORAGE_KEY = 'orchestration_metrics_history';
  private readonly MAX_HOURLY_SNAPSHOTS = 60; // Last 60 hours
  private readonly MAX_DAILY_SNAPSHOTS = 30; // Last 30 days
  private readonly MAX_WEEKLY_SNAPSHOTS = 12; // Last 12 weeks

  private history: MetricsSnapshot[] = [];
  private lastSnapshotTime: number = 0;

  private constructor() {
    this.loadHistory();
  }

  public static getInstance(): OrchestrationMetricsHistoryService {
    if (!OrchestrationMetricsHistoryService.instance) {
      OrchestrationMetricsHistoryService.instance = new OrchestrationMetricsHistoryService();
    }
    return OrchestrationMetricsHistoryService.instance;
  }

  /**
   * Record current metrics snapshot
   */
  public recordSnapshot(metrics: OrchestrationMetrics): void {
    const now = Date.now();

    // Only record if at least 1 minute has passed since last snapshot
    if (now - this.lastSnapshotTime < 60000) {
      return;
    }

    const snapshot: MetricsSnapshot = {
      timestamp: now,
      metrics: { ...metrics },
    };

    this.history.push(snapshot);
    this.lastSnapshotTime = now;

    // Keep only recent snapshots (last 7 days)
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    this.history = this.history.filter(s => s.timestamp > sevenDaysAgo);

    this.saveHistory();
  }

  /**
   * Get metrics summary (hourly, daily, weekly aggregates)
   */
  public getSummary(): MetricsSummary {
    const now = Date.now();

    return {
      hourly: this.getHourlySnapshots(now),
      daily: this.getDailySnapshots(now),
      weekly: this.getWeeklySnapshots(now),
      allTime: this.getAllTimeMetrics(),
    };
  }

  /**
   * Get hourly snapshots (last 24 hours)
   */
  private getHourlySnapshots(now: number): MetricsSnapshot[] {
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const hourlyData = this.history.filter(s => s.timestamp > oneDayAgo);

    // Aggregate into hourly buckets
    return this.aggregateByInterval(hourlyData, 60 * 60 * 1000); // 1 hour intervals
  }

  /**
   * Get daily snapshots (last 30 days)
   */
  private getDailySnapshots(now: number): MetricsSnapshot[] {
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const dailyData = this.history.filter(s => s.timestamp > thirtyDaysAgo);

    // Aggregate into daily buckets
    return this.aggregateByInterval(dailyData, 24 * 60 * 60 * 1000); // 1 day intervals
  }

  /**
   * Get weekly snapshots (last 12 weeks)
   */
  private getWeeklySnapshots(now: number): MetricsSnapshot[] {
    const twelveWeeksAgo = now - (12 * 7 * 24 * 60 * 60 * 1000);
    const weeklyData = this.history.filter(s => s.timestamp > twelveWeeksAgo);

    // Aggregate into weekly buckets
    return this.aggregateByInterval(weeklyData, 7 * 24 * 60 * 60 * 1000); // 1 week intervals
  }

  /**
   * Aggregate snapshots into time intervals
   */
  private aggregateByInterval(snapshots: MetricsSnapshot[], intervalMs: number): MetricsSnapshot[] {
    if (snapshots.length === 0) return [];

    const buckets = new Map<number, MetricsSnapshot[]>();

    // Group snapshots into time buckets
    for (const snapshot of snapshots) {
      const bucketKey = Math.floor(snapshot.timestamp / intervalMs) * intervalMs;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(snapshot);
    }

    // Aggregate each bucket
    const aggregated: MetricsSnapshot[] = [];
    for (const [timestamp, snapshotsInBucket] of buckets) {
      const aggregatedMetrics = this.aggregateMetrics(snapshotsInBucket.map(s => s.metrics));
      aggregated.push({
        timestamp,
        metrics: aggregatedMetrics,
      });
    }

    return aggregated.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Aggregate multiple metrics into one
   */
  private aggregateMetrics(metricsArray: OrchestrationMetrics[]): OrchestrationMetrics {
    if (metricsArray.length === 0) {
      return this.getEmptyMetrics();
    }

    if (metricsArray.length === 1) {
      return metricsArray[0];
    }

    // Sum up all metrics
    const totals = metricsArray.reduce((acc, metrics) => ({
      totalQueries: acc.totalQueries + metrics.totalQueries,
      localHandled: acc.localHandled + metrics.localHandled,
      delegated: acc.delegated + metrics.delegated,
      hybrid: acc.hybrid + metrics.hybrid,
      iterative: acc.iterative + metrics.iterative,
      escalations: acc.escalations + metrics.escalations,
      averageConfidence: acc.averageConfidence + metrics.averageConfidence,
      averageLatency: acc.averageLatency + metrics.averageLatency,
      totalCost: acc.totalCost + metrics.totalCost,
      cacheHitRate: acc.cacheHitRate + metrics.cacheHitRate,
      qualityGatePassRate: acc.qualityGatePassRate + metrics.qualityGatePassRate,
    }), this.getEmptyMetrics());

    // Calculate averages
    const count = metricsArray.length;
    return {
      ...totals,
      averageConfidence: totals.averageConfidence / count,
      averageLatency: totals.averageLatency / count,
      cacheHitRate: totals.cacheHitRate / count,
      qualityGatePassRate: totals.qualityGatePassRate / count,
    };
  }

  /**
   * Get all-time aggregated metrics
   */
  private getAllTimeMetrics(): OrchestrationMetrics {
    if (this.history.length === 0) {
      return this.getEmptyMetrics();
    }

    // Get the most recent snapshot (which should have cumulative totals)
    const latest = this.history[this.history.length - 1];
    return latest.metrics;
  }

  /**
   * Get trend data for a specific metric
   */
  public getTrendData(metricName: keyof OrchestrationMetrics, period: 'hourly' | 'daily' | 'weekly'): number[] {
    const summary = this.getSummary();
    const snapshots = summary[period];

    return snapshots.map(snapshot => {
      const value = snapshot.metrics[metricName];
      return typeof value === 'number' ? value : 0;
    });
  }

  /**
   * Export metrics history as JSON
   */
  public exportJSON(): string {
    const summary = this.getSummary();
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      summary,
      rawHistory: this.history,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export metrics history as CSV
   */
  public exportCSV(): string {
    const headers = [
      'Timestamp',
      'Date',
      'Total Queries',
      'Local Handled',
      'Delegated',
      'Hybrid',
      'Iterative',
      'Escalations',
      'Avg Confidence',
      'Avg Latency (ms)',
      'Total Cost ($)',
      'Cache Hit Rate',
      'Quality Pass Rate',
    ];

    const rows = this.history.map(snapshot => [
      snapshot.timestamp,
      new Date(snapshot.timestamp).toISOString(),
      snapshot.metrics.totalQueries,
      snapshot.metrics.localHandled,
      snapshot.metrics.delegated,
      snapshot.metrics.hybrid,
      snapshot.metrics.iterative,
      snapshot.metrics.escalations,
      snapshot.metrics.averageConfidence.toFixed(4),
      snapshot.metrics.averageLatency.toFixed(2),
      snapshot.metrics.totalCost.toFixed(6),
      snapshot.metrics.cacheHitRate.toFixed(4),
      snapshot.metrics.qualityGatePassRate.toFixed(4),
    ]);

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ];

    return csvLines.join('\n');
  }

  /**
   * Calculate growth rate for a metric
   */
  public getGrowthRate(metricName: keyof OrchestrationMetrics, period: 'hourly' | 'daily' | 'weekly'): number {
    const trend = this.getTrendData(metricName, period);

    if (trend.length < 2) {
      return 0;
    }

    const oldest = trend[0] || 0;
    const newest = trend[trend.length - 1] || 0;

    if (oldest === 0) {
      return newest > 0 ? 100 : 0;
    }

    return ((newest - oldest) / oldest) * 100;
  }

  /**
   * Get statistics for a metric
   */
  public getMetricStats(metricName: keyof OrchestrationMetrics, period: 'hourly' | 'daily' | 'weekly') {
    const trend = this.getTrendData(metricName, period);

    if (trend.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        current: 0,
        trend: 'stable' as const,
      };
    }

    const min = Math.min(...trend);
    const max = Math.max(...trend);
    const avg = trend.reduce((sum, val) => sum + val, 0) / trend.length;
    const current = trend[trend.length - 1];

    // Determine trend direction
    const growthRate = this.getGrowthRate(metricName, period);
    let trendDirection: 'up' | 'down' | 'stable';
    if (growthRate > 5) trendDirection = 'up';
    else if (growthRate < -5) trendDirection = 'down';
    else trendDirection = 'stable';

    return {
      min,
      max,
      avg,
      current,
      trend: trendDirection,
      growthRate,
    };
  }

  /**
   * Clear all history
   */
  public clearHistory(): void {
    this.history = [];
    this.lastSnapshotTime = 0;
    this.saveHistory();
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.history = parsed.history || [];
        this.lastSnapshotTime = parsed.lastSnapshotTime || 0;
      }
    } catch (error) {
      console.error('[MetricsHistory] Failed to load history:', error);
      this.history = [];
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    try {
      const data = {
        history: this.history,
        lastSnapshotTime: this.lastSnapshotTime,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[MetricsHistory] Failed to save history:', error);
    }
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): OrchestrationMetrics {
    return {
      totalQueries: 0,
      localHandled: 0,
      delegated: 0,
      hybrid: 0,
      iterative: 0,
      escalations: 0,
      averageConfidence: 0,
      averageLatency: 0,
      totalCost: 0,
      cacheHitRate: 0,
      qualityGatePassRate: 0,
    };
  }
}

export default OrchestrationMetricsHistoryService;
