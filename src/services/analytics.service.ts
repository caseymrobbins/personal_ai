/**
 * Analytics Service (Sprint 13: Advanced Analytics Dashboard)
 *
 * Aggregates and analyzes governance data to provide insights:
 * - ARI/RDI trends over time
 * - Conversation patterns and statistics
 * - Usage metrics
 * - Privacy score tracking
 */

import { dbService } from './db.service';

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

/**
 * ARI/RDI trend data
 */
export interface TrendData {
  ari: TimeSeriesPoint[];
  rdi: TimeSeriesPoint[];
  lexicalDensity: TimeSeriesPoint[];
  syntacticComplexity: TimeSeriesPoint[];
}

/**
 * Conversation statistics
 */
export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  oldestConversation: number | null;
  newestConversation: number | null;
  conversationsByDay: { date: string; count: number }[];
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  totalPrompts: number;
  averageARI: number;
  averageRDI: number | null;
  ariDistribution: { range: string; count: number }[];
  promptsPerDay: { date: string; count: number }[];
  activeHours: { hour: number; count: number }[];
}

/**
 * Privacy score data
 */
export interface PrivacyScore {
  score: number; // 0-100
  factors: {
    localFirst: boolean;
    encryptedStorage: boolean;
    noExternalTracking: boolean;
    userControlled: boolean;
  };
  recommendations: string[];
}

/**
 * Complete analytics report
 */
export interface AnalyticsReport {
  generatedAt: number;
  period: { start: number; end: number };
  trends: TrendData;
  conversations: ConversationStats;
  usage: UsageMetrics;
  privacy: PrivacyScore;
}

class AnalyticsService {
  /**
   * Get ARI/RDI trends over time
   * @param limit Number of recent data points (default: 100)
   * @returns Trend data with time series
   */
  getTrends(limit: number = 100): TrendData {
    const metrics = dbService.getRecentGovernanceMetrics(limit);

    // Reverse to get chronological order (oldest first)
    const chronological = metrics.reverse();

    const ari: TimeSeriesPoint[] = chronological.map(m => ({
      timestamp: m.timestamp,
      value: m.ariScore,
    }));

    const lexicalDensity: TimeSeriesPoint[] = chronological.map(m => ({
      timestamp: m.timestamp,
      value: m.lexicalDensity,
    }));

    const syntacticComplexity: TimeSeriesPoint[] = chronological.map(m => ({
      timestamp: m.timestamp,
      value: m.syntacticComplexity,
    }));

    // RDI calculation (drift from moving average)
    const rdi: TimeSeriesPoint[] = [];
    const windowSize = 5;

    for (let i = windowSize; i < chronological.length; i++) {
      const window = chronological.slice(i - windowSize, i);
      const avgARI = window.reduce((sum, m) => sum + m.ariScore, 0) / windowSize;
      const currentARI = chronological[i].ariScore;
      const drift = Math.abs(currentARI - avgARI);

      rdi.push({
        timestamp: chronological[i].timestamp,
        value: drift,
      });
    }

    return {
      ari,
      rdi,
      lexicalDensity,
      syntacticComplexity,
    };
  }

  /**
   * Get conversation statistics
   * @returns Conversation stats and patterns
   */
  getConversationStats(): ConversationStats {
    const conversations = dbService.getConversations();
    const messages = dbService.getAllMessages();

    // Group conversations by day
    const conversationsByDay = new Map<string, number>();

    conversations.forEach((conv: { created_at: number }) => {
      const date = new Date(conv.created_at).toISOString().split('T')[0];
      conversationsByDay.set(date, (conversationsByDay.get(date) || 0) + 1);
    });

    const sortedDays = Array.from(conversationsByDay.entries())
      .map(([date, count]: [string, number]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const timestamps = conversations.map((c: { created_at: number }) => c.created_at);
    const oldestConversation = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestConversation = timestamps.length > 0 ? Math.max(...timestamps) : null;

    return {
      totalConversations: conversations.length,
      totalMessages: messages.length,
      avgMessagesPerConversation: conversations.length > 0
        ? messages.length / conversations.length
        : 0,
      oldestConversation,
      newestConversation,
      conversationsByDay: sortedDays,
    };
  }

  /**
   * Get usage metrics
   * @returns Usage statistics and patterns
   */
  getUsageMetrics(): UsageMetrics {
    const stats = dbService.getGovernanceStats();
    const metrics = dbService.getRecentGovernanceMetrics(1000);

    // ARI distribution (bucketed)
    const ariDistribution = new Map<string, number>();
    const buckets = [
      { range: '0.0-0.2', min: 0.0, max: 0.2 },
      { range: '0.2-0.4', min: 0.2, max: 0.4 },
      { range: '0.4-0.6', min: 0.4, max: 0.6 },
      { range: '0.6-0.8', min: 0.6, max: 0.8 },
      { range: '0.8-1.0', min: 0.8, max: 1.0 },
    ];

    buckets.forEach(bucket => ariDistribution.set(bucket.range, 0));

    metrics.forEach(m => {
      const bucket = buckets.find(b => m.ariScore >= b.min && m.ariScore < b.max);
      if (bucket) {
        ariDistribution.set(bucket.range, (ariDistribution.get(bucket.range) || 0) + 1);
      }
    });

    // Prompts per day
    const promptsPerDay = new Map<string, number>();
    metrics.forEach(m => {
      const date = new Date(m.timestamp).toISOString().split('T')[0];
      promptsPerDay.set(date, (promptsPerDay.get(date) || 0) + 1);
    });

    const sortedPrompts = Array.from(promptsPerDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Active hours (hour of day analysis)
    const activeHours = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      activeHours.set(i, 0);
    }

    metrics.forEach(m => {
      const hour = new Date(m.timestamp).getHours();
      activeHours.set(hour, (activeHours.get(hour) || 0) + 1);
    });

    const sortedHours = Array.from(activeHours.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // Calculate average RDI (simplified - would need full RDI history in production)
    let averageRDI: number | null = null;
    if (metrics.length > 10) {
      const rdiValues: number[] = [];
      const windowSize = 5;

      for (let i = windowSize; i < metrics.length; i++) {
        const window = metrics.slice(i - windowSize, i);
        const avgARI = window.reduce((sum, m) => sum + m.ariScore, 0) / windowSize;
        const drift = Math.abs(metrics[i].ariScore - avgARI);
        rdiValues.push(drift);
      }

      averageRDI = rdiValues.length > 0
        ? rdiValues.reduce((sum, v) => sum + v, 0) / rdiValues.length
        : null;
    }

    return {
      totalPrompts: stats.totalEntries,
      averageARI: stats.avgARI,
      averageRDI,
      ariDistribution: Array.from(ariDistribution.entries()).map(([range, count]) => ({ range, count })),
      promptsPerDay: sortedPrompts,
      activeHours: sortedHours,
    };
  }

  /**
   * Calculate privacy score
   * @returns Privacy score and recommendations
   */
  getPrivacyScore(): PrivacyScore {
    const factors = {
      localFirst: true, // SML Guardian is local-first by design
      encryptedStorage: true, // API keys encrypted with WebCrypto
      noExternalTracking: true, // No analytics or tracking
      userControlled: true, // User controls all data
    };

    // Calculate score (all factors weighted equally)
    const factorValues = Object.values(factors);
    const score = (factorValues.filter(v => v).length / factorValues.length) * 100;

    const recommendations: string[] = [];

    if (!factors.encryptedStorage) {
      recommendations.push('Enable encryption for sensitive data storage');
    }

    if (!factors.noExternalTracking) {
      recommendations.push('Disable external tracking and analytics');
    }

    // Always provide positive reinforcement
    if (score === 100) {
      recommendations.push('Excellent! Your privacy is maximally protected.');
      recommendations.push('All data stays on your device.');
      recommendations.push('You have complete control over your information.');
    }

    return {
      score,
      factors,
      recommendations,
    };
  }

  /**
   * Generate complete analytics report
   * @param daysBack Number of days to include (default: 30)
   * @returns Complete analytics report
   */
  generateReport(daysBack: number = 30): AnalyticsReport {
    const now = Date.now();
    const start = now - (daysBack * 24 * 60 * 60 * 1000);

    return {
      generatedAt: now,
      period: { start, end: now },
      trends: this.getTrends(1000),
      conversations: this.getConversationStats(),
      usage: this.getUsageMetrics(),
      privacy: this.getPrivacyScore(),
    };
  }

  /**
   * Export analytics report to JSON
   * @param report Analytics report to export
   * @param filename Optional filename
   */
  exportReportJSON(report: AnalyticsReport, filename?: string): void {
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `sml-guardian-analytics-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('[Analytics] Report exported to JSON');
  }

  /**
   * Export analytics report to CSV
   * @param report Analytics report to export
   * @param filename Optional filename
   */
  exportReportCSV(report: AnalyticsReport, filename?: string): void {
    // CSV format: timestamp, ari, lexical_density, syntactic_complexity, rdi
    const lines = ['timestamp,ari,lexical_density,syntactic_complexity,rdi'];

    // Combine all trend data
    const maxLength = Math.max(
      report.trends.ari.length,
      report.trends.lexicalDensity.length,
      report.trends.syntacticComplexity.length,
      report.trends.rdi.length
    );

    for (let i = 0; i < maxLength; i++) {
      const ari = report.trends.ari[i];
      const ld = report.trends.lexicalDensity[i];
      const sc = report.trends.syntacticComplexity[i];
      const rdi = report.trends.rdi[i];

      if (ari) {
        const timestamp = new Date(ari.timestamp).toISOString();
        const ariValue = ari.value.toFixed(3);
        const ldValue = ld?.value.toFixed(3) || '';
        const scValue = sc?.value.toFixed(3) || '';
        const rdiValue = rdi?.value.toFixed(3) || '';

        lines.push(`${timestamp},${ariValue},${ldValue},${scValue},${rdiValue}`);
      }
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `sml-guardian-analytics-${Date.now()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('[Analytics] Report exported to CSV');
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
