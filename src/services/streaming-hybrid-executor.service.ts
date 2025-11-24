/**
 * Streaming Hybrid Executor Service
 *
 * Advanced orchestration that starts with local SLM streaming and can
 * seamlessly switch to cloud models mid-response if quality issues detected.
 *
 * Features:
 * - Start with local SLM for fast initial response
 * - Real-time quality monitoring during streaming
 * - Intelligent mid-stream switching to cloud on quality degradation
 * - Seamless user experience with buffered transitions
 * - Rollback capability if switch fails
 */

import type { IChatCompletionRequest, IStreamChunk } from '../modules/adapters/IAdapter';
import type { OrchestrationPreferences } from './local-slm-orchestrator.service';

export interface StreamingSwitchPoint {
  timestamp: number;
  chunkIndex: number;
  reason: 'quality' | 'confidence' | 'coherence' | 'timeout';
  qualityScore: number;
  fromModel: string;
  toModel: string;
}

export interface StreamingHybridResult {
  content: string;
  model: string;
  switched: boolean;
  switchPoint?: StreamingSwitchPoint;
  totalChunks: number;
  latency: number;
  cost: number;
}

interface QualityMonitorState {
  chunks: string[];
  coherenceScore: number;
  confidenceScore: number;
  repetitionCount: number;
  lastQualityCheck: number;
}

export class StreamingHybridExecutorService {
  private static instance: StreamingHybridExecutorService;

  // Configuration
  private readonly MIN_CHUNKS_BEFORE_SWITCH = 5; // Minimum chunks before considering switch
  private readonly QUALITY_CHECK_INTERVAL = 3; // Check quality every N chunks
  private readonly MIN_QUALITY_THRESHOLD = 0.5; // Switch if quality drops below this
  private readonly COHERENCE_THRESHOLD = 0.6;
  private readonly REPETITION_THRESHOLD = 3; // Max repeated phrases before switching

  private constructor() {}

  public static getInstance(): StreamingHybridExecutorService {
    if (!StreamingHybridExecutorService.instance) {
      StreamingHybridExecutorService.instance = new StreamingHybridExecutorService();
    }
    return StreamingHybridExecutorService.instance;
  }

  /**
   * Execute streaming with intelligent mid-response switching
   */
  public async executeStreamingHybrid(
    request: IChatCompletionRequest,
    preferences: OrchestrationPreferences,
    onChunk: (chunk: string, metadata?: any) => void,
    abortSignal?: AbortSignal
  ): Promise<StreamingHybridResult> {
    const startTime = Date.now();
    let currentModel = 'local';
    let switched = false;
    let switchPoint: StreamingSwitchPoint | undefined;
    let totalChunks = 0;
    let accumulatedContent = '';

    const monitorState: QualityMonitorState = {
      chunks: [],
      coherenceScore: 1.0,
      confidenceScore: 1.0,
      repetitionCount: 0,
      lastQualityCheck: 0,
    };

    try {
      // Start with local SLM streaming
      console.log('[StreamingHybrid] Starting with local SLM...');

      // Simulate streaming from local model (in real implementation, call actual adapter)
      const localStream = this.simulateLocalStream(request, abortSignal);

      for await (const chunk of localStream) {
        totalChunks++;
        monitorState.chunks.push(chunk);
        accumulatedContent += chunk;

        // Send chunk to user
        onChunk(chunk, { model: currentModel, chunkIndex: totalChunks });

        // Check if we should evaluate quality
        if (
          totalChunks >= this.MIN_CHUNKS_BEFORE_SWITCH &&
          totalChunks % this.QUALITY_CHECK_INTERVAL === 0
        ) {
          const shouldSwitch = this.evaluateQualityForSwitch(monitorState, preferences);

          if (shouldSwitch.switch) {
            console.log(
              `[StreamingHybrid] Quality degradation detected. Reason: ${shouldSwitch.reason}`
            );

            // Create switch point
            switchPoint = {
              timestamp: Date.now(),
              chunkIndex: totalChunks,
              reason: shouldSwitch.reason,
              qualityScore: shouldSwitch.qualityScore,
              fromModel: 'local',
              toModel: 'claude', // Use best cloud model
            };

            // Switch to cloud model
            const cloudResult = await this.switchToCloudModel(
              request,
              accumulatedContent,
              'claude',
              onChunk,
              abortSignal
            );

            if (cloudResult.success) {
              currentModel = 'claude';
              switched = true;
              accumulatedContent += cloudResult.content;
              totalChunks += cloudResult.chunks;

              console.log(
                `[StreamingHybrid] Successfully switched to ${currentModel} at chunk ${totalChunks}`
              );
              break; // Exit local stream
            } else {
              console.warn('[StreamingHybrid] Cloud switch failed, continuing with local');
            }
          }
        }

        // Check abort signal
        if (abortSignal?.aborted) {
          throw new Error('Request aborted');
        }
      }

      const latency = Date.now() - startTime;
      const cost = this.calculateCost(currentModel, accumulatedContent.length);

      return {
        content: accumulatedContent,
        model: currentModel,
        switched,
        switchPoint,
        totalChunks,
        latency,
        cost,
      };
    } catch (error) {
      console.error('[StreamingHybrid] Execution failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate if we should switch models based on quality metrics
   */
  private evaluateQualityForSwitch(
    state: QualityMonitorState,
    preferences: OrchestrationPreferences
  ): { switch: boolean; reason: 'quality' | 'confidence' | 'coherence' | 'timeout'; qualityScore: number } {
    const fullText = state.chunks.join('');

    // 1. Check coherence (does the response make sense?)
    const coherenceScore = this.checkCoherence(fullText);
    if (coherenceScore < this.COHERENCE_THRESHOLD) {
      return { switch: true, reason: 'coherence', qualityScore: coherenceScore };
    }

    // 2. Check for repetition (is the model stuck in a loop?)
    const repetitionCount = this.detectRepetition(state.chunks);
    if (repetitionCount >= this.REPETITION_THRESHOLD) {
      return { switch: true, reason: 'quality', qualityScore: 0.3 };
    }

    // 3. Check confidence (does the model seem uncertain?)
    const confidenceScore = this.estimateConfidence(fullText);
    if (confidenceScore < preferences.minConfidence || 0.6) {
      return { switch: true, reason: 'confidence', qualityScore: confidenceScore };
    }

    // 4. Check overall quality threshold
    const overallQuality = (coherenceScore + confidenceScore) / 2;
    if (overallQuality < this.MIN_QUALITY_THRESHOLD) {
      return { switch: true, reason: 'quality', qualityScore: overallQuality };
    }

    return { switch: false, reason: 'quality', qualityScore: overallQuality };
  }

  /**
   * Switch to cloud model mid-stream
   */
  private async switchToCloudModel(
    originalRequest: IChatCompletionRequest,
    contextSoFar: string,
    targetModel: string,
    onChunk: (chunk: string, metadata?: any) => void,
    abortSignal?: AbortSignal
  ): Promise<{ success: boolean; content: string; chunks: number }> {
    try {
      console.log(`[StreamingHybrid] Switching to ${targetModel}...`);

      // Send transition message to user
      onChunk('\n\n[Switching to enhanced model for better quality...]\n\n', {
        model: 'system',
        isTransition: true,
      });

      // Build continuation prompt
      const continuationPrompt = this.buildContinuationPrompt(originalRequest, contextSoFar);

      // Simulate cloud streaming (in real implementation, call actual cloud adapter)
      const cloudStream = this.simulateCloudStream(continuationPrompt, targetModel, abortSignal);

      let content = '';
      let chunks = 0;

      for await (const chunk of cloudStream) {
        chunks++;
        content += chunk;
        onChunk(chunk, { model: targetModel, chunkIndex: chunks, isContinuation: true });

        if (abortSignal?.aborted) {
          break;
        }
      }

      return { success: true, content, chunks };
    } catch (error) {
      console.error('[StreamingHybrid] Cloud switch failed:', error);
      return { success: false, content: '', chunks: 0 };
    }
  }

  /**
   * Build continuation prompt that includes context from local response
   */
  private buildContinuationPrompt(
    originalRequest: IChatCompletionRequest,
    contextSoFar: string
  ): IChatCompletionRequest {
    const messages = [...originalRequest.messages];

    // Add the partial response as context
    messages.push({
      role: 'assistant',
      content: contextSoFar,
    });

    // Add continuation instruction
    messages.push({
      role: 'user',
      content:
        'Please continue and complete the response above with high quality, addressing any gaps or improving clarity.',
    });

    return {
      ...originalRequest,
      messages,
    };
  }

  /**
   * Check coherence of the response
   */
  private checkCoherence(text: string): number {
    // Simple heuristics for coherence
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length === 0) return 0.5;

    // Check for complete sentences
    const completeSentences = sentences.filter((s) => s.trim().split(/\s+/).length >= 3);
    const completenessScore = completeSentences.length / sentences.length;

    // Check for uppercase starts (proper capitalization)
    const properStarts = sentences.filter((s) => /^[A-Z]/.test(s.trim()));
    const capitalizationScore = properStarts.length / sentences.length;

    // Check for gibberish (excessive special characters or numbers)
    const gibberishScore = 1 - Math.min(1, (text.match(/[^a-zA-Z0-9\s.,!?;:()-]/g) || []).length / text.length);

    return (completenessScore + capitalizationScore + gibberishScore) / 3;
  }

  /**
   * Detect repetitive patterns in recent chunks
   */
  private detectRepetition(chunks: string[]): number {
    if (chunks.length < 5) return 0;

    const recentChunks = chunks.slice(-10); // Look at last 10 chunks
    const chunkCounts = new Map<string, number>();

    for (const chunk of recentChunks) {
      const normalized = chunk.toLowerCase().trim();
      if (normalized.length > 0) {
        chunkCounts.set(normalized, (chunkCounts.get(normalized) || 0) + 1);
      }
    }

    const maxRepeats = Math.max(...chunkCounts.values());
    return maxRepeats;
  }

  /**
   * Estimate confidence from text patterns
   */
  private estimateConfidence(text: string): number {
    // Look for uncertainty markers
    const uncertaintyMarkers = [
      'i think',
      'maybe',
      'perhaps',
      'possibly',
      'might',
      'not sure',
      'unclear',
      'i believe',
    ];

    const lowerText = text.toLowerCase();
    let uncertaintyCount = 0;

    for (const marker of uncertaintyMarkers) {
      const matches = lowerText.split(marker).length - 1;
      uncertaintyCount += matches;
    }

    // More uncertainty markers = lower confidence
    const uncertaintyPenalty = Math.min(0.5, uncertaintyCount * 0.1);
    return Math.max(0, 1.0 - uncertaintyPenalty);
  }

  /**
   * Calculate cost based on model and content length
   */
  private calculateCost(model: string, contentLength: number): number {
    const tokens = Math.ceil(contentLength / 4); // Rough token estimate

    const costPer1kTokens: Record<string, number> = {
      local: 0,
      claude: 0.0025,
      'gpt-4': 0.0075,
      gemini: 0.0003,
    };

    return ((costPer1kTokens[model] || 0) * tokens) / 1000;
  }

  /**
   * Simulate local model streaming (placeholder for real implementation)
   */
  private async *simulateLocalStream(
    request: IChatCompletionRequest,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string> {
    // This is a simulation - in real implementation, call the actual local SLM adapter
    const response = 'This is a simulated local response that may have quality issues...';
    const words = response.split(' ');

    for (const word of words) {
      if (abortSignal?.aborted) break;
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate streaming delay
    }
  }

  /**
   * Simulate cloud model streaming (placeholder for real implementation)
   */
  private async *simulateCloudStream(
    request: IChatCompletionRequest,
    model: string,
    abortSignal?: AbortSignal
  ): AsyncGenerator<string> {
    // This is a simulation - in real implementation, call the actual cloud adapter
    const response = 'This is a high-quality cloud response that completes the answer with clarity and precision.';
    const words = response.split(' ');

    for (const word of words) {
      if (abortSignal?.aborted) break;
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 30)); // Cloud is slightly faster per word
    }
  }
}
