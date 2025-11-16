/**
 * Socratic Service (Sprint 7: Socratic Co-pilot Mode)
 *
 * Implements guided critical thinking to help users maintain autonomy.
 * When ARI is low, the system encourages deeper thought through questions.
 *
 * Philosophy:
 * - Instead of giving answers, ask guiding questions
 * - Help users develop their own understanding
 * - Prevent over-reliance on AI
 * - Build critical thinking skills
 *
 * Trigger Conditions:
 * - ARI < 0.4 (low autonomy - user using simplistic prompts)
 * - User preference: enable_socratic_mode = true
 */

export interface SocraticPrompt {
  type: 'question' | 'reflection' | 'clarification';
  message: string;
  guidance: string;
}

class SocraticService {
  private readonly ARI_THRESHOLD = 0.4; // Trigger below this ARI
  private socraticModeEnabled = false;

  /**
   * Enable or disable Socratic mode
   * (Will be configurable via user preferences in Sprint 9)
   */
  setSocraticMode(enabled: boolean): void {
    this.socraticModeEnabled = enabled;
    console.log(`[Socratic] Mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if Socratic mode is enabled
   */
  isEnabled(): boolean {
    return this.socraticModeEnabled;
  }

  /**
   * Determine if Socratic intervention should trigger
   *
   * @param ariScore Current ARI score
   * @returns True if intervention should occur
   */
  shouldIntervene(ariScore: number): boolean {
    if (!this.socraticModeEnabled) {
      return false;
    }

    return ariScore < this.ARI_THRESHOLD;
  }

  /**
   * Generate Socratic prompt based on user's query
   *
   * Analyzes the user's query and generates guiding questions to encourage
   * deeper thinking before providing a direct answer.
   *
   * @param userQuery The user's original query
   * @param _ariScore Current ARI score (for future use)
   * @returns Socratic prompt with guidance
   */
  generatePrompt(userQuery: string, _ariScore: number): SocraticPrompt {
    const queryLower = userQuery.toLowerCase().trim();

    // Detect query patterns and generate appropriate Socratic prompts

    // Pattern 1: Very short queries (1-2 words) - Ask for elaboration
    if (queryLower.split(/\s+/).length <= 2) {
      return {
        type: 'clarification',
        message: `Before I answer, let me help you explore this more deeply:\n\n• What specifically about "${userQuery}" interests you?\n• What have you already tried or considered?\n• What would a good answer look like for you?`,
        guidance: 'Taking time to articulate your question more fully will help you learn more effectively.',
      };
    }

    // Pattern 2: "What is..." queries - Encourage prior knowledge
    if (queryLower.startsWith('what is') || queryLower.startsWith('what are')) {
      return {
        type: 'reflection',
        message: `Let's think through this together:\n\n1. What do you already know about this topic?\n2. Why is this question important to you right now?\n3. What would you guess the answer might be?\n\nReflecting on these questions first will make the answer more meaningful.`,
        guidance: 'Activating your prior knowledge helps you learn and retain information better.',
      };
    }

    // Pattern 3: "How to..." queries - Encourage problem decomposition
    if (queryLower.startsWith('how to') || queryLower.startsWith('how do i') || queryLower.startsWith('how can i')) {
      return {
        type: 'question',
        message: `Before we dive into the solution, let's break this down:\n\n• What's the core problem you're trying to solve?\n• What approaches have you already considered?\n• What constraints or requirements should we keep in mind?\n• What would success look like?\n\nThinking through these will lead to a better solution.`,
        guidance: 'Breaking down problems into components helps you understand solutions more deeply.',
      };
    }

    // Pattern 4: "Why..." queries - Encourage hypothesis formation
    if (queryLower.startsWith('why does') || queryLower.startsWith('why is') || queryLower.startsWith('why')) {
      return {
        type: 'reflection',
        message: `Let's explore this question together:\n\n• What do you think might be the reason?\n• What evidence or observations led you to this question?\n• How would you test your hypothesis?\n\nForming your own hypotheses first makes learning more active.`,
        guidance: 'Developing hypotheses before seeking answers strengthens critical thinking.',
      };
    }

    // Pattern 5: "Can you..." or "Please..." - Encourage specificity
    if (queryLower.startsWith('can you') || queryLower.startsWith('please') || queryLower.startsWith('help me')) {
      return {
        type: 'clarification',
        message: `I'd love to help! First, let's clarify:\n\n• What specific outcome are you hoping for?\n• What have you tried so far?\n• What's the context or bigger picture?\n• Are there any constraints I should know about?\n\nMore context helps me provide more useful assistance.`,
        guidance: 'Specific, contextualized questions lead to more valuable answers.',
      };
    }

    // Default: General critical thinking prompt
    return {
      type: 'question',
      message: `Let's approach this thoughtfully:\n\n• What's the key question you're trying to answer?\n• What do you already know or think about this?\n• What would help you most right now?\n\nTaking a moment to reflect will make our conversation more productive.`,
      guidance: 'Thoughtful questions lead to deeper understanding than quick answers.',
    };
  }

  /**
   * Create a modified system prompt that incorporates Socratic guidance
   *
   * This system prompt instructs the AI to use the Socratic method in responses.
   *
   * @returns System prompt for Socratic mode
   */
  getSocraticSystemPrompt(): string {
    return `You are operating in Socratic Co-pilot Mode. Your goal is to help the user develop their own thinking rather than simply providing answers.

Guidelines:
1. Ask guiding questions that help the user think through the problem
2. Encourage the user to articulate their own understanding
3. Point out assumptions that might need examination
4. Help break complex problems into manageable parts
5. When you do provide information, explain the reasoning behind it
6. Encourage active learning over passive consumption

Remember: The goal is autonomy, not dependence. Help users build their critical thinking skills.`;
  }

  /**
   * Format Socratic prompt for display
   *
   * @param prompt Socratic prompt object
   * @returns Formatted message for UI
   */
  formatPrompt(prompt: SocraticPrompt): string {
    const icon = prompt.type === 'question' ? '❓' : prompt.type === 'reflection' ? '💭' : '🔍';

    return `${icon} **Socratic Mode Active**\n\n${prompt.message}\n\n_${prompt.guidance}_`;
  }

  /**
   * Get ARI threshold for Socratic intervention
   */
  getThreshold(): number {
    return this.ARI_THRESHOLD;
  }
}

// Export singleton instance
export const socraticService = new SocraticService();
