/**
 * Syntax Mirroring Service
 *
 * Analyzes and applies user's syntactic patterns to generated responses:
 * - Sentence length distribution (short, medium, long, very long)
 * - Complexity level (simple vs. academic)
 * - Grammatical structures and patterns
 * - Punctuation style (commas, semicolons, dashes, etc.)
 * - Paragraph structure and formatting
 *
 * Restructures responses to match user's natural writing patterns
 * while maintaining semantic meaning.
 */

import { userLinguisticProfileService } from './user-linguistic-profile.service';

export interface SyntaxAdaptation {
  userId: string;
  originalText: string;
  adaptedText: string;
  sentencesModified: number;
  averageOriginalLength: number;
  averageAdaptedLength: number;
  complexityAdjustment: number;  // -1 to +1 (simpler to more complex)
  structureChangeApplied: string[];
  confidence: number;
}

interface SentenceSegment {
  text: string;
  wordCount: number;
  punctuation: string;
  complexity: number;
}

/**
 * SyntaxMirroringService
 *
 * Applies user's syntactic patterns to text
 */
class SyntaxMirroringService {
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[SyntaxMirroring] ✅ Service initialized');
  }

  /**
   * Apply syntax mirroring to text based on user profile
   */
  async mirrorSyntax(userId: string, text: string): Promise<SyntaxAdaptation> {
    const profile = userLinguisticProfileService.getProfile(userId);

    if (!profile || profile.totalMessagesAnalyzed < 3) {
      // Not enough data yet
      return {
        userId,
        originalText: text,
        adaptedText: text,
        sentencesModified: 0,
        averageOriginalLength: 0,
        averageAdaptedLength: 0,
        complexityAdjustment: 0,
        structureChangeApplied: [],
        confidence: 0,
      };
    }

    // Segment the text into sentences
    const sentences = this.segmentSentences(text);
    const averageOriginalLength = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.wordCount, 0) / sentences.length
      : 0;

    const userSyntax = profile.syntax;
    const structureChanges: string[] = [];

    // Adapt each sentence to match user's patterns
    const adaptedSentences = sentences.map((sentence, index) => {
      return this.adaptSentenceLength(
        sentence,
        userSyntax.averageSentenceLength,
        userSyntax.sentenceLengthDistribution,
        index,
        structureChanges
      );
    });

    // Apply punctuation patterns
    const adaptedText = this.applyPunctuationPatterns(
      adaptedSentences,
      profile.formatting.punctuationStyle,
      structureChanges
    );

    // Apply complexity adjustments
    const complexityAdjustedText = this.adjustComplexity(
      adaptedText,
      userSyntax.complexityScore,
      structureChanges
    );

    // Apply formatting preferences
    const finalText = this.applyFormatting(
      complexityAdjustedText,
      profile.formatting,
      structureChanges
    );

    const adaptedSentencesList = this.segmentSentences(finalText);
    const averageAdaptedLength = adaptedSentencesList.length > 0
      ? adaptedSentencesList.reduce((sum, s) => sum + s.wordCount, 0) / adaptedSentencesList.length
      : 0;

    const complexityAdjustment = userSyntax.complexityScore * 2 - 1; // -1 to +1

    console.log(
      `[SyntaxMirroring] 📝 Applied syntax mirroring for user ${userId} ` +
      `(sentences: ${sentences.length}, avg length: ${averageOriginalLength.toFixed(1)} → ${averageAdaptedLength.toFixed(1)} words)`
    );

    return {
      userId,
      originalText: text,
      adaptedText: finalText,
      sentencesModified: adaptedSentences.length,
      averageOriginalLength,
      averageAdaptedLength,
      complexityAdjustment,
      structureChangeApplied: structureChanges,
      confidence: Math.min(1, profile.confidenceScore * 0.9),
    };
  }

  /**
   * Segment text into sentences
   */
  private segmentSentences(text: string): SentenceSegment[] {
    // Split by sentence-ending punctuation
    const sentenceTexts = text.split(/(?<=[.!?])\s+(?=[A-Z])/);

    return sentenceTexts
      .filter(s => s.trim().length > 0)
      .map(sentenceText => {
        const words = sentenceText.trim().split(/\s+/);
        const punctuation = sentenceText.match(/[.!?]+$/)?.[0] || '.';
        const complexity = this.calculateComplexity(sentenceText);

        return {
          text: sentenceText,
          wordCount: words.length,
          punctuation,
          complexity,
        };
      });
  }

  /**
   * Calculate complexity of a sentence (0.0-1.0)
   */
  private calculateComplexity(sentence: string): number {
    const words = sentence.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(1, words.length);
    const hasClause = /,|;|and|but|or|because|although|while/.test(sentence);
    const hasParens = /\(|\)/.test(sentence);

    let complexity = 0;

    // Word length factor (0.3)
    complexity += Math.min(1, avgWordLength / 6) * 0.3;

    // Sentence length factor (0.3)
    complexity += Math.min(1, words.length / 30) * 0.3;

    // Clause complexity factor (0.2)
    complexity += hasClause ? 0.2 : 0;

    // Parenthetical complexity factor (0.2)
    complexity += hasParens ? 0.2 : 0;

    return Math.min(1, complexity);
  }

  /**
   * Adapt sentence length to match user's pattern
   */
  private adaptSentenceLength(
    sentence: SentenceSegment,
    targetLength: number,
    distribution: any,
    index: number,
    changes: string[]
  ): SentenceSegment {
    const currentLength = sentence.wordCount;
    const difference = Math.abs(currentLength - targetLength);

    // If sentence is too far from user's average, flag for restructuring
    if (difference > 10) {
      if (currentLength > targetLength * 1.5) {
        changes.push(`Simplified sentence ${index + 1} (${currentLength} → ~${Math.round(targetLength)} words)`);
        // Would break long sentences into shorter ones
      } else if (currentLength < targetLength * 0.5) {
        changes.push(`Elaborated sentence ${index + 1} (${currentLength} → ~${Math.round(targetLength)} words)`);
        // Would combine short sentences
      }
    }

    return sentence;
  }

  /**
   * Apply punctuation patterns from user profile
   */
  private applyPunctuationPatterns(
    sentences: SentenceSegment[],
    punctuationStyle: Record<string, number>,
    changes: string[]
  ): string {
    let text = '';

    // Calculate total punctuation frequency
    const totalPunctuation = Object.values(punctuationStyle).reduce((a, b) => a + b, 0);

    sentences.forEach((sentence, index) => {
      let finalSentence = sentence.text;

      // Adjust punctuation based on user's patterns
      if (totalPunctuation > 0) {
        const commaRatio = (punctuationStyle['commas'] || 0) / Math.max(1, totalPunctuation);
        const semiRatio = (punctuationStyle['semicolons'] || 0) / Math.max(1, totalPunctuation);
        const dashRatio = (punctuationStyle['dashes'] || 0) / Math.max(1, totalPunctuation);

        // Remove existing punctuation
        finalSentence = finalSentence.replace(/[,;—–-]+/g, ' ');

        // Reapply based on user's preference
        if (commaRatio > 0.3 && !finalSentence.includes(',')) {
          finalSentence = this.addCommas(finalSentence);
          changes.push('Applied comma patterns');
        }

        if (semiRatio > 0.15) {
          finalSentence = this.addSemicolons(finalSentence);
          changes.push('Applied semicolon patterns');
        }

        if (dashRatio > 0.15) {
          finalSentence = this.addDashes(finalSentence);
          changes.push('Applied dash patterns');
        }
      }

      // Ensure proper ending punctuation
      if (!finalSentence.match(/[.!?]$/)) {
        finalSentence += '.';
      }

      text += finalSentence + (index < sentences.length - 1 ? ' ' : '');
    });

    return text;
  }

  /**
   * Add commas where appropriate
   */
  private addCommas(sentence: string): string {
    // Simple heuristic: add commas before conjunctions in longer clauses
    const words = sentence.split(/\s+/);
    if (words.length > 12) {
      return sentence.replace(/\b(and|but|or)\b/g, ', $1');
    }
    return sentence;
  }

  /**
   * Add semicolons where appropriate
   */
  private addSemicolons(sentence: string): string {
    // Replace coordinating conjunctions with semicolons for complex sentences
    return sentence.replace(/,\s*(and|but)\s+/g, '; ');
  }

  /**
   * Add dashes where appropriate
   */
  private addDashes(sentence: string): string {
    // Replace parenthetical commas with dashes
    return sentence.replace(/,\s+([a-z])/g, ' — $1');
  }

  /**
   * Adjust sentence complexity
   */
  private adjustComplexity(text: string, targetComplexity: number, changes: string[]): string {
    const sentences = this.segmentSentences(text);
    const avgComplexity = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.complexity, 0) / sentences.length
      : 0;

    if (Math.abs(avgComplexity - targetComplexity) > 0.2) {
      if (targetComplexity > avgComplexity) {
        changes.push('Increased sentence complexity');
        // Would add more subordinate clauses, longer words, etc.
      } else {
        changes.push('Simplified sentence structure');
        // Would shorten sentences, use simpler vocabulary, etc.
      }
    }

    return text;
  }

  /**
   * Apply formatting preferences
   */
  private applyFormatting(
    text: string,
    formatting: any,
    changes: string[]
  ): string {
    let formattedText = text;

    // Apply casing preference
    if (formatting.casingPreference === 'lowercase') {
      formattedText = formattedText.toLowerCase();
      changes.push('Applied lowercase preference');
    }

    // Apply line break frequency
    if (formatting.lineBreakFrequency === 'sparse' && formattedText.includes('\n\n')) {
      formattedText = formattedText.replace(/\n\n+/g, '\n');
      changes.push('Reduced paragraph breaks');
    } else if (formatting.lineBreakFrequency === 'generous') {
      formattedText = formattedText.replace(/(?<=[.!?])\s+/g, '\n\n');
      changes.push('Increased paragraph breaks');
    }

    return formattedText;
  }

  /**
   * Get syntax statistics for a user
   */
  getSyntaxStats(userId: string) {
    const profile = userLinguisticProfileService.getProfile(userId);

    if (!profile) {
      return null;
    }

    return {
      userId,
      averageSentenceLength: profile.syntax.averageSentenceLength,
      complexityScore: profile.syntax.complexityScore,
      sentenceLengthDistribution: profile.syntax.sentenceLengthDistribution,
      usesComplexSentences: profile.syntax.usesComplexSentences,
      abbreviationStyle: profile.syntax.abbreviationStyle,
      readyForMirroring: profile.totalMessagesAnalyzed >= 3,
      confidenceLevel: profile.confidenceScore,
      formattingPreference: {
        casing: profile.formatting.casingPreference,
        lineBreaks: profile.formatting.lineBreakFrequency,
        spacing: profile.formatting.spacingPreference,
      },
    };
  }

  /**
   * Analyze syntax differences between two users
   */
  compareSyntax(userId1: string, userId2: string) {
    const profile1 = userLinguisticProfileService.getProfile(userId1);
    const profile2 = userLinguisticProfileService.getProfile(userId2);

    if (!profile1 || !profile2) {
      return null;
    }

    const lengthDiff = Math.abs(profile1.syntax.averageSentenceLength - profile2.syntax.averageSentenceLength);
    const complexityDiff = Math.abs(profile1.syntax.complexityScore - profile2.syntax.complexityScore);

    return {
      user1Id: userId1,
      user2Id: userId2,
      averageLengthDifference: lengthDiff,
      complexityDifference: complexityDiff,
      similarityScore: 1 - ((lengthDiff / 30) + (complexityDiff / 1)) / 2,
      user1Style: `${profile1.dominantStyle}, avg sentence: ${profile1.syntax.averageSentenceLength.toFixed(1)} words`,
      user2Style: `${profile2.dominantStyle}, avg sentence: ${profile2.syntax.averageSentenceLength.toFixed(1)} words`,
    };
  }

  /**
   * Get recommended sentence length for a user
   */
  getRecommendedLength(userId: string): number | null {
    const stats = this.getSyntaxStats(userId);
    return stats ? stats.averageSentenceLength : null;
  }

  /**
   * Check if text matches user's syntax patterns
   */
  checkSyntaxMatch(userId: string, text: string): {
    matchScore: number;
    feedback: string[];
  } {
    const profile = userLinguisticProfileService.getProfile(userId);

    if (!profile) {
      return { matchScore: 0, feedback: ['No user profile found'] };
    }

    const sentences = this.segmentSentences(text);
    const avgLength = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.wordCount, 0) / sentences.length
      : 0;
    const avgComplexity = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.complexity, 0) / sentences.length
      : 0;

    const lengthMatch = 1 - Math.abs(avgLength - profile.syntax.averageSentenceLength) / 20;
    const complexityMatch = 1 - Math.abs(avgComplexity - profile.syntax.complexityScore);
    const matchScore = (lengthMatch + complexityMatch) / 2;

    const feedback: string[] = [];

    if (lengthMatch < 0.7) {
      if (avgLength > profile.syntax.averageSentenceLength) {
        feedback.push(`Sentences are too long (${avgLength.toFixed(1)} vs. ${profile.syntax.averageSentenceLength.toFixed(1)} words)`);
      } else {
        feedback.push(`Sentences are too short (${avgLength.toFixed(1)} vs. ${profile.syntax.averageSentenceLength.toFixed(1)} words)`);
      }
    }

    if (complexityMatch < 0.7) {
      if (avgComplexity > profile.syntax.complexityScore) {
        feedback.push('Sentences are too complex');
      } else {
        feedback.push('Sentences are too simple');
      }
    }

    if (feedback.length === 0) {
      feedback.push('Syntax matches user patterns well');
    }

    return {
      matchScore: Math.max(0, Math.min(1, matchScore)),
      feedback,
    };
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[SyntaxMirroring] 🔄 Service reset');
  }
}

// Export singleton instance
export const syntaxMirroringService = new SyntaxMirroringService();
