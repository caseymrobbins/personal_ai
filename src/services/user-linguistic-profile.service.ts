/**
 * User Linguistic Profile Analyzer Service
 *
 * Extracts and tracks user's linguistic patterns for adaptive mimicry:
 * - Vocabulary: Lexicon, slang, acronyms, domain-specific terms
 * - Syntax: Sentence length, complexity, grammatical patterns
 * - Formatting: Casing, punctuation, structural preferences
 *
 * Builds a continuously-updated profile that feeds into the Mirror mode
 * to enable linguistic resonance with the user.
 */

export interface VocabularyProfile {
  commonWords: Map<string, number>;      // Frequency count
  slang: Map<string, number>;            // User-specific slang
  acronyms: Map<string, number>;         // Abbreviations used
  technicalTerms: Map<string, number>;   // Domain-specific vocabulary
  uniqueWords: Set<string>;              // Words unique to this user
  vocabularySize: number;
  averageWordFrequency: number;
}

export interface SyntaxProfile {
  averageSentenceLength: number;         // Average words per sentence
  sentenceLengthDistribution: {
    short: number;    // < 10 words
    medium: number;   // 10-20 words
    long: number;     // 20-30 words
    veryLong: number; // > 30 words
  };
  complexityScore: number;               // 0.0-1.0 (simple to academic)
  grammaticalPatterns: Map<string, number>;
  usesComplexSentences: boolean;
  abbreviationStyle: 'frequent' | 'occasional' | 'rare';
}

export interface FormattingProfile {
  casingPreference: 'standard' | 'lowercase' | 'UPPERCASE' | 'mixed';
  punctuationStyle: {
    commas: number;
    periods: number;
    ellipsis: number;
    exclamation: number;
    question: number;
    semicolons: number;
    dashes: number;
    parentheses: number;
  };
  structuralPreferences: {
    usesBulletPoints: boolean;
    usesParagraphs: boolean;
    usesNumberedLists: boolean;
    usesHeaders: boolean;
    usesFormatting: boolean; // Bold, italic, etc.
  };
  lineBreakFrequency: 'dense' | 'moderate' | 'sparse';
  spacingPreference: 'compact' | 'balanced' | 'generous';
}

export interface UserLinguisticProfile {
  userId: string;
  createdAt: number;
  lastUpdatedAt: number;
  totalMessagesAnalyzed: number;
  confidenceScore: number;                // 0.0-1.0 based on sample size

  vocabulary: VocabularyProfile;
  syntax: SyntaxProfile;
  formatting: FormattingProfile;

  topWords: string[];                     // Top 20 most frequent words
  dominantStyle: string;                  // Description of overall style
  uniqueCharacteristics: string[];        // Notable linguistic quirks
}

interface MessageAnalysis {
  wordCount: number;
  words: string[];
  sentenceCount: number;
  averageSentenceLength: number;
  casing: 'standard' | 'lowercase' | 'UPPERCASE' | 'mixed';
  punctuationMarks: Record<string, number>;
  complexity: number;
  hasAcronyms: string[];
  hasSlang: string[];
  hasTechnicalTerms: string[];
}

/**
 * UserLinguisticProfileAnalyzerService
 *
 * Analyzes user messages to extract linguistic patterns
 */
class UserLinguisticProfileAnalyzerService {
  private profiles: Map<string, UserLinguisticProfile> = new Map();

  // Common words to filter out (stop words)
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'am', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'when', 'where', 'why', 'how', 'as', 'if', 'no', 'not', 'so'
  ]);

  // Common acronyms to detect
  private commonAcronyms = new Set([
    'btw', 'tbh', 'fyi', 'imho', 'aka', 'etc', 'asap', 'imo', 'atm',
    'lol', 'omg', 'wtf', 'smh', 'nvm', 'tl', 'dr', 'faq'
  ]);

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[UserLinguisticProfile] ✅ Service initialized');
  }

  /**
   * Analyze a single user message and update profile
   */
  async analyzeMessage(userId: string, message: string): Promise<UserLinguisticProfile> {
    // Get or create profile
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = this.createDefaultProfile(userId);
      this.profiles.set(userId, profile);
    }

    // Analyze the message
    const analysis = this.analyzeMessageText(message);

    // Update profile with new data
    this.updateProfileWithAnalysis(profile, analysis);
    profile.lastUpdatedAt = Date.now();
    profile.totalMessagesAnalyzed++;

    // Recalculate derived metrics
    this.updateDerivedMetrics(profile);

    console.log(
      `[UserLinguisticProfile] 📊 Analyzed message for user ${userId} ` +
      `(total messages: ${profile.totalMessagesAnalyzed}, confidence: ${profile.confidenceScore.toFixed(2)})`
    );

    return profile;
  }

  /**
   * Analyze text and extract linguistic features
   */
  private analyzeMessageText(message: string): MessageAnalysis {
    const words = message.toLowerCase().split(/\s+/);
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Count punctuation
    const punctuation: Record<string, number> = {
      commas: (message.match(/,/g) || []).length,
      periods: (message.match(/\./g) || []).length,
      ellipsis: (message.match(/\.\.\./g) || []).length,
      exclamation: (message.match(/!/g) || []).length,
      question: (message.match(/\?/g) || []).length,
      semicolons: (message.match(/;/g) || []).length,
      dashes: (message.match(/[-–—]/g) || []).length,
      parentheses: (message.match(/[()]/g) || []).length,
    };

    // Detect casing preference
    const uppercaseWords = words.filter(w => /^[A-Z]/.test(w)).length;
    const lowercaseWords = words.filter(w => /^[a-z]/.test(w)).length;
    const mixedCase = words.some(w => /[a-z].*[A-Z]|[A-Z].*[a-z]/.test(w));

    let casing: 'standard' | 'lowercase' | 'UPPERCASE' | 'mixed' = 'standard';
    if (lowercaseWords > uppercaseWords * 1.5) {
      casing = 'lowercase';
    } else if (uppercaseWords > lowercaseWords * 1.5) {
      casing = 'UPPERCASE';
    } else if (mixedCase) {
      casing = 'mixed';
    }

    // Detect acronyms and slang
    const acronyms: string[] = [];
    const slang: string[] = [];
    const technicalTerms: string[] = [];

    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (this.commonAcronyms.has(cleanWord)) {
        acronyms.push(cleanWord);
      }

      // Simple slang detection (contractions, informal words)
      if (/^[a-z]*'[a-z]+$/.test(cleanWord)) {
        slang.push(cleanWord);
      }

      // Technical terms detection (contains numbers, underscores, or capitals)
      if (/[0-9_]|[A-Z]{2,}/.test(word)) {
        technicalTerms.push(cleanWord);
      }
    }

    // Calculate complexity (ratio of complex words to total)
    const complexWords = words.filter(w => w.length > 10).length;
    const complexity = words.length > 0 ? complexWords / words.length : 0;

    return {
      wordCount: words.length,
      words: words,
      sentenceCount: sentences.length,
      averageSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
      casing,
      punctuationMarks: punctuation,
      complexity,
      hasAcronyms: acronyms,
      hasSlang: slang,
      hasTechnicalTerms: technicalTerms,
    };
  }

  /**
   * Update profile with new analysis
   */
  private updateProfileWithAnalysis(profile: UserLinguisticProfile, analysis: MessageAnalysis): void {
    // Update vocabulary
    for (const word of analysis.words) {
      if (!this.stopWords.has(word) && word.length > 2) {
        const current = profile.vocabulary.commonWords.get(word) || 0;
        profile.vocabulary.commonWords.set(word, current + 1);
        profile.vocabulary.vocabularySize = profile.vocabulary.commonWords.size;
      }
    }

    // Update slang and acronyms
    for (const slang of analysis.hasSlang) {
      const current = profile.vocabulary.slang.get(slang) || 0;
      profile.vocabulary.slang.set(slang, current + 1);
    }

    for (const acronym of analysis.hasAcronyms) {
      const current = profile.vocabulary.acronyms.get(acronym) || 0;
      profile.vocabulary.acronyms.set(acronym, current + 1);
    }

    for (const term of analysis.hasTechnicalTerms) {
      const current = profile.vocabulary.technicalTerms.get(term) || 0;
      profile.vocabulary.technicalTerms.set(term, current + 1);
    }

    // Update syntax patterns
    const sentenceLength = analysis.averageSentenceLength;
    if (sentenceLength < 10) profile.syntax.sentenceLengthDistribution.short++;
    else if (sentenceLength < 20) profile.syntax.sentenceLengthDistribution.medium++;
    else if (sentenceLength < 30) profile.syntax.sentenceLengthDistribution.long++;
    else profile.syntax.sentenceLengthDistribution.veryLong++;

    // Update formatting patterns
    if (analysis.casing === 'lowercase') {
      profile.formatting.casingPreference = 'lowercase';
    }

    for (const [mark, count] of Object.entries(analysis.punctuationMarks)) {
      if (mark in profile.formatting.punctuationStyle) {
        (profile.formatting.punctuationStyle as any)[mark] += count;
      }
    }
  }

  /**
   * Recalculate derived metrics
   */
  private updateDerivedMetrics(profile: UserLinguisticProfile): void {
    // Update syntax metrics
    const totalMessages = profile.totalMessagesAnalyzed;
    if (totalMessages > 0) {
      const dist = profile.syntax.sentenceLengthDistribution;
      const total = dist.short + dist.medium + dist.long + dist.veryLong;

      profile.syntax.averageSentenceLength =
        ((dist.short * 7) + (dist.medium * 15) + (dist.long * 25) + (dist.veryLong * 40)) / Math.max(1, total);

      profile.syntax.complexityScore = Math.min(1, profile.syntax.averageSentenceLength / 30);
      profile.syntax.usesComplexSentences = dist.long + dist.veryLong > totalMessages * 0.2;
    }

    // Update vocabulary metrics
    if (profile.vocabulary.commonWords.size > 0) {
      const totalCount = Array.from(profile.vocabulary.commonWords.values())
        .reduce((sum, count) => sum + count, 0);
      profile.vocabulary.averageWordFrequency = totalCount / profile.vocabulary.commonWords.size;
    }

    // Calculate confidence (0.0-1.0, increases with more samples)
    profile.confidenceScore = Math.min(1, Math.log(totalMessages + 1) / Math.log(50));

    // Update top words
    const sortedWords = Array.from(profile.vocabulary.commonWords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
    profile.topWords = sortedWords;

    // Generate unique characteristics
    profile.uniqueCharacteristics = this.identifyCharacteristics(profile);

    // Generate dominant style description
    profile.dominantStyle = this.generateStyleDescription(profile);
  }

  /**
   * Identify unique linguistic characteristics
   */
  private identifyCharacteristics(profile: UserLinguisticProfile): string[] {
    const characteristics: string[] = [];

    // Vocabulary characteristics
    if (profile.vocabulary.slang.size > 5) {
      characteristics.push('Uses frequent slang');
    }
    if (profile.vocabulary.acronyms.size > 3) {
      characteristics.push('Prefers acronyms');
    }
    if (profile.vocabulary.technicalTerms.size > 10) {
      characteristics.push('Employs technical vocabulary');
    }

    // Syntax characteristics
    if (profile.syntax.complexityScore > 0.7) {
      characteristics.push('Writes in complex sentences');
    } else if (profile.syntax.complexityScore < 0.3) {
      characteristics.push('Uses simple, direct language');
    }

    if (profile.syntax.usesComplexSentences) {
      characteristics.push('Mixes sentence lengths');
    }

    // Formatting characteristics
    if (profile.formatting.casingPreference === 'lowercase') {
      characteristics.push('Prefers lowercase writing');
    }

    const totalPunctuation = Object.values(profile.formatting.punctuationStyle)
      .reduce((sum, count) => sum + count, 0);
    if (totalPunctuation > profile.totalMessagesAnalyzed * 2) {
      characteristics.push('Heavy punctuation user');
    }

    return characteristics;
  }

  /**
   * Generate human-readable style description
   */
  private generateStyleDescription(profile: UserLinguisticProfile): string {
    const parts: string[] = [];

    if (profile.syntax.complexityScore > 0.6) {
      parts.push('Academic');
    } else if (profile.syntax.averageSentenceLength > 20) {
      parts.push('Verbose');
    } else if (profile.syntax.averageSentenceLength < 10) {
      parts.push('Concise');
    } else {
      parts.push('Balanced');
    }

    if (profile.vocabulary.technicalTerms.size > 5) {
      parts.push('Technical');
    }

    if (profile.formatting.casingPreference === 'lowercase') {
      parts.push('Informal');
    }

    if (profile.vocabulary.slang.size > 3) {
      parts.push('Casual');
    }

    return parts.join(' + ') || 'Neutral';
  }

  /**
   * Get profile for a user
   */
  getProfile(userId: string): UserLinguisticProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Get top words for a user
   */
  getTopWords(userId: string, limit: number = 20): string[] {
    const profile = this.profiles.get(userId);
    if (!profile) return [];

    return Array.from(profile.vocabulary.commonWords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  /**
   * Get formatting preference for a user
   */
  getFormattingPreferences(userId: string) {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    return {
      casing: profile.formatting.casingPreference,
      punctuation: profile.formatting.punctuationStyle,
      structure: profile.formatting.structuralPreferences,
      spacing: profile.formatting.spacingPreference,
    };
  }

  /**
   * Get syntax characteristics
   */
  getSyntaxCharacteristics(userId: string) {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    return {
      averageSentenceLength: profile.syntax.averageSentenceLength,
      complexityScore: profile.syntax.complexityScore,
      sentenceLengthDistribution: profile.syntax.sentenceLengthDistribution,
      usesComplexSentences: profile.syntax.usesComplexSentences,
    };
  }

  /**
   * Get vocabulary characteristics
   */
  getVocabularyCharacteristics(userId: string) {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    return {
      vocabularySize: profile.vocabulary.vocabularySize,
      averageWordFrequency: profile.vocabulary.averageWordFrequency,
      slangsCount: profile.vocabulary.slang.size,
      acronymsCount: profile.vocabulary.acronyms.size,
      technicalTermsCount: profile.vocabulary.technicalTerms.size,
      topWords: profile.topWords,
    };
  }

  /**
   * Get overall profile summary
   */
  getProfileSummary(userId: string): UserLinguisticProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Get confidence in profile (0.0-1.0)
   */
  getProfileConfidence(userId: string): number {
    const profile = this.profiles.get(userId);
    return profile ? profile.confidenceScore : 0;
  }

  /**
   * Check if profile has sufficient data
   */
  hasEnoughData(userId: string, minMessages: number = 5): boolean {
    const profile = this.profiles.get(userId);
    return profile ? profile.totalMessagesAnalyzed >= minMessages : false;
  }

  /**
   * Create default profile for new user
   */
  private createDefaultProfile(userId: string): UserLinguisticProfile {
    return {
      userId,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      totalMessagesAnalyzed: 0,
      confidenceScore: 0,
      vocabulary: {
        commonWords: new Map(),
        slang: new Map(),
        acronyms: new Map(),
        technicalTerms: new Map(),
        uniqueWords: new Set(),
        vocabularySize: 0,
        averageWordFrequency: 0,
      },
      syntax: {
        averageSentenceLength: 0,
        sentenceLengthDistribution: {
          short: 0,
          medium: 0,
          long: 0,
          veryLong: 0,
        },
        complexityScore: 0,
        grammaticalPatterns: new Map(),
        usesComplexSentences: false,
        abbreviationStyle: 'occasional',
      },
      formatting: {
        casingPreference: 'standard',
        punctuationStyle: {
          commas: 0,
          periods: 0,
          ellipsis: 0,
          exclamation: 0,
          question: 0,
          semicolons: 0,
          dashes: 0,
          parentheses: 0,
        },
        structuralPreferences: {
          usesBulletPoints: false,
          usesParagraphs: false,
          usesNumberedLists: false,
          usesHeaders: false,
          usesFormatting: false,
        },
        lineBreakFrequency: 'moderate',
        spacingPreference: 'balanced',
      },
      topWords: [],
      dominantStyle: 'Neutral',
      uniqueCharacteristics: [],
    };
  }

  /**
   * Export all profiles
   */
  exportProfiles(): Record<string, UserLinguisticProfile> {
    const exported: Record<string, UserLinguisticProfile> = {};

    for (const [userId, profile] of this.profiles) {
      exported[userId] = { ...profile };
    }

    return exported;
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.profiles.clear();
    console.log('[UserLinguisticProfile] 🔄 Service reset');
  }
}

// Export singleton instance
export const userLinguisticProfileService = new UserLinguisticProfileAnalyzerService();
