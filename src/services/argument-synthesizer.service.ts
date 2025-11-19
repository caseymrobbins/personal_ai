/**
 * ARGUMENT SYNTHESIZER SERVICE
 * =============================
 * Takes analysis from viewpoint analyzer and strong-manning service,
 * synthesizes a comprehensive answer that considers all perspectives.
 *
 * Features:
 * - Generate balanced synthesis considering all viewpoints
 * - Map trade-offs and value conflicts
 * - Identify areas of agreement
 * - Explain nuances and conditions for different approaches
 * - Generate actionable recommendations with caveats
 * - Rate synthesis quality and representativeness
 */

import {
  Viewpoint,
  ViewpointAnalysis,
  KeyTension,
} from './viewpoint-analyzer.service';
import {
  StrongMannedAnalysis,
} from './strong-manning.service';

export interface TradeOff {
  id: string;
  dimension1: {
    name: string;
    description: string;
    viewpointIds: string[];
    priority: number; // 0-1: how important
  };
  dimension2: {
    name: string;
    description: string;
    viewpointIds: string[];
    priority: number;
  };
  mutuallyExclusive: boolean;
  contextThatMatters: string; // When one becomes more important
  recommendation: string; // What to do about this trade-off
}

export interface SynthesizedPerspective {
  title: string;
  description: string;
  applicableWhen: string; // Conditions/contexts for this perspective
  strengths: string[];
  weaknesses: string[];
  implications: string[];
  relatedViewpoints: string[]; // Viewpoint IDs
}

export interface SynthesizedAnswer {
  id: string;
  originalQuestion: string;
  directAnswer: string; // Clear, direct answer
  nuancedExplanation: string; // Full context and complexity
  tradeOffs: TradeOff[];
  perspectives: SynthesizedPerspective[];
  commonGround: string[];
  unresolvableDisagreements: string[];
  contextualRecommendations: {
    context: string;
    recommendation: string;
    reasoning: string;
  }[];
  recommendedApproach: {
    primary: string;
    alternatives: string[];
    caveats: string[];
    assumptions: string[];
  };
  synthesisQuality: number; // 0-1: how well we integrated all views
  representativeness: number; // 0-1: how fairly all views are represented
  timestamp: number;
}

class ArgumentSynthesizerService {
  private static instance: ArgumentSynthesizerService;
  private answerCache = new Map<string, SynthesizedAnswer>();
  private answerCounter = 0;

  private constructor() {}

  static getInstance(): ArgumentSynthesizerService {
    if (!ArgumentSynthesizerService.instance) {
      ArgumentSynthesizerService.instance = new ArgumentSynthesizerService();
    }
    return ArgumentSynthesizerService.instance;
  }

  /**
   * Synthesize comprehensive answer from viewpoint and strong-manning analysis
   */
  async synthesizeAnswer(
    question: string,
    viewpointAnalysis: ViewpointAnalysis,
    strongMannedAnalyses: Map<string, StrongMannedAnalysis>
  ): Promise<SynthesizedAnswer> {
    const answerId = `answer-${this.answerCounter++}-${Date.now()}`;

    // Start with a direct answer based on user's position
    const directAnswer = this.generateDirectAnswer(
      question,
      viewpointAnalysis.userPosition
    );

    // Build nuanced explanation considering all views
    const nuancedExplanation = await this.buildNuancedExplanation(
      viewpointAnalysis,
      strongMannedAnalyses
    );

    // Identify and explain trade-offs
    const tradeOffs = this.identifyTradeOffs(
      viewpointAnalysis,
      strongMannedAnalyses
    );

    // Create synthesized perspectives
    const perspectives = await this.createSynthesizedPerspectives(
      viewpointAnalysis,
      tradeOffs
    );

    // Extract common ground statements
    const commonGround = this.synthesizeCommonGround(viewpointAnalysis);

    // Identify truly unresolvable disagreements
    const unresolvableDisagreements = this.identifyUnresolvableDisagreements(
      viewpointAnalysis
    );

    // Generate context-specific recommendations
    const contextualRecommendations =
      this.generateContextualRecommendations(
        viewpointAnalysis,
        tradeOffs
      );

    // Generate overall recommended approach
    const recommendedApproach = this.generateRecommendedApproach(
      viewpointAnalysis,
      perspectives,
      contextualRecommendations
    );

    // Calculate quality metrics
    const synthesisQuality = this.calculateSynthesisQuality(
      viewpointAnalysis,
      perspectives,
      tradeOffs
    );

    const representativeness = this.calculateRepresentativeness(
      viewpointAnalysis,
      strongMannedAnalyses
    );

    const answer: SynthesizedAnswer = {
      id: answerId,
      originalQuestion: question,
      directAnswer,
      nuancedExplanation,
      tradeOffs,
      perspectives,
      commonGround,
      unresolvableDisagreements,
      contextualRecommendations,
      recommendedApproach,
      synthesisQuality,
      representativeness,
      timestamp: Date.now(),
    };

    this.answerCache.set(answerId, answer);
    return answer;
  }

  /**
   * Generate clear, direct answer based on user position
   */
  private generateDirectAnswer(question: string, userPosition: Viewpoint): string {
    // Start with user's position
    let answer = userPosition.position;

    // Add confidence qualifier if warranted
    if (userPosition.confidence < 0.5) {
      answer = `Based on the conversation, a tentative answer is: ${answer}`;
    } else if (userPosition.confidence > 0.8) {
      answer = `The strongest position is: ${answer}`;
    } else {
      answer = `A reasonable answer is: ${answer}`;
    }

    return answer;
  }

  /**
   * Build detailed nuanced explanation considering all perspectives
   */
  private async buildNuancedExplanation(
    viewpointAnalysis: ViewpointAnalysis,
    strongMannedAnalyses: Map<string, StrongMannedAnalysis>
  ): Promise<string> {
    const parts: string[] = [];

    // Start with core issue
    parts.push(
      `The core issue is: ${viewpointAnalysis.topicClarities.coreDisagreement}`
    );

    // Add what all sides agree on
    if (viewpointAnalysis.commonGround.length > 0) {
      const sharedPoints = viewpointAnalysis.commonGround
        .slice(0, 3)
        .map((cg) => cg.statement)
        .join('; ');
      parts.push(
        `All perspectives share common ground: ${sharedPoints}.`
      );
    }

    // Add key tensions
    if (viewpointAnalysis.keyTensions.length > 0) {
      const mainTension = viewpointAnalysis.keyTensions[0];
      parts.push(
        `The key tension is: ${mainTension.topic}. ${mainTension.explanation}`
      );
    }

    // Add what strong-manning reveals
    for (const strongMan of strongMannedAnalyses.values()) {
      if (strongMan.counterArguments.length > 0) {
        const topCounter = strongMan.counterArguments[0];
        parts.push(
          `However, a significant challenge to this view is: ${topCounter.statement}`
        );
      }
    }

    // Add complexity
    if (!viewpointAnalysis.topicClarities.wellDefined) {
      parts.push(
        'The topic itself requires clarification before all sides can fully engage.'
      );
    }

    return parts.join(' ');
  }

  /**
   * Identify key trade-offs between viewpoints
   */
  private identifyTradeOffs(
    viewpointAnalysis: ViewpointAnalysis,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _strongMannedAnalyses: Map<string, StrongMannedAnalysis>
  ): TradeOff[] {
    const tradeOffs: TradeOff[] = [];
    let tradeOffCounter = 0;

    // Use key tensions to identify trade-offs
    for (const tension of viewpointAnalysis.keyTensions) {
      if (tension.nature === 'prioritization' || tension.nature === 'value') {
        tradeOffs.push({
          id: `tradeoff-${tradeOffCounter++}`,
          dimension1: {
            name: tension.position1.stance,
            description: `Position emphasizing ${tension.topic}`,
            viewpointIds: [tension.position1.viewpointId],
            priority: 0.7,
          },
          dimension2: {
            name: tension.position2.stance,
            description: `Position emphasizing other factors`,
            viewpointIds: [tension.position2.viewpointId],
            priority: 0.7,
          },
          mutuallyExclusive: tension.nature === 'contradictory',
          contextThatMatters: this.generateContextForTradeOff(tension),
          recommendation: this.generateTradeOffRecommendation(tension),
        });
      }
    }

    // Add common meta-tradeoffs
    if (
      viewpointAnalysis.userPosition.arguments.length > 0 ||
      viewpointAnalysis.opposingViewpoints.length > 0
    ) {
      tradeOffs.push({
        id: `tradeoff-${tradeOffCounter++}`,
        dimension1: {
          name: 'Theoretical purity / Idealism',
          description: 'Adhering to principles even when difficult',
          viewpointIds: [viewpointAnalysis.userPosition.id],
          priority: 0.6,
        },
        dimension2: {
          name: 'Practical feasibility / Pragmatism',
          description: 'Accepting compromises for real-world viability',
          viewpointIds: viewpointAnalysis.opposingViewpoints.map((v) => v.id),
          priority: 0.6,
        },
        mutuallyExclusive: false,
        contextThatMatters:
          'How much implementation ability vs. perfect outcomes matter',
        recommendation:
          'Find balance point based on specific context and constraints',
      });
    }

    return tradeOffs;
  }

  /**
   * Create synthesized perspectives that integrate multiple views
   */
  private async createSynthesizedPerspectives(
    viewpointAnalysis: ViewpointAnalysis,
    tradeOffs: TradeOff[]
  ): Promise<SynthesizedPerspective[]> {
    const perspectives: SynthesizedPerspective[] = [];

    // Create a "pure user position" perspective
    perspectives.push({
      title: 'User Position',
      description: viewpointAnalysis.userPosition.position,
      applicableWhen:
        'When prioritizing the values implicit in the user position',
      strengths: this.extractStrengths(viewpointAnalysis.userPosition),
      weaknesses: this.extractWeaknessesFromTensions(
        viewpointAnalysis.keyTensions,
        viewpointAnalysis.userPosition.id
      ),
      implications: this.generateImplications(
        viewpointAnalysis.userPosition
      ),
      relatedViewpoints: [viewpointAnalysis.userPosition.id],
    });

    // Create perspectives for each opposing view
    for (const opposing of viewpointAnalysis.opposingViewpoints) {
      perspectives.push({
        title: `${opposing.domain || 'Alternative'} perspective`,
        description: opposing.position,
        applicableWhen: `When ${opposing.domain || 'this domain'} factors are most important`,
        strengths: this.extractStrengths(opposing),
        weaknesses: [],
        implications: this.generateImplications(opposing),
        relatedViewpoints: [opposing.id],
      });
    }

    // Create integrated perspectives that bridge trade-offs
    for (const tradeOff of tradeOffs.slice(0, 2)) {
      perspectives.push({
        title: 'Integrated approach',
        description: `Balances ${tradeOff.dimension1.name} with ${tradeOff.dimension2.name}`,
        applicableWhen: tradeOff.contextThatMatters,
        strengths: [
          `Captures benefits from both ${tradeOff.dimension1.name} and ${tradeOff.dimension2.name}`,
          'Reduces vulnerability to changing contexts',
        ],
        weaknesses: [
          'Requires more nuance to explain',
          'May not fully satisfy purist positions',
        ],
        implications: [
          'Implementation requires careful balance',
          'Success depends on contextual adjustments',
        ],
        relatedViewpoints: [
          ...tradeOff.dimension1.viewpointIds,
          ...tradeOff.dimension2.viewpointIds,
        ],
      });
    }

    return perspectives;
  }

  /**
   * Synthesize common ground statements
   */
  private synthesizeCommonGround(
    viewpointAnalysis: ViewpointAnalysis
  ): string[] {
    const commonPoints: string[] = [];

    for (const cg of viewpointAnalysis.commonGround) {
      commonPoints.push(cg.statement);
    }

    // Add meta common ground
    commonPoints.push(
      'All perspectives care about reaching good outcomes'
    );
    commonPoints.push(
      'The issue is complex enough to warrant serious consideration'
    );

    return commonPoints;
  }

  /**
   * Identify truly unresolvable disagreements
   */
  private identifyUnresolvableDisagreements(
    viewpointAnalysis: ViewpointAnalysis
  ): string[] {
    const unresolvable: string[] = [];

    // Factual disagreements can be resolved with evidence
    // Value disagreements are often unresolvable

    for (const tension of viewpointAnalysis.keyTensions) {
      if (tension.nature === 'value') {
        unresolvable.push(
          `Value conflict: ${tension.position1.stance} vs ${tension.position2.stance}`
        );
      }
    }

    return unresolvable;
  }

  /**
   * Generate context-specific recommendations
   */
  private generateContextualRecommendations(
    viewpointAnalysis: ViewpointAnalysis,
    tradeOffs: TradeOff[]
  ): Array<{
    context: string;
    recommendation: string;
    reasoning: string;
  }> {
    const recommendations = [];

    // Recommend based on trade-offs
    for (const tradeOff of tradeOffs.slice(0, 2)) {
      recommendations.push({
        context: tradeOff.contextThatMatters,
        recommendation: tradeOff.recommendation,
        reasoning: `When ${tradeOff.contextThatMatters}, this approach best balances ${tradeOff.dimension1.name} and ${tradeOff.dimension2.name}`,
      });
    }

    return recommendations;
  }

  /**
   * Generate overall recommended approach with caveats
   */
  private generateRecommendedApproach(
    viewpointAnalysis: ViewpointAnalysis,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _perspectives: SynthesizedPerspective[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _contextualRecommendations: Array<{
      context: string;
      recommendation: string;
      reasoning: string;
    }>
  ): {
    primary: string;
    alternatives: string[];
    caveats: string[];
    assumptions: string[];
  } {
    return {
      primary: viewpointAnalysis.userPosition.position,
      alternatives: viewpointAnalysis.opposingViewpoints
        .map((v) => v.position)
        .slice(0, 2),
      caveats: [
        'This recommendation depends on the accuracy of underlying factual assumptions',
        'Different value systems may lead to different conclusions',
        'Implementation details matter significantly',
        'Context and constraints may require adaptation',
        ...viewpointAnalysis.topicClarities.sharedAssumptions,
      ],
      assumptions: [
        'The problem is framed correctly',
        'Relevant information has been considered',
        'The stated values are appropriate for this context',
        'No major unforeseen circumstances will occur',
      ],
    };
  }

  /**
   * Calculate synthesis quality (0-1)
   */
  private calculateSynthesisQuality(
    viewpointAnalysis: ViewpointAnalysis,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _perspectives: SynthesizedPerspective[],
    tradeOffs: TradeOff[]
  ): number {
    let quality = 0.5;

    // Increase for having identified key tensions
    quality += Math.min(0.15, viewpointAnalysis.keyTensions.length * 0.05);

    // Increase for finding common ground
    quality += Math.min(
      0.15,
      viewpointAnalysis.commonGround.length * 0.05
    );

    // Increase for identifying trade-offs
    quality += Math.min(0.15, tradeOffs.length * 0.075);

    // Increase if analysis confidence is high
    quality += viewpointAnalysis.analysisConfidence * 0.1;

    return Math.min(0.95, quality);
  }

  /**
   * Calculate representativeness (how fairly all views are represented)
   */
  private calculateRepresentativeness(
    viewpointAnalysis: ViewpointAnalysis,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _strongMannedAnalyses: Map<string, StrongMannedAnalysis>
  ): number {
    let representativeness = 0.5;

    // Increase if all viewpoints have good arguments
    const viewpointsWithArguments =
      [viewpointAnalysis.userPosition, ...viewpointAnalysis.opposingViewpoints]
        .filter((v) => v.arguments.length > 0)
        .length / (1 + viewpointAnalysis.opposingViewpoints.length);

    representativeness += viewpointsWithArguments * 0.3;

    // Increase if we found common ground
    if (viewpointAnalysis.commonGround.length > 0) {
      representativeness += 0.2;
    }

    return Math.min(0.95, representativeness);
  }

  /**
   * Extract strengths of a viewpoint
   */
  private extractStrengths(viewpoint: Viewpoint): string[] {
    const strengths: string[] = [];

    if (viewpoint.arguments.length > 0) {
      strengths.push(
        `Well-articulated position with ${viewpoint.arguments.length} supporting arguments`
      );
    }

    if (viewpoint.confidence > 0.7) {
      strengths.push('Supported by substantial reasoning');
    }

    if (viewpoint.domain) {
      strengths.push(`Strong from a ${viewpoint.domain} perspective`);
    }

    return strengths.length > 0
      ? strengths
      : ['Has merit worth considering'];
  }

  /**
   * Extract weaknesses based on tensions
   */
  private extractWeaknessesFromTensions(
    tensions: KeyTension[],
    viewpointId: string
  ): string[] {
    const weaknesses: string[] = [];

    for (const tension of tensions) {
      if (tension.position1.viewpointId === viewpointId) {
        weaknesses.push(`Tension: ${tension.topic}`);
      }
    }

    return weaknesses.length > 0
      ? weaknesses
      : ['May not address all considerations'];
  }

  /**
   * Generate implications of adopting a viewpoint
   */
  private generateImplications(viewpoint: Viewpoint): string[] {
    const implications: string[] = [];

    // Basic implications
    implications.push('Guides action in specific directions');

    if (viewpoint.stance === 'user') {
      implications.push('Reflects stated values and priorities');
    } else {
      implications.push(`Reflects ${viewpoint.domain || 'alternative'} priorities`);
    }

    implications.push('Has second-order consequences');

    return implications;
  }

  /**
   * Generate context for trade-off
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateContextForTradeOff(_tension: KeyTension): string {
    return 'The specific context, constraints, and priorities';
  }

  /**
   * Generate recommendation for trade-off
   */
  private generateTradeOffRecommendation(tension: KeyTension): string {
    return `Consider both ${tension.position1.stance} and ${tension.position2.stance} factors, with relative weight depending on context`;
  }

  /**
   * Get cached answer
   */
  getAnswer(answerId: string): SynthesizedAnswer | undefined {
    return this.answerCache.get(answerId);
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.answerCache.clear();
    this.answerCounter = 0;
  }
}

export const argumentSynthesizer = ArgumentSynthesizerService.getInstance();
