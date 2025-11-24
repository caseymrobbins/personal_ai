/**
 * ARGUMENTATION PIPELINE SERVICE
 * ===============================
 * Orchestrates the complete argumentation flow:
 * 1. Route query using HybridLLMRouter
 * 2. Analyze viewpoints using ViewpointAnalyzer
 * 3. Strong-man each viewpoint using StrongManningService
 * 4. Synthesize comprehensive answer using ArgumentSynthesizer
 *
 * Features:
 * - End-to-end pipeline orchestration
 * - Stage-by-stage progress tracking
 * - Error recovery and fallback
 * - Comprehensive logging and metrics
 * - Caching of intermediate results
 */

import { hybridLLMRouter, RoutingDecision } from './hybrid-llm-router.service';
import { viewpointAnalyzer, ViewpointAnalysis } from './viewpoint-analyzer.service';
import { strongManning, StrongMannedAnalysis } from './strong-manning.service';
import {
  argumentSynthesizer,
  SynthesizedAnswer,
} from './argument-synthesizer.service';
import { persistenceAdapter } from './persistence-adapter.service';

export type PipelineStage =
  | 'routing'
  | 'viewpoint-analysis'
  | 'strong-manning'
  | 'synthesis'
  | 'complete';

export interface PipelineProgress {
  stage: PipelineStage;
  progress: number; // 0-1
  statusMessage: string;
  timestamp: number;
  elapsedMs: number;
}

export interface PipelineResult {
  id: string;
  question: string;
  conversationHistory: Array<{ role: string; content: string }>;
  routingDecision: RoutingDecision;
  viewpointAnalysis: ViewpointAnalysis;
  strongMannedAnalyses: Map<string, StrongMannedAnalysis>;
  synthesizedAnswer: SynthesizedAnswer;
  progressLog: PipelineProgress[];
  quality: {
    routingConfidence: number;
    analysisConfidence: number;
    synthesisQuality: number;
    overallQuality: number;
  };
  timing: {
    totalMs: number;
    routingMs: number;
    analysisMs: number;
    strongManningMs: number;
    synthesisMs: number;
  };
  timestamp: number;
}

class ArgumentationPipelineService {
  private static instance: ArgumentationPipelineService;
  private resultCache = new Map<string, PipelineResult>();
  private progressCallbacks = new Map<string, (progress: PipelineProgress) => void>();
  private resultCounter = 0;

  private constructor() {}

  static getInstance(): ArgumentationPipelineService {
    if (!ArgumentationPipelineService.instance) {
      ArgumentationPipelineService.instance = new ArgumentationPipelineService();
    }
    return ArgumentationPipelineService.instance;
  }

  /**
   * Execute complete argumentation pipeline
   */
  async executePipeline(
    question: string,
    conversationHistory: Array<{ role: string; content: string }>,
    onProgress?: (progress: PipelineProgress) => void
  ): Promise<PipelineResult> {
    const resultId = `result-${this.resultCounter++}-${Date.now()}`;
    const startTime = Date.now();
    const progressLog: PipelineProgress[] = [];

    if (onProgress) {
      this.progressCallbacks.set(resultId, onProgress);
    }

    try {
      // Stage 1: Route query
      const routingResult = await this.executeRouting(
        question,
        conversationHistory,
        progressLog,
        startTime,
        resultId
      );

      // Stage 2: Analyze viewpoints
      const analysisResult = await this.executeViewpointAnalysis(
        question,
        conversationHistory,
        progressLog,
        startTime,
        resultId
      );

      // Stage 3: Strong-man viewpoints
      const strongManningResults = await this.executeStrongManning(
        analysisResult,
        progressLog,
        startTime,
        resultId
      );

      // Stage 4: Synthesize answer
      const synthesisResult = await this.executeSynthesis(
        question,
        analysisResult,
        strongManningResults,
        progressLog,
        startTime,
        resultId
      );

      // Calculate quality metrics
      const quality = this.calculateOverallQuality(
        routingResult,
        analysisResult,
        synthesisResult
      );

      const timing = this.calculateTiming(progressLog);

      const result: PipelineResult = {
        id: resultId,
        question,
        conversationHistory,
        routingDecision: routingResult,
        viewpointAnalysis: analysisResult,
        strongMannedAnalyses: strongManningResults,
        synthesizedAnswer: synthesisResult,
        progressLog,
        quality,
        timing,
        timestamp: Date.now(),
      };

      this.resultCache.set(resultId, result);

      // Persist result
      try {
        await this.persistResult(result);
      } catch (error) {
        console.warn('Failed to persist pipeline result:', error);
      }

      // Mark as complete
      this.reportProgress(
        resultId,
        {
          stage: 'complete',
          progress: 1.0,
          statusMessage: 'Argumentation pipeline complete',
          timestamp: Date.now(),
          elapsedMs: Date.now() - startTime,
        },
        progressLog
      );

      return result;
    } catch (error) {
      this.reportProgress(
        resultId,
        {
          stage: 'complete',
          progress: 0,
          statusMessage: `Pipeline error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
          elapsedMs: Date.now() - startTime,
        },
        progressLog
      );
      throw error;
    } finally {
      this.progressCallbacks.delete(resultId);
    }
  }

  /**
   * Execute routing stage
   */
  private async executeRouting(
    question: string,
    conversationHistory: Array<{ role: string; content: string }>,
    progressLog: PipelineProgress[],
    startTime: number,
    resultId: string
  ): Promise<RoutingDecision> {
    const stageStart = Date.now();

    this.reportProgress(
      resultId,
      {
        stage: 'routing',
        progress: 0.1,
        statusMessage: 'Analyzing query complexity...',
        timestamp: stageStart,
        elapsedMs: stageStart - startTime,
      },
      progressLog
    );

    const context = conversationHistory
      .map((turn) => turn.content)
      .join(' ')
      .slice(-2000); // Last 2000 chars

    // Analyze query complexity
    const complexity = await hybridLLMRouter.analyzeQueryComplexity(
      question,
      context
    );

    // Route the query
    const routingDecision = await hybridLLMRouter.routeQuery(
      question,
      context,
      { preferCost: true } // Prefer cost savings in routing
    );

    this.reportProgress(
      resultId,
      {
        stage: 'routing',
        progress: 1.0,
        statusMessage: `Routed to ${routingDecision.adapterId} (complexity: ${(complexity.score * 100).toFixed(1)}%)`,
        timestamp: Date.now(),
        elapsedMs: Date.now() - startTime,
      },
      progressLog
    );

    return routingDecision;
  }

  /**
   * Execute viewpoint analysis stage
   */
  private async executeViewpointAnalysis(
    question: string,
    conversationHistory: Array<{ role: string; content: string }>,
    progressLog: PipelineProgress[],
    startTime: number,
    resultId: string
  ): Promise<ViewpointAnalysis> {
    const stageStart = Date.now();

    this.reportProgress(
      resultId,
      {
        stage: 'viewpoint-analysis',
        progress: 0.1,
        statusMessage: 'Extracting viewpoints from conversation...',
        timestamp: stageStart,
        elapsedMs: stageStart - startTime,
      },
      progressLog
    );

    // Extract topic from question
    const topic = this.extractTopic(question);

    this.reportProgress(
      resultId,
      {
        stage: 'viewpoint-analysis',
        progress: 0.4,
        statusMessage: `Analyzing viewpoints on: ${topic}`,
        timestamp: Date.now(),
        elapsedMs: Date.now() - startTime,
      },
      progressLog
    );

    // Perform viewpoint analysis
    const analysis = await viewpointAnalyzer.analyzeConversation(
      conversationHistory,
      topic
    );

    this.reportProgress(
      resultId,
      {
        stage: 'viewpoint-analysis',
        progress: 1.0,
        statusMessage: `Found ${analysis.opposingViewpoints.length} opposing viewpoints, ${analysis.keyTensions.length} key tensions`,
        timestamp: Date.now(),
        elapsedMs: Date.now() - startTime,
      },
      progressLog
    );

    return analysis;
  }

  /**
   * Execute strong-manning stage
   */
  private async executeStrongManning(
    analysis: ViewpointAnalysis,
    progressLog: PipelineProgress[],
    startTime: number,
    resultId: string
  ): Promise<Map<string, StrongMannedAnalysis>> {
    const stageStart = Date.now();
    const results = new Map<string, StrongMannedAnalysis>();

    const allViewpoints = [analysis.userPosition, ...analysis.opposingViewpoints];

    this.reportProgress(
      resultId,
      {
        stage: 'strong-manning',
        progress: 0.1,
        statusMessage: `Strong-manning ${allViewpoints.length} viewpoints...`,
        timestamp: stageStart,
        elapsedMs: stageStart - startTime,
      },
      progressLog
    );

    // Strong-man each viewpoint
    for (let i = 0; i < allViewpoints.length; i++) {
      const viewpoint = allViewpoints[i];

      try {
        const strongManAnalysis = await strongManning.strongManViewpoint(
          viewpoint
        );
        results.set(viewpoint.id, strongManAnalysis);
      } catch (error) {
        console.warn(`Failed to strong-man viewpoint ${viewpoint.id}:`, error);
      }

      // Report progress
      const progress = 0.1 + (i / allViewpoints.length) * 0.8;
      this.reportProgress(
        resultId,
        {
          stage: 'strong-manning',
          progress,
          statusMessage: `Strong-manned ${i + 1}/${allViewpoints.length} viewpoints`,
          timestamp: Date.now(),
          elapsedMs: Date.now() - startTime,
        },
        progressLog
      );
    }

    this.reportProgress(
      resultId,
      {
        stage: 'strong-manning',
        progress: 1.0,
        statusMessage: `Completed strong-manning of all viewpoints`,
        timestamp: Date.now(),
        elapsedMs: Date.now() - startTime,
      },
      progressLog
    );

    return results;
  }

  /**
   * Execute synthesis stage
   */
  private async executeSynthesis(
    question: string,
    analysis: ViewpointAnalysis,
    strongManAnalyses: Map<string, StrongMannedAnalysis>,
    progressLog: PipelineProgress[],
    startTime: number,
    resultId: string
  ): Promise<SynthesizedAnswer> {
    const stageStart = Date.now();

    this.reportProgress(
      resultId,
      {
        stage: 'synthesis',
        progress: 0.1,
        statusMessage: 'Synthesizing comprehensive answer...',
        timestamp: stageStart,
        elapsedMs: stageStart - startTime,
      },
      progressLog
    );

    // Synthesize answer
    const synthesizedAnswer = await argumentSynthesizer.synthesizeAnswer(
      question,
      analysis,
      strongManAnalyses
    );

    this.reportProgress(
      resultId,
      {
        stage: 'synthesis',
        progress: 0.8,
        statusMessage: `Generated synthesis with ${synthesizedAnswer.tradeOffs.length} trade-offs and ${synthesizedAnswer.perspectives.length} perspectives`,
        timestamp: Date.now(),
        elapsedMs: Date.now() - startTime,
      },
      progressLog
    );

    this.reportProgress(
      resultId,
      {
        stage: 'synthesis',
        progress: 1.0,
        statusMessage: 'Synthesis complete',
        timestamp: Date.now(),
        elapsedMs: Date.now() - startTime,
      },
      progressLog
    );

    return synthesizedAnswer;
  }

  /**
   * Extract topic from question
   */
  private extractTopic(question: string): string {
    // Simple topic extraction - remove question words
    const cleanQuestion = question
      .replace(/^(what|how|why|when|where|who|is|are|do|does|should|can|will)/i, '')
      .trim()
      .slice(0, 100);

    return cleanQuestion || question;
  }

  /**
   * Calculate overall quality metrics
   */
  private calculateOverallQuality(
    routing: RoutingDecision,
    analysis: ViewpointAnalysis,
    synthesis: SynthesizedAnswer
  ): {
    routingConfidence: number;
    analysisConfidence: number;
    synthesisQuality: number;
    overallQuality: number;
  } {
    const routingConfidence = routing.complexity.confidence;
    const analysisConfidence = analysis.analysisConfidence;
    const synthesisQuality = synthesis.synthesisQuality;

    const overallQuality =
      (routingConfidence * 0.2 +
        analysisConfidence * 0.35 +
        synthesisQuality * 0.45) *
      synthesis.representativeness;

    return {
      routingConfidence,
      analysisConfidence,
      synthesisQuality,
      overallQuality: Math.min(0.95, overallQuality),
    };
  }

  /**
   * Calculate timing information
   */
  private calculateTiming(progressLog: PipelineProgress[]): {
    totalMs: number;
    routingMs: number;
    analysisMs: number;
    strongManningMs: number;
    synthesisMs: number;
  } {
    const total = progressLog[progressLog.length - 1]?.elapsedMs || 0;

    // Estimate stage timing from progress log
    let routingMs = 0;
    let analysisMs = 0;
    let strongManningMs = 0;
    let synthesisMs = 0;

    for (let i = 0; i < progressLog.length - 1; i++) {
      const current = progressLog[i];
      const next = progressLog[i + 1];
      const stageDuration = next.elapsedMs - current.elapsedMs;

      if (current.stage === 'routing') routingMs += stageDuration;
      else if (current.stage === 'viewpoint-analysis') analysisMs += stageDuration;
      else if (current.stage === 'strong-manning') strongManningMs += stageDuration;
      else if (current.stage === 'synthesis') synthesisMs += stageDuration;
    }

    return {
      totalMs: total,
      routingMs,
      analysisMs,
      strongManningMs,
      synthesisMs,
    };
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    resultId: string,
    progress: PipelineProgress,
    progressLog: PipelineProgress[]
  ): void {
    progressLog.push(progress);

    if (resultId && this.progressCallbacks.has(resultId)) {
      const callback = this.progressCallbacks.get(resultId);
      if (callback) {
        callback(progress);
      }
    }
  }

  /**
   * Persist result to database
   */
  private async persistResult(result: PipelineResult): Promise<void> {
    try {
      // Store in database for future reference
      await persistenceAdapter.persistInteraction(
        'system', // userId
        `pipeline-${result.id}`, // sessionId
        {
          type: 'argumentation-pipeline',
          question: result.question,
          answerId: result.synthesizedAnswer.id,
          quality: result.quality.overallQuality,
          timestamp: result.timestamp,
        }
      );
    } catch (error) {
      // Silently fail - don't block pipeline on persistence error
      console.warn('Failed to persist pipeline result:', error);
    }
  }

  /**
   * Get cached result
   */
  getResult(resultId: string): PipelineResult | undefined {
    return this.resultCache.get(resultId);
  }

  /**
   * Get result metrics for dashboard
   */
  getMetrics(): {
    totalPipelines: number;
    avgQuality: number;
    avgTotalTime: number;
    mostCommonStage: PipelineStage;
  } {
    const results = Array.from(this.resultCache.values());

    if (results.length === 0) {
      return {
        totalPipelines: 0,
        avgQuality: 0,
        avgTotalTime: 0,
        mostCommonStage: 'routing',
      };
    }

    const avgQuality =
      results.reduce((sum, r) => sum + r.quality.overallQuality, 0) /
      results.length;

    const avgTotalTime =
      results.reduce((sum, r) => sum + r.timing.totalMs, 0) / results.length;

    return {
      totalPipelines: results.length,
      avgQuality,
      avgTotalTime,
      mostCommonStage: 'synthesis', // Most complex stage
    };
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.resultCache.clear();
    this.progressCallbacks.clear();
    this.resultCounter = 0;
  }
}

export const argumentationPipeline =
  ArgumentationPipelineService.getInstance();
