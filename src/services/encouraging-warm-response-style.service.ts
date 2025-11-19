/**
 * Encouraging & Warm Response Style
 *
 * Implements supportive, compassionate response patterns that build hope and resilience.
 * Useful when users need emotional warmth, encouragement, and belief in their capability.
 *
 * Core Approach:
 * - Unconditional positive regard
 * - Celebrate strengths and growth
 * - Build hope through past success
 * - Normalize struggle and difficulty
 * - Offer companionship and presence
 * - Recognize effort, not just outcomes
 * - Build self-compassion and self-efficacy
 * - Connect to meaning and purpose
 *
 * Warm Presence:
 * - Genuine empathy and understanding
 * - Recognition of pain AND capability
 * - Belief in recovery and growth
 * - Presence without trying to fix
 */

import { EmotionalState, PrimaryEmotion } from './advanced-emotion-detection.service';

export interface EncouragingResponse {
  userId: string;
  warmOpeningStatement: string;
  strengthAcknowledgement: StrengthAcknowledgement;
  hopeMessage: HopeMessage;
  companionshipMessage: string;
  growthOpportunity: GrowthOpportunity;
  affirmation: string;
}

export interface StrengthAcknowledgement {
  observedStrength: string;
  howYouSeeIt: string;
  howItShows: string;
  futureApplication: string;
}

export interface HopeMessage {
  recoveryAffirmation: string;
  pastSuccessConnection: string;
  possibilityStatement: string;
  timetableFrame: string;
}

export interface GrowthOpportunity {
  whatThisTaught: string;
  characterBuilding: string;
  futureResilience: string;
  meaningMaking: string;
}

/**
 * EncouragingWarmResponseStyleService
 *
 * Generates warm, encouraging responses
 */
class EncouragingWarmResponseStyleService {
  private warmMessages: Map<PrimaryEmotion, string[]> = new Map();
  private strengthPatterns: Map<PrimaryEmotion, string[]> = new Map();
  private recoveryMessages: Map<PrimaryEmotion, string[]> = new Map();

  constructor() {
    this.initializeWarmResponses();
  }

  /**
   * Initialize warm response library
   */
  private initializeWarmResponses(): void {
    // Warm opening messages by emotion
    this.warmMessages.set(PrimaryEmotion.SADNESS, [
      'I hear that you\'re carrying a lot of pain right now. That takes courage just to keep going.',
      'Your sadness shows how much you care. That\'s not weakness - that\'s depth.',
      'I see you\'re struggling. I want you to know: you\'re not alone, and this matters to me.',
      'What you\'re feeling is real and valid. I\'m here with you in this.',
      'Even in this darkness, the fact that you\'re reaching out shows strength.',
    ]);

    this.warmMessages.set(PrimaryEmotion.ANGER, [
      'Your anger makes sense. You\'re standing up for what matters.',
      'I see your passion and conviction. That\'s a strength, even in anger.',
      'You care deeply. That\'s why this is hitting you so hard.',
      'Your boundaries matter. Standing firm for them takes courage.',
      'This fire in you - it can lead to meaningful change.',
    ]);

    this.warmMessages.set(PrimaryEmotion.FEAR, [
      'You\'re facing something scary and you\'re still here. That\'s brave.',
      'Fear is natural. The fact that you\'re moving forward anyway shows real courage.',
      'I believe in your ability to handle this, even when you don\'t.',
      'You\'ve gotten through hard things before. You have more strength than you know.',
      'Let me be here with you while you face this.',
    ]);

    this.warmMessages.set(PrimaryEmotion.SURPRISE, [
      'Change is disorienting. Give yourself grace as you adjust.',
      'You\'re adapting to something new. That flexibility is a strength.',
      'This caught you off guard, and that\'s okay. You\'re handling it.',
      'You\'re more adaptable than you think. You\'ll figure this out.',
      'Let\'s walk through this together at your pace.',
    ]);

    this.warmMessages.set(PrimaryEmotion.DISGUST, [
      'Your values are clear and strong. That\'s something to honor.',
      'You know what\'s acceptable and what isn\'t. Trust that.',
      'Standing against what feels wrong - that takes moral courage.',
      'Your standards matter. Protecting them is wise.',
      'I support you honoring your integrity here.',
    ]);

    this.warmMessages.set(PrimaryEmotion.JOY, [
      'I love seeing you this happy. You deserve this.',
      'Your joy is contagious and genuine. Hold onto this.',
      'You\'ve earned this good feeling. Enjoy every moment.',
      'This is wonderful to witness. You\'re glowing.',
      'Keep celebrating. You deserve all of this.',
    ]);

    this.warmMessages.set(PrimaryEmotion.NEUTRAL, [
      'You\'re in a good, grounded place right now.',
      'This calm is valuable. Use it wisely.',
      'You\'re steady. That\'s a strong foundation.',
      'This clarity you have - it\'s something to appreciate.',
      'You\'re doing well. Keep going.',
    ]);

    // Strength recognition patterns
    this.strengthPatterns.set(PrimaryEmotion.SADNESS, [
      'Your capacity to feel deeply',
      'Your ability to reach out for support',
      'Your resilience in continuing despite pain',
      'Your honesty about how you\'re doing',
      'Your willingness to process grief',
    ]);

    this.strengthPatterns.set(PrimaryEmotion.ANGER, [
      'Your conviction about what matters',
      'Your willingness to stand up for yourself',
      'Your clarity about your values',
      'Your refusal to accept disrespect',
      'Your passion for justice',
    ]);

    this.strengthPatterns.set(PrimaryEmotion.FEAR, [
      'Your willingness to face what scares you',
      'Your ability to recognize risk and prepare',
      'Your honesty about your vulnerability',
      'Your determination despite fear',
      'Your capacity to ask for help',
    ]);

    this.strengthPatterns.set(PrimaryEmotion.SURPRISE, [
      'Your ability to adapt to change',
      'Your flexibility and resilience',
      'Your willingness to adjust your thinking',
      'Your openness to new possibilities',
      'Your capability to navigate uncertainty',
    ]);

    this.strengthPatterns.set(PrimaryEmotion.DISGUST, [
      'Your strong moral compass',
      'Your refusal to compromise your values',
      'Your clarity about boundaries',
      'Your integrity in difficult situations',
      'Your willingness to stand against wrong',
    ]);

    this.strengthPatterns.set(PrimaryEmotion.JOY, [
      'Your capacity for happiness',
      'Your ability to recognize good',
      'Your openness to positive experience',
      'Your authenticity in celebration',
      'Your appreciation for beauty',
    ]);

    this.strengthPatterns.set(PrimaryEmotion.NEUTRAL, [
      'Your steady presence',
      'Your grounded thinking',
      'Your calm in uncertainty',
      'Your balanced perspective',
      'Your readiness for what comes next',
    ]);

    // Recovery messages
    this.recoveryMessages.set(PrimaryEmotion.SADNESS, [
      'Grief has a timeline. You don\'t need to rush it. Healing comes slowly, but it comes.',
      'This pain won\'t always feel this big. It will soften. You will laugh again.',
      'Recovery isn\'t linear. Some days will be harder. That\'s okay. Keep going.',
      'You have gotten through every difficult day so far. You\'ll get through this too.',
      'Your life will have color again. Give it time. You\'re stronger than this moment.',
    ]);

    this.recoveryMessages.set(PrimaryEmotion.ANGER, [
      'This fire you feel - it can fuel positive change. Channel it.',
      'Your anger is valid. Use it to create boundaries and build something better.',
      'Things can shift. You have the power to change the situation.',
      'This anger is temporary. On the other side is clarity and strength.',
      'You\'re going to come through this stronger and wiser.',
    ]);

    this.recoveryMessages.set(PrimaryEmotion.FEAR, [
      'You\'ve faced scary things before. You\'re built for this.',
      'Fear fades when you face it. You\'re capable of more than you think.',
      'The anticipation is often worse than the reality. You\'ll handle it.',
      'On the other side of this fear is your strength. You\'ll see it soon.',
      'You\'re going to look back amazed at what you got through.',
    ]);

    this.recoveryMessages.set(PrimaryEmotion.SURPRISE, [
      'You\'ll adjust. You\'re more flexible than you realize.',
      'This shock will fade. New normal will become... normal.',
      'Change happens. You\'re handling it better than you think.',
      'Give yourself time. Adjustment takes patience with yourself.',
      'You\'re going to integrate this and move forward. You\'re capable.',
    ]);

    this.recoveryMessages.set(PrimaryEmotion.DISGUST, [
      'Protect yourself and move forward. You know what\'s right.',
      'Your boundaries are now clear. That\'s wisdom.',
      'You\'re going to build something better. This is a foundation.',
      'Integrity guided you here. It will guide you forward.',
      'You\'re going to be okay. And you\'re going to be proud of yourself.',
    ]);

    this.recoveryMessages.set(PrimaryEmotion.JOY, [
      'Enjoy this. You deserve every moment of happiness.',
      'This joy is real and lasting. Build on this feeling.',
      'You\'re creating beautiful memories. Savor them.',
      'This is what life can be. Hold onto this knowing.',
      'You\'re worthy of this happiness. Embrace it fully.',
    ]);

    this.recoveryMessages.set(PrimaryEmotion.NEUTRAL, [
      'Use this steady state to prepare for what comes next.',
      'This balance is valuable. Protect it and build from it.',
      'You\'re in a good place. Keep moving forward intentionally.',
      'This clarity will serve you well in decisions ahead.',
      'You\'re in a position of strength. Use it wisely.',
    ]);
  }

  /**
   * Generate encouraging response
   */
  generateEncouragingResponse(
    userId: string,
    emotionalState: EmotionalState,
    userContext?: string
  ): EncouragingResponse {
    // Warm opening
    const openings = this.warmMessages.get(emotionalState.primaryEmotion) || this.warmMessages.get(PrimaryEmotion.NEUTRAL);
    const warmOpeningStatement = openings[Math.floor(Math.random() * openings.length)];

    // Acknowledge strengths
    const strengthAcknowledgement = this.acknowledgeStrengths(emotionalState);

    // Create hope message
    const hopeMessage = this.createHopeMessage(emotionalState);

    // Companionship message
    const companionshipMessage = this.createCompanionshipMessage(emotionalState);

    // Growth opportunity
    const growthOpportunity = this.identifyGrowthOpportunity(emotionalState);

    // Final affirmation
    const affirmation = this.createAffirmation(emotionalState);

    console.log(
      `[EncouragingWarmResponse] 🌟 Generated encouraging response for user ${userId} ` +
      `(emotion: ${emotionalState.primaryEmotion})`
    );

    return {
      userId,
      warmOpeningStatement,
      strengthAcknowledgement,
      hopeMessage,
      companionshipMessage,
      growthOpportunity,
      affirmation,
    };
  }

  /**
   * Acknowledge strengths
   */
  private acknowledgeStrengths(emotionalState: EmotionalState): StrengthAcknowledgement {
    const strengths = this.strengthPatterns.get(emotionalState.primaryEmotion) || this.strengthPatterns.get(PrimaryEmotion.NEUTRAL);
    const strength = strengths[Math.floor(Math.random() * strengths.length)];

    return {
      observedStrength: strength,
      howYouSeeIt: `Even in this moment, I can see your ${strength.toLowerCase()}`,
      howItShows: `It shows in how you\'re handling this, in what you\'re asking, in your willingness to be here`,
      futureApplication: `This strength is going to carry you through and beyond this moment`,
    };
  }

  /**
   * Create hope message
   */
  private createHopeMessage(emotionalState: EmotionalState): HopeMessage {
    const recoveries = this.recoveryMessages.get(emotionalState.primaryEmotion) || this.recoveryMessages.get(PrimaryEmotion.NEUTRAL);
    const recovery = recoveries[Math.floor(Math.random() * recoveries.length)];

    const pastSuccessConnections: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'You\'ve gotten through every hard day you\'ve ever faced. That\'s 100%.',
      [PrimaryEmotion.ANGER]: 'You\'ve stood up for yourself before. You know how to do this.',
      [PrimaryEmotion.FEAR]: 'Every scary thing you\'ve faced, you\'ve survived. You\'re still here.',
      [PrimaryEmotion.SURPRISE]: 'You\'ve adapted to change before. You\'re flexible and capable.',
      [PrimaryEmotion.DISGUST]: 'You\'ve set boundaries before. You know your worth.',
      [PrimaryEmotion.JOY]: 'You deserve this good thing. You\'ve earned happiness.',
      [PrimaryEmotion.NEUTRAL]: 'You\'re in a strong place. Trust that.',
    };

    const possibilityStatements: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'Healing is possible. You will feel better. It\'s not if, it\'s when.',
      [PrimaryEmotion.ANGER]: 'Change is possible. You have the power to shape this.',
      [PrimaryEmotion.FEAR]: 'You will get through this. On the other side is peace.',
      [PrimaryEmotion.SURPRISE]: 'You will adjust. This new normal will become familiar.',
      [PrimaryEmotion.DISGUST]: 'Better is coming. You\'re moving toward something good.',
      [PrimaryEmotion.JOY]: 'This happiness can last. You can build a life with more of this.',
      [PrimaryEmotion.NEUTRAL]: 'Good things are possible. You\'re positioned for them.',
    };

    const timeframes: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'Not overnight, but gradually, things will shift',
      [PrimaryEmotion.ANGER]: 'As you take action, things will change',
      [PrimaryEmotion.FEAR]: 'As you face it, fear loses its grip',
      [PrimaryEmotion.SURPRISE]: 'Days from now, weeks from now, this will feel normal',
      [PrimaryEmotion.DISGUST]: 'Step by step, you\'re building something better',
      [PrimaryEmotion.JOY]: 'Cherish this. You can create more moments like this',
      [PrimaryEmotion.NEUTRAL]: 'Moving forward intentionally, you\'ll build on this',
    };

    return {
      recoveryAffirmation: recovery,
      pastSuccessConnection: pastSuccessConnections[emotionalState.primaryEmotion] || pastSuccessConnections[PrimaryEmotion.NEUTRAL],
      possibilityStatement: possibilityStatements[emotionalState.primaryEmotion] || possibilityStatements[PrimaryEmotion.NEUTRAL],
      timetableFrame: timeframes[emotionalState.primaryEmotion] || timeframes[PrimaryEmotion.NEUTRAL],
    };
  }

  /**
   * Create companionship message
   */
  private createCompanionshipMessage(emotionalState: EmotionalState): string {
    const messages = [
      'I\'m here with you. You don\'t have to do this alone.',
      'You matter to me. I\'m standing with you in this.',
      'You\'re not going through this by yourself. I\'m here.',
      'You have support. I\'m in your corner.',
      'Let me be here for you. You\'re not alone in this.',
      'I see you. I hear you. I\'m with you.',
      'Whatever you need, I\'m here. You can lean on me.',
      'You\'re valued. Your struggle matters and so do you.',
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Identify growth opportunity
   */
  private identifyGrowthOpportunity(emotionalState: EmotionalState): GrowthOpportunity {
    const teachings: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'How to be gentle with yourself and honor what you\'ve lost',
      [PrimaryEmotion.ANGER]: 'How to set boundaries and stand up for what matters',
      [PrimaryEmotion.FEAR]: 'How to be brave and move forward despite being scared',
      [PrimaryEmotion.SURPRISE]: 'How to be flexible and adapt to change',
      [PrimaryEmotion.DISGUST]: 'How to honor your values and protect yourself',
      [PrimaryEmotion.JOY]: 'How to create and sustain happiness in your life',
      [PrimaryEmotion.NEUTRAL]: 'How to build from stability and create intentional change',
    };

    const characterBuilding: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'Compassion, depth, and human connection',
      [PrimaryEmotion.ANGER]: 'Integrity, conviction, and healthy boundaries',
      [PrimaryEmotion.FEAR]: 'Courage, resilience, and capability',
      [PrimaryEmotion.SURPRISE]: 'Flexibility, adaptability, and openness',
      [PrimaryEmotion.DISGUST]: 'Values clarity, self-respect, and discernment',
      [PrimaryEmotion.JOY]: 'Appreciation, authenticity, and presence',
      [PrimaryEmotion.NEUTRAL]: 'Intentionality, wisdom, and purposefulness',
    };

    const futureResilience: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'You\'ll never be this lost again. You\'re learning how to survive and thrive',
      [PrimaryEmotion.ANGER]: 'You\'ll stand firmer next time. This is building your strength',
      [PrimaryEmotion.FEAR]: 'You\'re proving to yourself you\'re capable. That\'s transformative',
      [PrimaryEmotion.SURPRISE]: 'You\'re expanding what you can handle. You\'re growing',
      [PrimaryEmotion.DISGUST]: 'You\'re clarifying who you are. That\'s powerful',
      [PrimaryEmotion.JOY]: 'You\'re learning happiness is possible. You can create more',
      [PrimaryEmotion.NEUTRAL]: 'You\'re building intentional life direction. That\'s wise',
    };

    const meaningMaking: Record<PrimaryEmotion, string> = {
      [PrimaryEmotion.SADNESS]: 'This loss taught you something irreplaceable about what matters',
      [PrimaryEmotion.ANGER]: 'This injustice is showing you what you\'re willing to fight for',
      [PrimaryEmotion.FEAR]: 'This challenge is proving your capability to yourself',
      [PrimaryEmotion.SURPRISE]: 'This change is opening doors you didn\'t see before',
      [PrimaryEmotion.DISGUST]: 'This moment is clarifying your true values and standards',
      [PrimaryEmotion.JOY]: 'This joy is reminding you of what makes life worth living',
      [PrimaryEmotion.NEUTRAL]: 'This clarity is positioning you to create something meaningful',
    };

    return {
      whatThisTaught: teachings[emotionalState.primaryEmotion] || teachings[PrimaryEmotion.NEUTRAL],
      characterBuilding: characterBuilding[emotionalState.primaryEmotion] || characterBuilding[PrimaryEmotion.NEUTRAL],
      futureResilience: futureResilience[emotionalState.primaryEmotion] || futureResilience[PrimaryEmotion.NEUTRAL],
      meaningMaking: meaningMaking[emotionalState.primaryEmotion] || meaningMaking[PrimaryEmotion.NEUTRAL],
    };
  }

  /**
   * Create affirmation
   */
  private createAffirmation(emotionalState: EmotionalState): string {
    const affirmations = [
      'You are stronger than you believe right now.',
      'You are worthy of support and care.',
      'You will get through this and come out better.',
      'Your effort matters. You matter.',
      'You\'re doing the best you can, and that\'s enough.',
      'You are allowed to struggle. You\'re still capable.',
      'You deserve kindness, especially from yourself.',
      'Your life has value. You have value.',
      'You are resilient. You are worthy. You are enough.',
      'This moment doesn\'t define you. Your character does.',
    ];

    return affirmations[Math.floor(Math.random() * affirmations.length)];
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[EncouragingWarmResponse] 🔄 Service reset');
  }
}

// Export singleton instance
export const encouragingWarmResponseStyleService = new EncouragingWarmResponseStyleService();
