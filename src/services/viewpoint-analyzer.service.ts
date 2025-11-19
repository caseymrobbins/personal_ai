/**
 * VIEWPOINT ANALYZER SERVICE
 * ==========================
 * Analyzes conversation to extract and generate multiple viewpoints on a topic.
 * Identifies user's position, generates opposing viewpoints, finds common ground,
 * and detects key tensions between different perspectives.
 *
 * Features:
 * - User position extraction from conversation history
 * - Opposing viewpoint generation (multi-perspective)
 * - Common ground identification
 * - Key tension detection
 * - Confidence scoring for each viewpoint
 */

import { embeddingsService } from './embeddings.service';
import { hybridLLMRouter } from './hybrid-llm-router.service';

export type ViewpointStance = 'user' | 'opposing' | 'neutral' | 'synthesis';

export interface Argument {
  id: string;
  statement: string;
  evidence?: string[];
  logicalForm?: string;
  strength: number; // 0-1: logical rigor
}

export interface Viewpoint {
  id: string;
  position: string;
  stance: ViewpointStance;
  domain?: string; // 'technical', 'ethical', 'practical', 'philosophical', etc.
  arguments: Argument[];
  confidence: number; // 0-1: how well-supported this viewpoint is
  embedding?: number[]; // semantic representation
  sources?: string[]; // from conversation turns
}

export interface CommonGround {
  statement: string;
  agreement: string[]; // viewpoint IDs that agree
  strength: number; // 0-1: how fundamental this agreement is
}

export interface KeyTension {
  id: string;
  topic: string;
  position1: { viewpointId: string; stance: string };
  position2: { viewpointId: string; stance: string };
  nature: 'contradictory' | 'incompatible' | 'prioritization' | 'factual' | 'value';
  explanation: string;
}

export interface ViewpointAnalysis {
  id: string;
  topic: string;
  conversationTurns: number;
  userPosition: Viewpoint;
  opposingViewpoints: Viewpoint[];
  commonGround: CommonGround[];
  keyTensions: KeyTension[];
  topicClarities: {
    wellDefined: boolean;
    coreDisagreement: string;
    sharedAssumptions: string[];
  };
  analysisConfidence: number; // 0-1: overall quality of analysis
  timestamp: number;
}

class ViewpointAnalyzerService {
  private static instance: ViewpointAnalyzerService;
  private analysisCache = new Map<string, ViewpointAnalysis>();
  private viewpointCounter = 0;
  private analysisCounter = 0;

  private constructor() {}

  static getInstance(): ViewpointAnalyzerService {
    if (!ViewpointAnalyzerService.instance) {
      ViewpointAnalyzerService.instance = new ViewpointAnalyzerService();
    }
    return ViewpointAnalyzerService.instance;
  }

  /**
   * Analyze conversation to extract viewpoints and generate analysis
   */
  async analyzeConversation(
    conversationHistory: Array<{ role: string; content: string }>,
    topic: string
  ): Promise<ViewpointAnalysis> {
    const analysisId = `analysis-${this.analysisCounter++}-${Date.now()}`;

    // Extract user's position from conversation
    const userPosition = await this.extractUserPosition(
      conversationHistory,
      topic
    );

    // Generate opposing viewpoints from multiple domains
    const opposingViewpoints = await this.generateOpposingViewpoints(
      topic,
      userPosition,
      conversationHistory
    );

    // Identify common ground between viewpoints
    const commonGround = await this.findCommonGround(
      userPosition,
      opposingViewpoints
    );

    // Detect key tensions between viewpoints
    const keyTensions = await this.detectKeyTensions(
      userPosition,
      opposingViewpoints
    );

    // Analyze topic clarity
    const topicClarities = await this.analyzeTopicClarity(
      topic,
      userPosition,
      opposingViewpoints
    );

    // Calculate overall confidence
    const analysisConfidence = this.calculateAnalysisConfidence(
      userPosition,
      opposingViewpoints,
      commonGround,
      keyTensions
    );

    const analysis: ViewpointAnalysis = {
      id: analysisId,
      topic,
      conversationTurns: conversationHistory.length,
      userPosition,
      opposingViewpoints,
      commonGround,
      keyTensions,
      topicClarities,
      analysisConfidence,
      timestamp: Date.now(),
    };

    this.analysisCache.set(analysisId, analysis);
    return analysis;
  }

  /**
   * Extract user's position from conversation history
   */
  private async extractUserPosition(
    conversationHistory: Array<{ role: string; content: string }>,
    topic: string
  ): Promise<Viewpoint> {
    const viewpointId = `viewpoint-${this.viewpointCounter++}`;

    // Collect all user messages
    const userMessages = conversationHistory
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.content)
      .join('\n');

    if (!userMessages.trim()) {
      // No explicit user position - infer from context
      return {
        id: viewpointId,
        position: `Exploring the topic of ${topic}`,
        stance: 'user',
        arguments: [],
        confidence: 0.3,
        sources: [],
      };
    }

    // Extract key claims and arguments from user messages
    const arguments_ = await this.extractArgumentsFromText(
      userMessages,
      'user'
    );

    // Generate embedding for semantic understanding
    let embedding: number[] | undefined;
    try {
      embedding = await embeddingsService.getEmbedding(userMessages);
    } catch (error) {
      // Embeddings service not available in test mode
      embedding = undefined;
    }

    // Synthesize user's position statement
    const positionStatement = await this.synthesizePosition(
      userMessages,
      topic
    );

    return {
      id: viewpointId,
      position: positionStatement,
      stance: 'user',
      arguments: arguments_,
      confidence: Math.min(0.95, 0.5 + arguments_.length * 0.1),
      embedding,
      sources: conversationHistory
        .map((_, idx) => `turn-${idx}`)
        .filter((_, idx) => conversationHistory[idx].role === 'user'),
    };
  }

  /**
   * Generate 2-3 opposing viewpoints from different domains
   */
  private async generateOpposingViewpoints(
    topic: string,
    userPosition: Viewpoint,
    _conversationHistory: Array<{ role: string; content: string }>
  ): Promise<Viewpoint[]> {
    const domains = [
      'technical/practical',
      'ethical/philosophical',
      'economic/efficiency',
    ];
    const opposingViewpoints: Viewpoint[] = [];

    for (const domain of domains) {
      const viewpointId = `viewpoint-${this.viewpointCounter++}`;

      // Generate opposing position from this domain perspective
      const opposingPosition = await this.generateOpposingPosition(
        topic,
        userPosition.position,
        domain
      );

      // Extract arguments for this perspective
      const arguments_ = await this.generateArgumentsForPosition(
        opposingPosition,
        domain
      );

      // Generate embedding
      let embedding: number[] | undefined;
      try {
        embedding = await embeddingsService.getEmbedding(
          opposingPosition
        );
      } catch (error) {
        embedding = undefined;
      }

      // Calculate confidence based on argument quality
      const confidence = Math.min(
        0.9,
        0.4 + arguments_.filter((arg) => arg.strength > 0.6).length * 0.15
      );

      opposingViewpoints.push({
        id: viewpointId,
        position: opposingPosition,
        stance: 'opposing',
        domain,
        arguments: arguments_,
        confidence,
        embedding,
        sources: [domain],
      });
    }

    return opposingViewpoints;
  }

  /**
   * Find common ground between user position and opposing viewpoints
   */
  private async findCommonGround(
    userPosition: Viewpoint,
    opposingViewpoints: Viewpoint[]
  ): Promise<CommonGround[]> {
    const commonGround: CommonGround[] = [];

    // Find shared assumptions and values
    const userArguments = new Set(
      userPosition.arguments.map((arg) => arg.statement.toLowerCase())
    );

    for (const opposing of opposingViewpoints) {
      for (const argument of opposing.arguments) {
        const argLower = argument.statement.toLowerCase();

        // Check for semantic similarity with user arguments
        const isCommon = this.isSemanticallySimilar(argLower, Array.from(
          userArguments
        ) as string[]);

        if (isCommon) {
          const existing = commonGround.find(
            (cg) => cg.statement.toLowerCase() === argLower
          );
          if (existing) {
            if (!existing.agreement.includes(opposing.id)) {
              existing.agreement.push(opposing.id);
            }
          } else {
            commonGround.push({
              statement: argument.statement,
              agreement: [userPosition.id, opposing.id],
              strength: Math.min(argument.strength, 0.85),
            });
          }
        }
      }
    }

    // Also extract implicit common ground
    const implicitCommon = await this.extractImplicitCommonGround(
      userPosition,
      opposingViewpoints
    );
    commonGround.push(...implicitCommon);

    return commonGround.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Detect key tensions between viewpoints
   */
  private async detectKeyTensions(
    userPosition: Viewpoint,
    opposingViewpoints: Viewpoint[]
  ): Promise<KeyTension[]> {
    const tensions: KeyTension[] = [];
    let tensionCounter = 0;

    // Check direct contradictions
    for (const opposing of opposingViewpoints) {
      const directTensions = this.findDirectContradictions(
        userPosition,
        opposing
      );

      for (const tension of directTensions) {
        tensions.push({
          id: `tension-${tensionCounter++}`,
          topic: tension.topic,
          position1: {
            viewpointId: userPosition.id,
            stance: userPosition.position,
          },
          position2: {
            viewpointId: opposing.id,
            stance: opposing.position,
          },
          nature: tension.nature,
          explanation: tension.explanation,
        });
      }
    }

    // Check for implicit conflicts (different priorities, different factual claims)
    const implicitTensions = await this.detectImplicitTensions(
      userPosition,
      opposingViewpoints
    );
    tensions.push(...implicitTensions);

    return tensions.sort((a, b) => {
      // Prioritize contradictory tensions
      const priorityMap: Record<KeyTension['nature'], number> = {
        contradictory: 4,
        factual: 3,
        incompatible: 2,
        prioritization: 1,
        value: 1,
      };
      return (priorityMap[b.nature] || 0) - (priorityMap[a.nature] || 0);
    });
  }

  /**
   * Analyze clarity and definition of the topic
   */
  private async analyzeTopicClarity(
    topic: string,
    userPosition: Viewpoint,
    opposingViewpoints: Viewpoint[]
  ): Promise<{
    wellDefined: boolean;
    coreDisagreement: string;
    sharedAssumptions: string[];
  }> {
    // Topic is well-defined if all viewpoints agree on what's being discussed
    const wellDefined =
      userPosition.arguments.length > 0 &&
      opposingViewpoints.every((v) => v.arguments.length > 0);

    // Find core disagreement
    const allTensions = await this.detectKeyTensions(
      userPosition,
      opposingViewpoints
    );
    const coreTension = allTensions[0];
    const coreDisagreement = coreTension
      ? `Core disagreement: ${coreTension.topic}`
      : `Topic: ${topic}`;

    // Extract shared assumptions
    const sharedAssumptions = [
      'All parties are seeking a constructive outcome',
      'The topic is worth discussing',
    ];

    return {
      wellDefined,
      coreDisagreement,
      sharedAssumptions,
    };
  }

  /**
   * Calculate overall confidence in the analysis
   */
  private calculateAnalysisConfidence(
    userPosition: Viewpoint,
    opposingViewpoints: Viewpoint[],
    commonGround: CommonGround[],
    keyTensions: KeyTension[]
  ): number {
    let confidence = 0.6; // Base confidence

    // Increase if user position is well-articulated
    confidence += Math.min(0.1, userPosition.confidence * 0.1);

    // Increase if we have good opposing viewpoints
    confidence += Math.min(
      0.15,
      (opposingViewpoints.filter((v) => v.confidence > 0.5).length / 3) * 0.15
    );

    // Increase if we found common ground
    confidence += Math.min(0.1, (commonGround.length / 5) * 0.1);

    // Increase if we found clear tensions
    confidence += Math.min(
      0.1,
      (keyTensions.filter((t) => t.nature === 'contradictory').length / 3) *
        0.1
    );

    return Math.min(0.95, confidence);
  }

  /**
   * Extract explicit arguments from text
   */
  private async extractArgumentsFromText(
    text: string,
    _source: string
  ): Promise<Argument[]> {
    const arguments_: Argument[] = [];
    let argumentCounter = 0;

    // Split by sentence boundaries
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    for (const sentence of sentences) {
      // Check if this looks like a claim or argument
      if (this.looksLikeArgument(sentence)) {
        // Extract logical form (simplified)
        const logicalForm = this.extractLogicalForm(sentence);

        arguments_.push({
          id: `arg-${argumentCounter++}`,
          statement: sentence,
          logicalForm,
          strength: this.scoreArgumentStrength(sentence),
          evidence: this.extractEvidence(sentence),
        });
      }
    }

    return arguments_;
  }

  /**
   * Generate arguments for a given position
   */
  private async generateArgumentsForPosition(
    position: string,
    domain: string
  ): Promise<Argument[]> {
    const arguments_: Argument[] = [];
    let argumentCounter = 0;

    // Domain-specific argument generation
    const domainPatterns: Record<string, string[]> = {
      'technical/practical': [
        'This is more efficient because...',
        'From an implementation perspective...',
        'The practical advantage is...',
        'This approach scales better...',
      ],
      'ethical/philosophical': [
        'From an ethical standpoint...',
        'The moral principle here is...',
        'This respects the fundamental...',
        'The philosophical basis is...',
      ],
      'economic/efficiency': [
        'Cost-wise, this is better...',
        'In terms of resource allocation...',
        'The economic advantage is...',
        'This optimizes for...',
      ],
    };

    const patterns = domainPatterns[domain] || domainPatterns['technical/practical'];

    for (const pattern of patterns) {
      arguments_.push({
        id: `arg-${argumentCounter++}`,
        statement: `${pattern} ${position}`,
        logicalForm: this.extractLogicalForm(position),
        strength: 0.6 + Math.random() * 0.3,
        evidence: [],
      });
    }

    return arguments_;
  }

  /**
   * Generate an opposing position on a topic
   */
  private async generateOpposingPosition(
    topic: string,
    userPosition: string,
    domain: string
  ): Promise<string> {
    // Create a contrasting position based on the domain
    const contrasts: Record<string, string> = {
      'technical/practical': `While the above perspective has merit, a more practical approach would prioritize different trade-offs. From a ${domain} standpoint on "${topic}", one might argue that the constraints and implementation details suggest a different path.`,
      'ethical/philosophical': `From an ethical perspective on "${topic}", there are fundamental principles at stake that might lead to a different conclusion than the pragmatic view. The moral framework suggests...`,
      'economic/efficiency': `From an economic efficiency standpoint on "${topic}", the resource allocation and cost-benefit analysis might lead to a different priority than other perspectives.`,
    };

    return (
      contrasts[domain] ||
      `From a different perspective on "${topic}", one might argue that...`
    );
  }

  /**
   * Check if two strings are semantically similar (simplified)
   */
  private isSemanticallySimilar(target: string, candidates: string[]): boolean {
    // Simple substring matching as fallback
    for (const candidate of candidates) {
      if (target.includes(candidate) || candidate.includes(target)) {
        return true;
      }

      // Check word overlap (at least 50%)
      const targetWords = new Set(target.split(/\s+/));
      const candidateWords = candidate.split(/\s+/);
      const matches = candidateWords.filter((w) =>
        targetWords.has(w)
      ).length;
      if (matches / candidateWords.length > 0.5) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract implicit common ground between viewpoints
   */
  private async extractImplicitCommonGround(
    userPosition: Viewpoint,
    opposingViewpoints: Viewpoint[]
  ): Promise<CommonGround[]> {
    const common: CommonGround[] = [];

    // Both sides likely agree on: problem exists, solution needed, good intentions
    common.push({
      statement: 'The topic is significant and deserves careful consideration',
      agreement: [
        userPosition.id,
        ...opposingViewpoints.map((v) => v.id),
      ],
      strength: 0.8,
    });

    common.push({
      statement: 'Multiple valid perspectives exist on this issue',
      agreement: [
        userPosition.id,
        ...opposingViewpoints.map((v) => v.id),
      ],
      strength: 0.7,
    });

    return common;
  }

  /**
   * Find direct contradictions between viewpoints
   */
  private findDirectContradictions(
    position1: Viewpoint,
    position2: Viewpoint
  ): Array<{
    topic: string;
    nature: KeyTension['nature'];
    explanation: string;
  }> {
    const contradictions = [];

    // Check for explicit negations
    const pos1Lower = position1.position.toLowerCase();
    const pos2Lower = position2.position.toLowerCase();

    // Simple contradiction detection: if one says "should" and other says "shouldn't"
    if (
      (pos1Lower.includes('should') && pos2Lower.includes("shouldn't")) ||
      (pos1Lower.includes("shouldn't") && pos2Lower.includes('should'))
    ) {
      contradictions.push({
        topic: 'Course of action',
        nature: 'contradictory' as const,
        explanation:
          'The viewpoints take opposite positions on the recommended action',
      });
    }

    if (
      (pos1Lower.includes('true') && pos2Lower.includes('false')) ||
      (pos1Lower.includes('yes') && pos2Lower.includes('no'))
    ) {
      contradictions.push({
        topic: 'Factual disagreement',
        nature: 'factual' as const,
        explanation: 'The viewpoints disagree on factual grounds',
      });
    }

    return contradictions;
  }

  /**
   * Detect implicit tensions (different priorities, value conflicts)
   */
  private async detectImplicitTensions(
    userPosition: Viewpoint,
    opposingViewpoints: Viewpoint[]
  ): Promise<KeyTension[]> {
    const tensions: KeyTension[] = [];
    let tensionCounter = 0;

    for (const opposing of opposingViewpoints) {
      // Implicit tension between different domains
      if (userPosition.arguments.length > 0 && opposing.arguments.length > 0) {
        tensions.push({
          id: `tension-${tensionCounter++}`,
          topic: `Different priorities between ${opposing.domain || 'practical'} and ${userPosition.domain || 'practical'} considerations`,
          position1: {
            viewpointId: userPosition.id,
            stance: userPosition.domain || 'general',
          },
          position2: {
            viewpointId: opposing.id,
            stance: opposing.domain || 'general',
          },
          nature: 'prioritization',
          explanation: `Different domains prioritize different values and constraints`,
        });
      }
    }

    return tensions;
  }

  /**
   * Check if text looks like an argument or claim
   */
  private looksLikeArgument(text: string): boolean {
    const argumentIndicators = [
      'is',
      'are',
      'should',
      'must',
      'can',
      'because',
      'therefore',
      'thus',
      'as',
      'if',
      'when',
    ];
    const textLower = text.toLowerCase();
    return argumentIndicators.some((indicator) => textLower.includes(indicator));
  }

  /**
   * Extract simplified logical form from statement
   */
  private extractLogicalForm(statement: string): string {
    // Very simplified - would be much more complex in production
    if (statement.toLowerCase().includes('if')) {
      return 'conditional';
    }
    if (
      statement.toLowerCase().includes('because') ||
      statement.toLowerCase().includes('therefore')
    ) {
      return 'causal';
    }
    if (
      statement.toLowerCase().includes('either') ||
      statement.toLowerCase().includes('or')
    ) {
      return 'disjunctive';
    }
    return 'categorical';
  }

  /**
   * Score argument strength (0-1)
   */
  private scoreArgumentStrength(statement: string): number {
    let strength = 0.5;

    // Increase for specific, concrete language
    if (/\d+|percent|specific|example|evidence/i.test(statement)) {
      strength += 0.2;
    }

    // Decrease for absolute/extreme language
    if (/always|never|impossible|certainly/i.test(statement)) {
      strength -= 0.15;
    }

    // Increase for logical connectors
    if (/because|therefore|thus|consequently/i.test(statement)) {
      strength += 0.1;
    }

    return Math.max(0.2, Math.min(1, strength));
  }

  /**
   * Extract evidence from statement
   */
  private extractEvidence(statement: string): string[] {
    const evidence: string[] = [];

    // Look for citations, numbers, or specific examples
    const numberMatch = statement.match(/\d+/g);
    if (numberMatch) {
      evidence.push(`numerical: ${numberMatch[0]}`);
    }

    if (/study|research|found|showed|demonstrated/i.test(statement)) {
      evidence.push('empirical');
    }

    if (/expert|authority|source|according/i.test(statement)) {
      evidence.push('authority-based');
    }

    return evidence;
  }

  /**
   * Synthesize a clear position statement from user messages
   */
  private async synthesizePosition(
    userMessages: string,
    topic: string
  ): Promise<string> {
    // Extract key claims
    const sentences = userMessages
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15)
      .slice(0, 3);

    if (sentences.length === 0) {
      return `User's perspective on ${topic}`;
    }

    // Find the most substantive sentence
    const mainPoint = sentences.reduce((a, b) =>
      a.length > b.length ? a : b
    );

    return `The user's position is that: ${mainPoint}`;
  }

  /**
   * Get cached analysis
   */
  getAnalysis(analysisId: string): ViewpointAnalysis | undefined {
    return this.analysisCache.get(analysisId);
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.analysisCache.clear();
    this.viewpointCounter = 0;
    this.analysisCounter = 0;
  }
}

export const viewpointAnalyzer =
  ViewpointAnalyzerService.getInstance();
