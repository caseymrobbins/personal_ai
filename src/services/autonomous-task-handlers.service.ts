/**
 * Autonomous Task Handlers Service
 *
 * Implements handlers for autonomous tasks generated during cognitive cycles.
 * These handlers execute background work without user intervention:
 *
 * - Research Tasks: Gather information about topics
 * - Learning Tasks: Extract and consolidate knowledge
 * - Analysis Tasks: Analyze patterns and generate insights
 * - Goal Tasks: Work toward specific goals
 * - Maintenance Tasks: Clean up and optimize
 *
 * Results are consolidated back into memory systems for future use.
 */

import { workingMemoryService } from './working-memory.service';
import { longTermMemoryService } from './long-term-memory.service';
import { declarativeKBService } from './declarative-kb.service';
import { goalManagementService } from './goal-management.service';
import { entityExtractorService } from './entity-extractor.service';
import { userModelService } from './user-model.service';

export type TaskHandlerType =
  | 'memory_consolidation'
  | 'pattern_analysis'
  | 'entity_extraction'
  | 'goal_research'
  | 'goal_analysis'
  | 'kb_maintenance'
  | 'user_model_update'
  | 'custom';

export interface TaskExecutionResult {
  taskId: string;
  handlerType: TaskHandlerType;
  success: boolean;
  duration: number;
  itemsProcessed: number;
  insightsGenerated: string[];
  errors?: string[];
  resultsSummary?: string;
}

/**
 * AutonomousTaskHandlersService
 *
 * Manages execution of autonomous background tasks
 */
class AutonomousTaskHandlersService {
  private executionResults: TaskExecutionResult[] = [];

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[AutonomousTaskHandlers] ✅ Service initialized');
  }

  /**
   * Execute a task based on its type
   */
  async executeTask(
    taskId: string,
    handlerType: TaskHandlerType,
    payload?: Record<string, unknown>
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const result: TaskExecutionResult = {
      taskId,
      handlerType,
      success: true,
      duration: 0,
      itemsProcessed: 0,
      insightsGenerated: [],
    };

    try {
      console.log(`[AutonomousTaskHandlers] ▶️ Executing task: ${handlerType}`);

      // Route to appropriate handler
      switch (handlerType) {
        case 'memory_consolidation':
          await this.handleMemoryConsolidation(result, payload);
          break;
        case 'pattern_analysis':
          await this.handlePatternAnalysis(result, payload);
          break;
        case 'entity_extraction':
          await this.handleEntityExtraction(result, payload);
          break;
        case 'goal_research':
          await this.handleGoalResearch(result, payload);
          break;
        case 'goal_analysis':
          await this.handleGoalAnalysis(result, payload);
          break;
        case 'kb_maintenance':
          await this.handleKBMaintenance(result, payload);
          break;
        case 'user_model_update':
          await this.handleUserModelUpdate(result, payload);
          break;
        default:
          throw new Error(`Unknown task handler type: ${handlerType}`);
      }

      result.duration = Date.now() - startTime;
      this.executionResults.push(result);

      console.log(
        `[AutonomousTaskHandlers] ✅ Task completed: ${handlerType} (${result.duration}ms, ${result.itemsProcessed} items)`
      );

      return result;
    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors = [error instanceof Error ? error.message : String(error)];
      this.executionResults.push(result);

      console.error(
        `[AutonomousTaskHandlers] ❌ Task failed: ${handlerType}`,
        error
      );

      return result;
    }
  }

  /**
   * Handle memory consolidation task
   */
  private async handleMemoryConsolidation(
    result: TaskExecutionResult,
    _payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Get consolidation candidates from working memory
      const candidates = workingMemoryService.getConsolidationCandidates();
      result.itemsProcessed = candidates.length;

      if (candidates.length === 0) {
        result.insightsGenerated.push('No consolidation candidates found');
        return;
      }

      // Consolidate to long-term memory
      const consolidated = await longTermMemoryService.consolidateMemories(candidates);
      result.itemsProcessed = consolidated.length;

      result.insightsGenerated.push(
        `Consolidated ${consolidated.length} memories to long-term storage`
      );

      // Mark items as consolidated
      for (const _candidate of candidates) {
        // Could update status in DB if needed
      }

      result.resultsSummary = `Successfully consolidated ${consolidated.length} working memory items`;
    } catch (error) {
      throw new Error(`Memory consolidation failed: ${error}`);
    }
  }

  /**
   * Handle pattern analysis task
   */
  private async handlePatternAnalysis(
    result: TaskExecutionResult,
    _payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Analyze recent memories for patterns
      const recentMemories = await longTermMemoryService.getRecentMemories(50);
      result.itemsProcessed = recentMemories.length;

      if (recentMemories.length === 0) {
        result.insightsGenerated.push('No recent memories to analyze');
        return;
      }

      // Extract content for analysis
      const contents = recentMemories.map((m) => m.content).join(' ');

      // Simple pattern detection: recurring keywords
      const wordFrequency: Record<string, number> = {};
      const words = contents.toLowerCase().split(/\s+/);

      words.forEach((word) => {
        // Skip short words and common words
        if (word.length > 3 && !['the', 'and', 'that', 'this', 'with', 'from'].includes(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });

      // Find top recurring topics
      const topPatterns = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => `${word} (${count} mentions)`);

      result.insightsGenerated = [
        `Detected ${Object.keys(wordFrequency).length} unique patterns`,
        `Top patterns: ${topPatterns.join(', ')}`,
      ];

      result.resultsSummary = `Pattern analysis complete: ${topPatterns.join(', ')}`;
    } catch (error) {
      throw new Error(`Pattern analysis failed: ${error}`);
    }
  }

  /**
   * Handle entity extraction task
   */
  private async handleEntityExtraction(
    result: TaskExecutionResult,
    _payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Extract from recent memories
      const recentMemories = await longTermMemoryService.getRecentMemories(30);
      result.itemsProcessed = recentMemories.length;

      let totalNewEntities = 0;

      for (const memory of recentMemories) {
        const extractionResult = await entityExtractorService.extractFromText(memory.content);
        totalNewEntities += extractionResult.newEntitiesAdded;
      }

      result.insightsGenerated.push(
        `Extracted ${totalNewEntities} new entities from recent memories`
      );

      // Get top entities
      const topEntities = entityExtractorService.getTopEntities(5);
      result.insightsGenerated.push(
        `Top entities: ${topEntities.map((e) => e.name).join(', ')}`
      );

      result.resultsSummary = `Entity extraction complete: ${totalNewEntities} new entities`;
    } catch (error) {
      throw new Error(`Entity extraction failed: ${error}`);
    }
  }

  /**
   * Handle goal research task
   */
  private async handleGoalResearch(
    result: TaskExecutionResult,
    payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      const goalId = payload?.goalId as string;
      if (!goalId) {
        throw new Error('Goal ID not provided');
      }

      const goal = goalManagementService.getGoal(goalId);
      if (!goal) {
        throw new Error(`Goal not found: ${goalId}`);
      }

      // Search memories for relevant information about the goal
      const relatedMemories = await longTermMemoryService.searchMemories(goal.title, 20, 0.4);
      result.itemsProcessed = relatedMemories.length;

      if (relatedMemories.length > 0) {
        // Consolidate findings
        const insights = relatedMemories
          .map((m) => m.content.substring(0, 100))
          .slice(0, 3);

        result.insightsGenerated = insights;
        result.insightsGenerated.push(`Found ${relatedMemories.length} relevant memories`);

        // Update goal with progress
        const progressIncrease = Math.min(0.1, relatedMemories.length * 0.02);
        goalManagementService.updateProgress(goalId, goal.progress + progressIncrease, 'Research findings');
      } else {
        result.insightsGenerated.push('No relevant memories found for this goal');
      }

      result.resultsSummary = `Research complete for goal: ${goal.title}`;
    } catch (error) {
      throw new Error(`Goal research failed: ${error}`);
    }
  }

  /**
   * Handle goal analysis task
   */
  private async handleGoalAnalysis(
    result: TaskExecutionResult,
    _payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Analyze all active goals
      const activeGoals = goalManagementService.getGoals('active');
      result.itemsProcessed = activeGoals.length;

      const analysis: string[] = [];

      for (const goal of activeGoals) {
        // Get related entities
        const entities = goal.relatedEntities.length;
        // Get related memories
        const memories = goal.relatedMemories.length;

        // Assess goal health
        let health = 'healthy';
        if (goal.progress === 0 && (Date.now() - goal.createdAt > 7 * 24 * 60 * 60 * 1000)) {
          health = 'stalled';
        } else if (goal.autonomyLevel < 0.3) {
          health = 'low_autonomy';
        }

        analysis.push(
          `${goal.title}: ${health} (progress: ${(goal.progress * 100).toFixed(0)}%, entities: ${entities}, memories: ${memories})`
        );
      }

      result.insightsGenerated = analysis;
      result.resultsSummary = `Analyzed ${activeGoals.length} active goals`;
    } catch (error) {
      throw new Error(`Goal analysis failed: ${error}`);
    }
  }

  /**
   * Handle knowledge base maintenance
   */
  private async handleKBMaintenance(
    result: TaskExecutionResult,
    _payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      const kbStats = declarativeKBService.getStats();
      result.itemsProcessed = kbStats.totalEntities;

      // Check for duplicate entities
      const entities = declarativeKBService.export().entities;
      const nameMap: Record<string, string[]> = {};

      entities.forEach((entity) => {
        const normalized = entity.name.toLowerCase();
        if (!nameMap[normalized]) {
          nameMap[normalized] = [];
        }
        nameMap[normalized].push(entity.id);
      });

      const duplicates = Object.entries(nameMap).filter(([_name, ids]) => ids.length > 1);
      result.insightsGenerated.push(
        `Found ${duplicates.length} potential duplicate entities`
      );

      // Attempt to merge duplicates
      let mergedCount = 0;
      for (const [_name, ids] of duplicates) {
        if (ids.length === 2) {
          try {
            declarativeKBService.mergeEntities(ids[0], ids[1]);
            mergedCount++;
          } catch (error) {
            console.warn(`Failed to merge entities: ${error}`);
          }
        }
      }

      result.insightsGenerated.push(`Merged ${mergedCount} duplicate entities`);
      result.resultsSummary = `KB maintenance complete: ${mergedCount} duplicates merged`;
    } catch (error) {
      throw new Error(`KB maintenance failed: ${error}`);
    }
  }

  /**
   * Handle user model update
   */
  private async handleUserModelUpdate(
    result: TaskExecutionResult,
    _payload?: Record<string, unknown>
  ): Promise<void> {
    try {
      const profile = userModelService.getProfile();
      if (!profile) {
        throw new Error('User profile not found');
      }

      result.itemsProcessed = profile.interests.size + profile.capabilities.size;

      // Consolidate top interests and capabilities into user profile summary
      const topInterests = Array.from(profile.interests.values())
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((i) => i.topic);

      const topCapabilities = Array.from(profile.capabilities.values())
        .sort((a, b) => b.proficiency - a.proficiency)
        .slice(0, 5)
        .map((c) => c.skill);

      result.insightsGenerated = [
        `Top interests: ${topInterests.join(', ')}`,
        `Top capabilities: ${topCapabilities.join(', ')}`,
        `Total interests tracked: ${profile.interests.size}`,
        `Total capabilities recorded: ${profile.capabilities.size}`,
      ];

      result.resultsSummary = `User model updated with ${profile.interests.size} interests and ${profile.capabilities.size} capabilities`;
    } catch (error) {
      throw new Error(`User model update failed: ${error}`);
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 20): TaskExecutionResult[] {
    return this.executionResults.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalTasksExecuted: number;
    successfulTasks: number;
    failedTasks: number;
    successRate: number;
    totalItemsProcessed: number;
    averageExecutionTime: number;
    taskTypeBreakdown: Record<TaskHandlerType, number>;
  } {
    const total = this.executionResults.length;
    const successful = this.executionResults.filter((r) => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    const totalItems = this.executionResults.reduce((sum, r) => sum + r.itemsProcessed, 0);
    const avgTime = total > 0 ? this.executionResults.reduce((sum, r) => sum + r.duration, 0) / total : 0;

    const typeBreakdown: Record<TaskHandlerType, number> = {
      memory_consolidation: 0,
      pattern_analysis: 0,
      entity_extraction: 0,
      goal_research: 0,
      goal_analysis: 0,
      kb_maintenance: 0,
      user_model_update: 0,
      custom: 0,
    };

    this.executionResults.forEach((r) => {
      typeBreakdown[r.handlerType]++;
    });

    return {
      totalTasksExecuted: total,
      successfulTasks: successful,
      failedTasks: failed,
      successRate,
      totalItemsProcessed: totalItems,
      averageExecutionTime: avgTime,
      taskTypeBreakdown: typeBreakdown,
    };
  }

  /**
   * Clear history
   */
  clear(): void {
    this.executionResults = [];
    console.log('[AutonomousTaskHandlers] ⚠️ History cleared');
  }
}

// Export singleton instance
export const autonomousTaskHandlersService = new AutonomousTaskHandlersService();
