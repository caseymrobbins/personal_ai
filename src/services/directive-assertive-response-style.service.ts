/**
 * Directive & Assertive Response Style
 *
 * Implements goal-oriented, action-focused response patterns.
 * Useful when users need clear direction, problem-solving, and empowerment.
 *
 * Core Approach:
 * - Problem identification and breakdown
 * - Clear action steps and priorities
 * - Accountability and progress tracking
 * - Empowerment through agency
 * - Remove obstacles and barriers
 * - Build momentum through wins
 *
 * Assertiveness Skills:
 * - Clear boundary setting
 * - Direct communication
 * - "I" statements with conviction
 * - Say no without guilt
 * - Ask directly for what's needed
 */

import { EmotionalState, PrimaryEmotion } from './advanced-emotion-detection.service';

export interface DirectiveResponse {
  userId: string;
  problemStatement: string;
  situationAnalysis: SituationAnalysis;
  actionPlan: ActionPlan;
  assertivenessGuidance: AssertivenesGuidance;
  empowermentMessage: string;
  successMetrics: SuccessMetric[];
}

export interface SituationAnalysis {
  coreIssue: string;
  rootCause: string;
  immediateObstacles: string[];
  systemic_factors: string[];
  userAgency: string[];
}

export interface ActionPlan {
  shortTerm: ActionStep[];
  mediumTerm: ActionStep[];
  longTerm: ActionStep[];
  priorityOrder: number[];
  estimatedTimeline: string;
}

export interface ActionStep {
  step: number;
  action: string;
  outcome: string;
  deadline: string;
  success_criteria: string[];
  potential_obstacles: string[];
  backup_plans: string[];
}

export interface AssertivenesGuidance {
  boundary: string;
  assertiveStatement: string;
  scriptExample: string;
  handleRejection: string;
  maintainComfort: string;
}

export interface SuccessMetric {
  metric: string;
  current_state: string;
  target_state: string;
  measurement: string;
}

/**
 * DirectiveAssertiveResponseStyleService
 *
 * Generates directive, action-oriented responses
 */
class DirectiveAssertiveResponseStyleService {
  private assertivePatterns: Map<string, string[]> = new Map();
  private actionFrameworks: Map<string, string[]> = new Map();
  private boundaryLanguage: Map<string, string[]> = new Map();

  constructor() {
    this.initializeFramework();
  }

  /**
   * Initialize directive framework
   */
  private initializeFramework(): void {
    // Assertive statements templates
    this.assertivePatterns.set('boundary', [
      'I need you to [specific action]. Here\'s why: [reason].',
      'That doesn\'t work for me. I need [what you need].',
      'I\'ve decided to [action]. I wanted to be direct about it.',
      'My boundary is [boundary]. I\'m telling you directly.',
      'I\'m going to [action]. I\'m not asking permission.',
    ]);

    this.assertivePatterns.set('request', [
      'I need [specific request] by [deadline].',
      'Here\'s what I\'m asking for: [specific request].',
      'I\'m asking you directly: [request]?',
      'I need you to commit to [action].',
      'Can you do [specific action]? I need a yes or no.',
    ]);

    this.assertivePatterns.set('rejection', [
      'No. I don\'t need to explain.',
      'That doesn\'t work for me. The answer is no.',
      'I\'ve decided not to do that.',
      'No is my final answer.',
      'I appreciate the offer, but I\'m going to decline.',
    ]);

    // Action frameworks
    this.actionFrameworks.set('problem-solving', [
      'Define the problem clearly',
      'Identify what you can control',
      'Break into smaller, actionable steps',
      'Set deadlines for each step',
      'Identify resources needed',
      'Execute with focus',
      'Track progress weekly',
      'Adjust as needed',
    ]);

    this.actionFrameworks.set('conflict-resolution', [
      'State your position clearly',
      'Listen to their perspective',
      'Find common ground',
      'Propose specific solutions',
      'Set boundaries if needed',
      'Establish next steps',
      'Follow up on commitments',
    ]);

    this.actionFrameworks.set('goal-achievement', [
      'Define your specific goal',
      'Identify the gap (where you are vs. where you want to be)',
      'Research options and strategies',
      'Choose your approach',
      'Create a timeline',
      'Take the first action TODAY',
      'Review progress weekly',
      'Iterate and improve',
    ]);

    // Boundary language
    this.boundaryLanguage.set('time', [
      'I can give you [time] and then I\'m done.',
      'My availability is [specific times]. Choose.',
      'I\'m not available for that right now.',
      'I need [time] to myself.',
      'Deadlines are [date]. Non-negotiable.',
    ]);

    this.boundaryLanguage.set('emotional', [
      'I\'m not responsible for managing your emotions.',
      'Your feelings are yours to handle.',
      'I can listen, but I can\'t fix this for you.',
      'I\'m not the right person for this.',
      'You need professional support, not me trying to fix it.',
    ]);

    this.boundaryLanguage.set('physical', [
      'Don\'t touch me. I mean it.',
      'I need [distance/space] from you right now.',
      'This is not acceptable behavior.',
      'If you do that again, I\'m leaving.',
      'My body is mine. Respect that.',
    ]);

    this.boundaryLanguage.set('financial', [
      'I\'m not lending you money. Full stop.',
      'I need to be paid by [date].',
      'These are my financial boundaries.',
      'I\'m not contributing to that.',
      'I have my own financial priorities.',
    ]);
  }

  /**
   * Generate directive response
   */
  generateDirectiveResponse(
    userId: string,
    emotionalState: EmotionalState,
    problemDescription: string
  ): DirectiveResponse {
    // Analyze the situation
    const situationAnalysis = this.analyzeSituation(problemDescription, emotionalState);

    // Create action plan
    const actionPlan = this.createActionPlan(situationAnalysis, emotionalState);

    // Provide assertiveness guidance
    const assertivenessGuidance = this.provideAssertivenesGuidance(situationAnalysis);

    // Create empowerment message
    const empowermentMessage = this.createEmpowermentMessage(situationAnalysis, emotionalState);

    // Define success metrics
    const successMetrics = this.defineSuccessMetrics(situationAnalysis);

    console.log(
      `[DirectiveAssertiveResponse] 💪 Generated directive response for user ${userId} ` +
      `(core issue: ${situationAnalysis.coreIssue})`
    );

    return {
      userId,
      problemStatement: situationAnalysis.coreIssue,
      situationAnalysis,
      actionPlan,
      assertivenessGuidance,
      empowermentMessage,
      successMetrics,
    };
  }

  /**
   * Analyze situation
   */
  private analyzeSituation(problem: string, state: EmotionalState): SituationAnalysis {
    // Identify core issue
    const coreIssue = this.extractCoreIssue(problem);

    // Determine root cause
    const rootCause = this.determineRootCause(problem, state);

    // Identify obstacles
    const obstacles = this.identifyObstacles(problem);

    // System factors
    const systemicFactors = this.identifySystemicFactors(problem);

    // What user can control
    const userAgency = this.identifyUserAgency(problem, obstacles);

    return {
      coreIssue,
      rootCause,
      immediateObstacles: obstacles,
      systemic_factors: systemicFactors,
      userAgency,
    };
  }

  /**
   * Extract core issue
   */
  private extractCoreIssue(problem: string): string {
    const keywords = [
      'need', 'want', 'can\'t', 'won\'t', 'should', 'must',
      'problem', 'issue', 'struggle', 'stuck', 'difficult',
    ];

    // Find sentences with action words
    const sentences = problem.split(/[.!?]+/);
    const actionSentence = sentences.find(s =>
      keywords.some(k => s.toLowerCase().includes(k))
    );

    return (actionSentence || sentences[0]).trim();
  }

  /**
   * Determine root cause
   */
  private determineRootCause(problem: string, state: EmotionalState): string {
    const causes: Record<PrimaryEmotion, string[]> = {
      [PrimaryEmotion.ANGER]: [
        'Boundary has been violated',
        'Expectations aren\'t aligned',
        'Someone isn\'t following through',
        'Your needs aren\'t being respected',
        'Power imbalance is present',
      ],
      [PrimaryEmotion.SADNESS]: [
        'Loss or disappointment',
        'Unmet needs',
        'Disconnection from important things',
        'Low agency or control',
        'Lack of support',
      ],
      [PrimaryEmotion.FEAR]: [
        'Unknown or unclear situation',
        'Lack of preparation or planning',
        'Uncertainty about capability',
        'Real threat present',
        'Past trauma triggered',
      ],
      [PrimaryEmotion.SURPRISE]: [
        'Unexpected change',
        'Misalignment of expectations',
        'Lack of information',
        'No preparation time',
        'External factors shifted',
      ],
      [PrimaryEmotion.DISGUST]: [
        'Boundary violation',
        'Values conflict',
        'Ethical concern',
        'Unwanted imposition',
        'Loss of control',
      ],
      [PrimaryEmotion.JOY]: [
        'Something aligned with your goals',
        'Success achieved',
        'Connection strengthened',
        'Values honored',
        'Progress made',
      ],
      [PrimaryEmotion.NEUTRAL]: [
        'Situation is manageable',
        'No immediate crisis',
        'Time for strategic thinking',
        'Opportunity for proactive action',
        'Clarity available',
      ],
    };

    const options = causes[state.primaryEmotion] || causes[PrimaryEmotion.NEUTRAL];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Identify obstacles
   */
  private identifyObstacles(problem: string): string[] {
    const obstacles: string[] = [];

    if (problem.toLowerCase().includes('other') || problem.toLowerCase().includes('them')) {
      obstacles.push('Other people\'s behavior or resistance');
    }
    if (problem.toLowerCase().includes('lack') || problem.toLowerCase().includes('don\'t have')) {
      obstacles.push('Resource or capability gap');
    }
    if (problem.toLowerCase().includes('afraid') || problem.toLowerCase().includes('scared')) {
      obstacles.push('Fear or uncertainty');
    }
    if (problem.toLowerCase().includes('don\'t know') || problem.toLowerCase().includes('unclear')) {
      obstacles.push('Lack of information or clarity');
    }
    if (problem.toLowerCase().includes('time')) {
      obstacles.push('Time constraints');
    }

    return obstacles.length > 0 ? obstacles : ['Unclear obstacles - need to assess'];
  }

  /**
   * Identify systemic factors
   */
  private identifySystemicFactors(problem: string): string[] {
    const factors: string[] = [];

    // These are outside immediate control but context matters
    if (problem.toLowerCase().includes('money') || problem.toLowerCase().includes('financial')) {
      factors.push('Economic/financial system constraints');
    }
    if (problem.toLowerCase().includes('work') || problem.toLowerCase().includes('job')) {
      factors.push('Workplace dynamics and culture');
    }
    if (problem.toLowerCase().includes('family') || problem.toLowerCase().includes('relationship')) {
      factors.push('Relationship patterns and dynamics');
    }
    if (problem.toLowerCase().includes('system') || problem.toLowerCase().includes('rules')) {
      factors.push('Institutional or policy constraints');
    }

    return factors;
  }

  /**
   * Identify user agency areas
   */
  private identifyUserAgency(problem: string, obstacles: string[]): string[] {
    return [
      'Your decision-making and choices',
      'Your effort and commitment level',
      'Your communication and boundaries',
      'Your timeline and priorities',
      'Seeking resources and support',
      'Learning and skill development',
      'How you respond to obstacles',
    ];
  }

  /**
   * Create action plan
   */
  private createActionPlan(analysis: SituationAnalysis, state: EmotionalState): ActionPlan {
    const shortTerm: ActionStep[] = [
      {
        step: 1,
        action: 'Clarify exactly what you want or need (be specific)',
        outcome: 'Clear understanding of your goal',
        deadline: 'Today',
        success_criteria: ['Written down', 'Specific not vague', 'Measurable if possible'],
        potential_obstacles: ['Emotional overwhelm', 'Unclear thinking'],
        backup_plans: ['Take a break, return to this', 'Write without editing'],
      },
      {
        step: 2,
        action: 'Identify what you control vs. what you don\'t',
        outcome: 'Clear focus on actionable areas',
        deadline: 'Today',
        success_criteria: ['Listed what you can influence', 'Identified what to accept'],
        potential_obstacles: ['Desire to control everything', 'Learned helplessness'],
        backup_plans: ['Focus on one thing you can do', 'Ask for input from trusted person'],
      },
      {
        step: 3,
        action: 'Take ONE action today that moves toward your goal',
        outcome: 'Momentum and reduced helplessness',
        deadline: 'Today - before bed',
        success_criteria: ['Action taken', 'However small', 'Moving in right direction'],
        potential_obstacles: ['Perfectionism', 'Fear', 'Energy', 'Overwhelm'],
        backup_plans: ['Make action smaller', 'Do it despite fear', 'Ask for accountability buddy'],
      },
    ];

    const mediumTerm: ActionStep[] = [
      {
        step: 4,
        action: 'Create detailed action plan with deadlines',
        outcome: 'Roadmap for progress',
        deadline: 'This week',
        success_criteria: ['Steps are specific', 'Deadlines are set', 'Resources identified'],
        potential_obstacles: ['Analysis paralysis', 'Overwhelm'],
        backup_plans: ['Start with just 3 steps', 'Get help from mentor'],
      },
      {
        step: 5,
        action: 'Communicate your needs directly if others are involved',
        outcome: 'Clarity and alignment',
        deadline: 'This week',
        success_criteria: ['Clear communication', 'Boundary set if needed', 'Next steps agreed'],
        potential_obstacles: ['Fear of conflict', 'Guilt', 'Rejection anxiety'],
        backup_plans: ['Practice with trusted person first', 'Write it out', 'Set boundary anyway'],
      },
      {
        step: 6,
        action: 'Execute first week of plan',
        outcome: 'Proof that change is possible',
        deadline: 'This week',
        success_criteria: ['Committed to plan', 'Action taken', 'Progress made'],
        potential_obstacles: ['Resistance', 'Circumstances change', 'Doubt'],
        backup_plans: ['Adjust plan if needed', 'Keep commitment to yourself', 'Celebrate small wins'],
      },
    ];

    const longTerm: ActionStep[] = [
      {
        step: 7,
        action: 'Review progress weekly',
        outcome: 'Sustained momentum',
        deadline: 'Weekly for 4 weeks',
        success_criteria: ['Progress tracked', 'Adjustments made', 'Momentum maintained'],
        potential_obstacles: ['Losing focus', 'Old patterns returning', 'Setbacks'],
        backup_plans: ['Schedule weekly check-in', 'Join accountability group', 'Celebrate wins'],
      },
      {
        step: 8,
        action: 'Consolidate gains and build new habits',
        outcome: 'Sustainable change',
        deadline: '1-3 months',
        success_criteria: ['New normal established', 'Boundary held', 'Goal achieved or clear path'],
        potential_obstacles: ['Regression', 'Boredom', 'Complacency'],
        backup_plans: ['Return to commitment', 'Upgrade goals', 'Find new challenge'],
      },
    ];

    return {
      shortTerm,
      mediumTerm,
      longTerm,
      priorityOrder: [1, 2, 3, 4, 5, 6, 7, 8],
      estimatedTimeline: '8 weeks for significant progress',
    };
  }

  /**
   * Provide assertiveness guidance
   */
  private provideAssertivenesGuidance(analysis: SituationAnalysis): AssertivenesGuidance {
    const isConflict = analysis.immediateObstacles.some(o => o.toLowerCase().includes('people'));

    const boundary = isConflict
      ? 'Setting boundaries with the people involved'
      : 'Setting boundaries with yourself and circumstances';

    const templates = this.assertivePatterns.get('boundary') || [];
    const assertiveStatement = templates[Math.floor(Math.random() * templates.length)];

    const scriptExample = `"I\'ve thought about this carefully. Here\'s what I need: [your specific need]. I\'m not asking permission, I\'m being direct with you."`;

    const handleRejection = `If they resist: "I understand you might not like this, but this is my decision. I\'m not debating it. Here\'s what comes next..."`;

    const maintainComfort = `You might feel uncomfortable. That\'s normal when setting new boundaries. Do it anyway. You get comfortable by being uncomfortable first.`;

    return {
      boundary,
      assertiveStatement,
      scriptExample,
      handleRejection,
      maintainComfort,
    };
  }

  /**
   * Create empowerment message
   */
  private createEmpowermentMessage(analysis: SituationAnalysis, state: EmotionalState): string {
    const agencyPoints = analysis.userAgency.slice(0, 3).join(' | ');

    const messages = [
      `You have more power in this situation than you think. Focus on: ${agencyPoints}`,
      `This is fixable. You\'re not helpless. Here\'s what YOU can do: ${agencyPoints}`,
      `Stop waiting for permission. You can act. Start with: ${agencyPoints}`,
      `Your agency is here. Use it. Don\'t diminish yourself: ${agencyPoints}`,
      `You\'re capable of this. Believe it. Then act: ${agencyPoints}`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Define success metrics
   */
  private defineSuccessMetrics(analysis: SituationAnalysis): SuccessMetric[] {
    return [
      {
        metric: 'Clarity',
        current_state: 'Unclear or conflicted',
        target_state: 'Know exactly what you want',
        measurement: 'Can write it in one sentence',
      },
      {
        metric: 'Agency',
        current_state: 'Feeling powerless',
        target_state: 'Identify 3+ things you can control',
        measurement: 'Listed and starting to act',
      },
      {
        metric: 'Action',
        current_state: 'No movement',
        target_state: 'Taking deliberate steps toward goal',
        measurement: 'Actions completed this week',
      },
      {
        metric: 'Communication',
        current_state: 'Unexpressed needs/boundaries',
        target_state: 'Clear, direct communication',
        measurement: 'Conversations had, boundaries stated',
      },
      {
        metric: 'Progress',
        current_state: 'Stuck or going backward',
        target_state: 'Moving toward desired outcome',
        measurement: 'Measurable progress in 2-4 weeks',
      },
    ];
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[DirectiveAssertiveResponse] 🔄 Service reset');
  }
}

// Export singleton instance
export const directiveAssertiveResponseStyleService = new DirectiveAssertiveResponseStyleService();
