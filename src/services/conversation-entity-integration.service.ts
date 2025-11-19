/**
 * Conversation Entity Integration Service
 *
 * Automatically extracts entities from conversation flow and integrates them
 * with the knowledge base, user model, and goal system.
 *
 * This service hooks into:
 * - User messages (extract what user mentions)
 * - Agent responses (extract what agent talks about)
 * - Conversation context (topic detection)
 * - User model updates (learn preferences and interests)
 *
 * Triggers automatic:
 * - Entity extraction from conversations
 * - Knowledge base population
 * - User interest and capability learning
 * - Goal relevance linking
 * - Preference discovery
 */

import { dbService } from './db.service';
import { entityExtractorService } from './entity-extractor.service';
import { declarativeKBService } from './declarative-kb.service';
import { userModelService } from './user-model.service';
import { goalManagementService } from './goal-management.service';

export interface ConversationEntityExtractionResult {
  messageId: string;
  entitiesFound: number;
  newEntities: number;
  entitiesLinkedToGoals: number;
  userInsightsDiscovered: number;
  preferencesLearned: number;
  extractedAt: number;
}

export interface EntityLearningInsight {
  type: 'technology' | 'interest' | 'capability' | 'preference' | 'project';
  content: string;
  confidence: number;
  relatedEntity?: string;
  context: string;
}

export interface ConversationAnalysis {
  sentiment?: 'positive' | 'neutral' | 'negative';
  topic?: string;
  entities: string[];
  userInterests: string[];
  userCapabilities: string[];
  userPreferences: Record<string, unknown>;
}

/**
 * ConversationEntityIntegrationService
 *
 * Bridges conversation flow with entity extraction and learning
 */
class ConversationEntityIntegrationService {
  private extractionHistory: ConversationEntityExtractionResult[] = [];
  private learningInsights: EntityLearningInsight[] = [];
  private readonly minConfidenceForKB = 0.7;
  private readonly minConfidenceForUserModel = 0.6;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[ConversationEntityIntegration] ✅ Service initialized');
  }

  /**
   * Process user message for entity extraction and learning
   */
  async processUserMessage(
    messageId: string,
    content: string,
    conversationId: string,
    metadata?: {
      timestamp?: number;
      messageIndex?: number;
    }
  ): Promise<ConversationEntityExtractionResult> {
    const startTime = Date.now();
    const result: ConversationEntityExtractionResult = {
      messageId,
      entitiesFound: 0,
      newEntities: 0,
      entitiesLinkedToGoals: 0,
      userInsightsDiscovered: 0,
      preferencesLearned: 0,
      extractedAt: startTime,
    };

    try {
      // Step 1: Extract entities from message
      const extractionResult = await entityExtractorService.extractFromText(content);
      result.entitiesFound = extractionResult.entitiesFound;
      result.newEntities = extractionResult.newEntitiesAdded;

      // Step 2: Analyze message for user insights
      const analysis = await this.analyzeUserMessage(content);
      result.userInsightsDiscovered = Object.keys(analysis.userPreferences).length +
        analysis.userInterests.length +
        analysis.userCapabilities.length;

      // Step 3: Learn user interests from message
      for (const interest of analysis.userInterests) {
        try {
          userModelService.addInterest(interest, 0.75, content.substring(0, 100));
          result.preferencesLearned++;
        } catch (error) {
          console.warn(
            '[ConversationEntityIntegration] Failed to add interest:',
            error
          );
        }
      }

      // Step 4: Learn user capabilities from message
      for (const capability of analysis.userCapabilities) {
        try {
          userModelService.addCapability(capability, 0.65, [content]);
          result.preferencesLearned++;
        } catch (error) {
          console.warn(
            '[ConversationEntityIntegration] Failed to add capability:',
            error
          );
        }
      }

      // Step 5: Learn user preferences
      for (const [key, value] of Object.entries(analysis.userPreferences)) {
        try {
          userModelService.addPreference(
            key,
            value,
            'interaction',
            0.7,
            ['conversation_analysis']
          );
          result.preferencesLearned++;
        } catch (error) {
          console.warn(
            '[ConversationEntityIntegration] Failed to add preference:',
            error
          );
        }
      }

      // Step 6: Link extracted entities to active goals
      const linkedGoals = await this.linkEntitiesToGoals(
        analysis.entities,
        conversationId
      );
      result.entitiesLinkedToGoals = linkedGoals;

      // Store extraction result
      this.extractionHistory.push(result);

      console.log(
        `[ConversationEntityIntegration] 📊 User message processed: ${result.newEntities} new entities, ${result.userInsightsDiscovered} insights discovered`
      );

      return result;
    } catch (error) {
      console.error(
        '[ConversationEntityIntegration] ❌ Failed to process user message:',
        error
      );
      return result;
    }
  }

  /**
   * Process agent response for entity extraction
   */
  async processAgentResponse(
    messageId: string,
    content: string,
    conversationId: string,
    moduleUsed?: string
  ): Promise<ConversationEntityExtractionResult> {
    const startTime = Date.now();
    const result: ConversationEntityExtractionResult = {
      messageId,
      entitiesFound: 0,
      newEntities: 0,
      entitiesLinkedToGoals: 0,
      userInsightsDiscovered: 0,
      preferencesLearned: 0,
      extractedAt: startTime,
    };

    try {
      // Step 1: Extract entities from agent response
      const extractionResult = await entityExtractorService.extractFromText(content);
      result.entitiesFound = extractionResult.entitiesFound;
      result.newEntities = extractionResult.newEntitiesAdded;

      // Step 2: Link entities to goals
      const linkedGoals = await this.linkEntitiesToGoals(
        extractionResult.entitiesFound > 0
          ? entityExtractorService
              .getHighConfidenceEntities(0.7)
              .map((e) => e.name)
          : [],
        conversationId
      );
      result.entitiesLinkedToGoals = linkedGoals;

      // Step 3: Learn about agent capabilities from response
      if (moduleUsed && moduleUsed !== 'local_guardian') {
        // Track external adapter usage
        const adapterEntity = await this.getOrCreateAdapterEntity(moduleUsed);
        if (adapterEntity) {
          userModelService.addCapability('uses_external_adapters', 0.8, [
            `Uses ${moduleUsed} adapter`,
          ]);
          result.preferencesLearned++;
        }
      }

      // Store extraction result
      this.extractionHistory.push(result);

      console.log(
        `[ConversationEntityIntegration] 🤖 Agent response processed: ${result.newEntities} new entities extracted`
      );

      return result;
    } catch (error) {
      console.error(
        '[ConversationEntityIntegration] ❌ Failed to process agent response:',
        error
      );
      return result;
    }
  }

  /**
   * Analyze user message for insights about the user
   */
  private async analyzeUserMessage(content: string): Promise<ConversationAnalysis> {
    const analysis: ConversationAnalysis = {
      entities: [],
      userInterests: [],
      userCapabilities: [],
      userPreferences: {},
    };

    const contentLower = content.toLowerCase();

    // Extract user interests based on keywords
    const interestKeywords: Record<string, string> = {
      'machine learning': 'machine_learning',
      'web development': 'web_development',
      'data science': 'data_science',
      'python': 'python_programming',
      'javascript': 'javascript_programming',
      'react': 'react_framework',
      'database': 'database_design',
      'api': 'api_development',
      'devops': 'devops',
      'cloud': 'cloud_computing',
      'docker': 'containerization',
      'kubernetes': 'kubernetes',
      'ai': 'artificial_intelligence',
      'neural': 'neural_networks',
      'nlp': 'natural_language_processing',
      'testing': 'software_testing',
      'performance': 'performance_optimization',
      'security': 'security',
      'accessibility': 'accessibility',
      'design': 'design',
    };

    for (const [keyword, interest] of Object.entries(interestKeywords)) {
      if (contentLower.includes(keyword)) {
        analysis.userInterests.push(interest);
      }
    }

    // Extract capabilities based on phrases
    const capabilityPhrases: Record<string, string> = {
      'i know': 'knowledge_of',
      'i can': 'capability_in',
      'i have experience': 'experience_with',
      'i built': 'has_built',
      'i wrote': 'programming_skill',
      'i designed': 'design_skill',
      'i manage': 'management_skill',
      'im familiar': 'familiarity_with',
      'ive worked': 'work_experience',
    };

    for (const phrase of Object.keys(capabilityPhrases)) {
      if (contentLower.includes(phrase)) {
        analysis.userCapabilities.push(capabilityPhrases[phrase]);
      }
    }

    // Extract preferences
    const preferencePatterns: Record<string, Record<string, unknown>> = {
      'prefer': { preference_style: 'stated' },
      'like': { preference_style: 'interested' },
      'love': { preference_style: 'highly_interested' },
      'dislike': { preference_style: 'avoid' },
      'hate': { preference_style: 'strongly_avoid' },
    };

    for (const [pattern, pref] of Object.entries(preferencePatterns)) {
      if (contentLower.includes(pattern)) {
        Object.assign(analysis.userPreferences, pref);
      }
    }

    // Detect sentiment
    const positiveWords = [
      'great',
      'love',
      'awesome',
      'excellent',
      'good',
      'happy',
      'enjoy',
      'perfect',
    ];
    const negativeWords = [
      'hate',
      'bad',
      'terrible',
      'poor',
      'disappointing',
      'dislike',
      'angry',
      'frustrated',
    ];

    const positiveCount = positiveWords.filter((w) => contentLower.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => contentLower.includes(w)).length;

    if (positiveCount > negativeCount) {
      analysis.sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      analysis.sentiment = 'negative';
    } else {
      analysis.sentiment = 'neutral';
    }

    return analysis;
  }

  /**
   * Link extracted entities to active goals
   */
  private async linkEntitiesToGoals(
    entityNames: string[],
    conversationId: string
  ): Promise<number> {
    let linkedCount = 0;

    if (entityNames.length === 0) {
      return linkedCount;
    }

    const activeGoals = goalManagementService.getGoals('active');

    for (const goal of activeGoals) {
      const goalText = `${goal.title} ${goal.description}`.toLowerCase();

      for (const entityName of entityNames) {
        if (goalText.includes(entityName.toLowerCase())) {
          // Link this entity to the goal
          const kb = declarativeKBService;
          const entity = kb.search(entityName, 1);

          if (entity.length > 0) {
            try {
              goalManagementService.linkToEntities(goal.id, [entity[0].id]);
              linkedCount++;
            } catch (error) {
              console.warn(
                '[ConversationEntityIntegration] Failed to link entity to goal:',
                error
              );
            }
          }
        }
      }
    }

    return linkedCount;
  }

  /**
   * Get or create entity for external adapter
   */
  private async getOrCreateAdapterEntity(adapterName: string): Promise<string | null> {
    try {
      const entity = declarativeKBService.search(adapterName, 1);

      if (entity.length === 0) {
        const newEntity = declarativeKBService.addEntity(
          'tool',
          adapterName,
          `External AI adapter: ${adapterName}`,
          0.85,
          ['conversation_analysis']
        );
        return newEntity.id;
      }

      return entity[0].id;
    } catch (error) {
      console.warn(
        '[ConversationEntityIntegration] Failed to create adapter entity:',
        error
      );
      return null;
    }
  }

  /**
   * Get extraction history
   */
  getExtractionHistory(limit: number = 20): ConversationEntityExtractionResult[] {
    return this.extractionHistory.slice(-limit);
  }

  /**
   * Get learning insights
   */
  getLearningInsights(limit: number = 20): EntityLearningInsight[] {
    return this.learningInsights.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalExtractions: number;
    totalEntitiesFound: number;
    totalNewEntities: number;
    totalGoalsLinked: number;
    totalInsights: number;
    totalPreferencesLearned: number;
    lastExtractionTime: number | null;
  } {
    const totalEntitiesFound = this.extractionHistory.reduce(
      (sum, e) => sum + e.entitiesFound,
      0
    );
    const totalNewEntities = this.extractionHistory.reduce(
      (sum, e) => sum + e.newEntities,
      0
    );
    const totalGoalsLinked = this.extractionHistory.reduce(
      (sum, e) => sum + e.entitiesLinkedToGoals,
      0
    );
    const totalInsights = this.extractionHistory.reduce(
      (sum, e) => sum + e.userInsightsDiscovered,
      0
    );
    const totalPreferencesLearned = this.extractionHistory.reduce(
      (sum, e) => sum + e.preferencesLearned,
      0
    );

    return {
      totalExtractions: this.extractionHistory.length,
      totalEntitiesFound,
      totalNewEntities,
      totalGoalsLinked,
      totalInsights,
      totalPreferencesLearned,
      lastExtractionTime:
        this.extractionHistory.length > 0
          ? this.extractionHistory[this.extractionHistory.length - 1].extractedAt
          : null,
    };
  }

  /**
   * Clear history
   */
  clear(): void {
    this.extractionHistory = [];
    this.learningInsights = [];
    console.log('[ConversationEntityIntegration] ⚠️ History cleared');
  }
}

// Export singleton instance
export const conversationEntityIntegrationService =
  new ConversationEntityIntegrationService();
