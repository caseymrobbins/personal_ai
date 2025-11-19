/**
 * Tonal Resonance Service
 *
 * Detects and applies the user's emotional tone and energy level:
 * - Energy levels (excited, casual, formal, tired, contemplative)
 * - Emotional tone (positive, neutral, negative, anxious, contemplative)
 * - Sentiment indicators (enthusiasm markers, hesitation, confidence)
 * - Tone register (intimate, professional, academic, casual, playful)
 *
 * Matches AI responses to user's natural emotional expressions and communication energy.
 */

import { userLinguisticProfileService } from './user-linguistic-profile.service';

export interface TonalProfile {
  userId: string;
  dominantEnergyLevel: 'excited' | 'casual' | 'formal' | 'tired' | 'contemplative';
  dominantTone: 'positive' | 'neutral' | 'negative' | 'anxious' | 'contemplative';
  toneRegister: 'intimate' | 'professional' | 'academic' | 'casual' | 'playful';
  excitementScore: number;      // 0.0-1.0
  formalityScore: number;        // 0.0-1.0
  confidenceScore: number;       // 0.0-1.0
  sentimentScore: number;        // -1.0 (negative) to +1.0 (positive)
  energyLevel: number;           // 0.0 (low) to 1.0 (high)
  stabilityIndex: number;        // 0.0 (unstable) to 1.0 (stable/grounded)
  toneMarkers: {
    exclamations: number;
    ellipsis: number;
    questionMarks: number;
    allCaps: number;
    hesitationMarkers: number;
    formalIndicators: number;
  };
  readyForTonalMirroring: boolean;
  confidenceLevel: number;
}

export interface TonalAdaptation {
  userId: string;
  originalText: string;
  adaptedText: string;
  energyAdjustment: number;      // -1 to +1 (more calm to more excited)
  toneShift: string;
  appliedTechniques: string[];
  overallConfidence: number;
}

interface EmotionalMarker {
  pattern: RegExp;
  energy: number;
  sentiment: number;
  formality: number;
  weight: number;
}

/**
 * TonalResonanceService
 *
 * Analyzes and applies user's emotional tone to responses
 */
class TonalResonanceService {
  // Emotional marker patterns
  private excitementPatterns: EmotionalMarker[] = [
    { pattern: /!/g, energy: 0.8, sentiment: 0.3, formality: -0.5, weight: 0.2 },
    { pattern: /!!+/g, energy: 1.0, sentiment: 0.5, formality: -0.7, weight: 0.3 },
    { pattern: /\?!/g, energy: 0.9, sentiment: 0.4, formality: -0.6, weight: 0.25 },
    { pattern: /LOVE|AMAZING|AWESOME|INCREDIBLE|FANTASTIC|WONDERFUL/gi, energy: 0.85, sentiment: 0.8, formality: -0.3, weight: 0.3 },
    { pattern: /so|very|really|quite|extremely/gi, energy: 0.6, sentiment: 0.3, formality: 0.1, weight: 0.2 },
    { pattern: /[A-Z]{2,}(?:\s[A-Z]{2,})+/g, energy: 0.9, sentiment: 0.2, formality: -0.8, weight: 0.35 },
  ];

  private formalityPatterns: EmotionalMarker[] = [
    { pattern: /\b(however|moreover|furthermore|consequently|notwithstanding)\b/gi, energy: -0.2, sentiment: 0, formality: 0.9, weight: 0.4 },
    { pattern: /\b(shall|would|could|should)\b/gi, energy: -0.1, sentiment: 0, formality: 0.7, weight: 0.3 },
    { pattern: /\b(herein|thereof|accordingly)\b/gi, energy: -0.3, sentiment: 0, formality: 1.0, weight: 0.45 },
    { pattern: /\./g, energy: -0.1, sentiment: 0, formality: 0.3, weight: 0.1 },
  ];

  private hesitationPatterns: EmotionalMarker[] = [
    { pattern: /\.\.\./g, energy: -0.4, sentiment: -0.2, formality: -0.2, weight: 0.3 },
    { pattern: /\?(?![!?])/g, energy: -0.3, sentiment: -0.1, formality: 0, weight: 0.2 },
    { pattern: /\b(maybe|perhaps|might|could|probably|possibly)\b/gi, energy: -0.4, sentiment: -0.2, formality: 0.1, weight: 0.25 },
    { pattern: /\b(um|uh|erm|hmm)\b/gi, energy: -0.5, sentiment: -0.1, formality: -0.5, weight: 0.2 },
  ];

  private confidencePatterns: EmotionalMarker[] = [
    { pattern: /\b(definitely|absolutely|certainly|obviously|clearly)\b/gi, energy: 0.5, sentiment: 0.2, formality: 0.3, weight: 0.35 },
    { pattern: /\b(must|will|shall|should)\b/gi, energy: 0.4, sentiment: 0.1, formality: 0.5, weight: 0.3 },
    { pattern: /\b(assert|insist|declare)\b/gi, energy: 0.6, sentiment: 0.1, formality: 0.7, weight: 0.4 },
  ];

  private casualPatterns: EmotionalMarker[] = [
    { pattern: /\b(like|yeah|totally|dude|man|lol|haha|wanna|gonna)\b/gi, energy: 0.6, sentiment: 0.3, formality: -0.9, weight: 0.4 },
    { pattern: /\b(so|anyway|basically|literally|actually)\b/gi, energy: 0.3, sentiment: 0, formality: -0.4, weight: 0.2 },
    { pattern: /[)(]/g, energy: 0.3, sentiment: 0.2, formality: -0.3, weight: 0.15 },
  ];

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[TonalResonance] ✅ Service initialized');
  }

  /**
   * Analyze user's tonal profile
   */
  analyzeTonalProfile(userId: string): TonalProfile {
    const profile = userLinguisticProfileService.getProfile(userId);

    if (!profile || profile.totalMessagesAnalyzed < 5) {
      return this.createEmptyProfile(userId);
    }

    const excitementScore = this.calculateExcitementScore(profile);
    const formalityScore = this.calculateFormalityScore(profile);
    const confidenceScore = this.calculateConfidenceScore(profile);
    const sentimentScore = this.calculateSentimentScore(profile);
    const energyLevel = (excitementScore + confidenceScore) / 2;
    const stabilityIndex = Math.max(0, 1 - Math.abs(sentimentScore));

    const dominantEnergyLevel = this.determineDominantEnergyLevel(energyLevel, formalityScore, sentimentScore);
    const dominantTone = this.determineDominantTone(sentimentScore, energyLevel, stabilityIndex);
    const toneRegister = this.determineToneRegister(formalityScore, energyLevel);

    console.log(
      `[TonalResonance] 🎭 Analyzed tonal profile for user ${userId} ` +
      `(energy: ${energyLevel.toFixed(2)}, formality: ${formalityScore.toFixed(2)}, ` +
      `confidence: ${confidenceScore.toFixed(2)}, sentiment: ${sentimentScore.toFixed(2)})`
    );

    return {
      userId,
      dominantEnergyLevel,
      dominantTone,
      toneRegister,
      excitementScore,
      formalityScore,
      confidenceScore,
      sentimentScore,
      energyLevel,
      stabilityIndex,
      toneMarkers: this.extractToneMarkers(profile),
      readyForTonalMirroring: profile.totalMessagesAnalyzed >= 5,
      confidenceLevel: Math.min(1, profile.confidenceScore * 0.95),
    };
  }

  /**
   * Apply tonal mirroring to text
   */
  applyTonalMirroring(userId: string, text: string): TonalAdaptation {
    const tonalProfile = this.analyzeTonalProfile(userId);

    if (!tonalProfile.readyForTonalMirroring) {
      return {
        userId,
        originalText: text,
        adaptedText: text,
        energyAdjustment: 0,
        toneShift: 'none',
        appliedTechniques: [],
        overallConfidence: 0,
      };
    }

    let adaptedText = text;
    const appliedTechniques: string[] = [];
    let energyAdjustment = 0;

    // Apply energy level adjustments
    if (tonalProfile.energyLevel > 0.7) {
      adaptedText = this.addExcitement(adaptedText, tonalProfile.excitementScore, appliedTechniques);
      energyAdjustment += 0.3;
    } else if (tonalProfile.energyLevel < 0.3) {
      adaptedText = this.addCalmness(adaptedText, appliedTechniques);
      energyAdjustment -= 0.3;
    }

    // Apply formality adjustments
    if (tonalProfile.formalityScore > 0.6) {
      adaptedText = this.applyFormalTone(adaptedText, appliedTechniques);
    } else if (tonalProfile.formalityScore < 0.3) {
      adaptedText = this.applyCasualTone(adaptedText, appliedTechniques);
    }

    // Apply confidence adjustments
    if (tonalProfile.confidenceScore > 0.7) {
      adaptedText = this.addConfidence(adaptedText, appliedTechniques);
    } else if (tonalProfile.confidenceScore < 0.3) {
      adaptedText = this.addHesitation(adaptedText, appliedTechniques);
    }

    // Apply sentiment alignment
    if (tonalProfile.sentimentScore > 0.3) {
      adaptedText = this.addPositiveLanguage(adaptedText, appliedTechniques);
    } else if (tonalProfile.sentimentScore < -0.3) {
      adaptedText = this.addNeutralRealism(adaptedText, appliedTechniques);
    }

    const overallConfidence = tonalProfile.confidenceLevel;
    const toneShift = this.describeToneShift(tonalProfile);

    console.log(
      `[TonalResonance] 🎵 Applied tonal mirroring for user ${userId} ` +
      `(techniques: ${appliedTechniques.length}, confidence: ${(overallConfidence * 100).toFixed(0)}%)`
    );

    return {
      userId,
      originalText: text,
      adaptedText,
      energyAdjustment,
      toneShift,
      appliedTechniques,
      overallConfidence,
    };
  }

  /**
   * Calculate excitement score based on user profile
   */
  private calculateExcitementScore(profile: any): number {
    let score = 0;
    let weight = 0;

    for (const pattern of this.excitementPatterns) {
      const matches = (profile.rawMessages?.join(' ') || '').match(pattern.pattern) || [];
      score += (matches.length * pattern.weight * pattern.energy);
      weight += pattern.weight;
    }

    return Math.min(1, weight > 0 ? (score / weight + 1) / 2 : 0.5);
  }

  /**
   * Calculate formality score based on user profile
   */
  private calculateFormalityScore(profile: any): number {
    let score = 0;
    let weight = 0;

    for (const pattern of this.formalityPatterns) {
      const matches = (profile.rawMessages?.join(' ') || '').match(pattern.pattern) || [];
      score += (matches.length * pattern.weight * pattern.formality);
      weight += pattern.weight;
    }

    return Math.min(1, Math.max(0, weight > 0 ? (score / weight + 1) / 2 : 0.5));
  }

  /**
   * Calculate confidence score based on user profile
   */
  private calculateConfidenceScore(profile: any): number {
    let confidenceScore = 0;
    let hesitationScore = 0;
    let weight = 0;

    for (const pattern of this.confidencePatterns) {
      const matches = (profile.rawMessages?.join(' ') || '').match(pattern.pattern) || [];
      confidenceScore += (matches.length * pattern.weight);
      weight += pattern.weight;
    }

    for (const pattern of this.hesitationPatterns) {
      const matches = (profile.rawMessages?.join(' ') || '').match(pattern.pattern) || [];
      hesitationScore += (matches.length * pattern.weight);
      weight += pattern.weight;
    }

    const net = (confidenceScore - hesitationScore) / Math.max(1, weight);
    return Math.min(1, Math.max(0, (net + 1) / 2));
  }

  /**
   * Calculate sentiment score (-1.0 to +1.0)
   */
  private calculateSentimentScore(profile: any): number {
    let positiveScore = 0;
    let negativeScore = 0;
    const text = profile.rawMessages?.join(' ') || '';

    // Positive indicators
    const positiveWords = /\b(great|good|excellent|wonderful|amazing|love|happy|pleased|grateful|fantastic)\b/gi;
    const positiveMatches = text.match(positiveWords) || [];
    positiveScore = positiveMatches.length * 0.15;

    // Negative indicators
    const negativeWords = /\b(bad|terrible|awful|hate|angry|frustrated|disappointed|sad|worried)\b/gi;
    const negativeMatches = text.match(negativeWords) || [];
    negativeScore = negativeMatches.length * 0.15;

    // Questions and uncertainty reduce positive sentiment
    const questionMarks = (text.match(/\?/g) || []).length;
    const ellipsis = (text.match(/\.\.\./g) || []).length;
    negativeScore += (questionMarks + ellipsis) * 0.05;

    return Math.min(1, Math.max(-1, (positiveScore - negativeScore) / Math.max(1, positiveScore + negativeScore + 1)));
  }

  /**
   * Determine dominant energy level
   */
  private determineDominantEnergyLevel(
    energyLevel: number,
    formalityScore: number,
    sentimentScore: number
  ): 'excited' | 'casual' | 'formal' | 'tired' | 'contemplative' {
    if (energyLevel > 0.7 && sentimentScore > 0.3) {
      return 'excited';
    } else if (formalityScore > 0.6) {
      return 'formal';
    } else if (energyLevel < 0.3) {
      return 'tired';
    } else if (sentimentScore < -0.2) {
      return 'contemplative';
    } else {
      return 'casual';
    }
  }

  /**
   * Determine dominant tone
   */
  private determineDominantTone(
    sentimentScore: number,
    energyLevel: number,
    stabilityIndex: number
  ): 'positive' | 'neutral' | 'negative' | 'anxious' | 'contemplative' {
    if (sentimentScore > 0.3) {
      return 'positive';
    } else if (sentimentScore < -0.3) {
      return stabilityIndex < 0.4 ? 'anxious' : 'contemplative';
    } else if (energyLevel < 0.4 && sentimentScore < 0.1) {
      return 'contemplative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Determine tone register
   */
  private determineToneRegister(
    formalityScore: number,
    energyLevel: number
  ): 'intimate' | 'professional' | 'academic' | 'casual' | 'playful' {
    if (formalityScore > 0.75) {
      return 'academic';
    } else if (formalityScore > 0.55) {
      return 'professional';
    } else if (energyLevel > 0.7) {
      return 'playful';
    } else if (energyLevel < 0.4) {
      return 'intimate';
    } else {
      return 'casual';
    }
  }

  /**
   * Extract tone markers from profile
   */
  private extractToneMarkers(profile: any): any {
    const text = profile.rawMessages?.join(' ') || '';

    return {
      exclamations: (text.match(/!/g) || []).length,
      ellipsis: (text.match(/\.\.\./g) || []).length,
      questionMarks: (text.match(/\?/g) || []).length,
      allCaps: (text.match(/[A-Z]{2,}/g) || []).length,
      hesitationMarkers: (text.match(/\b(um|uh|erm|hmm|maybe|perhaps)\b/gi) || []).length,
      formalIndicators: (text.match(/\b(however|moreover|furthermore|accordingly)\b/gi) || []).length,
    };
  }

  /**
   * Add excitement to text
   */
  private addExcitement(text: string, excitementScore: number, techniques: string[]): string {
    let result = text;

    // Add exclamation marks selectively
    if (excitementScore > 0.7) {
      result = result.replace(/([.!?])(\s+)([A-Z])/g, '$1!$2$3');
      techniques.push('Added emphasis with exclamations');
    }

    // Capitalize important words
    if (excitementScore > 0.8) {
      result = result.replace(/\b(really|very|so|absolutely)\b/gi, (match) => match.toUpperCase());
      techniques.push('Capitalized intensifiers');
    }

    return result;
  }

  /**
   * Add calmness to text
   */
  private addCalmness(text: string, techniques: string[]): string {
    let result = text;

    // Reduce exclamation marks
    result = result.replace(/!{2,}/g, '.');
    result = result.replace(/!(?=[.?])/g, '');

    // Replace intensity markers with measured language
    result = result.replace(/\b(absolutely|definitely|must)\b/gi, 'likely');
    result = result.replace(/\b(amazing|incredible|fantastic)\b/gi, 'interesting');

    techniques.push('Applied measured language');
    return result;
  }

  /**
   * Apply formal tone
   */
  private applyFormalTone(text: string, techniques: string[]): string {
    let result = text;

    // Replace casual markers
    result = result.replace(/\b(yeah|yep|nope|wanna|gonna|gotta)\b/gi, (match) => {
      const formalMap: Record<string, string> = {
        'yeah': 'yes',
        'yep': 'affirmative',
        'nope': 'no',
        'wanna': 'would like to',
        'gonna': 'will',
        'gotta': 'must',
      };
      return formalMap[match.toLowerCase()] || match;
    });

    // Add transitional phrases
    if (!result.includes('however') && !result.includes('moreover')) {
      result = result.replace(/\. ([A-Z])/g, '. Furthermore, $1');
      techniques.push('Added formal transitions');
    }

    return result;
  }

  /**
   * Apply casual tone
   */
  private applyCasualTone(text: string, techniques: string[]): string {
    let result = text;

    // Replace formal markers with casual equivalents
    result = result.replace(/\b(however|moreover|nevertheless)\b/gi, 'but');
    result = result.replace(/\b(subsequently|accordingly)\b/gi, 'so');

    // Contractions
    result = result.replace(/\b(will not|cannot|do not|have not)\b/gi, (match) => {
      const contractMap: Record<string, string> = {
        'will not': "won't",
        'cannot': "can't",
        'do not': "don't",
        'have not': "haven't",
      };
      return contractMap[match.toLowerCase()] || match;
    });

    techniques.push('Applied casual phrasing');
    return result;
  }

  /**
   * Add confidence to text
   */
  private addConfidence(text: string, techniques: string[]): string {
    let result = text;

    // Replace hedging language
    result = result.replace(/\b(maybe|perhaps|might|possibly|could)\b/gi, 'will');
    result = result.replace(/\b(seem|appear|tend to)\b/gi, 'is');

    // Add assertive markers
    if (!result.includes('clearly') && !result.includes('obviously')) {
      result = result.replace(/^(.+?)(\. |$)/m, 'Clearly, $1$2');
      techniques.push('Added assertive framing');
    }

    return result;
  }

  /**
   * Add hesitation to text
   */
  private addHesitation(text: string, techniques: string[]): string {
    let result = text;

    // Add hedging language
    result = result.replace(/\b(will|is|are|does)\b/gi, (match) => {
      const hedgeMap: Record<string, string> = {
        'will': 'might',
        'is': 'could be',
        'are': 'could be',
        'does': 'might',
      };
      return hedgeMap[match.toLowerCase()] || match;
    });

    // Add ellipsis selectively
    result = result.replace(/([.!?])(\s+)([A-Z])/g, '$1..$2$3');
    techniques.push('Added softened language');

    return result;
  }

  /**
   * Add positive language
   */
  private addPositiveLanguage(text: string, techniques: string[]): string {
    let result = text;

    // Add positive conjunctions
    result = result.replace(/\bbut\b/gi, 'and');
    result = result.replace(/\bproblem/gi, 'opportunity');
    result = result.replace(/\bdifficult/gi, 'challenging');

    techniques.push('Applied positive framing');
    return result;
  }

  /**
   * Add neutral realism
   */
  private addNeutralRealism(text: string, techniques: string[]): string {
    let result = text;

    // Remove emotional intensifiers
    result = result.replace(/\b(really|very|so|quite|extremely)\b/gi, '');

    // Add balanced perspective
    result = result.replace(/\. ([A-Z])/g, '. That said, $1');
    techniques.push('Applied realistic perspective');

    return result;
  }

  /**
   * Describe the tone shift applied
   */
  private describeToneShift(tonalProfile: TonalProfile): string {
    return `${tonalProfile.dominantEnergyLevel} + ${tonalProfile.dominantTone} (${tonalProfile.toneRegister})`;
  }

  /**
   * Create empty profile when insufficient data
   */
  private createEmptyProfile(userId: string): TonalProfile {
    return {
      userId,
      dominantEnergyLevel: 'casual',
      dominantTone: 'neutral',
      toneRegister: 'casual',
      excitementScore: 0.5,
      formalityScore: 0.5,
      confidenceScore: 0.5,
      sentimentScore: 0,
      energyLevel: 0.5,
      stabilityIndex: 1.0,
      toneMarkers: {
        exclamations: 0,
        ellipsis: 0,
        questionMarks: 0,
        allCaps: 0,
        hesitationMarkers: 0,
        formalIndicators: 0,
      },
      readyForTonalMirroring: false,
      confidenceLevel: 0,
    };
  }

  /**
   * Get tonal statistics for a user
   */
  getTonalStats(userId: string) {
    const profile = this.analyzeTonalProfile(userId);

    return {
      userId,
      energyLevel: profile.energyLevel,
      formalityScore: profile.formalityScore,
      confidenceScore: profile.confidenceScore,
      sentimentScore: profile.sentimentScore,
      stabilityIndex: profile.stabilityIndex,
      dominantEnergyLevel: profile.dominantEnergyLevel,
      dominantTone: profile.dominantTone,
      toneRegister: profile.toneRegister,
      readyForMirroring: profile.readyForTonalMirroring,
      confidenceLevel: profile.confidenceLevel,
    };
  }

  /**
   * Compare tonal profiles between two users
   */
  compareTonalProfiles(userId1: string, userId2: string) {
    const profile1 = this.analyzeTonalProfile(userId1);
    const profile2 = this.analyzeTonalProfile(userId2);

    if (!profile1.readyForTonalMirroring || !profile2.readyForTonalMirroring) {
      return null;
    }

    const energyDiff = Math.abs(profile1.energyLevel - profile2.energyLevel);
    const formalityDiff = Math.abs(profile1.formalityScore - profile2.formalityScore);
    const sentimentDiff = Math.abs(profile1.sentimentScore - profile2.sentimentScore);

    const averageDiff = (energyDiff + formalityDiff + sentimentDiff) / 3;
    const similarityScore = 1 - averageDiff;

    return {
      user1Id: userId1,
      user2Id: userId2,
      energyDifference: energyDiff,
      formalityDifference: formalityDiff,
      sentimentDifference: sentimentDiff,
      similarityScore,
      user1Tone: `${profile1.dominantEnergyLevel}/${profile1.dominantTone}`,
      user2Tone: `${profile2.dominantEnergyLevel}/${profile2.dominantTone}`,
    };
  }

  /**
   * Check if text matches user's tone
   */
  checkToneMatch(userId: string, text: string): {
    matchScore: number;
    energyMatch: number;
    formalityMatch: number;
    sentimentMatch: number;
    feedback: string[];
  } {
    const profile = this.analyzeTonalProfile(userId);

    if (!profile.readyForTonalMirroring) {
      return {
        matchScore: 0,
        energyMatch: 0,
        formalityMatch: 0,
        sentimentMatch: 0,
        feedback: ['Insufficient profile data for tone matching'],
      };
    }

    // Analyze text tone
    const textExcitement = this.calculateExcitementScore({ rawMessages: [text] });
    const textFormality = this.calculateFormalityScore({ rawMessages: [text] });
    const textSentiment = this.calculateSentimentScore({ rawMessages: [text] });

    const energyMatch = 1 - Math.abs(textExcitement - profile.excitementScore);
    const formalityMatch = 1 - Math.abs(textFormality - profile.formalityScore);
    const sentimentMatch = 1 - Math.abs(textSentiment - profile.sentimentScore);

    const matchScore = (energyMatch + formalityMatch + sentimentMatch) / 3;

    const feedback: string[] = [];
    if (energyMatch < 0.6) {
      feedback.push(textExcitement > profile.excitementScore ? 'Text is too excited' : 'Text is too calm');
    }
    if (formalityMatch < 0.6) {
      feedback.push(textFormality > profile.formalityScore ? 'Text is too formal' : 'Text is too casual');
    }
    if (sentimentMatch < 0.6) {
      feedback.push(textSentiment > profile.sentimentScore ? 'Text is too positive' : 'Text is too negative');
    }
    if (feedback.length === 0) {
      feedback.push('Tone matches user patterns well');
    }

    return {
      matchScore: Math.max(0, Math.min(1, matchScore)),
      energyMatch,
      formalityMatch,
      sentimentMatch,
      feedback,
    };
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[TonalResonance] 🔄 Service reset');
  }
}

// Export singleton instance
export const tonalResonanceService = new TonalResonanceService();
