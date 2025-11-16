/**
 * Anonymizer Service
 *
 * JS-native PII detection and reversible scrubbing
 * No external dependencies - privacy by design
 */

export interface PIIPattern {
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'name' | 'address' | 'custom';
  pattern: RegExp;
  replacement: (match: string, index: number) => string;
}

export interface ScrubMapping {
  token: string;
  original: string;
  type: string;
  position: number;
}

export interface ScrubResult {
  scrubbedText: string;
  mappings: ScrubMapping[];
  hadPII: boolean;
  piiTypes: string[];
}

export interface UnscrubResult {
  unscrubedText: string;
  restoredCount: number;
}

class AnonymizerService {
  private patterns: PIIPattern[] = [
    // Email addresses
    {
      type: 'email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: (_match, index) => `[EMAIL_${index}]`,
    },

    // Phone numbers (various formats)
    {
      type: 'phone',
      pattern: /\b(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
      replacement: (_match, index) => `[PHONE_${index}]`,
    },

    // Social Security Numbers (XXX-XX-XXXX)
    {
      type: 'ssn',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      replacement: (_match, index) => `[SSN_${index}]`,
    },

    // Credit card numbers (basic pattern, 13-19 digits with optional spaces/dashes)
    {
      type: 'credit_card',
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b/g,
      replacement: (_match, index) => `[CARD_${index}]`,
    },

    // IP addresses
    {
      type: 'custom',
      pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      replacement: (_match, index) => `[IP_${index}]`,
    },
  ];

  /**
   * Scrub PII from text, returning scrubbed text and reversible mappings
   */
  scrub(text: string): ScrubResult {
    const mappings: ScrubMapping[] = [];
    const piiTypesSet = new Set<string>();
    let scrubbedText = text;
    let tokenIndex = 0;

    // Process each pattern
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      const matches = Array.from(scrubbedText.matchAll(regex));

      for (const match of matches) {
        if (match[0] && match.index !== undefined) {
          const token = pattern.replacement(match[0], tokenIndex);
          const original = match[0];
          const position = match.index;

          // Store mapping
          mappings.push({
            token,
            original,
            type: pattern.type,
            position,
          });

          // Replace in text
          scrubbedText = scrubbedText.replace(original, token);

          piiTypesSet.add(pattern.type);
          tokenIndex++;
        }
      }
    }

    return {
      scrubbedText,
      mappings,
      hadPII: mappings.length > 0,
      piiTypes: Array.from(piiTypesSet),
    };
  }

  /**
   * Restore original PII from scrubbed text using mappings
   */
  unscrub(scrubbedText: string, mappings: ScrubMapping[]): UnscrubResult {
    let unscrubedText = scrubbedText;
    let restoredCount = 0;

    // Restore in reverse order to maintain position accuracy
    for (const mapping of [...mappings].reverse()) {
      if (unscrubedText.includes(mapping.token)) {
        unscrubedText = unscrubedText.replace(mapping.token, mapping.original);
        restoredCount++;
      }
    }

    return {
      unscrubedText,
      restoredCount,
    };
  }

  /**
   * Check if text contains PII without scrubbing
   */
  detectPII(text: string): { hasPII: boolean; types: string[] } {
    const types = new Set<string>();

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      if (regex.test(text)) {
        types.add(pattern.type);
      }
    }

    return {
      hasPII: types.size > 0,
      types: Array.from(types),
    };
  }

  /**
   * Add custom PII pattern
   */
  addPattern(pattern: PIIPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get summary of what would be scrubbed (for transparency)
   */
  getScrubPreview(text: string): { type: string; count: number }[] {
    const summary: { type: string; count: number }[] = [];

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      const matches = text.match(regex);
      const count = matches ? matches.length : 0;

      if (count > 0) {
        summary.push({ type: pattern.type, count });
      }
    }

    return summary;
  }
}

// Singleton instance
export const anonymizerService = new AnonymizerService();
