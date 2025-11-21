/**
 * Smart Routing Service
 *
 * Intelligently routes queries to the optimal AI adapter based on:
 * - Query complexity and type
 * - Privacy requirements
 * - Cost optimization
 * - Performance needs
 * - Adapter availability
 */

import { apiKeyService } from './apikey.service';

export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'expert';
export type QueryType =
  | 'factual'        // Simple facts, definitions
  | 'conversational' // General chat
  | 'technical'      // Technical questions
  | 'creative'       // Creative writing, brainstorming
  | 'coding'         // Code-related
  | 'reasoning'      // Complex reasoning, analysis
  | 'math';          // Mathematical computations

interface QueryAnalysis {
  complexity: QueryComplexity;
  type: QueryType;
  wordCount: number;
  hasCode: boolean;
  hasPII: boolean;
  requiresReasoning: boolean;
  estimatedTokens: number;
}

interface RoutingRecommendation {
  adapterId: string;
  confidence: number;
  reasoning: string;
  fallbacks: string[];
  estimatedCost?: number;
  estimatedTime?: number;
}

class SmartRoutingService {
  // Complexity thresholds
  private readonly SIMPLE_THRESHOLD = 50; // words
  private readonly MODERATE_THRESHOLD = 150;
  private readonly COMPLEX_THRESHOLD = 500;

  // Keywords for query type detection
  private readonly FACTUAL_KEYWORDS = ['what is', 'who is', 'when', 'where', 'define', 'explain', 'how to'];
  private readonly TECHNICAL_KEYWORDS = ['implement', 'configure', 'optimize', 'debug', 'architecture', 'system'];
  private readonly CREATIVE_KEYWORDS = ['write', 'create', 'generate', 'imagine', 'brainstorm', 'design'];
  private readonly CODING_KEYWORDS = ['function', 'class', 'code', 'bug', 'error', 'algorithm', 'refactor'];
  private readonly REASONING_KEYWORDS = ['analyze', 'compare', 'evaluate', 'pros and cons', 'why', 'reasoning'];
  private readonly MATH_KEYWORDS = ['calculate', 'compute', 'solve', 'equation', 'formula', 'mathematical'];

  /**
   * Analyze a query to determine its characteristics
   */
  analyzeQuery(query: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();
    const wordCount = query.split(/\s+/).length;
    const hasCode = /```|`\w+`|function|class|const|let|var|import|export/.test(query);
    const hasPII = this.detectPII(query);
    const requiresReasoning = this.REASONING_KEYWORDS.some(kw => lowerQuery.includes(kw));

    // Determine complexity
    let complexity: QueryComplexity;
    if (wordCount < this.SIMPLE_THRESHOLD && !requiresReasoning) {
      complexity = 'simple';
    } else if (wordCount < this.MODERATE_THRESHOLD) {
      complexity = 'moderate';
    } else if (wordCount < this.COMPLEX_THRESHOLD) {
      complexity = 'complex';
    } else {
      complexity = 'expert';
    }

    // Determine query type
    const type = this.determineQueryType(lowerQuery, hasCode);

    // Estimate tokens (rough approximation: 1 token ≈ 0.75 words)
    const estimatedTokens = Math.ceil(wordCount * 1.33);

    return {
      complexity,
      type,
      wordCount,
      hasCode,
      hasPII,
      requiresReasoning,
      estimatedTokens
    };
  }

  /**
   * Get routing recommendation based on query analysis
   */
  async getRecommendation(
    query: string,
    currentAdapter?: string
  ): Promise<RoutingRecommendation> {
    const analysis = this.analyzeQuery(query);
    const availableAdapters = await this.getAvailableAdapters();

    // Privacy-first: If PII detected, prefer local
    if (analysis.hasPII) {
      if (availableAdapters.includes('local_guardian')) {
        return {
          adapterId: 'local_guardian',
          confidence: 0.95,
          reasoning: 'PII detected - routing to local AI for privacy',
          fallbacks: []
        };
      } else {
        return {
          adapterId: currentAdapter || 'anthropic',
          confidence: 0.6,
          reasoning: 'PII detected but local AI unavailable - using cloud with anonymization',
          fallbacks: []
        };
      }
    }

    // Route based on complexity and type
    return this.selectOptimalAdapter(analysis, availableAdapters, currentAdapter);
  }

  /**
   * Select the optimal adapter based on query characteristics
   */
  private selectOptimalAdapter(
    analysis: QueryAnalysis,
    availableAdapters: string[],
    currentAdapter?: string
  ): RoutingRecommendation {
    // Simple factual queries -> Local AI (if available)
    if (
      analysis.complexity === 'simple' &&
      analysis.type === 'factual' &&
      !analysis.requiresReasoning &&
      availableAdapters.includes('local_guardian')
    ) {
      return {
        adapterId: 'local_guardian',
        confidence: 0.85,
        reasoning: 'Simple factual query - local AI is sufficient',
        fallbacks: ['openai', 'anthropic'],
        estimatedCost: 0,
        estimatedTime: 2000
      };
    }

    // Conversational queries -> Local AI (if available and simple)
    if (
      analysis.complexity === 'simple' &&
      analysis.type === 'conversational' &&
      availableAdapters.includes('local_guardian')
    ) {
      return {
        adapterId: 'local_guardian',
        confidence: 0.8,
        reasoning: 'Simple conversation - local AI works well',
        fallbacks: ['anthropic', 'openai'],
        estimatedCost: 0,
        estimatedTime: 2000
      };
    }

    // Complex reasoning -> Claude (Anthropic)
    if (
      (analysis.complexity === 'complex' || analysis.complexity === 'expert' ||
       analysis.requiresReasoning) &&
      availableAdapters.includes('anthropic')
    ) {
      return {
        adapterId: 'anthropic',
        confidence: 0.95,
        reasoning: 'Complex reasoning task - Claude excels at this',
        fallbacks: ['openai', 'gemini'],
        estimatedCost: 0.03,
        estimatedTime: 5000
      };
    }

    // Coding tasks -> Claude or GPT-4
    if (
      analysis.type === 'coding' &&
      analysis.hasCode
    ) {
      if (availableAdapters.includes('anthropic')) {
        return {
          adapterId: 'anthropic',
          confidence: 0.9,
          reasoning: 'Coding task - Claude has excellent code understanding',
          fallbacks: ['openai'],
          estimatedCost: 0.02,
          estimatedTime: 4000
        };
      } else if (availableAdapters.includes('openai')) {
        return {
          adapterId: 'openai',
          confidence: 0.85,
          reasoning: 'Coding task - GPT-4 is excellent for code',
          fallbacks: ['anthropic'],
          estimatedCost: 0.03,
          estimatedTime: 4000
        };
      }
    }

    // Creative tasks -> GPT-4 or Claude
    if (analysis.type === 'creative') {
      if (availableAdapters.includes('openai')) {
        return {
          adapterId: 'openai',
          confidence: 0.85,
          reasoning: 'Creative task - GPT-4 excels at creative writing',
          fallbacks: ['anthropic', 'gemini'],
          estimatedCost: 0.02,
          estimatedTime: 5000
        };
      }
    }

    // Math/computation -> Gemini or GPT-4
    if (analysis.type === 'math') {
      if (availableAdapters.includes('gemini')) {
        return {
          adapterId: 'gemini',
          confidence: 0.8,
          reasoning: 'Mathematical task - Gemini handles math well',
          fallbacks: ['openai', 'anthropic'],
          estimatedCost: 0.01,
          estimatedTime: 3000
        };
      }
    }

    // Moderate complexity -> Try local first, fallback to cloud
    if (
      analysis.complexity === 'moderate' &&
      availableAdapters.includes('local_guardian')
    ) {
      return {
        adapterId: 'local_guardian',
        confidence: 0.7,
        reasoning: 'Moderate task - trying local AI first',
        fallbacks: ['anthropic', 'openai'],
        estimatedCost: 0,
        estimatedTime: 3000
      };
    }

    // Default: Use current adapter or best available cloud model
    const defaultAdapter = this.getDefaultAdapter(availableAdapters, currentAdapter);
    return {
      adapterId: defaultAdapter,
      confidence: 0.6,
      reasoning: 'Using default adapter',
      fallbacks: availableAdapters.filter(a => a !== defaultAdapter),
      estimatedCost: 0.02,
      estimatedTime: 4000
    };
  }

  /**
   * Get list of available adapters (those with API keys configured)
   */
  private async getAvailableAdapters(): Promise<string[]> {
    const adapters = ['local_guardian']; // Local is always available

    // Check which cloud adapters have API keys
    const providers = ['openai', 'anthropic', 'gemini', 'cohere'];
    for (const provider of providers) {
      if (apiKeyService.hasAPIKey(provider)) {
        adapters.push(provider);
      }
    }

    return adapters;
  }

  /**
   * Detect potential PII in query
   */
  private detectPII(query: string): boolean {
    // Simple PII detection patterns
    const patterns = [
      /\b\d{3}-\d{2}-\d{4}\b/,              // SSN
      /\b\d{16}\b/,                          // Credit card
      /\b[\w.%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,      // Phone
      /\b\d{5}(-\d{4})?\b/,                 // ZIP code
      /\b(my name is|i'm|i am)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i // Name introduction
    ];

    return patterns.some(pattern => pattern.test(query));
  }

  /**
   * Determine the primary type of the query
   */
  private determineQueryType(lowerQuery: string, hasCode: boolean): QueryType {
    if (hasCode || this.CODING_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
      return 'coding';
    }
    if (this.REASONING_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
      return 'reasoning';
    }
    if (this.MATH_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
      return 'math';
    }
    if (this.CREATIVE_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
      return 'creative';
    }
    if (this.TECHNICAL_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
      return 'technical';
    }
    if (this.FACTUAL_KEYWORDS.some(kw => lowerQuery.includes(kw))) {
      return 'factual';
    }
    return 'conversational';
  }

  /**
   * Get default adapter preference
   */
  private getDefaultAdapter(available: string[], current?: string): string {
    // Prefer current if available
    if (current && available.includes(current)) {
      return current;
    }

    // Priority order: Claude > GPT-4 > Gemini > Local
    const priority = ['anthropic', 'openai', 'gemini', 'cohere', 'local_guardian'];
    for (const adapter of priority) {
      if (available.includes(adapter)) {
        return adapter;
      }
    }

    return 'local_guardian'; // Fallback
  }

  /**
   * Log routing decision for analytics
   */
  logRoutingDecision(
    _query: string, // Prefixed with _ to indicate intentionally unused
    recommendation: RoutingRecommendation,
    actualAdapter: string
  ): void {
    const followed = recommendation.adapterId === actualAdapter;
    console.log('[SmartRouting]', {
      recommended: recommendation.adapterId,
      actual: actualAdapter,
      followed,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning
    });
  }
}

// Singleton instance
export const smartRoutingService = new SmartRoutingService();
