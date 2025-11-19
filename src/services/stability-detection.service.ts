/**
 * Stability Detection Service
 *
 * Monitors user's emotional and cognitive stability state to determine
 * when Mirror Mode should be active versus when Balancer Mode is needed:
 * - Emotional stability (mood swings, consistency)
 * - Cognitive stability (clarity, focus, decision confidence)
 * - Conversational patterns (topic coherence, message entropy)
 * - Stress indicators (pressure markers, urgency levels)
 * - Grounding assessment (presence of grounding language, reality checks)
 *
 * Provides real-time stability metrics and triggers for mode switching.
 */

import { userLinguisticProfileService } from './user-linguistic-profile.service';
import { tonalResonanceService } from './tonal-resonance.service';

export interface StabilityProfile {
  userId: string;
  overallStabilityScore: number;         // 0.0 (unstable) to 1.0 (stable)
  emotionalStability: number;             // Based on sentiment consistency
  cognitiveStability: number;             // Based on clarity and focus
  conversationalStability: number;        // Based on coherence and consistency
  stressLevel: number;                   // 0.0 (calm) to 1.0 (high stress)
  groundingLevel: number;                // 0.0 (ungrounded) to 1.0 (well-grounded)
  shouldUseMirrorMode: boolean;
  recommendedMode: 'mirror' | 'balancer';
  confidenceThreshold: number;           // Confidence required for mode selection
  triggerReason: string;
}

export interface StabilityReport {
  userId: string;
  timestamp: number;
  stabilityScore: number;
  mode: 'mirror' | 'balancer';
  indicators: {
    name: string;
    value: number;
    status: 'stable' | 'warning' | 'critical';
  }[];
  recommendations: string[];
}

interface StabilityIndicator {
  pattern: RegExp;
  stabilityImpact: number;           // Positive increases stability, negative decreases
  category: 'cognitive' | 'emotional' | 'stress' | 'grounding';
  weight: number;
}

/**
 * StabilityDetectionService
 *
 * Monitors and assesses user stability state
 */
class StabilityDetectionService {
  // Cognitive clarity indicators (positive for stability)
  private clarityIndicators: StabilityIndicator[] = [
    { pattern: /\b(clearly|obviously|definitely|certainly|absolutely)\b/gi, stabilityImpact: 0.15, category: 'cognitive', weight: 0.3 },
    { pattern: /\b(I know|I understand|I realize|It's clear)\b/gi, stabilityImpact: 0.2, category: 'cognitive', weight: 0.35 },
    { pattern: /\b(specific|concrete|example|evidence|reason)\b/gi, stabilityImpact: 0.15, category: 'cognitive', weight: 0.25 },
  ];

  // Cognitive confusion indicators (negative for stability)
  private confusionIndicators: StabilityIndicator[] = [
    { pattern: /\b(confused|unclear|lost|disoriented|scattered)\b/gi, stabilityImpact: -0.3, category: 'cognitive', weight: 0.4 },
    { pattern: /\b(maybe|possibly|might|could|not sure)\b/gi, stabilityImpact: -0.2, category: 'cognitive', weight: 0.3 },
    { pattern: /\?\?\?|\?{2,}/g, stabilityImpact: -0.25, category: 'cognitive', weight: 0.35 },
  ];

  // Emotional stability indicators (consistent sentiment)
  private emotionalConsistencyIndicators: StabilityIndicator[] = [
    { pattern: /\b(feel|felt|feeling|emotion|mood)\b/gi, stabilityImpact: 0.1, category: 'emotional', weight: 0.2 },
    { pattern: /\b(grounded|centered|calm|peaceful|balanced)\b/gi, stabilityImpact: 0.25, category: 'emotional', weight: 0.4 },
  ];

  // Emotional distress indicators (negative stability)
  private distressIndicators: StabilityIndicator[] = [
    { pattern: /\b(panic|anxious|desperate|overwhelmed|terrified|crisis)\b/gi, stabilityImpact: -0.4, category: 'emotional', weight: 0.45 },
    { pattern: /\b(help|urgent|immediately|emergency|dying)\b/gi, stabilityImpact: -0.35, category: 'emotional', weight: 0.4 },
    { pattern: /!!!|!!!/g, stabilityImpact: -0.2, category: 'emotional', weight: 0.25 },
  ];

  // Stress indicators
  private stressIndicators: StabilityIndicator[] = [
    { pattern: /\b(stressed|stressed out|stressed-out|pressure|deadline)\b/gi, stabilityImpact: -0.25, category: 'stress', weight: 0.35 },
    { pattern: /\b(busy|hectic|chaotic|crazy|insane)\b/gi, stabilityImpact: -0.2, category: 'stress', weight: 0.3 },
    { pattern: /\b(need to|have to|must|gotta|asap)\b/gi, stabilityImpact: -0.15, category: 'stress', weight: 0.25 },
  ];

  // Grounding indicators (positive for stability)
  private groundingIndicators: StabilityIndicator[] = [
    { pattern: /\b(here|now|present|moment|reality|fact|truth)\b/gi, stabilityImpact: 0.2, category: 'grounding', weight: 0.3 },
    { pattern: /\b(I can|I will|I am|I have)\b/gi, stabilityImpact: 0.15, category: 'grounding', weight: 0.25 },
    { pattern: /\b(step|breath|focus|attention|mindful)\b/gi, stabilityImpact: 0.25, category: 'grounding', weight: 0.35 },
  ];

  // Dissociation indicators (negative for grounding)
  private dissociationIndicators: StabilityIndicator[] = [
    { pattern: /\b(numb|disconnected|floating|unreal|dreamlike|zoned out)\b/gi, stabilityImpact: -0.3, category: 'grounding', weight: 0.4 },
    { pattern: /\b(spacing out|losing it|falling apart|coming undone)\b/gi, stabilityImpact: -0.35, category: 'grounding', weight: 0.45 },
  ];

  // Store recent stability assessments for trend analysis
  private stabilityHistory: Map<string, number[]> = new Map();

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[StabilityDetection] ✅ Service initialized');
  }

  /**
   * Assess user's current stability state
   */
  assessStability(userId: string, recentMessage?: string): StabilityProfile {
    const profile = userLinguisticProfileService.getProfile(userId);

    if (!profile || profile.totalMessagesAnalyzed < 3) {
      return this.createDefaultProfile(userId);
    }

    const emotionalStability = this.assessEmotionalStability(profile, recentMessage);
    const cognitiveStability = this.assessCognitiveStability(profile, recentMessage);
    const conversationalStability = this.assessConversationalStability(profile);
    const stressLevel = this.assessStressLevel(profile, recentMessage);
    const groundingLevel = this.assessGroundingLevel(profile, recentMessage);

    // Calculate overall stability (weighted average)
    const overallStabilityScore = (
      (emotionalStability * 0.25) +
      (cognitiveStability * 0.25) +
      (conversationalStability * 0.15) +
      ((1 - stressLevel) * 0.2) +
      (groundingLevel * 0.15)
    );

    // Determine mode and trigger reason
    const { shouldUseMirrorMode, recommendedMode, triggerReason } = this.determineModeSelection(
      overallStabilityScore,
      emotionalStability,
      groundingLevel,
      stressLevel
    );

    // Track stability history for trend analysis
    if (!this.stabilityHistory.has(userId)) {
      this.stabilityHistory.set(userId, []);
    }
    const history = this.stabilityHistory.get(userId)!;
    history.push(overallStabilityScore);
    if (history.length > 50) {
      history.shift();
    }

    const confidenceThreshold = Math.min(1, profile.confidenceScore * 0.9);

    console.log(
      `[StabilityDetection] 📊 Assessed stability for user ${userId}: ` +
      `overall=${overallStabilityScore.toFixed(2)}, emotional=${emotionalStability.toFixed(2)}, ` +
      `cognitive=${cognitiveStability.toFixed(2)}, stress=${stressLevel.toFixed(2)}, ` +
      `mode=${recommendedMode}`
    );

    return {
      userId,
      overallStabilityScore,
      emotionalStability,
      cognitiveStability,
      conversationalStability,
      stressLevel,
      groundingLevel,
      shouldUseMirrorMode,
      recommendedMode,
      confidenceThreshold,
      triggerReason,
    };
  }

  /**
   * Generate comprehensive stability report
   */
  generateStabilityReport(userId: string, recentMessage?: string): StabilityReport {
    const stability = this.assessStability(userId, recentMessage);

    const indicators = [
      {
        name: 'Emotional Stability',
        value: stability.emotionalStability,
        status: this.scoreToStatus(stability.emotionalStability),
      },
      {
        name: 'Cognitive Clarity',
        value: stability.cognitiveStability,
        status: this.scoreToStatus(stability.cognitiveStability),
      },
      {
        name: 'Conversational Coherence',
        value: stability.conversationalStability,
        status: this.scoreToStatus(stability.conversationalStability),
      },
      {
        name: 'Stress Level',
        value: stability.stressLevel,
        status: this.scoreToStatus(1 - stability.stressLevel),
      },
      {
        name: 'Grounding Level',
        value: stability.groundingLevel,
        status: this.scoreToStatus(stability.groundingLevel),
      },
    ];

    const recommendations = this.generateRecommendations(stability);

    console.log(
      `[StabilityDetection] 📋 Generated report for user ${userId} - Mode: ${stability.recommendedMode.toUpperCase()}`
    );

    return {
      userId,
      timestamp: Date.now(),
      stabilityScore: stability.overallStabilityScore,
      mode: stability.recommendedMode,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess emotional stability based on sentiment consistency
   */
  private assessEmotionalStability(profile: any, recentMessage?: string): number {
    let stabilityScore = 0;
    let weight = 0;

    const text = recentMessage || profile.rawMessages?.slice(-3).join(' ') || '';

    // Check for emotional consistency indicators (positive)
    for (const indicator of this.emotionalConsistencyIndicators) {
      const matches = text.match(indicator.pattern) || [];
      stabilityScore += (matches.length * indicator.weight * Math.max(0, indicator.stabilityImpact));
      weight += indicator.weight;
    }

    // Check for distress indicators (negative)
    for (const indicator of this.distressIndicators) {
      const matches = text.match(indicator.pattern) || [];
      stabilityScore -= (matches.length * indicator.weight * Math.abs(indicator.stabilityImpact));
      weight += indicator.weight;
    }

    return Math.min(1, Math.max(0, 0.5 + (stabilityScore / Math.max(1, weight * 2))));
  }

  /**
   * Assess cognitive stability (clarity, focus, decision confidence)
   */
  private assessCognitiveStability(profile: any, recentMessage?: string): number {
    let clarityScore = 0;
    let confusionScore = 0;
    let weight = 0;

    const text = recentMessage || profile.rawMessages?.slice(-3).join(' ') || '';

    // Clarity indicators (positive)
    for (const indicator of this.clarityIndicators) {
      const matches = text.match(indicator.pattern) || [];
      clarityScore += (matches.length * indicator.weight);
      weight += indicator.weight;
    }

    // Confusion indicators (negative)
    for (const indicator of this.confusionIndicators) {
      const matches = text.match(indicator.pattern) || [];
      confusionScore += (matches.length * indicator.weight);
      weight += indicator.weight;
    }

    const netScore = (clarityScore - confusionScore) / Math.max(1, weight * 2);
    return Math.min(1, Math.max(0, 0.5 + netScore));
  }

  /**
   * Assess conversational stability (coherence, consistency of topics)
   */
  private assessConversationalStability(profile: any): number {
    if (!profile.rawMessages || profile.rawMessages.length < 2) {
      return 0.5;
    }

    const messages = profile.rawMessages.slice(-10);

    // Calculate message length consistency
    const lengths = messages.map((m: string) => m.split(/\s+/).length);
    const avgLength = lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length;
    const lengthVariance = lengths.reduce((sum: number, len: number) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const standardDeviation = Math.sqrt(lengthVariance);
    const lengthConsistency = Math.max(0, 1 - (standardDeviation / Math.max(1, avgLength)));

    // Calculate topic coherence (simple: check for repeated important words)
    const allWords = messages.join(' ').toLowerCase().split(/\s+/);
    const uniqueWords = new Set(allWords);
    const repetitionRate = 1 - (uniqueWords.size / allWords.length);

    // Conversation should have some repetition (coherence) but not too much (variety)
    const coherenceScore = repetitionRate > 0.2 ? 0.8 : 0.5;

    return (lengthConsistency * 0.5) + (coherenceScore * 0.5);
  }

  /**
   * Assess user's stress level
   */
  private assessStressLevel(profile: any, recentMessage?: string): number {
    let stressScore = 0;
    let weight = 0;

    const text = recentMessage || profile.rawMessages?.slice(-3).join(' ') || '';

    for (const indicator of this.stressIndicators) {
      const matches = text.match(indicator.pattern) || [];
      stressScore += (matches.length * indicator.weight);
      weight += indicator.weight;
    }

    return Math.min(1, Math.max(0, stressScore / Math.max(1, weight * 2)));
  }

  /**
   * Assess user's grounding level (reality-based vs. dissociated)
   */
  private assessGroundingLevel(profile: any, recentMessage?: string): number {
    let groundingScore = 0;
    let dissociationScore = 0;
    let weight = 0;

    const text = recentMessage || profile.rawMessages?.slice(-3).join(' ') || '';

    // Grounding indicators (positive)
    for (const indicator of this.groundingIndicators) {
      const matches = text.match(indicator.pattern) || [];
      groundingScore += (matches.length * indicator.weight);
      weight += indicator.weight;
    }

    // Dissociation indicators (negative)
    for (const indicator of this.dissociationIndicators) {
      const matches = text.match(indicator.pattern) || [];
      dissociationScore += (matches.length * indicator.weight);
      weight += indicator.weight;
    }

    const netScore = (groundingScore - dissociationScore) / Math.max(1, weight * 2);
    return Math.min(1, Math.max(0, 0.5 + netScore));
  }

  /**
   * Determine whether to use Mirror or Balancer mode
   */
  private determineModeSelection(
    overallScore: number,
    emotionalStability: number,
    groundingLevel: number,
    stressLevel: number
  ): { shouldUseMirrorMode: boolean; recommendedMode: 'mirror' | 'balancer'; triggerReason: string } {
    // Mirror Mode: User is stable, grounded, and not under high stress
    if (overallScore > 0.65 && emotionalStability > 0.6 && groundingLevel > 0.5 && stressLevel < 0.4) {
      return {
        shouldUseMirrorMode: true,
        recommendedMode: 'mirror',
        triggerReason: 'User is stable and grounded - Mirror mode active',
      };
    }

    // Balancer Mode: User needs support
    if (overallScore < 0.55 || emotionalStability < 0.45 || groundingLevel < 0.4 || stressLevel > 0.6) {
      let reason = 'Balancer mode activated due to: ';
      const reasons: string[] = [];

      if (emotionalStability < 0.45) reasons.push('emotional instability');
      if (groundingLevel < 0.4) reasons.push('lack of grounding');
      if (stressLevel > 0.6) reasons.push('high stress');
      if (overallScore < 0.55) reasons.push('low overall stability');

      return {
        shouldUseMirrorMode: false,
        recommendedMode: 'balancer',
        triggerReason: reason + reasons.join(', '),
      };
    }

    // Neutral state - use Mirror mode as default
    return {
      shouldUseMirrorMode: true,
      recommendedMode: 'mirror',
      triggerReason: 'User in stable/neutral state - Mirror mode active',
    };
  }

  /**
   * Convert numeric score to status
   */
  private scoreToStatus(score: number): 'stable' | 'warning' | 'critical' {
    if (score > 0.65) return 'stable';
    if (score > 0.4) return 'warning';
    return 'critical';
  }

  /**
   * Generate recommendations based on stability assessment
   */
  private generateRecommendations(stability: StabilityProfile): string[] {
    const recommendations: string[] = [];

    if (stability.emotionalStability < 0.5) {
      recommendations.push('Consider emotional grounding techniques');
    }

    if (stability.cognitiveStability < 0.5) {
      recommendations.push('Break down tasks into smaller, clearer steps');
    }

    if (stability.stressLevel > 0.6) {
      recommendations.push('Take a break to reduce stress levels');
    }

    if (stability.groundingLevel < 0.5) {
      recommendations.push('Focus on present-moment awareness and reality-based thinking');
    }

    if (stability.conversationalStability < 0.5) {
      recommendations.push('Try to clarify your thoughts before sharing');
    }

    if (recommendations.length === 0) {
      recommendations.push('You appear to be in a good state - continue with your current approach');
    }

    return recommendations;
  }

  /**
   * Check if a mode switch is recommended based on stability change
   */
  shouldSwitchMode(userId: string, currentMode: 'mirror' | 'balancer'): boolean {
    const stability = this.assessStability(userId);
    return stability.recommendedMode !== currentMode;
  }

  /**
   * Get stability trend analysis
   */
  getStabilityTrend(userId: string): {
    recentScore: number;
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
    trendStrength: number;
  } {
    const history = this.stabilityHistory.get(userId) || [];

    if (history.length < 2) {
      return {
        recentScore: 0.5,
        averageScore: 0.5,
        trend: 'stable',
        trendStrength: 0,
      };
    }

    const recentScore = history[history.length - 1];
    const averageScore = history.reduce((a, b) => a + b, 0) / history.length;

    // Calculate trend using simple linear regression
    const n = Math.min(history.length, 10);
    const recentHistory = history.slice(-n);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < recentHistory.length; i++) {
      sumX += i;
      sumY += recentHistory[i];
      sumXY += i * recentHistory[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trend = slope > 0.05 ? 'improving' : slope < -0.05 ? 'declining' : 'stable';
    const trendStrength = Math.abs(slope);

    return {
      recentScore,
      averageScore,
      trend,
      trendStrength,
    };
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.stabilityHistory.clear();
    console.log('[StabilityDetection] 🔄 Service reset');
  }

  /**
   * Create default profile when insufficient data
   */
  private createDefaultProfile(userId: string): StabilityProfile {
    return {
      userId,
      overallStabilityScore: 0.5,
      emotionalStability: 0.5,
      cognitiveStability: 0.5,
      conversationalStability: 0.5,
      stressLevel: 0.5,
      groundingLevel: 0.5,
      shouldUseMirrorMode: true,
      recommendedMode: 'mirror',
      confidenceThreshold: 0.3,
      triggerReason: 'Insufficient data for stability assessment',
    };
  }
}

// Export singleton instance
export const stabilityDetectionService = new StabilityDetectionService();
