/**
 * STRONG MANNING SERVICE
 * ======================
 * Constructs the strongest possible arguments AGAINST a given viewpoint.
 * This is "devil's advocate" with intellectual honesty—we're not trying to
 * strawman or defeat the argument, but to steel-man the opposition.
 *
 * Features:
 * - Generate strongest counterarguments (not strawman)
 * - Identify edge cases and boundary conditions
 * - Surface implicit assumptions and challenge them fairly
 * - Rate counterargument strength fairly
 * - Generate probing questions
 */

import { Argument, Viewpoint } from './viewpoint-analyzer.service';

export interface CounterArgument extends Argument {
  targetStatement: string; // Which statement this counters
  counterType:
    | 'logical-fallacy'
    | 'empirical-challenge'
    | 'value-conflict'
    | 'assumption-challenge'
    | 'edge-case'
    | 'practical-problem';
  fairnessScore: number; // 0-1: how fairly we're representing the counterargument
  potentialResponse?: string; // How the original argument might respond
}

export interface UnexaminedAssumption {
  assumption: string;
  whyAssumed: string;
  challengeStatement: string;
  isExplicit: boolean;
  importance: number; // 0-1: how critical this assumption is
}

export interface EdgeCase {
  scenario: string;
  description: string;
  wouldOriginalPositionHold: boolean;
  reasoning: string;
  severity: 'critical' | 'significant' | 'minor';
}

export interface ProbingQuestion {
  question: string;
  reasoning: string;
  revealsProblem: boolean; // Does this question expose a weakness?
  difficulty: number; // 0-1: how hard to answer
}

export interface StrongMannedAnalysis {
  id: string;
  targetViewpoint: Viewpoint;
  counterArguments: CounterArgument[];
  unexpaminedAssumptions: UnexaminedAssumption[];
  edgeCases: EdgeCase[];
  probingQuestions: ProbingQuestion[];
  overallChallengeStrength: number; // 0-1: strength of total challenge
  fairnessScore: number; // 0-1: how fair/honest the challenge is
  timestamp: number;
}

class StrongManningService {
  private static instance: StrongManningService;
  private analysisCache = new Map<string, StrongMannedAnalysis>();
  private analysisCounter = 0;

  private constructor() {}

  static getInstance(): StrongManningService {
    if (!StrongManningService.instance) {
      StrongManningService.instance = new StrongManningService();
    }
    return StrongManningService.instance;
  }

  /**
   * Generate strongest possible arguments against a viewpoint
   */
  async strongManViewpoint(viewpoint: Viewpoint): Promise<StrongMannedAnalysis> {
    const analysisId = `strong-man-${this.analysisCounter++}-${Date.now()}`;

    // Generate counterarguments for each argument in the viewpoint
    const counterArguments = await this.generateCounterArguments(
      viewpoint.arguments
    );

    // Surface unexamined assumptions
    const unexpaminedAssumptions = await this.findUnexaminedAssumptions(
      viewpoint
    );

    // Find edge cases where the viewpoint might fail
    const edgeCases = await this.findEdgeCases(
      viewpoint.position,
      viewpoint.arguments
    );

    // Generate probing questions
    const probingQuestions = await this.generateProbingQuestions(
      viewpoint,
      unexpaminedAssumptions,
      edgeCases
    );

    // Calculate scores
    const overallChallengeStrength = this.calculateChallengeStrength(
      counterArguments,
      unexpaminedAssumptions,
      edgeCases
    );

    const fairnessScore = this.calculateFairnessScore(
      counterArguments,
      unexpaminedAssumptions
    );

    const analysis: StrongMannedAnalysis = {
      id: analysisId,
      targetViewpoint: viewpoint,
      counterArguments,
      unexpaminedAssumptions,
      edgeCases,
      probingQuestions,
      overallChallengeStrength,
      fairnessScore,
      timestamp: Date.now(),
    };

    this.analysisCache.set(analysisId, analysis);
    return analysis;
  }

  /**
   * Generate the strongest counterarguments for given arguments
   */
  private async generateCounterArguments(
    arguments_: Argument[]
  ): Promise<CounterArgument[]> {
    const counterArguments: CounterArgument[] = [];
    let counterCounter = 0;

    for (const arg of arguments_) {
      // Generate multiple counterargument types
      const logicalChallenge = await this.generateLogicalChallenge(arg);
      if (logicalChallenge) {
        counterArguments.push({
          ...logicalChallenge,
          id: `counter-${counterCounter++}`,
          targetStatement: arg.statement,
          fairnessScore: 0.8,
        });
      }

      const empiricalChallenge = await this.generateEmpiricalChallenge(arg);
      if (empiricalChallenge) {
        counterArguments.push({
          ...empiricalChallenge,
          id: `counter-${counterCounter++}`,
          targetStatement: arg.statement,
          fairnessScore: 0.85,
        });
      }

      const valueChallenge = await this.generateValueChallenge(arg);
      if (valueChallenge) {
        counterArguments.push({
          ...valueChallenge,
          id: `counter-${counterCounter++}`,
          targetStatement: arg.statement,
          fairnessScore: 0.75,
        });
      }

      // Generate potential response to show we're not strawmanning
      for (const counterArg of counterArguments.slice(-3)) {
        counterArg.potentialResponse = await this.generatePotentialResponse(
          arg,
          counterArg
        );
      }
    }

    return counterArguments;
  }

  /**
   * Generate logical challenges to an argument
   */
  private async generateLogicalChallenge(arg: Argument): Promise<Partial<CounterArgument> | null> {
    const statement = arg.statement.toLowerCase();

    // Check for common logical fallacies
    if (this.hasAppealsToAuthority(statement)) {
      return {
        statement: `While ${arg.statement} is presented as authoritative, the argument may rely too heavily on the credibility of the source rather than the strength of the reasoning itself. What is the underlying logical basis independent of who said it?`,
        evidence: ['logical structure'],
        logicalForm: 'ad-hominem-reversal',
        strength: 0.75,
        counterType: 'logical-fallacy',
      };
    }

    if (this.hasFalseBinary(statement)) {
      return {
        statement: `The statement "${arg.statement}" may present a false binary. There could be alternatives between or beyond the two positions presented.`,
        logicalForm: 'false-dilemma',
        strength: 0.7,
        counterType: 'logical-fallacy',
      };
    }

    if (this.hasBeggingTheQuestion(statement)) {
      return {
        statement: `The argument "${arg.statement}" may assume the conclusion it's trying to prove, rather than independently establishing its truth.`,
        logicalForm: 'circular',
        strength: 0.65,
        counterType: 'logical-fallacy',
      };
    }

    if (this.hasCompositionFallacy(statement)) {
      return {
        statement: `While true of individual cases, "${arg.statement}" may not hold when scaled or applied collectively.`,
        logicalForm: 'composition',
        strength: 0.68,
        counterType: 'logical-fallacy',
      };
    }

    return null;
  }

  /**
   * Generate empirical challenges to an argument
   */
  private async generateEmpiricalChallenge(arg: Argument): Promise<Partial<CounterArgument> | null> {
    // Check if argument makes empirical claims
    if (!/\d+|percent|study|research|data|evidence|shown|found/i.test(arg.statement)) {
      return null;
    }

    // Generate challenges to empirical claims
    const challenges = [
      {
        statement: `The claim "${arg.statement}" lacks specific citation. What is the source of this empirical evidence? Is it peer-reviewed? How recent?`,
        strength: 0.72,
      },
      {
        statement: `While the evidence for "${arg.statement}" may exist, contrary evidence also exists. This represents one perspective on contested empirical ground.`,
        strength: 0.68,
      },
      {
        statement: `The generalization in "${arg.statement}" may not hold across all contexts or populations. Geographic, temporal, or demographic factors could change the conclusion.`,
        strength: 0.7,
      },
    ];

    const randomChallenge =
      challenges[Math.floor(Math.random() * challenges.length)];

    return {
      ...randomChallenge,
      evidence: ['requires-verification'],
      logicalForm: 'empirical-claim',
      counterType: 'empirical-challenge',
    };
  }

  /**
   * Generate value/priority challenges to an argument
   */
  private async generateValueChallenge(arg: Argument): Promise<Partial<CounterArgument> | null> {
    const statement = arg.statement.toLowerCase();

    const valueKeywords = [
      'important',
      'should',
      'must',
      'must not',
      'valuable',
      'worth',
      'better',
      'best',
      'right',
      'wrong',
      'good',
      'bad',
      'prefer',
    ];

    if (!valueKeywords.some((kw) => statement.includes(kw))) {
      return null;
    }

    return {
      statement: `While "${arg.statement}" reflects one set of values, different values might lead to a different conclusion. What trade-offs are being made? Whose values are being prioritized?`,
      logicalForm: 'value-laden',
      strength: 0.72,
      counterType: 'value-conflict',
      evidence: ['values-dependent'],
    };
  }

  /**
   * Find assumptions the viewpoint doesn't examine
   */
  private async findUnexaminedAssumptions(
    viewpoint: Viewpoint
  ): Promise<UnexaminedAssumption[]> {
    const assumptions: UnexaminedAssumption[] = [];

    // Every argument has implicit assumptions
    const universalAssumptions: UnexaminedAssumption[] = [
      {
        assumption: 'The problem being addressed is correctly framed',
        whyAssumed: 'Viewpoint treats the frame as given',
        challengeStatement:
          'The framing of this issue determines what solutions are possible. Different frames might suggest different approaches.',
        isExplicit: false,
        importance: 0.9,
      },
      {
        assumption:
          'The values prioritized are the right ones to prioritize',
        whyAssumed: "Implicit in viewpoint's recommendations",
        challengeStatement:
          'What values are being sacrificed to achieve the stated goals? Are those trade-offs acceptable?',
        isExplicit: false,
        importance: 0.85,
      },
      {
        assumption: 'The future will resemble the past in relevant ways',
        whyAssumed: 'Reasoning based on current understanding',
        challengeStatement:
          'Rapid change could invalidate assumptions about how the system will behave.',
        isExplicit: false,
        importance: 0.7,
      },
    ];

    assumptions.push(...universalAssumptions);

    // Extract specific assumptions from arguments
    for (const arg of viewpoint.arguments) {
      const specificAssumptions = this.extractArgumentAssumptions(arg);
      assumptions.push(...specificAssumptions);
    }

    return assumptions.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Extract assumptions from a specific argument
   */
  private extractArgumentAssumptions(arg: Argument): UnexaminedAssumption[] {
    const assumptions: UnexaminedAssumption[] = [];
    const statement = arg.statement.toLowerCase();

    // Causality assumptions
    if (statement.includes('because') || statement.includes('therefore')) {
      assumptions.push({
        assumption: 'The causal relationship is correctly identified',
        whyAssumed: 'Argument asserts causal connection',
        challengeStatement:
          'Correlation is not causation. What other factors might explain the relationship?',
        isExplicit: true,
        importance: 0.8,
      });
    }

    // Generality assumptions
    if (statement.includes('all') || statement.includes('always')) {
      assumptions.push({
        assumption: 'This applies universally without exception',
        whyAssumed: 'Universal claim made',
        challengeStatement:
          'Are there edge cases or exceptions? What are the boundary conditions?',
        isExplicit: true,
        importance: 0.75,
      });
    }

    // Necessity assumptions
    if (
      statement.includes('must') ||
      statement.includes('required') ||
      statement.includes('necessary')
    ) {
      assumptions.push({
        assumption: 'No alternative approaches exist',
        whyAssumed: 'Claims necessity',
        challengeStatement:
          'What alternatives have been considered and rejected? Why are they inferior?',
        isExplicit: true,
        importance: 0.8,
      });
    }

    return assumptions;
  }

  /**
   * Find edge cases where the viewpoint might fail
   */
  private async findEdgeCases(
    position: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _arguments_: Argument[]
  ): Promise<EdgeCase[]> {
    const edgeCases: EdgeCase[] = [];

    // Common edge case patterns
    const edgeCasePatterns = [
      {
        scenario: 'Extreme scaling',
        description:
          'When scaled to extreme levels (very large, very small, very different context)',
        severity: 'significant' as const,
      },
      {
        scenario: 'Temporal edge case',
        description: 'Over long time horizons or during rapid change',
        severity: 'significant' as const,
      },
      {
        scenario: 'Adversarial conditions',
        description:
          'When someone is actively trying to circumvent or exploit the system',
        severity: 'critical' as const,
      },
      {
        scenario: 'Resource constraints',
        description: 'When resources are extremely limited',
        severity: 'significant' as const,
      },
      {
        scenario: 'Value conflicts',
        description: 'When core values clash with the recommendation',
        severity: 'critical' as const,
      },
    ];

    for (const pattern of edgeCasePatterns) {
      const wouldHold = !this.wouldPositionFailUnder(
        position,
        pattern.scenario
      );

      edgeCases.push({
        scenario: pattern.scenario,
        description: pattern.description,
        wouldOriginalPositionHold: wouldHold,
        reasoning: wouldHold
          ? `The position appears robust to ${pattern.scenario}`
          : `The position may not hold under ${pattern.scenario}`,
        severity: pattern.severity,
      });
    }

    return edgeCases;
  }

  /**
   * Generate probing questions that expose assumptions or weaknesses
   */
  private async generateProbingQuestions(
    viewpoint: Viewpoint,
    assumptions: UnexaminedAssumption[],
    edgeCases: EdgeCase[]
  ): Promise<ProbingQuestion[]> {
    const questions: ProbingQuestion[] = [];

    // Questions about assumptions
    for (const assumption of assumptions.slice(0, 3)) {
      questions.push({
        question: `You assume that ${assumption.assumption.toLowerCase()}. How would your position change if this assumption were false?`,
        reasoning: `Tests the dependency of the argument on this assumption`,
        revealsProblem: assumption.importance > 0.7,
        difficulty: 0.7,
      });
    }

    // Questions about edge cases
    for (const edgeCase of edgeCases.filter((e) => !e.wouldOriginalPositionHold)) {
      questions.push({
        question: `How would your recommendation apply in a scenario with ${edgeCase.scenario.toLowerCase()}?`,
        reasoning: `Explores whether the position breaks down under edge conditions`,
        revealsProblem: edgeCase.severity === 'critical',
        difficulty: 0.75,
      });
    }

    // Meta-questions about the reasoning
    questions.push({
      question:
        'What would convince you that your position was wrong? What evidence or argument would change your mind?',
      reasoning: 'Tests epistemic openness and identifies falsifiability',
      revealsProblem: false,
      difficulty: 0.85,
    });

    questions.push({
      question:
        'What are the strongest arguments against your position, in your view? Have you engaged with them fairly?',
      reasoning: 'Tests whether the person has steel-manned the opposition',
      revealsProblem: false,
      difficulty: 0.8,
    });

    return questions;
  }

  /**
   * Generate a potential response the original argument might make to the counter
   */
  private async generatePotentialResponse(
    originalArg: Argument,
    counterArg: CounterArgument
  ): Promise<string> {
    const responses: Record<string, string> = {
      'logical-fallacy': `The original argument might respond: "Your critique of the logical form doesn't address the actual substance. Even if imperfectly argued, the conclusion could still be true on other grounds."`,
      'empirical-challenge': `The original argument might respond: "While I could provide more citations, the basic point has strong empirical support. The burden is on the challenger to provide conflicting evidence."`,
      'value-conflict': `The original argument might respond: "You're right that different values could lead to different conclusions. However, these particular values are important because..."`,
      'assumption-challenge': `The original argument might respond: "That assumption is reasonable precisely because... Here's why that foundation is solid."`,
      'edge-case': `The original argument might respond: "The edge case is so rare/unlikely that it doesn't undermine the general principle. The position holds in ordinary circumstances."`,
      'practical-problem': `The original argument might respond: "While the practical challenge exists, it's a matter of implementation, not a flaw in the basic logic."`,
    };

    return (
      responses[counterArg.counterType] ||
      responses['assumption-challenge']
    );
  }

  /**
   * Check for appeal to authority (ad populum, appeal to tradition, etc.)
   */
  private hasAppealsToAuthority(statement: string): boolean {
    const patterns = [
      /expert|authority|scientist|research.*found|study.*showed|according to|evidence shows|proven/i,
    ];
    return patterns.some((p) => p.test(statement));
  }

  /**
   * Check for false binary (either/or)
   */
  private hasFalseBinary(statement: string): boolean {
    const patterns = [/either.*or|only.*or|must choose|one or the other/i];
    return patterns.some((p) => p.test(statement));
  }

  /**
   * Check for begging the question (circular reasoning)
   */
  private hasBeggingTheQuestion(statement: string): boolean {
    // Simplified check: statements that are tautological
    const patterns = [
      /is what it is|obviously|clearly|self-evident|naturally|of course/i,
    ];
    return patterns.some((p) => p.test(statement));
  }

  /**
   * Check for composition fallacy (part-to-whole error)
   */
  private hasCompositionFallacy(statement: string): boolean {
    const patterns = [/each|every|all.*individuals|individually/i];
    return patterns.some((p) => p.test(statement));
  }

  /**
   * Check if position would fail under given scenario
   */
  private wouldPositionFailUnder(position: string, scenario: string): boolean {
    const scenarioFailureIndicators: Record<string, RegExp> = {
      'Extreme scaling': /small|limited|few|particular/i,
      'Temporal edge case': /short term|recent|current|now|quick/i,
      'Adversarial conditions': /trust|honest|good faith|assumes/i,
      'Resource constraints': /abundant|unlimited|available|plenty/i,
      'Value conflicts': /efficient|optimal|best|always/i,
    };

    const indicator = scenarioFailureIndicators[scenario];
    if (!indicator) return false;

    // If the position seems optimistic/assumes favorable conditions, it might fail adversarially
    return scenario === 'Adversarial conditions'
      ? /trust|assume|honest|good|cooperat/i.test(position)
      : indicator.test(position);
  }

  /**
   * Calculate overall challenge strength
   */
  private calculateChallengeStrength(
    counterArguments: CounterArgument[],
    assumptions: UnexaminedAssumption[],
    edgeCases: EdgeCase[]
  ): number {
    let strength = 0.3; // Base strength

    // Add from strong counter arguments
    const strongCounters = counterArguments.filter((c) => c.strength > 0.7);
    strength += Math.min(0.3, (strongCounters.length / 5) * 0.3);

    // Add from important unexamined assumptions
    const importantAssumptions = assumptions.filter((a) => a.importance > 0.75);
    strength += Math.min(0.25, (importantAssumptions.length / 4) * 0.25);

    // Add from critical edge cases
    const criticalCases = edgeCases.filter(
      (e) => e.severity === 'critical' && !e.wouldOriginalPositionHold
    );
    strength += Math.min(0.15, (criticalCases.length / 2) * 0.15);

    return Math.min(0.95, strength);
  }

  /**
   * Calculate fairness score (how honest and fair the challenge is)
   */
  private calculateFairnessScore(
    counterArguments: CounterArgument[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _assumptions: UnexaminedAssumption[]
  ): number {
    // Fairness is based on:
    // 1. Are we representing the strongest version of the opposition?
    // 2. Are we acknowledging valid points?
    // 3. Are we avoiding strawmanning?

    const avgFairnessInCounters =
      counterArguments.reduce((sum, c) => sum + c.fairnessScore, 0) /
      Math.max(1, counterArguments.length);

    // High fairness if we have potential responses (showing we understand opposing view)
    const hasResponses = counterArguments.some((c) => c.potentialResponse);
    const responseBonus = hasResponses ? 0.1 : 0;

    return Math.min(0.95, avgFairnessInCounters * 0.7 + 0.25 + responseBonus);
  }

  /**
   * Get cached analysis
   */
  getAnalysis(analysisId: string): StrongMannedAnalysis | undefined {
    return this.analysisCache.get(analysisId);
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.analysisCache.clear();
    this.analysisCounter = 0;
  }
}

export const strongManning = StrongManningService.getInstance();
