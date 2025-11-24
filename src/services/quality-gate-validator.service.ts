/**
 * Quality Gate Validator Service
 *
 * Validates the quality of local SLM responses to determine if they meet
 * standards for user delivery or require escalation to cloud models.
 *
 * Implements multi-factor quality assessment including coherence, completeness,
 * accuracy, relevance, and safety checks.
 *
 * @module QualityGateValidatorService
 */

import type { IChatCompletionRequest, IChatMessage } from '../modules/adapters/adapter.interface';

/**
 * Quality validation result
 */
export interface QualityValidationResult {
  passed: boolean;
  overallScore: number; // 0.0-1.0
  scores: {
    coherence: number;
    completeness: number;
    relevance: number;
    accuracy: number;
    safety: number;
  };
  reasoning: string;
  recommendation: 'accept' | 'improve' | 'escalate';
  confidence: number; // How confident are we in this assessment
}

/**
 * Quality validation thresholds
 */
interface QualityThresholds {
  pass: number; // Overall score needed to pass (0.7 = 70%)
  coherence: number; // Minimum coherence score
  completeness: number; // Minimum completeness score
  relevance: number; // Minimum relevance score
  accuracy: number; // Minimum accuracy score
  safety: number; // Minimum safety score (higher threshold)
}

/**
 * Quality Gate Validator Service
 *
 * Provides sophisticated validation of AI responses to ensure quality standards.
 */
export class QualityGateValidatorService {
  private static instance: QualityGateValidatorService;

  // Default quality thresholds
  private readonly DEFAULT_THRESHOLDS: QualityThresholds = {
    pass: 0.70, // Overall score >= 70% to pass
    coherence: 0.60, // Min coherence
    completeness: 0.65, // Min completeness
    relevance: 0.70, // Min relevance (important!)
    accuracy: 0.65, // Min accuracy
    safety: 0.95, // Min safety (critical!)
  };

  // Validation metrics for monitoring
  private validationStats = {
    totalValidations: 0,
    passed: 0,
    failed: 0,
    escalated: 0,
    averageScore: 0,
  };

  private constructor() {}

  public static getInstance(): QualityGateValidatorService {
    if (!QualityGateValidatorService.instance) {
      QualityGateValidatorService.instance = new QualityGateValidatorService();
    }
    return QualityGateValidatorService.instance;
  }

  /**
   * Validate response quality
   *
   * @param response - AI-generated response to validate
   * @param request - Original request context
   * @param thresholds - Optional custom thresholds
   * @returns Quality validation result
   */
  public async validate(
    response: string,
    request: IChatCompletionRequest,
    thresholds: Partial<QualityThresholds> = {}
  ): Promise<QualityValidationResult> {
    const mergedThresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };

    // Extract user query from request
    const userQuery = this.extractUserQuery(request.messages);

    // Run all quality checks
    const coherenceScore = this.checkCoherence(response);
    const completenessScore = this.checkCompleteness(response, userQuery);
    const relevanceScore = this.checkRelevance(response, userQuery);
    const accuracyScore = this.checkAccuracy(response, userQuery);
    const safetyScore = this.checkSafety(response);

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore({
      coherence: coherenceScore,
      completeness: completenessScore,
      relevance: relevanceScore,
      accuracy: accuracyScore,
      safety: safetyScore,
    });

    // Determine if passed
    const passed =
      overallScore >= mergedThresholds.pass &&
      coherenceScore >= mergedThresholds.coherence &&
      completenessScore >= mergedThresholds.completeness &&
      relevanceScore >= mergedThresholds.relevance &&
      accuracyScore >= mergedThresholds.accuracy &&
      safetyScore >= mergedThresholds.safety;

    // Determine recommendation
    let recommendation: 'accept' | 'improve' | 'escalate';
    if (passed) {
      recommendation = 'accept';
    } else if (overallScore >= 0.6) {
      recommendation = 'improve'; // Could be improved with refinement
    } else {
      recommendation = 'escalate'; // Need cloud model
    }

    // Generate reasoning
    const reasoning = this.generateReasoning({
      coherence: coherenceScore,
      completeness: completenessScore,
      relevance: relevanceScore,
      accuracy: accuracyScore,
      safety: safetyScore,
    }, mergedThresholds);

    // Calculate confidence in this assessment
    const confidence = this.calculateAssessmentConfidence({
      coherence: coherenceScore,
      completeness: completenessScore,
      relevance: relevanceScore,
      accuracy: accuracyScore,
      safety: safetyScore,
    });

    // Update stats
    this.updateStats(passed, overallScore);

    return {
      passed,
      overallScore,
      scores: {
        coherence: coherenceScore,
        completeness: completenessScore,
        relevance: relevanceScore,
        accuracy: accuracyScore,
        safety: safetyScore,
      },
      reasoning,
      recommendation,
      confidence,
    };
  }

  /**
   * Check coherence (response flows logically)
   */
  private checkCoherence(response: string): number {
    let score = 0.5; // Base score

    // Check 1: Proper sentence structure
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) {
      score += 0.15;
    }

    // Check 2: No excessive repetition
    const words = response.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio > 0.5) {
      score += 0.15;
    }

    // Check 3: Proper punctuation
    const hasPunctuation = /[.!?,;:]/.test(response);
    if (hasPunctuation) {
      score += 0.10;
    }

    // Check 4: No incomplete thoughts (doesn't end mid-sentence)
    const endsWell = /[.!?]$/.test(response.trim());
    if (endsWell) {
      score += 0.10;
    }

    return Math.min(1.0, score);
  }

  /**
   * Check completeness (all parts of query addressed)
   */
  private checkCompleteness(response: string, query: string): number {
    let score = 0.5; // Base score

    // Check 1: Response length appropriate for query
    const queryLength = query.split(/\s+/).length;
    const responseLength = response.split(/\s+/).length;

    if (queryLength < 10 && responseLength >= 20) {
      score += 0.15; // Simple query, good response length
    } else if (queryLength >= 10 && responseLength >= 50) {
      score += 0.15; // Complex query, detailed response
    } else if (responseLength < 10) {
      score -= 0.15; // Response too short
    }

    // Check 2: Addresses key question words
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];
    const queryLower = query.toLowerCase();
    const responseLower = response.toLowerCase();

    const questionWordsInQuery = questionWords.filter(word => queryLower.includes(word));
    if (questionWordsInQuery.length > 0) {
      // Response should be substantive
      if (responseLength >= 30) {
        score += 0.20;
      }
    }

    // Check 3: Has structure (multiple points if complex query)
    if (queryLength > 15) {
      const hasStructure = /\n|•|1\.|2\.|first|second|additionally|moreover/i.test(response);
      if (hasStructure) {
        score += 0.15;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Check relevance (response is on-topic)
   */
  private checkRelevance(response: string, query: string): number {
    let score = 0.4; // Base score

    // Extract keywords from query (filter stopwords)
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const queryWords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopwords.has(word));

    const responseWords = response.toLowerCase();

    // Check 1: Keyword overlap
    if (queryWords.length > 0) {
      const matchedWords = queryWords.filter(word => responseWords.includes(word));
      const overlapRatio = matchedWords.length / queryWords.length;
      score += overlapRatio * 0.40;
    }

    // Check 2: No generic fallback responses
    const genericPhrases = [
      'i don\'t know',
      'i cannot help',
      'i\'m not sure',
      'sorry, i can\'t',
      'unable to assist',
    ];
    const hasGenericFallback = genericPhrases.some(phrase =>
      response.toLowerCase().includes(phrase)
    );
    if (hasGenericFallback) {
      score -= 0.30; // Penalty for generic responses
    }

    // Check 3: Direct answer detection
    if (queryWords.length > 0) {
      const firstSentence = response.split(/[.!?]/)[0].toLowerCase();
      const directAnswer = queryWords.some(word => firstSentence.includes(word));
      if (directAnswer) {
        score += 0.20;
      }
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Check accuracy (factual claims are reasonable)
   */
  private checkAccuracy(response: string, query: string): number {
    let score = 0.6; // Base score (neutral)

    // Check 1: No hedging on simple facts
    const isSimpleFactual = /^(what is|define|who is|when did)/i.test(query);
    if (isSimpleFactual) {
      const hasHedging = /maybe|perhaps|possibly|might be|could be|uncertain/i.test(response);
      if (!hasHedging) {
        score += 0.15; // Good - confident on factual
      } else {
        score -= 0.10; // Bad - hedging on simple facts
      }
    }

    // Check 2: Appropriate hedging on complex/subjective
    const isOpinion = /should|better|best|recommend|suggest|opinion/i.test(query);
    if (isOpinion) {
      const hasNuance = /however|although|depending|may vary|consider|typically/i.test(response);
      if (hasNuance) {
        score += 0.15; // Good - shows nuance
      }
    }

    // Check 3: No obvious contradictions within response
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    let contradictionFound = false;
    for (let i = 0; i < sentences.length - 1; i++) {
      const s1 = sentences[i].toLowerCase();
      const s2 = sentences[i + 1].toLowerCase();

      // Simple contradiction detection
      if (
        (s1.includes('is') && s2.includes('is not')) ||
        (s1.includes('can') && s2.includes('cannot')) ||
        (s1.includes('always') && s2.includes('never'))
      ) {
        contradictionFound = true;
        break;
      }
    }
    if (contradictionFound) {
      score -= 0.25; // Penalty for contradictions
    }

    // Check 4: Has citations or evidence for factual claims
    const hasCitations = /according to|research shows|studies indicate|\[.*\]/i.test(response);
    if (hasCitations && isSimpleFactual) {
      score += 0.10;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Check safety (no harmful content)
   */
  private checkSafety(response: string): number {
    let score = 1.0; // Start perfect, deduct for issues

    const responseLower = response.toLowerCase();

    // Check 1: No harmful instructions
    const harmfulKeywords = [
      'how to harm',
      'how to hurt',
      'kill yourself',
      'commit suicide',
      'make a bomb',
      'illegal drugs',
      'hack into',
      'steal',
      'violence',
    ];
    const hasHarmful = harmfulKeywords.some(keyword => responseLower.includes(keyword));
    if (hasHarmful) {
      score = 0.0; // Auto-fail on harmful content
    }

    // Check 2: No PII leakage (SSN, credit cards, etc.)
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    ];
    const hasPII = piiPatterns.some(pattern => pattern.test(response));
    if (hasPII) {
      score -= 0.50; // Major penalty for PII leakage
    }

    // Check 3: No excessive profanity
    const profanityPatterns = [
      /\bf+u+c+k/i,
      /\bs+h+i+t/i,
      /\ba+s+s+h+o+l+e/i,
    ];
    const hasProfanity = profanityPatterns.some(pattern => pattern.test(response));
    if (hasProfanity) {
      score -= 0.20; // Penalty for profanity
    }

    // Check 4: No discriminatory content
    const discriminatoryKeywords = [
      'racist',
      'sexist',
      'homophobic',
      'inferior race',
      'superior gender',
    ];
    const hasDiscrimination = discriminatoryKeywords.some(keyword => responseLower.includes(keyword));
    if (hasDiscrimination) {
      score -= 0.50; // Major penalty
    }

    return Math.max(0.0, score);
  }

  /**
   * Calculate overall score (weighted average)
   */
  private calculateOverallScore(scores: {
    coherence: number;
    completeness: number;
    relevance: number;
    accuracy: number;
    safety: number;
  }): number {
    // Weights (must sum to 1.0)
    const weights = {
      coherence: 0.15,
      completeness: 0.20,
      relevance: 0.30, // Most important
      accuracy: 0.20,
      safety: 0.15,
    };

    return (
      scores.coherence * weights.coherence +
      scores.completeness * weights.completeness +
      scores.relevance * weights.relevance +
      scores.accuracy * weights.accuracy +
      scores.safety * weights.safety
    );
  }

  /**
   * Generate human-readable reasoning for validation result
   */
  private generateReasoning(
    scores: {
      coherence: number;
      completeness: number;
      relevance: number;
      accuracy: number;
      safety: number;
    },
    thresholds: QualityThresholds
  ): string {
    const issues: string[] = [];

    if (scores.coherence < thresholds.coherence) {
      issues.push(`low coherence (${(scores.coherence * 100).toFixed(0)}%)`);
    }
    if (scores.completeness < thresholds.completeness) {
      issues.push(`incomplete response (${(scores.completeness * 100).toFixed(0)}%)`);
    }
    if (scores.relevance < thresholds.relevance) {
      issues.push(`low relevance (${(scores.relevance * 100).toFixed(0)}%)`);
    }
    if (scores.accuracy < thresholds.accuracy) {
      issues.push(`accuracy concerns (${(scores.accuracy * 100).toFixed(0)}%)`);
    }
    if (scores.safety < thresholds.safety) {
      issues.push(`safety issues (${(scores.safety * 100).toFixed(0)}%)`);
    }

    if (issues.length === 0) {
      return 'All quality checks passed';
    } else {
      return `Quality issues: ${issues.join(', ')}`;
    }
  }

  /**
   * Calculate confidence in the quality assessment itself
   */
  private calculateAssessmentConfidence(scores: {
    coherence: number;
    completeness: number;
    relevance: number;
    accuracy: number;
    safety: number;
  }): number {
    // If scores are very clear (all high or all low), confidence is high
    // If scores are mixed, confidence is lower

    const scoreValues = Object.values(scores);
    const avgScore = scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length;
    const variance = scoreValues.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scoreValues.length;

    // Low variance = high confidence (scores agree)
    // High variance = low confidence (scores conflict)
    const confidence = 1.0 - Math.min(variance * 2, 0.4); // Cap uncertainty at 40%

    return Math.max(0.6, Math.min(1.0, confidence));
  }

  /**
   * Extract user query from messages
   */
  private extractUserQuery(messages: IChatMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
  }

  /**
   * Update validation statistics
   */
  private updateStats(passed: boolean, score: number): void {
    this.validationStats.totalValidations++;
    if (passed) {
      this.validationStats.passed++;
    } else {
      this.validationStats.failed++;
    }

    // Update running average score
    const n = this.validationStats.totalValidations;
    this.validationStats.averageScore =
      (this.validationStats.averageScore * (n - 1) + score) / n;
  }

  /**
   * Get validation statistics
   */
  public getStats() {
    return { ...this.validationStats };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.validationStats = {
      totalValidations: 0,
      passed: 0,
      failed: 0,
      escalated: 0,
      averageScore: 0,
    };
  }

  /**
   * Get pass rate percentage
   */
  public getPassRate(): number {
    if (this.validationStats.totalValidations === 0) return 0;
    return (this.validationStats.passed / this.validationStats.totalValidations) * 100;
  }
}

export default QualityGateValidatorService;
