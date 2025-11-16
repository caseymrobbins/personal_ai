/**
 * RDI Service (Sprint 6: Reality Drift Index)
 *
 * Tracks "Reality Drift" - when conversation topics shift unexpectedly,
 * potentially indicating AI hallucinations or unintended topic drift.
 *
 * Uses semantic embeddings to measure conceptual similarity over time.
 *
 * RDI Calculation:
 * - Compare current prompt to recent prompts (last 10)
 * - Calculate average cosine similarity
 * - Low similarity = high drift
 * - RDI = 1 - average_similarity (so higher RDI = more drift)
 *
 * Thresholds:
 * - RDI < 0.3: Stable conversation (low drift)
 * - RDI 0.3-0.6: Moderate drift (normal topic evolution)
 * - RDI > 0.6: High drift (alert: possible hallucination or topic jump)
 */

import { embeddingsService } from './embeddings.service';

export interface RDIMetrics {
  rdiScore: number;                // 0.0-1.0 (higher = more drift)
  avgSimilarity: number;           // 0.0-1.0 (average similarity to recent prompts)
  driftLevel: 'stable' | 'moderate' | 'high';
  alert: boolean;                  // True if drift is high
  comparedPrompts: number;         // Number of prompts compared
}

export interface RDIHistory {
  timestamp: number;
  rdiScore: number;
  avgSimilarity: number;
  driftLevel: 'stable' | 'moderate' | 'high';
}

class RDIService {
  private readonly DRIFT_THRESHOLD_MODERATE = 0.3;
  private readonly DRIFT_THRESHOLD_HIGH = 0.6;
  private readonly COMPARISON_WINDOW = 10; // Compare to last N prompts

  /**
   * Calculate RDI for a new prompt
   *
   * Compares the new prompt's embedding to recent prompts to detect drift.
   *
   * @param currentEmbedding Embedding of current prompt
   * @param recentEmbeddings Array of recent prompt embeddings (up to last 10)
   * @returns RDI metrics
   */
  calculateRDI(
    currentEmbedding: Float32Array,
    recentEmbeddings: Float32Array[]
  ): RDIMetrics {
    // If no history, can't calculate drift
    if (recentEmbeddings.length === 0) {
      return {
        rdiScore: 0,
        avgSimilarity: 1.0,
        driftLevel: 'stable',
        alert: false,
        comparedPrompts: 0,
      };
    }

    // Calculate similarity to each recent prompt
    const similarities = recentEmbeddings.map(embedding =>
      embeddingsService.cosineSimilarity(currentEmbedding, embedding)
    );

    // Calculate average similarity
    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;

    // RDI is inverse of similarity (1 - similarity)
    // So high similarity = low drift, low similarity = high drift
    const rdiScore = 1 - avgSimilarity;

    // Determine drift level
    let driftLevel: 'stable' | 'moderate' | 'high';
    if (rdiScore < this.DRIFT_THRESHOLD_MODERATE) {
      driftLevel = 'stable';
    } else if (rdiScore < this.DRIFT_THRESHOLD_HIGH) {
      driftLevel = 'moderate';
    } else {
      driftLevel = 'high';
    }

    // Alert if high drift
    const alert = driftLevel === 'high';

    console.log(`[RDI] Calculated drift:`, {
      rdiScore: rdiScore.toFixed(3),
      avgSimilarity: avgSimilarity.toFixed(3),
      driftLevel,
      comparedPrompts: recentEmbeddings.length,
    });

    return {
      rdiScore,
      avgSimilarity,
      driftLevel,
      alert,
      comparedPrompts: recentEmbeddings.length,
    };
  }

  /**
   * Analyze RDI trend over time
   *
   * @param recentRDI Array of recent RDI scores (sorted by timestamp DESC)
   * @returns Trend analysis
   */
  analyzeTrend(recentRDI: RDIHistory[]): {
    currentAvg: number;
    previousAvg: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    alertCount: number;
  } {
    if (recentRDI.length === 0) {
      return {
        currentAvg: 0,
        previousAvg: 0,
        trend: 'stable',
        alertCount: 0,
      };
    }

    // Split into current period (last 5) and previous period (5-10)
    const currentPeriod = recentRDI.slice(0, 5);
    const previousPeriod = recentRDI.slice(5, 10);

    const currentAvg = currentPeriod.length > 0
      ? currentPeriod.reduce((sum, item) => sum + item.rdiScore, 0) / currentPeriod.length
      : 0;

    const previousAvg = previousPeriod.length > 0
      ? previousPeriod.reduce((sum, item) => sum + item.rdiScore, 0) / previousPeriod.length
      : currentAvg;

    // Determine trend
    const diff = currentAvg - previousAvg;
    let trend: 'increasing' | 'stable' | 'decreasing';
    if (Math.abs(diff) < 0.05) {
      trend = 'stable';
    } else if (diff > 0) {
      trend = 'increasing'; // Drift is increasing (bad)
    } else {
      trend = 'decreasing'; // Drift is decreasing (good)
    }

    // Count high drift alerts
    const alertCount = recentRDI.filter(item => item.driftLevel === 'high').length;

    return {
      currentAvg,
      previousAvg,
      trend,
      alertCount,
    };
  }

  /**
   * Get drift threshold for alerts
   */
  getDriftThreshold(): number {
    return this.DRIFT_THRESHOLD_HIGH;
  }

  /**
   * Get recommended action based on RDI score
   */
  getRecommendation(rdiScore: number): string {
    if (rdiScore < this.DRIFT_THRESHOLD_MODERATE) {
      return 'Your conversation is focused and coherent. Topics are well-connected.';
    } else if (rdiScore < this.DRIFT_THRESHOLD_HIGH) {
      return 'Your conversation is evolving naturally. Topic shifts are moderate.';
    } else {
      return '⚠️ Significant topic drift detected. Consider: (1) Are you still discussing what you intended? (2) Is the AI staying on track? (3) Review recent responses for accuracy.';
    }
  }

  /**
   * Get comparison window size
   */
  getComparisonWindow(): number {
    return this.COMPARISON_WINDOW;
  }
}

// Export singleton instance
export const rdiService = new RDIService();
