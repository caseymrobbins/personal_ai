/**
 * Advanced Emotion Detection Service
 *
 * Provides deep emotional state analysis for Agent 2 (The Balancer).
 * Detects complex emotional patterns and triggers that indicate
 * when users need supportive, regulated responses.
 *
 * Emotional Models:
 * - Primary emotions (joy, sadness, anger, fear, surprise, disgust)
 * - Secondary emotions (anxiety, depression, frustration, etc.)
 * - Emotional intensity (mild, moderate, high, critical)
 * - Emotional trajectory (escalating, de-escalating, stable)
 * - Emotional coherence (aligned, conflicted, fragmented)
 *
 * Trigger Detection:
 * - Crisis indicators (suicide, self-harm, violence threats)
 * - Distress markers (overwhelm, panic, despair)
 * - Cognitive distortions (catastrophizing, black-and-white thinking)
 * - Rumination patterns (repetitive negative thoughts)
 */

import { userLinguisticProfileService } from './user-linguistic-profile.service';
import { tonalResonanceService } from './tonal-resonance.service';

export enum PrimaryEmotion {
  JOY = 'joy',
  SADNESS = 'sadness',
  ANGER = 'anger',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
  NEUTRAL = 'neutral',
}

export enum EmotionalIntensity {
  MILD = 'mild',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface EmotionalState {
  userId: string;
  primaryEmotion: PrimaryEmotion;
  secondaryEmotions: { emotion: string; intensity: number }[];
  overallIntensity: EmotionalIntensity;
  intensityScore: number;              // 0.0-1.0
  valence: number;                     // -1.0 (negative) to +1.0 (positive)
  arousal: number;                     // 0.0 (low) to 1.0 (high)
  dominance: number;                   // 0.0 (submissive) to 1.0 (dominant)
  emotionalTrajectory: 'escalating' | 'de-escalating' | 'stable';
  emotionalCoherence: 'aligned' | 'conflicted' | 'fragmented';
  triggers: string[];
  riskFactors: string[];
  timestamp: number;
}

export interface EmotionalReport {
  userId: string;
  emotionalState: EmotionalState;
  recommendations: string[];
  responseStrategy: 'support' | 'validate' | 'ground' | 'redirect' | 'escalate';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requires_human_intervention: boolean;
}

interface EmotionMarker {
  pattern: RegExp;
  emotion: PrimaryEmotion;
  intensity: number;              // 0.0-1.0
  weight: number;
}

/**
 * AdvancedEmotionDetectionService
 *
 * Analyzes complex emotional states and patterns
 */
class AdvancedEmotionDetectionService {
  // Joy/Positive emotion markers
  private joyMarkers: EmotionMarker[] = [
    { pattern: /\b(happy|joyful|excited|thrilled|delighted|wonderful|amazing|fantastic|excellent)\b/gi, emotion: PrimaryEmotion.JOY, intensity: 0.8, weight: 0.3 },
    { pattern: /\b(love|adore|grateful|blessed|lucky|fortunate)\b/gi, emotion: PrimaryEmotion.JOY, intensity: 0.7, weight: 0.25 },
    { pattern: /😊|😄|😍|🎉|✨/g, emotion: PrimaryEmotion.JOY, intensity: 0.6, weight: 0.2 },
  ];

  // Sadness markers
  private sadnessMarkers: EmotionMarker[] = [
    { pattern: /\b(sad|depressed|unhappy|miserable|broken|hopeless|devastated|crushed|shattered)\b/gi, emotion: PrimaryEmotion.SADNESS, intensity: 0.85, weight: 0.35 },
    { pattern: /\b(miss|lonely|alone|abandoned|rejected|worthless|useless|failure)\b/gi, emotion: PrimaryEmotion.SADNESS, intensity: 0.75, weight: 0.3 },
    { pattern: /😢|😭|💔|😔/g, emotion: PrimaryEmotion.SADNESS, intensity: 0.7, weight: 0.25 },
  ];

  // Anger markers
  private angerMarkers: EmotionMarker[] = [
    { pattern: /\b(angry|furious|enraged|furious|livid|seething|disgusted|hate)\b/gi, emotion: PrimaryEmotion.ANGER, intensity: 0.9, weight: 0.35 },
    { pattern: /\b(frustrated|irritated|annoyed|upset|resentful|bitter)\b/gi, emotion: PrimaryEmotion.ANGER, intensity: 0.65, weight: 0.3 },
    { pattern: /😠|🤬|😤|🔥/g, emotion: PrimaryEmotion.ANGER, intensity: 0.8, weight: 0.3 },
  ];

  // Fear/Anxiety markers
  private fearMarkers: EmotionMarker[] = [
    { pattern: /\b(afraid|terrified|scared|petrified|anxious|worried|concerned|nervous|frightened|panicked)\b/gi, emotion: PrimaryEmotion.FEAR, intensity: 0.85, weight: 0.35 },
    { pattern: /\b(panic|dread|terror|horrified|apprehensive)\b/gi, emotion: PrimaryEmotion.FEAR, intensity: 0.9, weight: 0.4 },
    { pattern: /😨|😰|😱|😖/g, emotion: PrimaryEmotion.FEAR, intensity: 0.75, weight: 0.3 },
  ];

  // Surprise markers
  private surpriseMarkers: EmotionMarker[] = [
    { pattern: /\b(surprised|shocked|astonished|amazed|stunned|taken aback|unexpected)\b/gi, emotion: PrimaryEmotion.SURPRISE, intensity: 0.7, weight: 0.3 },
    { pattern: /\?{2,}|!!!|WOW|WHAT\b/gi, emotion: PrimaryEmotion.SURPRISE, intensity: 0.6, weight: 0.25 },
  ];

  // Disgust markers
  private disgustMarkers: EmotionMarker[] = [
    { pattern: /\b(disgusted|repulsed|revolted|sick|awful|terrible|gross|vile|disgusting)\b/gi, emotion: PrimaryEmotion.DISGUST, intensity: 0.8, weight: 0.35 },
    { pattern: /🤮|😒|🙄/g, emotion: PrimaryEmotion.DISGUST, intensity: 0.65, weight: 0.25 },
  ];

  // Cognitive distortion markers
  private distortionMarkers: Map<string, { pattern: RegExp; severity: number }> = new Map([
    ['catastrophizing', { pattern: /\b(worst|disaster|ruined|never|always|everything|impossible)\b/gi, severity: 0.8 }],
    ['black-and-white', { pattern: /\b(never|always|completely|totally|entirely|all|nothing)\b/gi, severity: 0.7 }],
    ['mind-reading', { pattern: /\b(they think|they know|everyone knows|people must think)\b/gi, severity: 0.6 }],
    ['personalization', { pattern: /\b(my fault|because of me|my problem|my responsibility)\b/gi, severity: 0.65 }],
  ]);

  // Crisis/Danger indicators
  private crisisMarkers: Map<string, RegExp> = new Map([
    ['suicide', /\b(kill myself|end it|suicidal|suicide|don't want to live|better off dead)\b/gi],
    ['self-harm', /\b(cut myself|hurt myself|self-harm|self-injury|starving myself|overdose)\b/gi],
    ['violence', /\b(hurt them|kill|attack|punch|stab|shoot|violent|harm others)\b/gi],
    ['abuse', /\b(abuse|abusive|beaten|hit|harmed|violated)\b/gi],
    ['substance', /\b(using|drugs|alcohol|high|drunk|intoxicated|addiction)\b/gi],
  ]);

  // Rumination patterns (repeated negative thoughts)
  private ruminationThreshold = 3;  // Number of repetitions before flagging

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[AdvancedEmotionDetection] ✅ Service initialized');
  }

  /**
   * Detect emotional state from text
   */
  detectEmotionalState(userId: string, recentMessage?: string): EmotionalState {
    const profile = userLinguisticProfileService.getProfile(userId);
    const text = recentMessage || profile?.rawMessages?.slice(-3).join(' ') || '';

    if (!text) {
      return this.createNeutralState(userId);
    }

    // Detect primary emotion
    const emotionScores = this.detectEmotions(text);
    const primaryEmotion = this.determinePrimaryEmotion(emotionScores);

    // Detect secondary emotions
    const secondaryEmotions = this.detectSecondaryEmotions(text, emotionScores);

    // Calculate dimensional emotions (valence, arousal, dominance)
    const valence = this.calculateValence(emotionScores);
    const arousal = this.calculateArousal(text);
    const dominance = this.calculateDominance(text);

    // Overall intensity
    const intensityScore = Math.max(...Object.values(emotionScores));
    const overallIntensity = this.scoreToIntensity(intensityScore);

    // Emotional trajectory
    const trajectory = this.detectTrajectory(userId, text);

    // Emotional coherence
    const coherence = this.detectCoherence(emotionScores);

    // Detect triggers and risk factors
    const triggers = this.detectTriggers(text);
    const riskFactors = this.detectRiskFactors(text);

    console.log(
      `[AdvancedEmotionDetection] 🎭 Detected emotion for user ${userId}: ` +
      `${primaryEmotion.toUpperCase()} (intensity: ${intensityScore.toFixed(2)}, ` +
      `valence: ${valence.toFixed(2)}, arousal: ${arousal.toFixed(2)})`
    );

    return {
      userId,
      primaryEmotion,
      secondaryEmotions,
      overallIntensity,
      intensityScore,
      valence,
      arousal,
      dominance,
      emotionalTrajectory: trajectory,
      emotionalCoherence: coherence,
      triggers,
      riskFactors,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate emotional report with recommendations
   */
  generateEmotionalReport(userId: string, recentMessage?: string): EmotionalReport {
    const emotionalState = this.detectEmotionalState(userId, recentMessage);

    // Determine response strategy
    const responseStrategy = this.selectResponseStrategy(emotionalState);

    // Calculate urgency
    const urgency = this.calculateUrgency(emotionalState);

    // Check if human intervention needed
    const requires_human_intervention = this.needsHumanIntervention(emotionalState);

    // Generate recommendations
    const recommendations = this.generateRecommendations(emotionalState, responseStrategy);

    console.log(
      `[AdvancedEmotionDetection] 📋 Generated report for user ${userId} - ` +
      `Strategy: ${responseStrategy}, Urgency: ${urgency}`
    );

    return {
      userId,
      emotionalState,
      recommendations,
      responseStrategy,
      urgency,
      requires_human_intervention,
    };
  }

  /**
   * Detect emotion scores from text
   */
  private detectEmotions(text: string): Record<PrimaryEmotion, number> {
    const scores: Record<PrimaryEmotion, number> = {
      [PrimaryEmotion.JOY]: 0,
      [PrimaryEmotion.SADNESS]: 0,
      [PrimaryEmotion.ANGER]: 0,
      [PrimaryEmotion.FEAR]: 0,
      [PrimaryEmotion.SURPRISE]: 0,
      [PrimaryEmotion.DISGUST]: 0,
      [PrimaryEmotion.NEUTRAL]: 0,
    };

    // Calculate scores for each emotion
    for (const marker of this.joyMarkers) {
      const matches = text.match(marker.pattern) || [];
      scores[PrimaryEmotion.JOY] += (matches.length * marker.intensity * marker.weight);
    }

    for (const marker of this.sadnessMarkers) {
      const matches = text.match(marker.pattern) || [];
      scores[PrimaryEmotion.SADNESS] += (matches.length * marker.intensity * marker.weight);
    }

    for (const marker of this.angerMarkers) {
      const matches = text.match(marker.pattern) || [];
      scores[PrimaryEmotion.ANGER] += (matches.length * marker.intensity * marker.weight);
    }

    for (const marker of this.fearMarkers) {
      const matches = text.match(marker.pattern) || [];
      scores[PrimaryEmotion.FEAR] += (matches.length * marker.intensity * marker.weight);
    }

    for (const marker of this.surpriseMarkers) {
      const matches = text.match(marker.pattern) || [];
      scores[PrimaryEmotion.SURPRISE] += (matches.length * marker.intensity * marker.weight);
    }

    for (const marker of this.disgustMarkers) {
      const matches = text.match(marker.pattern) || [];
      scores[PrimaryEmotion.DISGUST] += (matches.length * marker.intensity * marker.weight);
    }

    // Normalize scores to 0-1 range
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      for (const emotion in scores) {
        scores[emotion as PrimaryEmotion] = Math.min(1, scores[emotion as PrimaryEmotion] / (maxScore * 2));
      }
    }

    return scores;
  }

  /**
   * Determine primary emotion from scores
   */
  private determinePrimaryEmotion(scores: Record<PrimaryEmotion, number>): PrimaryEmotion {
    let maxScore = 0;
    let primaryEmotion = PrimaryEmotion.NEUTRAL;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore && emotion !== PrimaryEmotion.NEUTRAL) {
        maxScore = score;
        primaryEmotion = emotion as PrimaryEmotion;
      }
    }

    return primaryEmotion;
  }

  /**
   * Detect secondary emotions
   */
  private detectSecondaryEmotions(
    text: string,
    scores: Record<PrimaryEmotion, number>
  ): { emotion: string; intensity: number }[] {
    const secondary: { emotion: string; intensity: number }[] = [];

    // Define secondary emotions based on text patterns
    const secondaryPatterns: Record<string, { pattern: RegExp; related: PrimaryEmotion[] }> = {
      'anxiety': { pattern: /\b(anxious|nervous|worried|stressed)\b/gi, related: [PrimaryEmotion.FEAR] },
      'depression': { pattern: /\b(depressed|hopeless|empty|numb)\b/gi, related: [PrimaryEmotion.SADNESS] },
      'frustration': { pattern: /\b(frustrated|exasperated|annoyed)\b/gi, related: [PrimaryEmotion.ANGER] },
      'guilt': { pattern: /\b(guilty|ashamed|embarrassed|wrong)\b/gi, related: [PrimaryEmotion.SADNESS, PrimaryEmotion.ANGER] },
      'shame': { pattern: /\b(shame|ashamed|humiliated|exposed)\b/gi, related: [PrimaryEmotion.SADNESS, PrimaryEmotion.FEAR] },
      'jealousy': { pattern: /\b(jealous|envious|resentful)\b/gi, related: [PrimaryEmotion.ANGER, PrimaryEmotion.SADNESS] },
    };

    for (const [emotion, config] of Object.entries(secondaryPatterns)) {
      const matches = text.match(config.pattern) || [];
      if (matches.length > 0) {
        const intensity = Math.min(1, (matches.length * 0.3));
        secondary.push({ emotion, intensity });
      }
    }

    return secondary.sort((a, b) => b.intensity - a.intensity);
  }

  /**
   * Calculate valence (-1 to +1)
   */
  private calculateValence(scores: Record<PrimaryEmotion, number>): number {
    const positive = scores[PrimaryEmotion.JOY] + (scores[PrimaryEmotion.SURPRISE] * 0.5);
    const negative = scores[PrimaryEmotion.SADNESS] + scores[PrimaryEmotion.ANGER] + scores[PrimaryEmotion.FEAR] + scores[PrimaryEmotion.DISGUST];

    return (positive - negative) / Math.max(1, positive + negative);
  }

  /**
   * Calculate arousal (0 to 1)
   */
  private calculateArousal(text: string): number {
    const excitations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;
    const caps = (text.match(/[A-Z]{2,}/g) || []).length;

    const baseArousal = Math.min(1, (excitations + questions + caps * 0.5) / 20);

    // Check for calming language
    const calmWords = /\b(calm|peaceful|relax|breathe|quiet|still|gentle)\b/gi;
    const calmCount = (text.match(calmWords) || []).length;

    return Math.max(0, Math.min(1, baseArousal - (calmCount * 0.1)));
  }

  /**
   * Calculate dominance (0 to 1)
   */
  private calculateDominance(text: string): number {
    const assertive = /\b(I will|I must|I should|I demand|I insist|I need|I want)\b/gi;
    const submissive = /\b(maybe|perhaps|might|could|sorry|sorry|please forgive)\b/gi;

    const assertiveCount = (text.match(assertive) || []).length;
    const submissiveCount = (text.match(submissive) || []).length;

    return (assertiveCount - submissiveCount) / Math.max(1, assertiveCount + submissiveCount + 1);
  }

  /**
   * Convert intensity score to level
   */
  private scoreToIntensity(score: number): EmotionalIntensity {
    if (score < 0.3) return EmotionalIntensity.MILD;
    if (score < 0.6) return EmotionalIntensity.MODERATE;
    if (score < 0.8) return EmotionalIntensity.HIGH;
    return EmotionalIntensity.CRITICAL;
  }

  /**
   * Detect emotional trajectory
   */
  private detectTrajectory(userId: string, text: string): 'escalating' | 'de-escalating' | 'stable' {
    // Simple heuristic: check for escalation markers
    const escalationWords = /\b(getting|becoming|more|worse|increasingly|can't take|breaking|falling apart)\b/gi;
    const calming = /\b(better|improving|calming|relaxing|feeling better)\b/gi;

    const escalations = (text.match(escalationWords) || []).length;
    const calmings = (text.match(calming) || []).length;

    if (escalations > calmings) return 'escalating';
    if (calmings > escalations) return 'de-escalating';
    return 'stable';
  }

  /**
   * Detect emotional coherence
   */
  private detectCoherence(scores: Record<PrimaryEmotion, number>): 'aligned' | 'conflicted' | 'fragmented' {
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const topScore = sortedScores[0];
    const secondScore = sortedScores[1];

    // If one emotion dominates clearly, emotions are aligned
    if (topScore > secondScore * 1.5) return 'aligned';

    // If two emotions are close, user is conflicted
    if (Math.abs(topScore - secondScore) < 0.2) return 'conflicted';

    // If multiple emotions are present, fragmented
    return 'fragmented';
  }

  /**
   * Detect triggers and stressors
   */
  private detectTriggers(text: string): string[] {
    const triggers: string[] = [];

    const triggerPatterns: Record<string, RegExp> = {
      'social': /\b(friend|people|social|rejected|alone|lonely|friend)\b/gi,
      'work': /\b(work|job|boss|colleague|coworker|career|fired)\b/gi,
      'family': /\b(family|parent|mother|father|sibling|relationship|break up|divorce)\b/gi,
      'health': /\b(sick|ill|disease|dying|death|hospital|doctor|medicine)\b/gi,
      'financial': /\b(money|debt|poor|broke|financial|payment|loan)\b/gi,
      'performance': /\b(fail|failure|disappointed|not good enough|stupid|incompetent)\b/gi,
    };

    for (const [trigger, pattern] of Object.entries(triggerPatterns)) {
      if ((text.match(pattern) || []).length > 0) {
        triggers.push(trigger);
      }
    }

    return triggers;
  }

  /**
   * Detect risk factors and crisis indicators
   */
  private detectRiskFactors(text: string): string[] {
    const riskFactors: string[] = [];

    for (const [risk, pattern] of this.crisisMarkers) {
      if ((text.match(pattern) || []).length > 0) {
        riskFactors.push(`CRITICAL: ${risk}`);
      }
    }

    // Detect cognitive distortions
    for (const [distortion, config] of this.distortionMarkers) {
      const matches = (text.match(config.pattern) || []).length;
      if (matches > 2) {
        riskFactors.push(`Cognitive distortion: ${distortion}`);
      }
    }

    return riskFactors;
  }

  /**
   * Select appropriate response strategy
   */
  private selectResponseStrategy(state: EmotionalState): 'support' | 'validate' | 'ground' | 'redirect' | 'escalate' {
    // Critical risk factors require escalation
    if (state.riskFactors.some(r => r.startsWith('CRITICAL'))) {
      return 'escalate';
    }

    // High intensity with negative valence requires grounding
    if (state.intensityScore > 0.7 && state.valence < -0.3) {
      return 'ground';
    }

    // Conflicted emotions need validation
    if (state.emotionalCoherence === 'conflicted') {
      return 'validate';
    }

    // Escalating emotions need support
    if (state.emotionalTrajectory === 'escalating') {
      return 'support';
    }

    // Default to redirect (help refocus)
    return 'redirect';
  }

  /**
   * Calculate response urgency
   */
  private calculateUrgency(state: EmotionalState): 'low' | 'medium' | 'high' | 'critical' {
    // Critical if any crisis markers
    if (state.riskFactors.some(r => r.startsWith('CRITICAL'))) {
      return 'critical';
    }

    // High if intensity is high and negative
    if (state.intensityScore > 0.7 && state.valence < -0.3) {
      return 'high';
    }

    // Medium if moderate intensity negative emotion
    if (state.intensityScore > 0.5 && state.valence < 0) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check if human intervention needed
   */
  private needsHumanIntervention(state: EmotionalState): boolean {
    // Any critical risk factors
    if (state.riskFactors.some(r => r.startsWith('CRITICAL'))) {
      return true;
    }

    // Extreme emotional intensity with severe negative valence
    if (state.intensityScore > 0.8 && state.valence < -0.5) {
      return true;
    }

    return false;
  }

  /**
   * Generate recommendations based on emotional state
   */
  private generateRecommendations(
    state: EmotionalState,
    strategy: 'support' | 'validate' | 'ground' | 'redirect' | 'escalate'
  ): string[] {
    const recommendations: string[] = [];

    switch (strategy) {
      case 'escalate':
        recommendations.push('URGENT: Connect user with mental health professional');
        recommendations.push('Provide crisis hotline numbers');
        recommendations.push('Encourage immediate safety measures');
        break;

      case 'ground':
        recommendations.push('Use grounding techniques (5 senses)');
        recommendations.push('Focus on present moment');
        recommendations.push('Offer concrete coping strategies');
        break;

      case 'validate':
        recommendations.push('Acknowledge conflicting feelings as normal');
        recommendations.push('Help user explore both sides');
        recommendations.push('Avoid forcing resolution');
        break;

      case 'support':
        recommendations.push('Provide emotional support and empathy');
        recommendations.push('Help identify coping resources');
        recommendations.push('Offer perspective and hope');
        break;

      case 'redirect':
        recommendations.push('Gently redirect focus to constructive actions');
        recommendations.push('Suggest problem-solving approaches');
        recommendations.push('Build on strengths');
        break;
    }

    // Add emotion-specific recommendations
    if (state.primaryEmotion === PrimaryEmotion.SADNESS) {
      recommendations.push('Consider suggesting professional support if persistent');
    } else if (state.primaryEmotion === PrimaryEmotion.ANGER) {
      recommendations.push('Help identify underlying needs');
    } else if (state.primaryEmotion === PrimaryEmotion.FEAR) {
      recommendations.push('Offer reassurance and concrete safety planning');
    }

    return recommendations;
  }

  /**
   * Create neutral emotional state
   */
  private createNeutralState(userId: string): EmotionalState {
    return {
      userId,
      primaryEmotion: PrimaryEmotion.NEUTRAL,
      secondaryEmotions: [],
      overallIntensity: EmotionalIntensity.MILD,
      intensityScore: 0.2,
      valence: 0,
      arousal: 0.3,
      dominance: 0.5,
      emotionalTrajectory: 'stable',
      emotionalCoherence: 'aligned',
      triggers: [],
      riskFactors: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[AdvancedEmotionDetection] 🔄 Service reset');
  }
}

// Export singleton instance
export const advancedEmotionDetectionService = new AdvancedEmotionDetectionService();
