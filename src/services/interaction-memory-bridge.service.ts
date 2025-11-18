/**
 * Interaction Memory Bridge Service
 *
 * Integrates the Interaction Loop with the Cognitive Core
 * Records user messages and agent responses to Working Memory
 * Enables the cognitive loop to learn from conversations
 *
 * This service sits between:
 * - ChatContainer (interaction loop)
 * - Working Memory Service (cognitive core)
 * - Long-Term Memory Service (consolidation)
 * - Entity Extractor Service (learning)
 * - Goal Management Service (goal evaluation)
 */

import { dbService } from './db.service';
import { workingMemoryService } from './working-memory.service';
import { entityExtractorService } from './entity-extractor.service';
import { goalManagementService } from './goal-management.service';

export interface ConversationMemoryContext {
  conversationId: string;
  messageCount: number;
  topic?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  hasAttachments: boolean;
  relatedGoals: string[];
  extractedEntities: string[];
}

export interface InteractionMemoryStats {
  conversationsTracked: number;
  messagesRecorded: number;
  entitiesExtracted: number;
  goalsUpdated: number;
  lastUpdateTime: number | null;
}

/**
 * InteractionMemoryBridgeService
 *
 * Bridges interaction loop and cognitive core
 */
class InteractionMemoryBridgeService {
  private activeConversationMemoryTask: Map<string, string> = new Map(); // conversationId -> taskId
  private conversationContexts: Map<string, ConversationMemoryContext> =
    new Map();
  private stats: InteractionMemoryStats = {
    conversationsTracked: 0,
    messagesRecorded: 0,
    entitiesExtracted: 0,
    goalsUpdated: 0,
    lastUpdateTime: null,
  };

  /**
   * Initialize the bridge service
   */
  async initialize(): Promise<void> {
    try {
      // Create tracking table for conversation memory mapping
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS conversation_memory_links (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          working_memory_task_id TEXT NOT NULL,
          long_term_memories TEXT,
          extracted_entities TEXT,
          related_goals TEXT,
          created_at INTEGER NOT NULL,
          last_updated_at INTEGER NOT NULL
        )
      `);

      // Create table for interaction insights
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS interaction_insights (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          insight_type TEXT NOT NULL,
          content TEXT NOT NULL,
          confidence REAL NOT NULL,
          source TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_memory_links_conversation
        ON conversation_memory_links(conversation_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_memory_links_task
        ON conversation_memory_links(working_memory_task_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_insights_conversation
        ON interaction_insights(conversation_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_insights_type
        ON interaction_insights(insight_type)
      `);

      await dbService.save();

      console.log('[InteractionMemoryBridge] ✅ Service initialized');
    } catch (error) {
      console.error('[InteractionMemoryBridge] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Record a new conversation in memory
   * Called when conversation is created
   */
  async onConversationCreated(conversationId: string, title?: string): Promise<string> {
    try {
      // Create working memory task for this conversation
      const taskId = workingMemoryService.createTask(
        conversationId,
        `Conversation: ${title || 'New Chat'}`
      ).id;

      // Create context
      const context: ConversationMemoryContext = {
        conversationId,
        messageCount: 0,
        topic: title,
        hasAttachments: false,
        relatedGoals: [],
        extractedEntities: [],
      };

      this.activeConversationMemoryTask.set(conversationId, taskId);
      this.conversationContexts.set(conversationId, context);

      // Store link in database
      const linkId = `link-${conversationId}-${Date.now()}`;
      dbService.exec(
        `INSERT INTO conversation_memory_links
         (id, conversation_id, working_memory_task_id, created_at, last_updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [linkId, conversationId, taskId, Date.now(), Date.now()]
      );

      console.log(
        `[InteractionMemoryBridge] 🆕 Conversation tracked: ${conversationId}`
      );
      return taskId;
    } catch (error) {
      console.error(
        '[InteractionMemoryBridge] ❌ Failed to create conversation memory:',
        error
      );
      throw error;
    }
  }

  /**
   * Record a message in working memory
   * Called when user sends a message OR agent responds
   */
  async recordMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: {
      moduleUsed?: string;
      hasAttachments?: boolean;
      attachmentCount?: number;
    }
  ): Promise<void> {
    try {
      // Get or create task for this conversation
      let taskId = this.activeConversationMemoryTask.get(conversationId);
      if (!taskId) {
        taskId = await this.onConversationCreated(conversationId);
      }

      const context = this.conversationContexts.get(conversationId);
      if (context) {
        context.messageCount++;
        if (metadata?.hasAttachments) {
          context.hasAttachments = true;
        }
      }

      // Determine memory item type based on role
      const itemType = role === 'user' ? 'observation' : 'reasoning';
      const confidence = role === 'user' ? 0.9 : 0.85; // User messages are more reliable

      // Add to working memory
      workingMemoryService.addMemoryItem(
        taskId,
        itemType,
        content,
        confidence
      );

      // Extract entities from message
      await this.extractAndLinkEntities(conversationId, taskId, content);

      // Trigger entity extraction asynchronously
      this.entityExtractionAsync(conversationId, content);

      // Update database
      dbService.exec(
        `UPDATE conversation_memory_links SET last_updated_at = ? WHERE conversation_id = ?`,
        [Date.now(), conversationId]
      );

      this.stats.messagesRecorded++;
      this.stats.lastUpdateTime = Date.now();

      console.log(
        `[InteractionMemoryBridge] 💬 Message recorded: ${role} (${content.substring(0, 50)}...)`
      );
    } catch (error) {
      console.error('[InteractionMemoryBridge] ❌ Failed to record message:', error);
      // Don't throw - bridge should not interrupt conversation
    }
  }

  /**
   * Extract entities from message and link to conversation
   */
  private async extractAndLinkEntities(
    conversationId: string,
    taskId: string,
    content: string
  ): Promise<void> {
    try {
      const result = await entityExtractorService.extractFromText(content);

      const context = this.conversationContexts.get(conversationId);
      if (context && result.newEntitiesAdded > 0) {
        this.stats.entitiesExtracted += result.newEntitiesAdded;
      }

      // Store extracted entities in conversation memory link
      if (result.newEntitiesAdded > 0) {
        const extractedEntities = entityExtractorService
          .getHighConfidenceEntities(0.7)
          .map((e) => e.name);

        if (extractedEntities.length > 0) {
          dbService.exec(
            `UPDATE conversation_memory_links SET extracted_entities = ? WHERE conversation_id = ?`,
            [JSON.stringify(extractedEntities), conversationId]
          );
        }
      }
    } catch (error) {
      console.warn(
        '[InteractionMemoryBridge] ⚠️ Entity extraction failed:',
        error
      );
      // Don't throw - extraction is optional
    }
  }

  /**
   * Asynchronous entity extraction (non-blocking)
   */
  private entityExtractionAsync(conversationId: string, content: string): void {
    setTimeout(() => {
      try {
        entityExtractorService.extractFromText(content).catch((error) => {
          console.warn('[InteractionMemoryBridge] Entity extraction error:', error);
        });
      } catch (error) {
        // Silently fail - async operation
      }
    }, 100); // Defer to next tick
  }

  /**
   * Evaluate conversation for goal relevance
   * Called periodically or when conversation ends
   */
  async evaluateConversationGoals(conversationId: string): Promise<string[]> {
    try {
      const taskId = this.activeConversationMemoryTask.get(conversationId);
      if (!taskId) return [];

      const task = workingMemoryService.getTask(taskId);
      if (!task) return [];

      // Get active goals
      const activeGoals = goalManagementService.getGoals('active');
      const relatedGoalIds: string[] = [];

      // Simple relevance heuristic: check if goal title/description matches conversation topic
      const context = this.conversationContexts.get(conversationId);
      const conversationText = [
        context?.topic,
        task.chainOfThought,
        ...task.items.map((i) => i.content),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      for (const goal of activeGoals) {
        const goalText = `${goal.title} ${goal.description}`.toLowerCase();

        // Simple keyword matching
        const goalWords = goalText.split(/\s+/);
        const matchCount = goalWords.filter((word) =>
          conversationText.includes(word)
        ).length;

        if (matchCount >= 2) {
          // At least 2 words match
          relatedGoalIds.push(goal.id);
          goalManagementService.linkToMemories(goal.id, [taskId]);
        }
      }

      // Update context
      if (context) {
        context.relatedGoals = relatedGoalIds;
      }

      // Store in database
      if (relatedGoalIds.length > 0) {
        dbService.exec(
          `UPDATE conversation_memory_links SET related_goals = ? WHERE conversation_id = ?`,
          [JSON.stringify(relatedGoalIds), conversationId]
        );

        this.stats.goalsUpdated += relatedGoalIds.length;
      }

      console.log(
        `[InteractionMemoryBridge] 🎯 Found ${relatedGoalIds.length} related goals`
      );
      return relatedGoalIds;
    } catch (error) {
      console.error('[InteractionMemoryBridge] ❌ Goal evaluation failed:', error);
      return [];
    }
  }

  /**
   * Complete a conversation
   * Called when conversation ends or is archived
   */
  async onConversationCompleted(conversationId: string): Promise<void> {
    try {
      const taskId = this.activeConversationMemoryTask.get(conversationId);
      if (!taskId) return;

      // Mark task as complete (triggers consolidation)
      workingMemoryService.completeTask(taskId);

      // Evaluate goals one final time
      await this.evaluateConversationGoals(conversationId);

      // Extract final summary
      const task = workingMemoryService.getTask(taskId);
      if (task) {
        // Generate summary conclusion
        const summary = `Conversation ended. Topic: ${task.description}. Messages: ${task.items.length}. Key decisions: ${task.conclusions.join('; ')}`;
        workingMemoryService.addConclusion(taskId, summary);
      }

      // Remove from active tracking
      this.activeConversationMemoryTask.delete(conversationId);

      console.log(
        `[InteractionMemoryBridge] ✅ Conversation completed and memory consolidated`
      );
    } catch (error) {
      console.error(
        '[InteractionMemoryBridge] ❌ Failed to complete conversation:',
        error
      );
    }
  }

  /**
   * Generate and record insight about conversation
   */
  recordInsight(
    conversationId: string,
    insightType:
      | 'user_preference'
      | 'capability'
      | 'interest'
      | 'pattern'
      | 'recommendation',
    content: string,
    confidence: number = 0.7
  ): void {
    try {
      const insightId = `insight-${conversationId}-${Date.now()}`;

      dbService.exec(
        `INSERT INTO interaction_insights
         (id, conversation_id, insight_type, content, confidence, source)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          insightId,
          conversationId,
          insightType,
          content,
          confidence,
          'interaction_bridge',
        ]
      );

      console.log(
        `[InteractionMemoryBridge] 💡 Insight recorded: ${insightType}`
      );
    } catch (error) {
      console.warn('[InteractionMemoryBridge] ⚠️ Failed to record insight:', error);
    }
  }

  /**
   * Get conversation memory context
   */
  getConversationContext(conversationId: string): ConversationMemoryContext | undefined {
    return this.conversationContexts.get(conversationId);
  }

  /**
   * Get all conversation contexts
   */
  getAllConversationContexts(): Map<string, ConversationMemoryContext> {
    return new Map(this.conversationContexts);
  }

  /**
   * Get bridge statistics
   */
  getStats(): InteractionMemoryStats {
    return {
      ...this.stats,
      conversationsTracked: this.activeConversationMemoryTask.size,
    };
  }

  /**
   * Clear conversation tracking (dangerous)
   */
  clear(): void {
    this.activeConversationMemoryTask.clear();
    this.conversationContexts.clear();
    dbService.exec('DELETE FROM conversation_memory_links');
    dbService.exec('DELETE FROM interaction_insights');
    console.log('[InteractionMemoryBridge] ⚠️ All conversation tracking cleared');
  }
}

// Export singleton instance
export const interactionMemoryBridgeService = new InteractionMemoryBridgeService();
