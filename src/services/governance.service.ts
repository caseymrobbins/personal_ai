/**
 * Governance Service (Sprint 5: Conscience Engine)
 *
 * Tracks user autonomy metrics (ARI - Autonomy Retention Index)
 * to help users maintain agency and avoid over-dependence on AI.
 *
 * ARI Components:
 * 1. Lexical Density: Ratio of substantive words to total words
 *    - Higher density = more thoughtful, specific language
 *    - Lower density = more simplistic, generic language
 *
 * 2. Syntactic Complexity: Measure of sentence structure sophistication
 *    - Higher complexity = more careful composition
 *    - Lower complexity = shorter, simpler requests
 *
 * Privacy-by-Design:
 * - Only stores metrics, NEVER raw user text
 * - Uses SHA-256 hash for de-duplication only (NOT reversible)
 */

/**
 * Governance metrics for a single interaction
 */
export interface GovernanceMetrics {
  timestamp: number;
  userPromptHash: string;
  lexicalDensity: number;        // 0.0 - 1.0
  syntacticComplexity: number;   // 0.0 - 1.0
  ariScore: number;              // 0.0 - 1.0 (combined ARI)
}

/**
 * ARI trend analysis result
 */
export interface ARITrend {
  currentARI: number;           // Current 7-day average
  previousARI: number;          // Previous 7-day average
  percentChange: number;        // Percentage change
  trend: 'increasing' | 'stable' | 'decreasing';
  alert: boolean;               // True if below threshold
}

class GovernanceService {
  private readonly ARI_THRESHOLD = 0.65; // Default threshold from schema

  /**
   * Calculate lexical density of text
   *
   * Measures the ratio of substantive/content words to total words.
   * We use a simplified heuristic: words >= 5 characters are considered substantive.
   *
   * Examples:
   * - "Write a story about dragons" -> medium density (0.5)
   * - "hello" -> low density (0.0)
   * - "Synthesize comprehensive analysis regarding methodology" -> high density (1.0)
   *
   * @param text The user's prompt
   * @returns Lexical density score (0.0 - 1.0)
   */
  private calculateLexicalDensity(text: string): number {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (words.length === 0) return 0.0;

    // Count substantive words (simplified: length >= 5 chars)
    // This approximates content words (nouns, verbs, adjectives, adverbs)
    const substantiveWords = words.filter(word => word.length >= 5);

    const density = substantiveWords.length / words.length;

    // Clamp to [0, 1]
    return Math.min(1.0, Math.max(0.0, density));
  }

  /**
   * Calculate syntactic complexity of text
   *
   * Measures sentence structure sophistication using:
   * 1. Average sentence length (normalized)
   * 2. Punctuation variety (commas, semicolons, dashes indicate complex structure)
   *
   * Examples:
   * - "Hello" -> low complexity (0.1)
   * - "How can I improve my code?" -> medium complexity (0.4)
   * - "Given the constraints X, Y, and Z; how would you approach this problem?" -> high complexity (0.8)
   *
   * @param text The user's prompt
   * @returns Syntactic complexity score (0.0 - 1.0)
   */
  private calculateSyntacticComplexity(text: string): number {
    // Split into sentences (rough heuristic)
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return 0.0;

    // Factor 1: Average sentence length (normalized to ~50 words max)
    const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
    const avgSentenceLength = totalWords / sentences.length;
    const lengthScore = Math.min(1.0, avgSentenceLength / 50);

    // Factor 2: Punctuation variety (commas, semicolons, colons, dashes)
    const complexPunctuation = (text.match(/[,;:\-—]/g) || []).length;
    const punctuationScore = Math.min(1.0, complexPunctuation / 10);

    // Combine factors (weighted average)
    const complexity = (lengthScore * 0.6) + (punctuationScore * 0.4);

    return Math.min(1.0, Math.max(0.0, complexity));
  }

  /**
   * Calculate combined ARI score
   *
   * The Autonomy Retention Index combines lexical density and syntactic complexity
   * to measure overall cognitive engagement.
   *
   * High ARI (>= 0.65): User is composing thoughtful, specific requests
   * Medium ARI (0.4 - 0.65): User is engaged but could be more specific
   * Low ARI (< 0.4): User may be over-relying on AI, using simplistic prompts
   *
   * @param lexicalDensity Lexical density score
   * @param syntacticComplexity Syntactic complexity score
   * @returns Combined ARI score (0.0 - 1.0)
   */
  private calculateARI(lexicalDensity: number, syntacticComplexity: number): number {
    // Weighted combination: Lexical density is more important (60%)
    const ari = (lexicalDensity * 0.6) + (syntacticComplexity * 0.4);
    return Math.min(1.0, Math.max(0.0, ari));
  }

  /**
   * Hash user prompt for privacy-preserving de-duplication
   *
   * Uses SHA-256 to create a one-way hash. This allows us to:
   * - Detect duplicate prompts (for analytics)
   * - NEVER store raw user text
   * - CANNOT reverse the hash to recover original text
   *
   * @param text User's prompt
   * @returns SHA-256 hash as hex string
   */
  private async hashPrompt(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Analyze user prompt and generate governance metrics
   *
   * This is the main entry point for ARI tracking. Call this whenever
   * a user sends a message to the AI.
   *
   * @param userPrompt The user's message
   * @returns Governance metrics
   */
  async analyzePrompt(userPrompt: string): Promise<GovernanceMetrics> {
    const lexicalDensity = this.calculateLexicalDensity(userPrompt);
    const syntacticComplexity = this.calculateSyntacticComplexity(userPrompt);
    const ariScore = this.calculateARI(lexicalDensity, syntacticComplexity);
    const userPromptHash = await this.hashPrompt(userPrompt);

    const metrics: GovernanceMetrics = {
      timestamp: Date.now(),
      userPromptHash,
      lexicalDensity,
      syntacticComplexity,
      ariScore,
    };

    console.log(`[Governance] ARI Analysis:`, {
      ariScore: ariScore.toFixed(2),
      lexicalDensity: lexicalDensity.toFixed(2),
      syntacticComplexity: syntacticComplexity.toFixed(2),
    });

    return metrics;
  }

  /**
   * Calculate ARI trend over time
   *
   * Compares current 7-day ARI average to previous 7-day average
   * to detect if user autonomy is increasing or decreasing.
   *
   * @param recentMetrics Array of recent governance metrics (sorted by timestamp DESC)
   * @returns Trend analysis
   */
  calculateTrend(recentMetrics: Array<{ timestamp: number; ariScore: number }>): ARITrend {
    if (recentMetrics.length === 0) {
      return {
        currentARI: 0,
        previousARI: 0,
        percentChange: 0,
        trend: 'stable',
        alert: true,
      };
    }

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);

    // Current 7-day average
    const currentPeriod = recentMetrics.filter(
      m => m.timestamp >= sevenDaysAgo && m.timestamp <= now
    );
    const currentARI = currentPeriod.length > 0
      ? currentPeriod.reduce((sum, m) => sum + m.ariScore, 0) / currentPeriod.length
      : 0;

    // Previous 7-day average (days 8-14)
    const previousPeriod = recentMetrics.filter(
      m => m.timestamp >= fourteenDaysAgo && m.timestamp < sevenDaysAgo
    );
    const previousARI = previousPeriod.length > 0
      ? previousPeriod.reduce((sum, m) => sum + m.ariScore, 0) / previousPeriod.length
      : currentARI; // If no previous data, use current as baseline

    // Calculate percent change
    const percentChange = previousARI > 0
      ? ((currentARI - previousARI) / previousARI) * 100
      : 0;

    // Determine trend
    let trend: 'increasing' | 'stable' | 'decreasing';
    if (Math.abs(percentChange) < 5) {
      trend = 'stable';
    } else if (percentChange > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Alert if below threshold
    const alert = currentARI < this.ARI_THRESHOLD;

    return {
      currentARI,
      previousARI,
      percentChange,
      trend,
      alert,
    };
  }

  /**
   * Get ARI threshold from user preferences
   * (For now, uses default 0.65 - will be configurable in Sprint 9)
   */
  getThreshold(): number {
    return this.ARI_THRESHOLD;
  }
}

// Export singleton instance
export const governanceService = new GovernanceService();
