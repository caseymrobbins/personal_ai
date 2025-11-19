/**
 * Grounding & Structured Response Generator
 *
 * Generates supportive, grounded responses using evidence-based techniques:
 * - Grounding techniques (5-4-3-2-1, body scan, breathing)
 * - Emotional validation and normalization
 * - Reality anchoring and present-moment focus
 * - Safety planning and coping strategies
 * - Cognitive restructuring support
 * - Distress tolerance building
 * - Hope and resilience messaging
 *
 * Integrates with emotional state to create personalized support.
 */

import { EmotionalState, PrimaryEmotion, EmotionalIntensity } from './advanced-emotion-detection.service';
import { ResponseStrategy } from './state-response-mapping.service';

export interface GroundedResponse {
  userId: string;
  primaryText: string;
  secondaryComponents: ResponseComponent[];
  groundingTechnique: GroundingTechnique;
  emotionalValidation: string;
  structuredElements: StructuredElement[];
  callToAction: string;
  safetyWarnings: string[];
  timestamp: number;
}

export interface ResponseComponent {
  type: 'validation' | 'grounding' | 'coping' | 'safety' | 'hope';
  content: string;
  technique: string;
}

export interface GroundingTechnique {
  name: string;
  instructions: string[];
  duration: number;                    // seconds
  effectiveness: number;               // 0.0-1.0
  contraindications: string[];
}

export interface StructuredElement {
  label: string;
  content: string;
  order: number;
}

/**
 * GroundingResponseGeneratorService
 *
 * Generates grounded, structured responses
 */
class GroundingResponseGeneratorService {
  private groundingTechniques: Map<string, GroundingTechnique> = new Map();

  constructor() {
    this.initializeGroundingTechniques();
  }

  /**
   * Initialize grounding technique library
   */
  private initializeGroundingTechniques(): void {
    // 5-4-3-2-1 Technique
    this.groundingTechniques.set('5-4-3-2-1', {
      name: '5-4-3-2-1 Sensory Grounding',
      instructions: [
        'Notice 5 things you can SEE around you - describe them (color, texture, light)',
        'Notice 4 things you can TOUCH - feel the texture, temperature, weight',
        'Notice 3 things you can HEAR - identify distinct sounds',
        'Notice 2 things you can SMELL - or places you can smell',
        'Notice 1 thing you can TASTE - describe it',
      ],
      duration: 300,  // 5 minutes
      effectiveness: 0.85,
      contraindications: ['Active dissociation', 'Sensory sensitivities'],
    });

    // Box Breathing
    this.groundingTechniques.set('box-breathing', {
      name: 'Box Breathing (4-4-4-4)',
      instructions: [
        'Breathe in slowly through your nose for 4 counts',
        'Hold your breath for 4 counts',
        'Breathe out slowly through your mouth for 4 counts',
        'Hold empty for 4 counts',
        'Repeat 5-10 times, focusing completely on the breath',
      ],
      duration: 300,
      effectiveness: 0.88,
      contraindications: ['Panic disorder', 'Hyperventilation history'],
    });

    // Progressive Muscle Relaxation
    this.groundingTechniques.set('progressive-relaxation', {
      name: 'Progressive Muscle Relaxation',
      instructions: [
        'Starting with your toes: tense the muscles for 5 seconds, then release',
        'Move up through feet, legs, stomach, chest',
        'Continue through arms, shoulders, neck, and face',
        'Notice the difference between tension and relaxation',
        'End with deep, slow breathing',
      ],
      duration: 600,
      effectiveness: 0.82,
      contraindications: ['Chronic pain conditions', 'Muscle disorders'],
    });

    // Grounding with Temperature
    this.groundingTechniques.set('temperature-grounding', {
      name: 'Temperature Grounding',
      instructions: [
        'Hold ice cubes or splash cold water on your face - notice the sensation',
        'Or hold something warm - tea, blanket, warm water',
        'Focus completely on the temperature sensation',
        'Notice how your body responds',
        'Gradually return to normal temperature',
      ],
      duration: 120,
      effectiveness: 0.80,
      contraindications: ['Temperature sensitivity', 'Raynaud\'s syndrome'],
    });

    // Timed Counting
    this.groundingTechniques.set('counting', {
      name: 'Counting & Awareness',
      instructions: [
        'Count slowly from 1 to 100, focusing only on the numbers',
        'Or count backwards from 100',
        'Count how many breaths it takes',
        'Count items in your room',
        'This occupies the part of mind that creates panic',
      ],
      duration: 300,
      effectiveness: 0.78,
      contraindications: ['Math anxiety', 'ADHD'],
    });

    // 5D Grounding
    this.groundingTechniques.set('5d-grounding', {
      name: '5D Grounding (Senses + Distraction)',
      instructions: [
        'Senses: Notice 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste',
        'Distraction: Name capitals of countries, song lyrics, movie quotes',
        'Describe: Pick an object and describe it in detail (texture, color, weight)',
        'Movement: Do gentle stretches, walk, shake out your body',
        'Combine multiple elements for stronger effect',
      ],
      duration: 600,
      effectiveness: 0.87,
      contraindications: ['Severe dissociation'],
    });
  }

  /**
   * Generate grounded response based on emotional state
   */
  generateGroundedResponse(
    userId: string,
    emotionalState: EmotionalState,
    strategy: ResponseStrategy
  ): GroundedResponse {
    // Select appropriate grounding technique
    const technique = this.selectGroundingTechnique(emotionalState);

    // Generate emotional validation
    const validation = this.generateValidation(emotionalState);

    // Build response components
    const components = this.buildResponseComponents(emotionalState, strategy, technique);

    // Create structured response
    const structuredElements = this.createStructuredElements(emotionalState, strategy);

    // Generate call to action
    const cta = this.generateCallToAction(emotionalState, technique);

    // Safety warnings if needed
    const warnings = this.generateSafetyWarnings(emotionalState);

    // Assemble primary text
    const primaryText = this.assemblePrimaryText(validation, technique, strategy, emotionalState);

    console.log(
      `[GroundingResponseGenerator] 🌿 Generated grounded response for user ${userId} ` +
      `using ${technique.name} for ${emotionalState.primaryEmotion}`
    );

    return {
      userId,
      primaryText,
      secondaryComponents: components,
      groundingTechnique: technique,
      emotionalValidation: validation,
      structuredElements,
      callToAction: cta,
      safetyWarnings: warnings,
      timestamp: Date.now(),
    };
  }

  /**
   * Select appropriate grounding technique
   */
  private selectGroundingTechnique(emotionalState: EmotionalState): GroundingTechnique {
    const intensity = emotionalState.intensityScore;
    const emotion = emotionalState.primaryEmotion;

    // Critical intensity - fastest technique
    if (intensity > 0.8) {
      return this.groundingTechniques.get('temperature-grounding')!;
    }

    // High anxiety/fear - breathing focused
    if (emotion === PrimaryEmotion.FEAR || emotion === PrimaryEmotion.SURPRISE) {
      return this.groundingTechniques.get('box-breathing')!;
    }

    // Moderate intensity - comprehensive sensory
    if (intensity > 0.5) {
      return this.groundingTechniques.get('5-4-3-2-1')!;
    }

    // Lower intensity - relaxation
    if (emotion === PrimaryEmotion.SADNESS && intensity < 0.5) {
      return this.groundingTechniques.get('progressive-relaxation')!;
    }

    // Default - most versatile
    return this.groundingTechniques.get('5-4-3-2-1')!;
  }

  /**
   * Generate emotional validation
   */
  private generateValidation(emotionalState: EmotionalState): string {
    const validations: Record<PrimaryEmotion, string[]> = {
      [PrimaryEmotion.SADNESS]: [
        'What you\'re feeling makes complete sense. Loss is real.',
        'Your sadness shows how much this matters to you.',
        'Grief is love with nowhere to go. It\'s valid.',
        'It\'s okay to not be okay right now.',
      ],
      [PrimaryEmotion.ANGER]: [
        'Your anger is valid. It\'s telling you something important was violated.',
        'Anger is a signal. It means your boundaries matter.',
        'What happened is unfair. Your anger makes sense.',
        'You have the right to feel this way.',
      ],
      [PrimaryEmotion.FEAR]: [
        'Your fear is real. Your body is trying to protect you.',
        'Anxiety can lie to you. You\'re safe right now.',
        'Fear is a normal response to uncertainty.',
        'You\'ve survived 100% of your difficult days so far.',
      ],
      [PrimaryEmotion.SURPRISE]: [
        'Shock takes time to process. That\'s normal.',
        'Your confusion is understandable given what happened.',
        'It\'s okay to need time to adjust.',
        'What you\'re experiencing is a normal response.',
      ],
      [PrimaryEmotion.DISGUST]: [
        'Your feeling of disgust is valid. You\'re responding to something wrong.',
        'Trust your instincts. Your revulsion is protective.',
        'It\'s okay to set boundaries around what you\'ll accept.',
        'Your disgust is telling you something matters.',
      ],
      [PrimaryEmotion.JOY]: [
        'Your happiness is deserved. Enjoy this moment.',
        'This joy you\'re feeling - hold onto it.',
        'You\'re allowed to feel good about this.',
        'Celebrate this. You\'ve earned it.',
      ],
      [PrimaryEmotion.NEUTRAL]: [
        'It\'s okay to feel calm and neutral right now.',
        'Not every moment needs to be intense.',
        'Equilibrium is healthy.',
        'You\'re grounded and present.',
      ],
    };

    const options = validations[emotionalState.primaryEmotion] || validations[PrimaryEmotion.NEUTRAL];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Build response components
   */
  private buildResponseComponents(
    emotionalState: EmotionalState,
    strategy: ResponseStrategy,
    technique: GroundingTechnique
  ): ResponseComponent[] {
    const components: ResponseComponent[] = [];

    // Add validation component
    components.push({
      type: 'validation',
      content: this.generateValidation(emotionalState),
      technique: 'Emotional Validation',
    });

    // Add grounding component
    components.push({
      type: 'grounding',
      content: this.formatGroundingInstructions(technique),
      technique: technique.name,
    });

    // Add strategy-specific component
    if (strategy === 'support') {
      components.push({
        type: 'coping',
        content: this.generateCopingStrategies(emotionalState),
        technique: 'Immediate Coping',
      });
    } else if (strategy === 'ground') {
      components.push({
        type: 'coping',
        content: this.generateCopingStrategies(emotionalState),
        technique: 'Coping Strategies',
      });
    }

    // Add safety component if needed
    if (emotionalState.riskFactors.length > 0) {
      components.push({
        type: 'safety',
        content: this.generateSafetyPlan(emotionalState),
        technique: 'Safety Planning',
      });
    }

    // Add hope component
    if (emotionalState.valence < -0.3) {
      components.push({
        type: 'hope',
        content: this.generateHopeMessage(emotionalState),
        technique: 'Hope & Resilience',
      });
    }

    return components;
  }

  /**
   * Format grounding instructions
   */
  private formatGroundingInstructions(technique: GroundingTechnique): string {
    const formatted = technique.instructions
      .map((instruction, i) => `${i + 1}. ${instruction}`)
      .join('\n');

    return `Try this grounding technique (${Math.round(technique.duration / 60)} min):\n\n${formatted}`;
  }

  /**
   * Generate coping strategies
   */
  private generateCopingStrategies(emotionalState: EmotionalState): string {
    const strategies: Record<PrimaryEmotion, string[]> = {
      [PrimaryEmotion.SADNESS]: [
        '• Let yourself feel it - cry if you need to',
        '• Reach out to someone you trust',
        '• Do something gentle for yourself',
        '• Get outside, even for 5 minutes',
        '• Move your body - walk, stretch, dance',
      ],
      [PrimaryEmotion.ANGER]: [
        '• Channel the energy - exercise, clean, create',
        '• Write out your anger without censoring',
        '• Take a cold shower or splash cold water',
        '• Physical activity (punch pillow, run)',
        '• Give yourself permission to be angry',
      ],
      [PrimaryEmotion.FEAR]: [
        '• Name what you\'re afraid of',
        '• Check: Is it happening RIGHT NOW?',
        '• Ground yourself in present reality',
        '• Make a safety plan',
        '• Call someone safe',
      ],
      [PrimaryEmotion.SURPRISE]: [
        '• Take slow, deep breaths',
        '• Give yourself time to process',
        '• Talk it through with someone',
        '• Write down what happened',
        '• Rest and recharge',
      ],
      [PrimaryEmotion.DISGUST]: [
        '• Remove yourself from the situation if possible',
        '• Set firm boundaries',
        '• Clean or refresh yourself',
        '• Spend time with people you trust',
        '• Protect yourself going forward',
      ],
      [PrimaryEmotion.JOY]: [
        '• Savor this feeling',
        '• Share it with someone',
        '• Do more of what created this',
        '• Remember this moment',
        '• Let yourself enjoy it fully',
      ],
      [PrimaryEmotion.NEUTRAL]: [
        '• Notice you\'re doing okay right now',
        '• Appreciate the calm',
        '• Use this clarity productively',
        '• Rest and recharge',
        '• Prepare for what comes next',
      ],
    };

    const options = strategies[emotionalState.primaryEmotion] || strategies[PrimaryEmotion.NEUTRAL];
    return 'Right now, consider:\n\n' + options.join('\n');
  }

  /**
   * Generate safety plan
   */
  private generateSafetyPlan(emotionalState: EmotionalState): string {
    const riskFactors = emotionalState.riskFactors.slice(0, 2).join(', ');

    return `IMMEDIATE SAFETY PLAN:\n\n` +
      `Risk factors identified: ${riskFactors}\n\n` +
      `1. If you\'re in immediate danger, call 911\n` +
      `2. Crisis Hotline: 988 (call or text)\n` +
      `3. Reach out to a trusted person NOW\n` +
      `4. Move to a safe location\n` +
      `5. Remove access to means if possible\n\n` +
      `Your safety is the priority. These resources are available 24/7.`;
  }

  /**
   * Generate hope message
   */
  private generateHopeMessage(emotionalState: EmotionalState): string {
    const messages = [
      'This feeling will pass. You\'ve gotten through every hard day so far.',
      'Right now is temporary. Healing takes time, and you can do this.',
      'Your pain shows your capacity for depth. That\'s your strength.',
      'You reached out. That takes courage. That matters.',
      'This is not forever. Even the darkest nights end.',
      'You are stronger than you believe right now.',
      'Help exists. You don\'t have to do this alone.',
      'Tomorrow might be different. Possibility exists.',
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Create structured elements
   */
  private createStructuredElements(
    emotionalState: EmotionalState,
    strategy: ResponseStrategy
  ): StructuredElement[] {
    const elements: StructuredElement[] = [];

    elements.push({
      label: 'What I hear',
      content: `You\'re experiencing intense ${emotionalState.primaryEmotion}. That\'s real and valid.`,
      order: 1,
    });

    elements.push({
      label: 'What\'s true right now',
      content: 'You are alive. You are safe in this moment. This will pass.',
      order: 2,
    });

    elements.push({
      label: 'What you can do',
      content: 'Use the grounding technique above. Focus on your senses.',
      order: 3,
    });

    if (strategy === 'support') {
      elements.push({
        label: 'What I\'ll do',
        content: 'I\'m here with you. You\'re not alone in this.',
        order: 4,
      });
    }

    return elements;
  }

  /**
   * Generate call to action
   */
  private generateCallToAction(emotionalState: EmotionalState, technique: GroundingTechnique): string {
    if (emotionalState.intensityScore > 0.7) {
      return `Try the ${technique.name} technique right now. Just follow the steps. I\'ll be here.`;
    } else if (emotionalState.intensityScore > 0.5) {
      return `When you\'re ready, try the grounding technique. There\'s no rush.`;
    } else {
      return `Would you like to try this grounding exercise together?`;
    }
  }

  /**
   * Generate safety warnings
   */
  private generateSafetyWarnings(emotionalState: EmotionalState): string[] {
    const warnings: string[] = [];

    if (emotionalState.riskFactors.some(r => r.includes('suicide'))) {
      warnings.push('⚠️ CRITICAL: Suicide risk detected. Call 988 or 911 immediately.');
    }

    if (emotionalState.riskFactors.some(r => r.includes('self-harm'))) {
      warnings.push('⚠️ HIGH: Self-harm risk present. Seek immediate professional support.');
    }

    if (emotionalState.riskFactors.some(r => r.includes('violence'))) {
      warnings.push('⚠️ HIGH: Violence risk present. Call 911 if anyone is in danger.');
    }

    if (emotionalState.intensityScore > 0.85) {
      warnings.push('⚠️ Extreme emotional intensity detected. Consider professional support.');
    }

    return warnings;
  }

  /**
   * Assemble primary text
   */
  private assemblePrimaryText(
    validation: string,
    technique: GroundingTechnique,
    strategy: ResponseStrategy,
    emotionalState: EmotionalState
  ): string {
    let text = validation + '\n\n';

    if (strategy === 'ground') {
      text += `Right now, let\'s focus on bringing you back to this moment.\n\n` +
              `${this.formatGroundingInstructions(technique)}\n\n` +
              `Take your time. You\'re safe.`;
    } else if (strategy === 'support') {
      text += `I\'m here with you in this. You\'re not alone.\n\n` +
              `What might help:\n` +
              this.generateCopingStrategies(emotionalState) + '\n\n' +
              `Let me know what you need. I\'m listening.`;
    } else if (strategy === 'validate') {
      text += `This makes sense. You\'re reacting normally to a difficult situation.\n\n` +
              `Your feelings are information - they\'re showing you what matters.\n\n` +
              `Take space for this. You deserve to feel what you feel.`;
    } else if (strategy === 'redirect') {
      text += `This is hard, and it\'s also temporary.\n\n` +
              `Let\'s focus on what you can influence right now.\n\n` +
              `What\'s one small thing that might help today?`;
    } else {
      text += `I\'m listening. You\'re not alone in this.`;
    }

    return text;
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[GroundingResponseGenerator] 🔄 Service reset');
  }
}

// Export singleton instance
export const groundingResponseGeneratorService = new GroundingResponseGeneratorService();
