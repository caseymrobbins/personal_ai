/**
 * Mirror Mode Orchestrator Service
 *
 * Integrates all Mirror Mode components (Linguistic Profile, Lexicon Matching,
 * Syntax Mirroring, Tonal Resonance, Stability Detection) into a unified
 * response generation pipeline.
 *
 * Coordinates:
 * - Mode selection (Mirror vs. Balancer)
 * - Service invocation order for optimal performance
 * - Confidence aggregation across all services
 * - Result merging and conflict resolution
 * - Latency monitoring for real-time operation
 */

import { userLinguisticProfileService } from './user-linguistic-profile.service';
import { lexiconMatchingEngineService } from './lexicon-matching-engine.service';
import { syntaxMirroringService } from './syntax-mirroring.service';
import { tonalResonanceService } from './tonal-resonance.service';
import { stabilityDetectionService } from './stability-detection.service';

export interface MirrorModeResponse {
  userId: string;
  originalResponse: string;
  mirrorResponse: string;
  modeActive: 'mirror' | 'balancer' | 'off';
  pipelineStats: {
    startTime: number;
    endTime: number;
    duration: number;
    stagesCompleted: string[];
  };
  confidenceScores: {
    lexicon: number;
    syntax: number;
    tone: number;
    overall: number;
  };
  appliedTransformations: {
    lexiconMatching: boolean;
    syntaxMirroring: boolean;
    tonalMirroring: boolean;
  };
  stabilityAssessment: {
    overallScore: number;
    modeRecommendation: 'mirror' | 'balancer';
    rationale: string;
  };
}

export interface MirrorModeConfig {
  enabled: boolean;
  minConfidenceThreshold: number;
  minProfileDataThreshold: number;           // Messages required before activation
  latencyBudget: number;                     // Maximum milliseconds for processing
  transformationPriority: ('lexicon' | 'syntax' | 'tone')[];
  useStabilityDetection: boolean;
  autoModeSwitching: boolean;
}

/**
 * MirrorModeOrchestratorService
 *
 * Orchestrates all Mirror Mode services
 */
class MirrorModeOrchestratorService {
  private config: MirrorModeConfig = {
    enabled: true,
    minConfidenceThreshold: 0.4,
    minProfileDataThreshold: 5,
    latencyBudget: 100,                   // 100ms budget for response transformation
    transformationPriority: ['lexicon', 'syntax', 'tone'],
    useStabilityDetection: true,
    autoModeSwitching: true,
  };

  private activeSessions: Map<string, { mode: 'mirror' | 'balancer'; lastUpdated: number }> = new Map();
  private performanceMetrics: Map<string, { avgLatency: number; successRate: number; transformationsApplied: number }> = new Map();

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    console.log('[MirrorModeOrchestrator] ✅ Initializing all Mirror Mode services...');

    try {
      await userLinguisticProfileService.initialize();
      await lexiconMatchingEngineService.initialize();
      await syntaxMirroringService.initialize();
      await tonalResonanceService.initialize();
      await stabilityDetectionService.initialize();

      console.log('[MirrorModeOrchestrator] ✅ All services initialized successfully');
    } catch (error) {
      console.error('[MirrorModeOrchestrator] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Update Mirror Mode configuration
   */
  updateConfig(newConfig: Partial<MirrorModeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[MirrorModeOrchestrator] ⚙️ Configuration updated');
  }

  /**
   * Process user message and update linguistic profile
   */
  async profileUserMessage(userId: string, message: string): Promise<void> {
    try {
      await userLinguisticProfileService.analyzeMessage(userId, message);
    } catch (error) {
      console.error('[MirrorModeOrchestrator] Error profiling message:', error);
    }
  }

  /**
   * Apply Mirror Mode transformations to response
   */
  async applyMirrorMode(userId: string, response: string): Promise<MirrorModeResponse> {
    const startTime = Date.now();
    const stagesCompleted: string[] = [];

    // Check if Mirror Mode is enabled
    if (!this.config.enabled) {
      return this.createBypassResponse(userId, response, startTime, stagesCompleted);
    }

    // Check user has sufficient profile data
    const userProfile = userLinguisticProfileService.getProfile(userId);
    if (!userProfile || userProfile.totalMessagesAnalyzed < this.config.minProfileDataThreshold) {
      return this.createBypassResponse(userId, response, startTime, stagesCompleted);
    }

    stagesCompleted.push('profile_check');

    // Determine mode (Mirror vs. Balancer)
    let currentMode: 'mirror' | 'balancer' = 'mirror';
    let stabilityRationale = 'Default mode';

    if (this.config.useStabilityDetection) {
      const stability = stabilityDetectionService.assessStability(userId);
      currentMode = stability.recommendedMode;
      stabilityRationale = stability.triggerReason;
      stagesCompleted.push('stability_detection');

      // Store active session info
      this.activeSessions.set(userId, { mode: currentMode, lastUpdated: Date.now() });
    }

    // Skip Mirror Mode if Balancer mode is recommended
    if (currentMode === 'balancer') {
      console.log(`[MirrorModeOrchestrator] 📊 Balancer Mode active for user ${userId}`);
      return this.createBypassResponse(userId, response, startTime, stagesCompleted, 'balancer', stabilityRationale);
    }

    // Apply transformations in priority order
    let transformedResponse = response;
    const confidenceScores = { lexicon: 0, syntax: 0, tone: 0, overall: 0 };
    const appliedTransformations = { lexiconMatching: false, syntaxMirroring: false, tonalMirroring: false };

    for (const priority of this.config.transformationPriority) {
      // Check latency budget
      const elapsed = Date.now() - startTime;
      if (elapsed > this.config.latencyBudget) {
        console.warn(
          `[MirrorModeOrchestrator] ⏱️ Latency budget exceeded (${elapsed}ms > ${this.config.latencyBudget}ms), skipping remaining transformations`
        );
        break;
      }

      if (priority === 'lexicon') {
        const result = await lexiconMatchingEngineService.matchLexicon(userId, transformedResponse);
        if (result.overallConfidence >= this.config.minConfidenceThreshold) {
          transformedResponse = result.matchedText;
          confidenceScores.lexicon = result.overallConfidence;
          appliedTransformations.lexiconMatching = true;
          stagesCompleted.push('lexicon_matching');
        }
      } else if (priority === 'syntax') {
        const result = await syntaxMirroringService.mirrorSyntax(userId, transformedResponse);
        if (result.confidence >= this.config.minConfidenceThreshold) {
          transformedResponse = result.adaptedText;
          confidenceScores.syntax = result.confidence;
          appliedTransformations.syntaxMirroring = true;
          stagesCompleted.push('syntax_mirroring');
        }
      } else if (priority === 'tone') {
        const result = tonalResonanceService.applyTonalMirroring(userId, transformedResponse);
        if (result.overallConfidence >= this.config.minConfidenceThreshold) {
          transformedResponse = result.adaptedText;
          confidenceScores.tone = result.overallConfidence;
          appliedTransformations.tonalMirroring = true;
          stagesCompleted.push('tonal_mirroring');
        }
      }
    }

    // Calculate overall confidence
    const appliedCount = Object.values(appliedTransformations).filter(Boolean).length;
    if (appliedCount > 0) {
      const scores = [confidenceScores.lexicon, confidenceScores.syntax, confidenceScores.tone].filter(s => s > 0);
      confidenceScores.overall = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
    } else {
      confidenceScores.overall = 0;
    }

    // Update performance metrics
    this.updatePerformanceMetrics(userId, Date.now() - startTime, appliedCount > 0);

    const endTime = Date.now();

    console.log(
      `[MirrorModeOrchestrator] 🪞 Applied Mirror Mode for user ${userId} ` +
      `(duration: ${endTime - startTime}ms, transformations: ${appliedCount}, confidence: ${(confidenceScores.overall * 100).toFixed(0)}%)`
    );

    return {
      userId,
      originalResponse: response,
      mirrorResponse: transformedResponse,
      modeActive: 'mirror',
      pipelineStats: {
        startTime,
        endTime,
        duration: endTime - startTime,
        stagesCompleted,
      },
      confidenceScores,
      appliedTransformations,
      stabilityAssessment: {
        overallScore: userProfile.confidenceScore,
        modeRecommendation: currentMode,
        rationale: stabilityRationale,
      },
    };
  }

  /**
   * Get current mode for a user
   */
  getCurrentMode(userId: string): 'mirror' | 'balancer' | 'unknown' {
    const session = this.activeSessions.get(userId);
    if (session && Date.now() - session.lastUpdated < 3600000) { // 1 hour session timeout
      return session.mode;
    }

    // Assess current mode based on stability
    if (this.config.useStabilityDetection) {
      const stability = stabilityDetectionService.assessStability(userId);
      return stability.recommendedMode;
    }

    return 'unknown';
  }

  /**
   * Get comprehensive Mirror Mode status
   */
  getStatus(): {
    enabled: boolean;
    config: MirrorModeConfig;
    activeSessions: number;
    performanceMetrics: any;
  } {
    const metrics: any = {};
    for (const [userId, metric] of this.performanceMetrics) {
      metrics[userId] = {
        averageLatency: `${metric.avgLatency.toFixed(0)}ms`,
        successRate: `${(metric.successRate * 100).toFixed(0)}%`,
        transformationsApplied: metric.transformationsApplied,
      };
    }

    return {
      enabled: this.config.enabled,
      config: this.config,
      activeSessions: this.activeSessions.size,
      performanceMetrics: metrics,
    };
  }

  /**
   * Get detailed user Mirror Mode profile
   */
  getUserMirrorProfile(userId: string) {
    const linguisticProfile = userLinguisticProfileService.getProfile(userId);
    const syntaxStats = syntaxMirroringService.getSyntaxStats(userId);
    const tonalStats = tonalResonanceService.getTonalStats(userId);
    const lexiconStats = lexiconMatchingEngineService.getLexiconStats(userId);
    const stabilityProfile = stabilityDetectionService.assessStability(userId);
    const stabilityReport = stabilityDetectionService.generateStabilityReport(userId);

    if (!linguisticProfile) {
      return null;
    }

    return {
      userId,
      readiness: {
        totalMessagesAnalyzed: linguisticProfile.totalMessagesAnalyzed,
        minRequired: this.config.minProfileDataThreshold,
        ready: linguisticProfile.totalMessagesAnalyzed >= this.config.minProfileDataThreshold,
      },
      linguistic: linguisticProfile,
      syntax: syntaxStats,
      tone: tonalStats,
      lexicon: lexiconStats,
      stability: stabilityProfile,
      stabilityReport,
      currentMode: this.getCurrentMode(userId),
      performanceMetrics: this.performanceMetrics.get(userId),
    };
  }

  /**
   * Compare Mirror Mode profiles between two users
   */
  compareUserProfiles(userId1: string, userId2: string) {
    const profile1 = this.getUserMirrorProfile(userId1);
    const profile2 = this.getUserMirrorProfile(userId2);

    if (!profile1 || !profile2) {
      return null;
    }

    return {
      user1: userId1,
      user2: userId2,
      syntaxComparison: syntaxMirroringService.compareSyntax(userId1, userId2),
      tonalComparison: tonalResonanceService.compareTonalProfiles(userId1, userId2),
      lexiconComparison: lexiconMatchingEngineService.compareLexicons(userId1, userId2),
    };
  }

  /**
   * Enable/disable Mirror Mode
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[MirrorModeOrchestrator] Mirror Mode ${enabled ? '✅ enabled' : '❌ disabled'}`);
  }

  /**
   * Reset all services (for testing)
   */
  reset(): void {
    this.activeSessions.clear();
    this.performanceMetrics.clear();

    userLinguisticProfileService.reset();
    lexiconMatchingEngineService.reset();
    syntaxMirroringService.reset();
    tonalResonanceService.reset();
    stabilityDetectionService.reset();

    console.log('[MirrorModeOrchestrator] 🔄 All services reset');
  }

  /**
   * Create bypass response when Mirror Mode is inactive
   */
  private createBypassResponse(
    userId: string,
    response: string,
    startTime: number,
    stagesCompleted: string[],
    mode: 'mirror' | 'balancer' | 'off' = 'off',
    rationale?: string
  ): MirrorModeResponse {
    const endTime = Date.now();
    return {
      userId,
      originalResponse: response,
      mirrorResponse: response,
      modeActive: mode,
      pipelineStats: {
        startTime,
        endTime,
        duration: endTime - startTime,
        stagesCompleted,
      },
      confidenceScores: {
        lexicon: 0,
        syntax: 0,
        tone: 0,
        overall: 0,
      },
      appliedTransformations: {
        lexiconMatching: false,
        syntaxMirroring: false,
        tonalMirroring: false,
      },
      stabilityAssessment: {
        overallScore: 0,
        modeRecommendation: mode === 'balancer' ? 'balancer' : 'mirror',
        rationale: rationale || 'Mirror Mode inactive',
      },
    };
  }

  /**
   * Update performance metrics for a user
   */
  private updatePerformanceMetrics(userId: string, latency: number, success: boolean): void {
    const current = this.performanceMetrics.get(userId) || {
      avgLatency: 0,
      successRate: 0,
      transformationsApplied: 0,
    };

    const count = current.transformationsApplied + 1;
    current.avgLatency = (current.avgLatency * (count - 1) + latency) / count;
    current.successRate = (current.successRate * (count - 1) + (success ? 1 : 0)) / count;
    current.transformationsApplied = count;

    this.performanceMetrics.set(userId, current);
  }
}

// Export singleton instance
export const mirrorModeOrchestratorService = new MirrorModeOrchestratorService();
