/**
 * Local SLM Orchestrator Service
 *
 * Core orchestration engine that uses the local SLM (Phi-3) as the primary
 * decision maker for all AI interactions. Implements SOTA hybrid-first
 * architecture with intelligent routing, confidence scoring, and quality gates.
 *
 * @module LocalSLMOrchestratorService
 */

import type {
  IChatCompletionRequest,
  IChatCompletionResponse,
  IChatMessage,
} from '@/modules/adapters/adapter.interface';
import { AdapterRegistry } from '@/modules/adapters/AdapterRegistry';
import type { IModuleAdapter } from '@/modules/adapters/adapter.interface';
import { db } from '@/db';
import { ResponseCacheService } from './response-cache.service';
import { QualityGateValidatorService } from './quality-gate-validator.service';

/**
 * Orchestration strategy types
 */
export type OrchestrationStrategy =
  | 'local' // Handle entirely with local SLM
  | 'delegate' // Delegate to specific cloud model
  | 'hybrid' // Local attempt with cloud validation
  | 'iterative'; // Local first, escalate if needed

/**
 * Available model identifiers
 */
export type ModelIdentifier = 'local' | 'claude' | 'gpt4' | 'gemini' | 'cohere';

/**
 * Orchestration decision made by the local SLM
 */
export interface OrchestrationDecision {
  strategy: OrchestrationStrategy;
  confidence: number; // 0.0-1.0 (local model's confidence)
  selectedModel: ModelIdentifier;
  reasoning: string;
  canHandleLocally: boolean;
  estimatedLatency: number; // milliseconds
  estimatedCost: number; // USD
  qualityPrediction: number; // 0.0-1.0
  requiresPrivacy: boolean; // PII detected
  queryType: string; // e.g., "technical", "creative", "factual"
}

/**
 * Execution result with metadata
 */
export interface OrchestrationResult {
  response: string;
  modelUsed: ModelIdentifier;
  strategy: OrchestrationStrategy;
  confidence: number;
  latency: number;
  cost: number;
  qualityScore?: number;
  escalated: boolean; // Whether we escalated from local to cloud
  cacheHit: boolean;
}

/**
 * User preferences for orchestration
 */
export interface OrchestrationPreferences {
  priority: 'cost' | 'quality' | 'latency' | 'balanced';
  privacyLevel: 'strict' | 'moderate' | 'relaxed';
  maxCostPerQuery?: number; // USD
  maxLatency?: number; // milliseconds
  minConfidence?: number; // 0.0-1.0
}

/**
 * Orchestration metrics for monitoring
 */
export interface OrchestrationMetrics {
  totalQueries: number;
  localHandled: number;
  delegated: number;
  hybrid: number;
  iterative: number;
  escalations: number;
  averageConfidence: number;
  averageLatency: number;
  totalCost: number;
  cacheHitRate: number;
  qualityGatePassRate: number;
}

/**
 * Local SLM Orchestrator Service
 *
 * Primary orchestrator that uses Phi-3 to make intelligent routing decisions.
 * Implements hybrid-first architecture with local-by-default, cloud-by-exception.
 */
export class LocalSLMOrchestratorService {
  private static instance: LocalSLMOrchestratorService;
  private adapterRegistry: AdapterRegistry;
  private cacheService: ResponseCacheService;
  private qualityValidator: QualityGateValidatorService;
  private metrics: OrchestrationMetrics;

  // Default thresholds (can be overridden by preferences)
  private readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.8, // Handle locally with high confidence
    MEDIUM: 0.5, // Handle locally but validate quality
    LOW: 0.5, // Below this, delegate to cloud
  };

  // Model-specific latency estimates (ms)
  private readonly LATENCY_ESTIMATES: Record<ModelIdentifier, number> = {
    local: 250,
    claude: 1500,
    gpt4: 2000,
    gemini: 1800,
    cohere: 1600,
  };

  // Model-specific cost estimates (USD per 1K tokens)
  private readonly COST_ESTIMATES: Record<ModelIdentifier, number> = {
    local: 0,
    claude: 0.0025, // $2.50 per 1M tokens average
    gpt4: 0.0075, // $7.50 per 1M tokens average
    gemini: 0.0003, // $0.30 per 1M tokens
    cohere: 0.0020, // $2.00 per 1M tokens
  };

  private constructor() {
    this.adapterRegistry = AdapterRegistry.getInstance();
    this.cacheService = ResponseCacheService.getInstance();
    this.qualityValidator = QualityGateValidatorService.getInstance();
    this.metrics = this.initializeMetrics();
  }

  public static getInstance(): LocalSLMOrchestratorService {
    if (!LocalSLMOrchestratorService.instance) {
      LocalSLMOrchestratorService.instance = new LocalSLMOrchestratorService();
    }
    return LocalSLMOrchestratorService.instance;
  }

  /**
   * Main orchestration entry point
   *
   * @param request - Chat completion request
   * @param preferences - User preferences for routing
   * @param abortSignal - Optional abort signal
   * @returns Orchestration result with response and metadata
   */
  public async orchestrate(
    request: IChatCompletionRequest,
    preferences: OrchestrationPreferences = { priority: 'balanced', privacyLevel: 'moderate' },
    abortSignal?: AbortSignal
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Check cache first
      const cachedResponse = await this.checkCache(request);
      if (cachedResponse) {
        this.metrics.totalQueries++;
        return {
          response: cachedResponse,
          modelUsed: 'local',
          strategy: 'local',
          confidence: 1.0,
          latency: Date.now() - startTime,
          cost: 0,
          escalated: false,
          cacheHit: true,
        };
      }

      // Step 2: Get orchestration decision from local SLM
      const decision = await this.getOrchestrationDecision(request, preferences);

      console.log('[LocalSLMOrchestrator] Decision:', {
        strategy: decision.strategy,
        model: decision.selectedModel,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      });

      // Step 3: Execute based on strategy
      let result: OrchestrationResult;

      switch (decision.strategy) {
        case 'local':
          result = await this.executeLocal(request, decision, abortSignal);
          break;
        case 'delegate':
          result = await this.executeDelegate(request, decision, abortSignal);
          break;
        case 'hybrid':
          result = await this.executeHybrid(request, decision, preferences, abortSignal);
          break;
        case 'iterative':
          result = await this.executeIterative(request, decision, preferences, abortSignal);
          break;
        default:
          throw new Error(`Unknown strategy: ${decision.strategy}`);
      }

      // Step 4: Update metrics
      this.updateMetrics(result);

      // Step 5: Cache the result if successful
      if (result.response && result.response.length > 0) {
        await this.cacheResponse(request, result.response);
      }

      // Step 6: Log to governance
      await this.logOrchestrationDecision(request, decision, result);

      result.latency = Date.now() - startTime;
      return result;

    } catch (error) {
      console.error('[LocalSLMOrchestrator] Error:', error);

      // Fallback to direct cloud call on orchestration failure
      return await this.executeFallback(request, abortSignal, startTime);
    }
  }

  /**
   * Get orchestration decision from local SLM using meta-prompting
   *
   * The local SLM analyzes the query and decides:
   * 1. Can it handle this locally?
   * 2. What's the confidence level?
   * 3. If delegation needed, which cloud model?
   * 4. What execution strategy is optimal?
   */
  private async getOrchestrationDecision(
    request: IChatCompletionRequest,
    preferences: OrchestrationPreferences
  ): Promise<OrchestrationDecision> {
    const localAdapter = this.adapterRegistry.getAdapter('local-guardian');

    if (!localAdapter || !localAdapter.isReady()) {
      // If local model not ready, delegate to Claude by default
      return this.createDefaultDelegationDecision(request, preferences);
    }

    // Extract user query (last message)
    const userQuery = this.extractUserQuery(request.messages);

    // Check for PII (privacy-first)
    const hasPII = this.detectPII(userQuery);

    // Build meta-prompt for orchestration
    const metaPrompt = this.buildMetaPrompt(userQuery, preferences, hasPII);

    try {
      // Query local SLM for orchestration decision
      const metaRequest: IChatCompletionRequest = {
        model: 'phi-3',
        messages: [
          {
            role: 'system',
            content: 'You are an AI orchestrator. Analyze queries and make routing decisions. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: metaPrompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistent decisions
        max_tokens: 500,
      };

      const response = await localAdapter.query(metaRequest);
      const decisionText = typeof response === 'string' ? response : response.choices[0].message.content;

      // Parse JSON decision
      const decision = this.parseOrchestrationDecision(decisionText, request, preferences, hasPII);

      return decision;

    } catch (error) {
      console.error('[LocalSLMOrchestrator] Meta-prompt failed:', error);
      return this.createDefaultDelegationDecision(request, preferences);
    }
  }

  /**
   * Build meta-prompt for orchestration decision
   */
  private buildMetaPrompt(
    query: string,
    preferences: OrchestrationPreferences,
    hasPII: boolean
  ): string {
    const privacyNote = hasPII
      ? '\n⚠️  PRIVACY ALERT: PII detected in query. Must use local model only.'
      : '';

    return `You are the orchestrator of a hybrid AI system. Analyze this query and decide the optimal execution strategy.

Query: "${query}"

Available Resources:
- Local (You - Phi-3): Fast (250ms), FREE, 4K context, good for simple tasks, factual queries, PII-sensitive data
- Claude (Anthropic): Excellent reasoning (1500ms), $0.0025/1K tokens, 200K context, best for complex reasoning, coding
- GPT-4 (OpenAI): Creative & general (2000ms), $0.0075/1K tokens, 128K context, best for creative writing, general knowledge
- Gemini (Google): Math & long context (1800ms), $0.0003/1K tokens, 1M context, best for math, calculations, very long context
${privacyNote}

User Preference: ${preferences.priority}
Privacy Level: ${preferences.privacyLevel}

Analyze the query and respond with ONLY a JSON object (no markdown, no explanation):
{
  "strategy": "local|delegate|hybrid|iterative",
  "confidence": 0.0-1.0,
  "selectedModel": "local|claude|gpt4|gemini",
  "reasoning": "one sentence explanation",
  "canHandleLocally": true|false,
  "queryType": "factual|conversational|technical|coding|creative|reasoning|math"
}

Guidelines:
- If PII detected, MUST use strategy="local" and selectedModel="local"
- If confidence >= 0.8, use strategy="local"
- If confidence 0.5-0.8, use strategy="hybrid" (local with validation)
- If confidence < 0.5, use strategy="delegate" to appropriate cloud model
- For priority="cost", bias toward local (increase confidence by 0.1)
- For priority="quality", bias toward cloud (decrease confidence by 0.1)
- For coding tasks, prefer Claude
- For creative writing, prefer GPT-4
- For math/calculations, prefer Gemini
- For simple factual queries, prefer local

Respond with JSON only:`;
  }

  /**
   * Parse orchestration decision from local SLM response
   */
  private parseOrchestrationDecision(
    decisionText: string,
    request: IChatCompletionRequest,
    preferences: OrchestrationPreferences,
    hasPII: boolean
  ): OrchestrationDecision {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = decisionText.trim();
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(jsonText);

      // Enforce privacy-first: if PII detected, force local
      if (hasPII) {
        parsed.strategy = 'local';
        parsed.selectedModel = 'local';
        parsed.canHandleLocally = true;
        parsed.confidence = Math.max(parsed.confidence || 0.7, 0.7);
      }

      // Estimate latency and cost
      const selectedModel = parsed.selectedModel || 'local';
      const estimatedTokens = this.estimateTokens(request);

      return {
        strategy: parsed.strategy || 'local',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        selectedModel,
        reasoning: parsed.reasoning || 'No reasoning provided',
        canHandleLocally: parsed.canHandleLocally ?? true,
        estimatedLatency: this.LATENCY_ESTIMATES[selectedModel] || 250,
        estimatedCost: (this.COST_ESTIMATES[selectedModel] || 0) * (estimatedTokens / 1000),
        qualityPrediction: this.predictQuality(parsed.strategy, parsed.confidence),
        requiresPrivacy: hasPII,
        queryType: parsed.queryType || 'general',
      };

    } catch (error) {
      console.error('[LocalSLMOrchestrator] Failed to parse decision:', error);

      // Default to local on parse error
      return {
        strategy: hasPII ? 'local' : 'iterative',
        confidence: 0.6,
        selectedModel: hasPII ? 'local' : 'claude',
        reasoning: 'Parse error, using safe default',
        canHandleLocally: true,
        estimatedLatency: 250,
        estimatedCost: 0,
        qualityPrediction: 0.7,
        requiresPrivacy: hasPII,
        queryType: 'general',
      };
    }
  }

  /**
   * Execute local strategy (handle entirely with local SLM)
   */
  private async executeLocal(
    request: IChatCompletionRequest,
    decision: OrchestrationDecision,
    abortSignal?: AbortSignal
  ): Promise<OrchestrationResult> {
    const localAdapter = this.adapterRegistry.getAdapter('local-guardian');

    if (!localAdapter || !localAdapter.isReady()) {
      throw new Error('Local adapter not available');
    }

    const response = await localAdapter.query(request, abortSignal);
    const responseText = typeof response === 'string' ? response : response.choices[0].message.content;

    return {
      response: responseText,
      modelUsed: 'local',
      strategy: 'local',
      confidence: decision.confidence,
      latency: 0, // Will be set by caller
      cost: 0,
      escalated: false,
      cacheHit: false,
    };
  }

  /**
   * Execute delegate strategy (send directly to cloud model)
   */
  private async executeDelegate(
    request: IChatCompletionRequest,
    decision: OrchestrationDecision,
    abortSignal?: AbortSignal
  ): Promise<OrchestrationResult> {
    const adapter = this.getAdapterForModel(decision.selectedModel);

    if (!adapter) {
      throw new Error(`Adapter not available for model: ${decision.selectedModel}`);
    }

    const response = await adapter.query(request, abortSignal);
    const responseText = typeof response === 'string' ? response : response.choices[0].message.content;

    const tokens = this.estimateTokens(request) + this.estimateTokens({ messages: [{ role: 'assistant', content: responseText }] } as any);
    const cost = (this.COST_ESTIMATES[decision.selectedModel] || 0) * (tokens / 1000);

    return {
      response: responseText,
      modelUsed: decision.selectedModel,
      strategy: 'delegate',
      confidence: decision.confidence,
      latency: 0,
      cost,
      escalated: false,
      cacheHit: false,
    };
  }

  /**
   * Execute hybrid strategy (local attempt with cloud validation)
   */
  private async executeHybrid(
    request: IChatCompletionRequest,
    decision: OrchestrationDecision,
    preferences: OrchestrationPreferences,
    abortSignal?: AbortSignal
  ): Promise<OrchestrationResult> {
    // Try local first
    const localResult = await this.executeLocal(request, decision, abortSignal);

    // Validate quality
    const qualityScore = await this.validateQuality(localResult.response, request);

    // If quality good enough, use local response
    if (qualityScore >= 0.7) {
      return {
        ...localResult,
        qualityScore,
        strategy: 'hybrid',
      };
    }

    // Otherwise, escalate to cloud
    console.log('[LocalSLMOrchestrator] Quality gate failed, escalating to cloud');

    const cloudResult = await this.executeDelegate(request, {
      ...decision,
      selectedModel: decision.selectedModel === 'local' ? 'claude' : decision.selectedModel,
    }, abortSignal);

    return {
      ...cloudResult,
      strategy: 'hybrid',
      escalated: true,
      qualityScore,
    };
  }

  /**
   * Execute iterative strategy (local first, escalate if needed)
   */
  private async executeIterative(
    request: IChatCompletionRequest,
    decision: OrchestrationDecision,
    preferences: OrchestrationPreferences,
    abortSignal?: AbortSignal
  ): Promise<OrchestrationResult> {
    // Similar to hybrid, but always starts local
    return await this.executeHybrid(request, decision, preferences, abortSignal);
  }

  /**
   * Validate quality of local response using Quality Gate Validator
   */
  private async validateQuality(response: string, request: IChatCompletionRequest): Promise<number> {
    const validation = await this.qualityValidator.validate(response, request);

    console.log('[LocalSLMOrchestrator] Quality validation:', {
      passed: validation.passed,
      score: validation.overallScore,
      recommendation: validation.recommendation,
      reasoning: validation.reasoning,
    });

    return validation.overallScore;
  }

  /**
   * Fallback execution when orchestration fails
   */
  private async executeFallback(
    request: IChatCompletionRequest,
    abortSignal?: AbortSignal,
    startTime: number
  ): Promise<OrchestrationResult> {
    const claudeAdapter = this.adapterRegistry.getAdapter('anthropic');

    if (!claudeAdapter) {
      throw new Error('Fallback adapter not available');
    }

    const response = await claudeAdapter.query(request, abortSignal);
    const responseText = typeof response === 'string' ? response : response.choices[0].message.content;

    return {
      response: responseText,
      modelUsed: 'claude',
      strategy: 'delegate',
      confidence: 0.9,
      latency: Date.now() - startTime,
      cost: 0.005, // Estimated
      escalated: true,
      cacheHit: false,
    };
  }

  /**
   * Helper: Get adapter for model identifier
   */
  private getAdapterForModel(model: ModelIdentifier): IModuleAdapter | null {
    const adapterMap: Record<ModelIdentifier, string> = {
      local: 'local-guardian',
      claude: 'anthropic',
      gpt4: 'openai',
      gemini: 'gemini',
      cohere: 'cohere',
    };

    return this.adapterRegistry.getAdapter(adapterMap[model]);
  }

  /**
   * Helper: Extract user query from messages
   */
  private extractUserQuery(messages: IChatMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
  }

  /**
   * Helper: Detect PII in text
   */
  private detectPII(text: string): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
    ];

    return piiPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Helper: Estimate tokens in request
   */
  private estimateTokens(request: IChatCompletionRequest): number {
    const text = request.messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
  }

  /**
   * Helper: Predict quality based on strategy and confidence
   */
  private predictQuality(strategy: OrchestrationStrategy, confidence: number): number {
    const strategyQuality: Record<OrchestrationStrategy, number> = {
      local: 0.75,
      delegate: 0.95,
      hybrid: 0.85,
      iterative: 0.90,
    };

    return strategyQuality[strategy] * confidence;
  }

  /**
   * Helper: Create default delegation decision
   */
  private createDefaultDelegationDecision(
    request: IChatCompletionRequest,
    preferences: OrchestrationPreferences
  ): OrchestrationDecision {
    return {
      strategy: 'delegate',
      confidence: 0.9,
      selectedModel: 'claude',
      reasoning: 'Local model not available, using Claude',
      canHandleLocally: false,
      estimatedLatency: 1500,
      estimatedCost: 0.005,
      qualityPrediction: 0.95,
      requiresPrivacy: false,
      queryType: 'general',
    };
  }

  /**
   * Cache operations
   */
  private async checkCache(request: IChatCompletionRequest): Promise<string | null> {
    const query = this.extractUserQuery(request.messages);
    return await this.cacheService.get(query);
  }

  private async cacheResponse(request: IChatCompletionRequest, response: string): Promise<void> {
    const query = this.extractUserQuery(request.messages);
    await this.cacheService.set(query, response);
  }

  /**
   * Metrics operations
   */
  private initializeMetrics(): OrchestrationMetrics {
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

  private updateMetrics(result: OrchestrationResult): void {
    this.metrics.totalQueries++;

    if (result.strategy === 'local') this.metrics.localHandled++;
    if (result.strategy === 'delegate') this.metrics.delegated++;
    if (result.strategy === 'hybrid') this.metrics.hybrid++;
    if (result.strategy === 'iterative') this.metrics.iterative++;
    if (result.escalated) this.metrics.escalations++;

    this.metrics.totalCost += result.cost;

    // Update running averages
    const n = this.metrics.totalQueries;
    this.metrics.averageConfidence =
      (this.metrics.averageConfidence * (n - 1) + result.confidence) / n;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (n - 1) + result.latency) / n;

    if (result.cacheHit) {
      this.metrics.cacheHitRate =
        (this.metrics.cacheHitRate * (n - 1) + 1) / n;
    } else {
      this.metrics.cacheHitRate =
        (this.metrics.cacheHitRate * (n - 1)) / n;
    }
  }

  public getMetrics(): OrchestrationMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Log orchestration decision to governance database
   */
  private async logOrchestrationDecision(
    request: IChatCompletionRequest,
    decision: OrchestrationDecision,
    result: OrchestrationResult
  ): Promise<void> {
    try {
      const query = this.extractUserQuery(request.messages);

      await db.execute(
        `INSERT INTO governance_log (
          timestamp,
          event_type,
          user_id,
          metadata
        ) VALUES (?, ?, ?, ?)`,
        [
          Date.now(),
          'orchestration_decision',
          'system',
          JSON.stringify({
            query: query.substring(0, 200), // Truncate for storage
            decision: {
              strategy: decision.strategy,
              confidence: decision.confidence,
              selectedModel: decision.selectedModel,
              reasoning: decision.reasoning,
              queryType: decision.queryType,
            },
            result: {
              modelUsed: result.modelUsed,
              latency: result.latency,
              cost: result.cost,
              escalated: result.escalated,
              cacheHit: result.cacheHit,
              qualityScore: result.qualityScore,
            },
          }),
        ]
      );
    } catch (error) {
      console.error('[LocalSLMOrchestrator] Failed to log decision:', error);
    }
  }
}

export default LocalSLMOrchestratorService;
