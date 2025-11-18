/**
 * Lexicon Matching Engine Service
 *
 * Takes user vocabulary profiles and applies lexicon matching to responses.
 * Replaces or augments words in generated text to match the user's:
 * - Vocabulary (specific words they use)
 * - Slang and colloquialisms
 * - Technical terms and jargon
 * - Acronyms and abbreviations
 *
 * Maintains semantic meaning while adapting linguistic form to user preferences.
 */

import { userLinguisticProfileService } from './user-linguistic-profile.service';

export interface LexiconReplacementRule {
  original: string;
  replacement: string;
  confidence: number;    // 0.0-1.0
  category: 'vocabulary' | 'slang' | 'acronym' | 'technical' | 'phrase';
  weight: number;        // How much this rule should influence output
}

export interface LexiconMatchResult {
  userId: string;
  originalText: string;
  matchedText: string;
  replacementsApplied: number;
  replacementDetails: Array<{
    original: string;
    replacement: string;
    position: number;
    confidence: number;
  }>;
  overallConfidence: number;
  lexiconCoverage: number; // 0.0-1.0, how much user vocab was used
}

interface WordSynonymMap {
  word: string;
  synonyms: string[];
  userPreference?: string; // User's preferred variant
  confidence: number;
}

/**
 * LexiconMatchingEngineService
 *
 * Applies user vocabulary patterns to text generation
 */
class LexiconMatchingEngineService {
  // Common word synonyms and variants
  private synonymMaps: Map<string, WordSynonymMap> = new Map([
    ['hello', { word: 'hello', synonyms: ['hi', 'hey', 'greetings', 'what\'s up', 'yo', 'hola'], confidence: 0.8 }],
    ['thank', { word: 'thank', synonyms: ['thanks', 'appreciate', 'thx', 'ty', 'grateful'], confidence: 0.8 }],
    ['okay', { word: 'okay', synonyms: ['ok', 'alright', 'sure', 'sounds good', 'cool'], confidence: 0.8 }],
    ['because', { word: 'because', synonyms: ['bc', 'cuz', 'since', 'as', 'since'], confidence: 0.7 }],
    ['really', { word: 'really', synonyms: ['rlly', 'rly', 'truly', 'very', 'honestly'], confidence: 0.75 }],
    ['understand', { word: 'understand', synonyms: ['get', 'comprehend', 'grok', 'feel', 'know'], confidence: 0.8 }],
    ['problem', { word: 'problem', synonyms: ['issue', 'bug', 'error', 'problem', 'glitch'], confidence: 0.85 }],
    ['good', { word: 'good', synonyms: ['good', 'great', 'solid', 'nice', 'awesome', 'rad'], confidence: 0.8 }],
    ['help', { word: 'help', synonyms: ['help', 'assist', 'aid', 'support', 'hlp'], confidence: 0.8 }],
    ['think', { word: 'think', synonyms: ['think', 'believe', 'reckon', 'suppose', 'guess'], confidence: 0.75 }],
  ]);

  // Technical term variations
  private technicalTermVariations: Map<string, string[]> = new Map([
    ['artificial intelligence', ['AI', 'AI/ML', 'machine learning', 'deep learning']],
    ['application programming interface', ['API', 'APIs', 'endpoint', 'service']],
    ['database', ['DB', 'database', 'data store', 'repository']],
    ['function', ['function', 'method', 'procedure', 'routine', 'fn']],
    ['variable', ['variable', 'var', 'value', 'parameter', 'arg']],
    ['error', ['error', 'exception', 'bug', 'failure', 'crash']],
  ]);

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[LexiconMatching] ✅ Service initialized');
  }

  /**
   * Apply lexicon matching to text based on user profile
   */
  async matchLexicon(userId: string, text: string): Promise<LexiconMatchResult> {
    const profile = userLinguisticProfileService.getProfile(userId);

    if (!profile || profile.totalMessagesAnalyzed < 2) {
      // Not enough data yet
      return {
        userId,
        originalText: text,
        matchedText: text,
        replacementsApplied: 0,
        replacementDetails: [],
        overallConfidence: 0,
        lexiconCoverage: 0,
      };
    }

    let matchedText = text;
    const replacementDetails: Array<{
      original: string;
      replacement: string;
      position: number;
      confidence: number;
    }> = [];

    // Get user's top words and preferences
    const userWords = userLinguisticProfileService.getTopWords(userId, 30);
    const userSlang = Array.from(profile.vocabulary.slang.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    const userAcronyms = Array.from(profile.vocabulary.acronyms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    const userTechnical = Array.from(profile.vocabulary.technicalTerms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Apply replacements in order of confidence and impact
    const replacementRules = this.generateReplacementRules(
      userWords,
      userSlang,
      userAcronyms,
      userTechnical,
      profile
    );

    // Sort rules by weight (descending)
    replacementRules.sort((a, b) => b.weight - a.weight);

    // Apply replacements carefully to avoid double-replacement
    const appliedReplacements = new Set<string>();

    for (const rule of replacementRules) {
      // Create case-insensitive regex
      const regex = new RegExp(`\\b${this.escapeRegex(rule.original)}\\b`, 'gi');
      const matches = matchedText.match(regex);

      if (matches && !appliedReplacements.has(rule.original.toLowerCase())) {
        const originalOccurrences = matches.length;

        // Apply replacement
        matchedText = matchedText.replace(regex, rule.replacement);
        appliedReplacements.add(rule.original.toLowerCase());

        replacementDetails.push({
          original: rule.original,
          replacement: rule.replacement,
          position: matchedText.indexOf(rule.replacement),
          confidence: rule.confidence,
        });
      }
    }

    // Calculate metrics
    const overallConfidence = replacementDetails.length > 0
      ? replacementDetails.reduce((sum, r) => sum + r.confidence, 0) / replacementDetails.length
      : 0;

    const lexiconCoverage = Math.min(1, replacementDetails.length / Math.max(1, replacementRules.length));

    console.log(
      `[LexiconMatching] 📝 Applied ${replacementDetails.length} lexicon replacements for user ${userId} ` +
      `(coverage: ${(lexiconCoverage * 100).toFixed(0)}%, confidence: ${(overallConfidence * 100).toFixed(0)}%)`
    );

    return {
      userId,
      originalText: text,
      matchedText,
      replacementsApplied: replacementDetails.length,
      replacementDetails,
      overallConfidence,
      lexiconCoverage,
    };
  }

  /**
   * Generate replacement rules based on user profile
   */
  private generateReplacementRules(
    userWords: string[],
    userSlang: string[],
    userAcronyms: string[],
    userTechnical: string[],
    profile: any
  ): LexiconReplacementRule[] {
    const rules: LexiconReplacementRule[] = [];

    // Rule 1: Replace common words with user's preferred variants
    for (const [word, wordMap] of this.synonymMaps) {
      const userPreference = wordMap.synonyms.find(s => userWords.includes(s) || userSlang.includes(s));

      if (userPreference && userPreference !== word) {
        rules.push({
          original: word,
          replacement: userPreference,
          confidence: 0.8,
          category: 'vocabulary',
          weight: 0.7,
        });
      }
    }

    // Rule 2: Include user's slang terms
    for (const slangTerm of userSlang) {
      const standardForm = this.findStandardForm(slangTerm);

      if (standardForm) {
        rules.push({
          original: standardForm,
          replacement: slangTerm,
          confidence: 0.75,
          category: 'slang',
          weight: 0.6,
        });
      }
    }

    // Rule 3: Include user's acronyms
    for (const acronym of userAcronyms) {
      const expandedForm = this.findExpandedForm(acronym);

      if (expandedForm) {
        rules.push({
          original: expandedForm,
          replacement: acronym,
          confidence: 0.85,
          category: 'acronym',
          weight: 0.8,
        });
      }
    }

    // Rule 4: Include user's technical terminology
    for (const technicalTerm of userTechnical) {
      const standardForm = this.findStandardFormForTechnical(technicalTerm);

      if (standardForm) {
        rules.push({
          original: standardForm,
          replacement: technicalTerm,
          confidence: 0.8,
          category: 'technical',
          weight: 0.75,
        });
      }
    }

    // Rule 5: Multi-word phrase replacements based on user patterns
    const userWordPairs = this.extractWordPairs(userWords);
    for (const pair of userWordPairs) {
      const standardPair = this.findStandardPair(pair);

      if (standardPair && standardPair !== pair) {
        rules.push({
          original: standardPair,
          replacement: pair,
          confidence: 0.7,
          category: 'phrase',
          weight: 0.5,
        });
      }
    }

    return rules;
  }

  /**
   * Find standard form of slang term
   */
  private findStandardForm(slang: string): string | null {
    const mapping: Record<string, string> = {
      'tbh': 'to be honest',
      'btw': 'by the way',
      'fyi': 'for your information',
      'imho': 'in my humble opinion',
      'thx': 'thanks',
      'ty': 'thank you',
      'rly': 'really',
      'rlly': 'really',
      'k': 'ok',
      'kk': 'ok',
      'omg': 'oh my god',
      'lol': 'laughing out loud',
      'bc': 'because',
      'cuz': 'because',
      'ain\'t': 'am not',
      'gotta': 'got to',
      'gonna': 'going to',
      'wanna': 'want to',
    };

    return mapping[slang.toLowerCase()] || null;
  }

  /**
   * Find expanded form of acronym
   */
  private findExpandedForm(acronym: string): string | null {
    const mapping: Record<string, string> = {
      'ai': 'artificial intelligence',
      'ml': 'machine learning',
      'api': 'application programming interface',
      'db': 'database',
      'ui': 'user interface',
      'ux': 'user experience',
      'crud': 'create read update delete',
      'json': 'JSON',
      'html': 'HTML',
      'css': 'CSS',
      'sql': 'SQL',
    };

    return mapping[acronym.toLowerCase()] || null;
  }

  /**
   * Find standard form of technical term
   */
  private findStandardFormForTechnical(term: string): string | null {
    for (const [standard, variations] of this.technicalTermVariations) {
      if (variations.includes(term.toLowerCase())) {
        return standard;
      }
    }
    return null;
  }

  /**
   * Extract common word pairs from user's vocabulary
   */
  private extractWordPairs(words: string[]): string[] {
    const pairs: string[] = [];

    if (words.length > 1) {
      for (let i = 0; i < Math.min(words.length - 1, 5); i++) {
        pairs.push(`${words[i]} ${words[i + 1]}`);
      }
    }

    return pairs;
  }

  /**
   * Find standard pair (opposite of user's custom pair)
   */
  private findStandardPair(pair: string): string | null {
    // This would be more sophisticated in production
    // For now, return null (no standard form found)
    return null;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get lexicon statistics for a user
   */
  getLexiconStats(userId: string) {
    const profile = userLinguisticProfileService.getProfile(userId);

    if (!profile) {
      return null;
    }

    return {
      userId,
      vocabularySize: profile.vocabulary.vocabularySize,
      commonSlangsCount: profile.vocabulary.slang.size,
      acronymsCount: profile.vocabulary.acronyms.size,
      technicalTermsCount: profile.vocabulary.technicalTerms.size,
      topSlang: Array.from(profile.vocabulary.slang.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term),
      topAcronyms: Array.from(profile.vocabulary.acronyms.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term),
      topTechnicalTerms: Array.from(profile.vocabulary.technicalTerms.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term),
      readyForMatching: profile.totalMessagesAnalyzed >= 5,
      confidenceLevel: profile.confidenceScore,
    };
  }

  /**
   * Compare two lexicon styles
   */
  compareLexicons(userId1: string, userId2: string) {
    const profile1 = userLinguisticProfileService.getProfile(userId1);
    const profile2 = userLinguisticProfileService.getProfile(userId2);

    if (!profile1 || !profile2) {
      return null;
    }

    const commonWords = new Set(
      Array.from(profile1.vocabulary.commonWords.keys()).filter(
        w => profile2.vocabulary.commonWords.has(w)
      )
    );

    const commonSlang = new Set(
      Array.from(profile1.vocabulary.slang.keys()).filter(
        s => profile2.vocabulary.slang.has(s)
      )
    );

    const commonAcronyms = new Set(
      Array.from(profile1.vocabulary.acronyms.keys()).filter(
        a => profile2.vocabulary.acronyms.has(a)
      )
    );

    return {
      user1Id: userId1,
      user2Id: userId2,
      commonWords: commonWords.size,
      commonSlang: commonSlang.size,
      commonAcronyms: commonAcronyms.size,
      similarityScore: (commonWords.size + commonSlang.size + commonAcronyms.size) /
        (profile1.vocabulary.vocabularySize + profile2.vocabulary.vocabularySize),
    };
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    console.log('[LexiconMatching] 🔄 Service reset');
  }
}

// Export singleton instance
export const lexiconMatchingEngineService = new LexiconMatchingEngineService();
