/**
 * State-Response Mapping Engine
 *
 * Maps detected emotional states to optimal response patterns and strategies.
 * Creates adaptive response blueprints based on:
 * - Emotional state (primary emotion, intensity, valence)
 * - User context (profile, history, preferences)
 * - Response objectives (validate, support, ground, redirect)
 * - Interaction history (what has worked before)
 *
 * Response Types:
 * - Validating: Acknowledge and normalize feelings
 * - Supporting: Provide comfort and encouragement
 * - Grounding: Focus on present reality and body-based techniques
 * - Redirecting: Shift focus to constructive action
 * - Escalating: Connect to professional resources
 */

import { PrimaryEmotion, EmotionalIntensity, EmotionalState } from './advanced-emotion-detection.service';

export interface EmotionalStateMapping {
  emotionalState: EmotionalState;
  responseStrategy: ResponseStrategy;
  responseBlueprints: ResponseBlueprint[];
  selectedBlueprint: ResponseBlueprint;
  contextFactors: ContextFactor[];
  effectiveness_likelihood: number;
}

export interface ResponseBlueprint {
  id: string;
  name: string;
  strategy: ResponseStrategy;
  structure: ResponseStructure;
  tone: ResponseTone;
  techniques: Technique[];
  examples: string[];
  contraindications: string[];  // When NOT to use this blueprint
  effectiveness: number;         // Historical effectiveness 0.0-1.0
}

export interface ResponseStructure {
  opening: string;        // How to start the response
  middle: string;         // Main content approach
  closing: string;        // How to wrap up
  include_acknowledgment: boolean;
  include_normalization: boolean;
  include_action: boolean;
}

export interface ResponseTone {
  formality: number;      // 0.0 (casual) to 1.0 (formal)
  warmth: number;         // 0.0 (detached) to 1.0 (warm)
  directness: number;     // 0.0 (indirect) to 1.0 (direct)
  hope: number;           // 0.0 (realistic) to 1.0 (hopeful)
}

export interface Technique {
  name: string;
  description: string;
  keywords: string[];
  application: string;
  caution: string;
}

export interface ContextFactor {
  factor: string;
  value: string | number;
  impact: 'increases_effectiveness' | 'decreases_effectiveness' | 'neutral';
}

type ResponseStrategy = 'support' | 'validate' | 'ground' | 'redirect' | 'escalate';

/**
 * StateResponseMappingService
 *
 * Maps emotional states to response patterns
 */
class StateResponseMappingService {
  // Blueprints for each emotion x strategy combination
  private blueprints: Map<string, ResponseBlueprint[]> = new Map();

  constructor() {
    this.initializeBlueprintLibrary();
  }

  /**
   * Initialize comprehensive blueprint library
   */
  private initializeBlueprintLibrary(): void {
    // SADNESS + VALIDATE
    this.addBlueprint({
      id: 'sad-validate-1',
      name: 'Sadness Validation - Loss & Grief',
      strategy: 'validate',
      structure: {
        opening: 'acknowledge_pain',
        middle: 'normalize_grief_process',
        closing: 'affirm_feelings_as_valid',
        include_acknowledgment: true,
        include_normalization: true,
        include_action: false,
      },
      tone: { formality: 0.3, warmth: 0.9, directness: 0.4, hope: 0.3 },
      techniques: [
        { name: 'Acknowledgment', description: 'Recognize the loss', keywords: ['understand', 'hear you'], application: 'Open with recognition of what they\'ve lost', caution: 'Avoid minimizing' },
        { name: 'Normalization', description: 'Make grief normal', keywords: ['natural', 'understandable'], application: 'Explain grief is a normal response', caution: 'Avoid rushing them' },
        { name: 'Permission', description: 'Allow feelings', keywords: ['it\'s okay', 'valid'], application: 'Give explicit permission to feel sad', caution: 'Don\'t suppress emotions' },
      ],
      examples: [
        'It makes complete sense that you\'re feeling this way. What you\'ve experienced is a real loss.',
        'Grief takes time, and there\'s no "right" way to feel about it.',
        'Your sadness shows how much this mattered to you, and that\'s meaningful.',
      ],
      contraindications: ['Avoid toxic positivity', 'Don\'t rush to "silver linings"', 'Avoid comparisons'],
      effectiveness: 0.85,
    });

    // SADNESS + SUPPORT
    this.addBlueprint({
      id: 'sad-support-1',
      name: 'Sadness Support - Companionship',
      strategy: 'support',
      structure: {
        opening: 'presence_not_fixing',
        middle: 'offer_practical_help',
        closing: 'steady_presence',
        include_acknowledgment: true,
        include_normalization: true,
        include_action: true,
      },
      tone: { formality: 0.2, warmth: 1.0, directness: 0.3, hope: 0.5 },
      techniques: [
        { name: 'Presence', description: 'Be there', keywords: ['with you', 'here'], application: 'Communicate you\'re not going anywhere', caution: 'Avoid toxic positivity' },
        { name: 'Practical Help', description: 'Offer concrete support', keywords: ['can I', 'would help'], application: 'Suggest specific things you can do', caution: 'Don\'t overpromise' },
        { name: 'Hope Insertion', description: 'Gentle hope', keywords: ['eventually', 'time', 'possible'], application: 'Suggest things may feel different with time', caution: 'Don\'t force hope' },
      ],
      examples: [
        'I\'m here with you in this. You don\'t have to go through this alone.',
        'Would it help if I checked in tomorrow? I\'m not going anywhere.',
        'This is really hard right now. And I believe that with time and support, things can shift.',
      ],
      contraindications: ['Avoid "at least" statements', 'Don\'t minimize pain', 'Avoid absent support'],
      effectiveness: 0.82,
    });

    // SADNESS + GROUND
    this.addBlueprint({
      id: 'sad-ground-1',
      name: 'Sadness Grounding - Present Moment Focus',
      strategy: 'ground',
      structure: {
        opening: 'acknowledge_overwhelm',
        middle: 'bring_to_present',
        closing: 'immediate_coping',
        include_acknowledgment: true,
        include_normalization: false,
        include_action: true,
      },
      tone: { formality: 0.4, warmth: 0.7, directness: 0.7, hope: 0.4 },
      techniques: [
        { name: 'Sensory Grounding', description: 'Use 5 senses', keywords: ['notice', 'feel', 'see'], application: 'Guide through sensory awareness', caution: 'Can be triggering if traumatic' },
        { name: 'Breath Work', description: 'Breathing techniques', keywords: ['breathe', 'slow', 'count'], application: 'Provide simple breathing pattern', caution: 'Avoid if trauma-related' },
        { name: 'Present Moment', description: 'Focus on now', keywords: ['right now', 'this moment'], application: 'Anchor to current reality', caution: 'Don\'t use as avoidance' },
      ],
      examples: [
        'Right now, in this moment, you are safe. Notice five things you can see around you.',
        'Let\'s slow down. Take a breath in for 4, hold for 4, out for 4.',
        'The sadness is real, and right now, in this moment, you can notice that you\'re breathing and alive.',
      ],
      contraindications: ['Avoid with active dissociation', 'Don\'t use as replacement for processing', 'Avoid if trauma-related'],
      effectiveness: 0.75,
    });

    // ANGER + VALIDATE
    this.addBlueprint({
      id: 'anger-validate-1',
      name: 'Anger Validation - Legitimate Frustration',
      strategy: 'validate',
      structure: {
        opening: 'acknowledge_legitimacy',
        middle: 'normalize_anger_response',
        closing: 'affirm_boundaries',
        include_acknowledgment: true,
        include_normalization: true,
        include_action: false,
      },
      tone: { formality: 0.5, warmth: 0.6, directness: 0.8, hope: 0.3 },
      techniques: [
        { name: 'Legitimacy', description: 'Anger is valid', keywords: ['understandable', 'justified'], application: 'Show their anger makes sense', caution: 'Avoid enabling harmful actions' },
        { name: 'Boundary Recognition', description: 'Violations acknowledged', keywords: ['boundary', 'treated unfairly'], application: 'Recognize if they were wronged', caution: 'Don\'t take sides rashly' },
        { name: 'Anger as Information', description: 'What does anger tell us?', keywords: ['means', 'tells us', 'signal'], application: 'Explore anger as feedback', caution: 'Don\'t minimize feelings' },
      ],
      examples: [
        'That\'s a completely legitimate response to being treated that way.',
        'Your anger is telling you that something important to you was violated. That makes sense.',
        'Anger is valid information. It\'s showing you where your boundaries are.',
      ],
      contraindications: ['Avoid enabling violence', 'Don\'t agree to harmful plans', 'Avoid blame game'],
      effectiveness: 0.78,
    });

    // ANGER + REDIRECT
    this.addBlueprint({
      id: 'anger-redirect-1',
      name: 'Anger Redirect - Channel to Action',
      strategy: 'redirect',
      structure: {
        opening: 'acknowledge_then_redirect',
        middle: 'suggest_constructive_action',
        closing: 'empower_change',
        include_acknowledgment: true,
        include_normalization: false,
        include_action: true,
      },
      tone: { formality: 0.5, warmth: 0.5, directness: 0.9, hope: 0.7 },
      techniques: [
        { name: 'Channel Energy', description: 'Use anger productively', keywords: ['channel', 'direct', 'action'], application: 'Suggest what anger could fuel', caution: 'Avoid aggressive actions' },
        { name: 'Problem-Solving', description: 'Find solutions', keywords: ['can do', 'options', 'approach'], application: 'Shift to what can be done', caution: 'Don\'t minimize problem' },
        { name: 'Empowerment', description: 'Reclaim power', keywords: ['your choice', 'you can', 'control'], application: 'Show where they have agency', caution: 'Avoid false empowerment' },
      ],
      examples: [
        'Your anger makes sense, and it\'s actually telling you something matters. What would help you feel like you have some power here?',
        'This situation is unfair. What\'s one thing you could do to make it better?',
        'Channel this energy. What would actually address this problem?',
      ],
      contraindications: ['Avoid minimizing problem', 'Don\'t push action too fast', 'Avoid dismissing feelings'],
      effectiveness: 0.72,
    });

    // FEAR + GROUND
    this.addBlueprint({
      id: 'fear-ground-1',
      name: 'Fear Grounding - Safety & Reality Check',
      strategy: 'ground',
      structure: {
        opening: 'acknowledge_fear',
        middle: 'reality_testing',
        closing: 'safety_planning',
        include_acknowledgment: true,
        include_normalization: true,
        include_action: true,
      },
      tone: { formality: 0.4, warmth: 0.8, directness: 0.6, hope: 0.5 },
      techniques: [
        { name: 'Safety Assessment', description: 'Check actual vs. feared', keywords: ['right now', 'safe', 'actual danger'], application: 'Distinguish between worry and reality', caution: 'Don\'t minimize real dangers' },
        { name: 'Grounding', description: 'Physical grounding', keywords: ['feet', 'ground', 'present'], application: 'Use 5 senses to establish safety', caution: 'Can trigger if traumatic' },
        { name: 'Action Planning', description: 'What if it happens?', keywords: ['plan', 'prepared', 'know what to do'], application: 'Create concrete safety plan', caution: 'Avoid overplanning' },
      ],
      examples: [
        'I hear your fear. Right now, in this moment, are you physically safe? Let\'s check.',
        'Your mind is showing you scary possibilities. But what\'s actually happening right now?',
        'Let\'s make a plan. If this happens, here\'s what you can do. Having a plan often helps fear feel more manageable.',
      ],
      contraindications: ['Avoid toxic reassurance', 'Don\'t dismiss real threats', 'Avoid forced positivity'],
      effectiveness: 0.80,
    });

    // FEAR + SUPPORT
    this.addBlueprint({
      id: 'fear-support-1',
      name: 'Fear Support - Reassurance & Companionship',
      strategy: 'support',
      structure: {
        opening: 'acknowledge_presence',
        middle: 'offer_protection',
        closing: 'steady_support',
        include_acknowledgment: true,
        include_normalization: true,
        include_action: true,
      },
      tone: { formality: 0.3, warmth: 0.95, directness: 0.4, hope: 0.6 },
      techniques: [
        { name: 'Presence', description: 'I\'m here', keywords: ['with you', 'not alone'], application: 'Communicate constant presence', caution: 'Don\'t overpromise safety' },
        { name: 'Reassurance', description: 'You\'ll get through this', keywords: ['survive', 'manage', 'get through'], application: 'Build confidence gradually', caution: 'Avoid false guarantees' },
        { name: 'Practical Help', description: 'Concrete support', keywords: ['help', 'can do', 'support'], application: 'Offer specific things to reduce fear', caution: 'Don\'t enable avoidance' },
      ],
      examples: [
        'I\'m right here with you. You\'re not alone in this.',
        'I know you\'re scared. You\'ve gotten through hard things before, and you can get through this too.',
        'What would help you feel safer right now? I\'m here to help however I can.',
      ],
      contraindications: ['Avoid false guarantees', 'Don\'t enable avoidance', 'Avoid abandonment threats'],
      effectiveness: 0.85,
    });

    // ANXIETY + GROUND
    this.addBlueprint({
      id: 'anxiety-ground-1',
      name: 'Anxiety Grounding - Slow & Steady',
      strategy: 'ground',
      structure: {
        opening: 'validate_anxiety',
        middle: 'slowing_techniques',
        closing: 'present_moment_anchoring',
        include_acknowledgment: true,
        include_normalization: true,
        include_action: true,
      },
      tone: { formality: 0.4, warmth: 0.8, directness: 0.5, hope: 0.4 },
      techniques: [
        { name: 'Breathing', description: 'Slow breathing', keywords: ['breathe', 'slow', 'count'], application: '4-7-8 or box breathing', caution: 'Avoid if hyperventilation' },
        { name: 'Progressive Relaxation', description: 'Tension release', keywords: ['tense', 'relax', 'release'], application: 'Guide through muscle groups', caution: 'Avoid if dissociative' },
        { name: 'Grounding', description: '5 senses', keywords: ['see', 'hear', 'feel', 'notice'], application: 'Anchor to sensory reality', caution: 'Can trigger some' },
      ],
      examples: [
        'Anxiety makes your body think there\'s danger. Let\'s slow things down. Breathe in for 4, hold for 4, out for 6.',
        'Feel your feet on the ground. Notice the pressure. You\'re here. You\'re safe.',
        'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
      ],
      contraindications: ['Avoid with panic attacks', 'Don\'t use alone if suicidal', 'Avoid if trauma-related'],
      effectiveness: 0.82,
    });

    // Populate the map
    this.blueprints.set('sadness-validate', this.blueprints.get('sadness-validate') || []);
    this.blueprints.set('sadness-support', this.blueprints.get('sadness-support') || []);
    this.blueprints.set('sadness-ground', this.blueprints.get('sadness-ground') || []);
    this.blueprints.set('anger-validate', this.blueprints.get('anger-validate') || []);
    this.blueprints.set('anger-redirect', this.blueprints.get('anger-redirect') || []);
    this.blueprints.set('fear-ground', this.blueprints.get('fear-ground') || []);
    this.blueprints.set('fear-support', this.blueprints.get('fear-support') || []);
    this.blueprints.set('anxiety-ground', this.blueprints.get('anxiety-ground') || []);
  }

  /**
   * Add blueprint to library
   */
  private addBlueprint(blueprint: ResponseBlueprint): void {
    const key = `${blueprint.strategy}`;
    if (!this.blueprints.has(key)) {
      this.blueprints.set(key, []);
    }
    this.blueprints.get(key)!.push(blueprint);
  }

  /**
   * Map emotional state to response blueprint
   */
  mapStateToResponse(emotionalState: EmotionalState, responseStrategy: ResponseStrategy): EmotionalStateMapping {
    // Get candidate blueprints for this emotional state and strategy
    const candidates = this.getBlueprintCandidates(emotionalState, responseStrategy);

    // Score each blueprint based on context
    const scored = candidates.map(bp => ({
      blueprint: bp,
      score: this.scoreBlueprint(bp, emotionalState),
    }));

    // Select best blueprint
    scored.sort((a, b) => b.score - a.score);
    const selectedBlueprint = scored[0]?.blueprint || this.getDefaultBlueprint(responseStrategy);

    // Identify context factors that affect this mapping
    const contextFactors = this.identifyContextFactors(emotionalState);

    // Calculate effectiveness likelihood
    const effectiveness_likelihood = this.calculateEffectiveness(selectedBlueprint, contextFactors);

    return {
      emotionalState,
      responseStrategy,
      responseBlueprints: scored.map(s => s.blueprint),
      selectedBlueprint,
      contextFactors,
      effectiveness_likelihood,
    };
  }

  /**
   * Get candidate blueprints
   */
  private getBlueprintCandidates(state: EmotionalState, strategy: ResponseStrategy): ResponseBlueprint[] {
    const candidates: ResponseBlueprint[] = [];

    // Map primary emotion and strategy to blueprint key
    const key = `${state.primaryEmotion}-${strategy}`;
    const blueprints = this.blueprints.get(key);

    if (blueprints) {
      candidates.push(...blueprints);
    }

    // Also check secondary emotions
    for (const secondary of state.secondaryEmotions) {
      const secondaryKey = `${secondary.emotion}-${strategy}`;
      const secondaryBlueprints = this.blueprints.get(secondaryKey);
      if (secondaryBlueprints) {
        candidates.push(...secondaryBlueprints);
      }
    }

    return candidates.slice(0, 5);  // Return top 5 candidates
  }

  /**
   * Score blueprint fit
   */
  private scoreBlueprint(blueprint: ResponseBlueprint, state: EmotionalState): number {
    let score = blueprint.effectiveness;

    // Boost if intensity matches blueprint's target
    if (state.intensityScore > 0.7 && blueprint.tone.warmth > 0.7) {
      score += 0.1;
    }

    // Boost if valence matches
    if (state.valence < 0 && blueprint.tone.hope < 0.5) {
      score += 0.1;
    }

    // Consider trajectory
    if (state.emotionalTrajectory === 'escalating' && blueprint.strategy === 'ground') {
      score += 0.15;
    }

    // Consider coherence
    if (state.emotionalCoherence === 'fragmented' && blueprint.tone.directness > 0.5) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Identify context factors
   */
  private identifyContextFactors(state: EmotionalState): ContextFactor[] {
    const factors: ContextFactor[] = [];

    // Risk factors
    if (state.riskFactors.length > 0) {
      factors.push({
        factor: 'Crisis Indicators',
        value: state.riskFactors.length,
        impact: 'decreases_effectiveness',
      });
    }

    // Emotional intensity
    if (state.intensityScore > 0.8) {
      factors.push({
        factor: 'High Emotional Intensity',
        value: state.intensityScore,
        impact: 'decreases_effectiveness',
      });
    }

    // Valence
    if (state.valence < -0.5) {
      factors.push({
        factor: 'Highly Negative Valence',
        value: state.valence,
        impact: 'decreases_effectiveness',
      });
    }

    // Escalating trajectory
    if (state.emotionalTrajectory === 'escalating') {
      factors.push({
        factor: 'Escalating Emotion',
        value: 'escalating',
        impact: 'decreases_effectiveness',
      });
    }

    // Positive factors
    if (state.valence > 0.3) {
      factors.push({
        factor: 'Positive Valence',
        value: state.valence,
        impact: 'increases_effectiveness',
      });
    }

    if (state.emotionalTrajectory === 'de-escalating') {
      factors.push({
        factor: 'De-escalating Emotion',
        value: 'de-escalating',
        impact: 'increases_effectiveness',
      });
    }

    return factors;
  }

  /**
   * Calculate effectiveness likelihood
   */
  private calculateEffectiveness(blueprint: ResponseBlueprint, contextFactors: ContextFactor[]): number {
    let effectiveness = blueprint.effectiveness;

    // Apply context factor adjustments
    for (const factor of contextFactors) {
      if (factor.impact === 'increases_effectiveness') {
        effectiveness = Math.min(1, effectiveness + 0.1);
      } else if (factor.impact === 'decreases_effectiveness') {
        effectiveness = Math.max(0, effectiveness - 0.1);
      }
    }

    return effectiveness;
  }

  /**
   * Get default blueprint
   */
  private getDefaultBlueprint(strategy: ResponseStrategy): ResponseBlueprint {
    return {
      id: 'default',
      name: 'General Support Response',
      strategy,
      structure: {
        opening: 'Acknowledge your feelings',
        middle: 'Offer support and understanding',
        closing: 'Affirm your strength',
        include_acknowledgment: true,
        include_normalization: true,
        include_action: false,
      },
      tone: { formality: 0.4, warmth: 0.8, directness: 0.5, hope: 0.5 },
      techniques: [
        { name: 'Empathy', description: 'Show understanding', keywords: ['understand', 'hear'], application: 'Validate their experience', caution: 'Be genuine' },
      ],
      examples: [
        'I hear you. What you\'re going through is real and valid.',
        'I\'m here to listen and support you however I can.',
      ],
      contraindications: [],
      effectiveness: 0.65,
    };
  }

  /**
   * Get all available strategies for an emotion
   */
  getAvailableStrategies(emotion: PrimaryEmotion): ResponseStrategy[] {
    const strategies: ResponseStrategy[] = [];
    for (const key of this.blueprints.keys()) {
      if (key.startsWith(emotion)) {
        const strategy = key.split('-')[1] as ResponseStrategy;
        if (!strategies.includes(strategy)) {
          strategies.push(strategy);
        }
      }
    }
    return strategies;
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[StateResponseMapping] 🔄 Service reset');
  }
}

// Export singleton instance
export const stateResponseMappingService = new StateResponseMappingService();
