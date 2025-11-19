/**
 * Stoic & Objective Response Style
 *
 * Implements Stoic philosophy and CBT-based objective response patterns.
 * Useful when users need clarity, perspective, and reality-grounded thinking.
 *
 * Core Principles:
 * - Distinguish between what's within control vs. outside control
 * - Focus on values and virtue
 * - Reframe challenging thoughts logically
 * - Build resilience through acceptance
 * - Find meaning in difficulty
 *
 * Cognitive Reframing:
 * - Identify cognitive distortions
 * - Provide alternative perspectives
 * - Use evidence-based reasoning
 * - Acknowledge reality without catastrophizing
 */

import { EmotionalState, PrimaryEmotion } from './advanced-emotion-detection.service';

export interface StoicResponse {
  userId: string;
  primaryStatement: string;
  perspectiveShift: PerspectiveShift;
  controlAnalysis: ControlAnalysis;
  cognitiveReframe: CognitiveReframe;
  valueAlignment: ValueAlignment;
  actionableInsight: string;
  timeframe: string;
}

export interface PerspectiveShift {
  originalThought: string;
  shorterPerspective: string;
  longerPerspective: string;
  philosophicalFramework: string;
}

export interface ControlAnalysis {
  withinControl: string[];
  outsideControl: string[];
  focusAreas: string[];
  acceptanceAreas: string[];
}

export interface CognitiveReframe {
  distortion: string;
  logicalChallenge: string;
  alternativeThought: string;
  evidence: string;
}

export interface ValueAlignment {
  identifiedValue: string;
  howChallengeTestsValue: string;
  virtuousResponse: string;
  characterGrowth: string;
}

/**
 * StoicObjectiveResponseStyleService
 *
 * Generates stoic, objective responses
 */
class StoicObjectiveResponseStyleService {
  private stoicPrinciples: Map<string, string[]> = new Map();
  private controlVocabulary: Map<string, string[]> = new Map();
  private virtues: Map<string, string> = new Map();

  constructor() {
    this.initializeFramework();
  }

  /**
   * Initialize Stoic framework
   */
  private initializeFramework(): void {
    // Stoic principles by emotion
    this.stoicPrinciples.set('sadness', [
      'This suffering is impermanent. All things pass.',
      'Focus on what is within your control: your response.',
      'Your pain reveals what you value. That is not weakness.',
      'The goal is not to avoid pain, but to face it with virtue.',
      'This moment will become the past. What matters is what you do now.',
    ]);

    this.stoicPrinciples.set('anger', [
      'Anger wastes your energy on things outside your control.',
      'The other person\'s actions are their responsibility, yours is your response.',
      'Choose to respond with integrity, not reaction.',
      'This is an opportunity to demonstrate your virtue.',
      'What would the wisest version of you do right now?',
    ]);

    this.stoicPrinciples.set('fear', [
      'You are more resilient than you believe. You\'ve handled 100% of difficulties so far.',
      'Fear is natural. Acting despite fear is courageous.',
      'Focus on what you can prepare for. Accept what you cannot control.',
      'The worst case has a high probability of being survivable.',
      'Clarity comes from logic, not fear.',
    ]);

    this.stoicPrinciples.set('anxiety', [
      'Anxiety is worry about what hasn\'t happened. Reality is now.',
      'Distinguish between real problems and imagined ones.',
      'You have survived every difficult moment up to now.',
      'Action reduces anxiety. What can you do?',
      'Excessive worry steals joy from today. Don\'t let it.',
    ]);

    // Control vocabulary
    this.controlVocabulary.set('within', [
      'your thoughts and interpretations',
      'your effort and commitment',
      'your values and principles',
      'your responses and reactions',
      'your character and virtue',
      'your acceptance of reality',
      'your focus and attention',
      'your persistence',
    ]);

    this.controlVocabulary.set('outside', [
      'other people\'s actions',
      'external circumstances',
      'the past',
      'outcomes',
      'what others think',
      'events happening to you',
      'economic conditions',
      'timing and luck',
    ]);

    // Virtues
    this.virtues.set('courage', 'Facing difficulty with integrity despite fear');
    this.virtues.set('wisdom', 'Seeing clearly and acting according to reason');
    this.virtues.set('justice', 'Treating others fairly and maintaining integrity');
    this.virtues.set('temperance', 'Maintaining balance and self-control');
  }

  /**
   * Generate Stoic response
   */
  generateStoicResponse(userId: string, emotionalState: EmotionalState, situation: string): StoicResponse {
    const emotion = this.mapEmotionToStoicCategory(emotionalState.primaryEmotion);

    // Generate perspective shifts
    const perspectiveShift = this.createPerspectiveShift(situation, emotionalState);

    // Analyze control
    const controlAnalysis = this.analyzeControl(situation);

    // Create cognitive reframe
    const cognitiveReframe = this.createCognitiveReframe(emotionalState);

    // Identify value alignment
    const valueAlignment = this.identifyValueAlignment(emotionalState, situation);

    // Generate actionable insight
    const actionableInsight = this.generateActionableInsight(
      controlAnalysis.focusAreas,
      emotionalState.primaryEmotion
    );

    // Determine timeframe
    const timeframe = this.determineTimeframe(emotionalState.intensityScore);

    // Assemble primary statement
    const primaryStatement = this.assemblePrimaryStoicStatement(emotion, perspectiveShift, situation);

    console.log(
      `[StoicObjectiveResponse] 🏛️ Generated Stoic response for user ${userId} ` +
      `(emotion: ${emotionalState.primaryEmotion}, value: ${valueAlignment.identifiedValue})`
    );

    return {
      userId,
      primaryStatement,
      perspectiveShift,
      controlAnalysis,
      cognitiveReframe,
      valueAlignment,
      actionableInsight,
      timeframe,
    };
  }

  /**
   * Map emotion to Stoic category
   */
  private mapEmotionToStoicCategory(emotion: PrimaryEmotion): string {
    const mapping: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'sadness',
      [PrimaryEmotion.ANGER]: 'anger',
      [PrimaryEmotion.FEAR]: 'fear',
      [PrimaryEmotion.SURPRISE]: 'fear',  // Surprise treated as fear initially
      [PrimaryEmotion.DISGUST]: 'anger',  // Disgust treated as anger
      [PrimaryEmotion.JOY]: 'wisdom',
      [PrimaryEmotion.NEUTRAL]: 'wisdom',
    };

    return mapping[emotion];
  }

  /**
   * Create perspective shift
   */
  private createPerspectiveShift(situation: string, state: EmotionalState): PerspectiveShift {
    const shifts: Record<string, PerspectiveShift> = {
      'sadness': {
        originalThought: 'This will never get better. I\'m broken.',
        shorterPerspective: 'This is hard right now. This will change.',
        longerPerspective: 'This moment is temporary. I will carry this experience and grow.',
        philosophicalFramework: 'Stoicism: Acceptance of difficulty as part of life\'s nature',
      },
      'anger': {
        originalThought: 'This is unacceptable. It\'s all their fault.',
        shorterPerspective: 'This happened. I choose my response.',
        longerPerspective: 'I cannot control what happened, only how I respond. That\'s my power.',
        philosophicalFramework: 'Stoicism: Focus energy on what\'s within your control',
      },
      'fear': {
        originalThought: 'Everything could go wrong. I\'ll collapse.',
        shorterPerspective: 'Something might happen. I can handle it.',
        longerPerspective: 'I\'ve survived everything difficult so far. Fear is information, not truth.',
        philosophicalFramework: 'Stoicism: Distinguish real threats from imagined catastrophes',
      },
      'anxiety': {
        originalThought: 'What if, what if, what if...',
        shorterPerspective: 'Right now, I am okay.',
        longerPerspective: 'Anxiety shows me what I value. I can prepare without obsessing.',
        philosophicalFramework: 'Stoicism: Live in the present. The future hasn\'t happened.',
      },
    };

    const category = this.mapEmotionToStoicCategory(state.primaryEmotion);
    return shifts[category] || shifts['sadness'];
  }

  /**
   * Analyze what's within vs. outside control
   */
  private analyzeControl(situation: string): ControlAnalysis {
    const withinControl: string[] = [];
    const outsideControl: string[] = [];

    // Common patterns
    if (situation.toLowerCase().includes('other') || situation.toLowerCase().includes('them')) {
      withinControl.push('how you respond to their actions');
      withinControl.push('setting your own boundaries');
      withinControl.push('your integrity in the situation');
      outsideControl.push('their choices and behavior');
      outsideControl.push('their beliefs about you');
      outsideControl.push('their timeline');
    }

    if (situation.toLowerCase().includes('past') || situation.toLowerCase().includes('mistake')) {
      withinControl.push('what you learn from this');
      withinControl.push('who you choose to be going forward');
      withinControl.push('how you make amends if needed');
      outsideControl.push('what already happened');
      outsideControl.push('changing the past');
    }

    if (situation.toLowerCase().includes('outcome') || situation.toLowerCase().includes('result')) {
      withinControl.push('your effort and preparation');
      withinControl.push('your intention and values');
      withinControl.push('how you handle the result');
      outsideControl.push('whether you succeed');
      outsideControl.push('external variables');
      outsideControl.push('luck and timing');
    }

    // Defaults
    if (withinControl.length === 0) {
      withinControl.push(...this.controlVocabulary.get('within') || []);
    }
    if (outsideControl.length === 0) {
      outsideControl.push(...this.controlVocabulary.get('outside') || []);
    }

    return {
      withinControl,
      outsideControl,
      focusAreas: withinControl.slice(0, 3),
      acceptanceAreas: outsideControl.slice(0, 3),
    };
  }

  /**
   * Create cognitive reframe
   */
  private createCognitiveReframe(emotionalState: EmotionalState): CognitiveReframe {
    const emotion = emotionalState.primaryEmotion;

    const reframes: Record<PrimaryEmotion, CognitiveReframe> = {
      [PrimaryEmotion.SADNESS]: {
        distortion: 'All-or-nothing thinking: "Everything is ruined"',
        logicalChallenge: 'Is everything actually ruined? What still exists? What is salvageable?',
        alternativeThought: 'This part of my life is difficult. Other parts still exist and matter.',
        evidence: 'You still have capabilities, relationships, and future possibility.',
      },
      [PrimaryEmotion.ANGER]: {
        distortion: 'Personalization: "They deliberately hurt me"',
        logicalChallenge: 'Do you know their internal experience? Or are you assuming?',
        alternativeThought: 'They acted based on their own reasons. That doesn\'t define my worth.',
        evidence: 'Your worth is independent of anyone\'s actions toward you.',
      },
      [PrimaryEmotion.FEAR]: {
        distortion: 'Catastrophizing: "The worst will happen"',
        logicalChallenge: 'What\'s the actual probability? What\'s most likely to happen?',
        alternativeThought: 'Many outcomes are possible. Most are manageable.',
        evidence: 'You\'ve faced uncertainty before. You\'re still here.',
      },
      [PrimaryEmotion.SURPRISE]: {
        distortion: 'Shocked thinking: "This shouldn\'t have happened"',
        logicalChallenge: 'If reality happened this way, then by definition it could.',
        alternativeThought: 'This happened. Now I respond to what is, not what I expected.',
        evidence: 'Reality is what is. Acceptance is the first step.',
      },
      [PrimaryEmotion.DISGUST]: {
        distortion: 'Moral judgment: "This is unacceptable"',
        logicalChallenge: 'Is something actually wrong, or is it just different/difficult?',
        alternativeThought: 'I can acknowledge what troubles me while accepting reality.',
        evidence: 'Many difficult things are normal. Difficulty isn\'t abnormality.',
      },
      [PrimaryEmotion.JOY]: {
        distortion: 'None - joy is appropriate',
        logicalChallenge: 'Good. Enjoy this moment fully.',
        alternativeThought: 'This joy is real and deserved.',
        evidence: 'Happiness when things go well is reasonable and healthy.',
      },
      [PrimaryEmotion.NEUTRAL]: {
        distortion: 'None - neutrality is balanced',
        logicalChallenge: 'Stay grounded in reality.',
        alternativeThought: 'Stability is valuable. Use clarity productively.',
        evidence: 'Calm is a foundation for good decisions.',
      },
    };

    return reframes[emotion] || reframes[PrimaryEmotion.SADNESS];
  }

  /**
   * Identify value alignment
   */
  private identifyValueAlignment(emotionalState: EmotionalState, situation: string): ValueAlignment {
    // Map emotions to values tested
    const valueMapping: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'courage',      // Courage to face loss
      [PrimaryEmotion.ANGER]: 'justice',        // Justice when wronged
      [PrimaryEmotion.FEAR]: 'courage',         // Courage facing threat
      [PrimaryEmotion.SURPRISE]: 'wisdom',      // Wisdom integrating new reality
      [PrimaryEmotion.DISGUST]: 'temperance',   // Temperance and boundaries
      [PrimaryEmotion.JOY]: 'wisdom',           // Wisdom appreciating good
      [PrimaryEmotion.NEUTRAL]: 'temperance',   // Temperance in balance
    };

    const value = valueMapping[emotionalState.primaryEmotion];

    return {
      identifiedValue: value,
      howChallengeTestsValue: `This situation tests your ${value}. How you respond defines who you are.`,
      virtuousResponse: `Respond with ${value}. Act as the best version of yourself would act.`,
      characterGrowth: `Your character is built through difficult moments. This is an opportunity.`,
    };
  }

  /**
   * Generate actionable insight
   */
  private generateActionableInsight(focusAreas: string[], emotion: PrimaryEmotion): string {
    if (focusAreas.length === 0) {
      focusAreas = ['your response', 'your effort', 'your values'];
    }

    const actionMap: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: `Focus your energy on ${focusAreas[0]}. Grief is a process. Give it time, but don't let it consume your agency.`,
      [PrimaryEmotion.ANGER]: `Channel this into ${focusAreas[0]}. Anger can fuel positive change when directed wisely.`,
      [PrimaryEmotion.FEAR]: `Prepare for what you can control in ${focusAreas[0]}. Then accept what you cannot.`,
      [PrimaryEmotion.SURPRISE]: `Use clarity to rebuild. Focus on ${focusAreas[0]} as you adapt.`,
      [PrimaryEmotion.DISGUST]: `Set boundaries and redirect toward ${focusAreas[0]}. You control your standards.`,
      [PrimaryEmotion.JOY]: `Savor this. The wisdom here is knowing good things are real and valuable.`,
      [PrimaryEmotion.NEUTRAL]: `Stability allows for good decisions. Use this clarity for ${focusAreas[0]}.`,
    };

    return actionMap[emotion];
  }

  /**
   * Determine timeframe
   */
  private determineTimeframe(intensity: number): string {
    if (intensity > 0.8) {
      return '2-4 weeks (healing from intense emotion takes time)';
    } else if (intensity > 0.5) {
      return '1-2 weeks (allow yourself this processing time)';
    } else {
      return '3-7 days (perspective often comes quickly)';
    }
  }

  /**
   * Assemble primary Stoic statement
   */
  private assemblePrimaryStoicStatement(
    emotion: string,
    perspective: PerspectiveShift,
    situation: string
  ): string {
    const principles = this.stoicPrinciples.get(emotion) || this.stoicPrinciples.get('sadness');
    const principle = principles?.[Math.floor(Math.random() * principles.length)] || 'This is an opportunity to grow.';

    return `${principle}\n\n${perspective.shorterPerspective}`;
  }

  /**
   * Get dichotomy of control explanation
   */
  getDictomyOfControl(situation: string): string {
    return `The Dichotomy of Control (Epictetus):\n\n` +
      `WITHIN YOUR CONTROL:\n` +
      `• Your judgments and interpretations\n` +
      `• Your desires and aversions\n` +
      `• Your effort and intention\n` +
      `• Your character and virtue\n\n` +
      `OUTSIDE YOUR CONTROL:\n` +
      `• Your body and health outcomes\n` +
      `• Wealth and status\n` +
      `• Others' opinions\n` +
      `• External events\n\n` +
      `Focus your energy on what's within your control. Accept what isn't with grace.`;
  }

  /**
   * Generate philosophical perspective
   */
  generatePhilosophicalPerspective(emotion: PrimaryEmotion): string {
    const perspectives: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: `Marcus Aurelius wrote: "Confine yourself to the present." Your pain is real, and temporary. This too shall pass.`,
      [PrimaryEmotion.ANGER]: `Epictetus taught: "It is impossible for a person to be free while enslaved to anger." Choose your response.`,
      [PrimaryEmotion.FEAR]: `Seneca said: "Anticipatory suffering is worse than suffering itself." Many fears exist only in imagination.`,
      [PrimaryEmotion.SURPRISE]: `The Stoics taught acceptance of nature's course. Reality is what is. Respond with wisdom.`,
      [PrimaryEmotion.DISGUST]: `Virtue is choosing integrity regardless of circumstances. Your standards are yours to set.`,
      [PrimaryEmotion.JOY]: `Appreciate good fortune, but remember it may pass. This moment is real. Enjoy it fully.`,
      [PrimaryEmotion.NEUTRAL]: `Tranquility comes from clear thinking and virtuous action. Maintain this foundation.`,
    };

    return perspectives[emotion];
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[StoicObjectiveResponse] 🔄 Service reset');
  }
}

// Export singleton instance
export const stoicObjectiveResponseStyleService = new StoicObjectiveResponseStyleService();
