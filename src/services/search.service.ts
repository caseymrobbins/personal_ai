/**
 * Semantic Search Service (Sprint 11)
 *
 * Enables searching conversations by meaning, not just keywords.
 * Uses the same embedding infrastructure built for RDI (Sprint 6).
 *
 * Example:
 * - Search "privacy concerns" → finds messages about "data security", "anonymization"
 * - Search "how to build" → finds "implementation steps", "development guide"
 *
 * Uses cosine similarity to rank results by semantic relevance.
 */

import { embeddingsService } from './embeddings.service';
import { dbService } from './db.service';

export interface SearchResult {
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  similarity: number;  // 0.0-1.0 (1.0 = perfect match)
  snippet: string;     // Highlighted snippet
}

export interface SearchOptions {
  conversationId?: string;  // Optional: limit to specific conversation
  minSimilarity?: number;   // Minimum similarity threshold (default: 0.3)
  maxResults?: number;      // Maximum results to return (default: 20)
  includeSystem?: boolean;  // Include system messages (default: false)
}

class SearchService {
  private readonly DEFAULT_MIN_SIMILARITY = 0.3;
  private readonly DEFAULT_MAX_RESULTS = 20;

  /**
   * Perform semantic search across all messages
   *
   * @param query The search query (natural language)
   * @param options Search options (filters, limits)
   * @returns Array of search results, ranked by similarity
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      conversationId,
      minSimilarity = this.DEFAULT_MIN_SIMILARITY,
      maxResults = this.DEFAULT_MAX_RESULTS,
      includeSystem = false,
    } = options;

    console.log(`[Search] Searching for: "${query}"`, options);

    try {
      // Step 1: Generate embedding for search query
      const queryEmbedding = await embeddingsService.embed(query);

      // Step 2: Get all messages with their embeddings
      // Note: We store embeddings in governance_log, but we need to match them to messages
      // For now, we'll search through governance_log entries that have embeddings
      const governanceEntries = dbService.getRecentGovernanceMetrics(1000); // Get more for search

      // Step 3: Get all messages (we'll need to correlate by timestamp)
      let messages = conversationId
        ? dbService.getConversationHistory(conversationId)
        : this.getAllMessages();

      // Filter out system messages if not included
      if (!includeSystem) {
        messages = messages.filter(msg => msg.role !== 'system');
      }

      // Step 4: Calculate similarity for each message
      // We need to match messages to their embeddings via timestamp proximity
      const results: SearchResult[] = [];

      for (const message of messages) {
        // Find governance entry closest to this message's timestamp
        const governanceEntry = this.findClosestGovernanceEntry(
          message.timestamp,
          governanceEntries
        );

        if (!governanceEntry) continue;

        // Get the embedding from database
        const embeddingBlob = this.getEmbeddingById(governanceEntry.id);
        if (!embeddingBlob) continue;

        const messageEmbedding = embeddingsService.deserializeEmbedding(embeddingBlob);

        // Calculate similarity
        const similarity = embeddingsService.cosineSimilarity(queryEmbedding, messageEmbedding);

        // Filter by minimum similarity
        if (similarity < minSimilarity) continue;

        // Get conversation title
        const conversation = dbService.getConversation(message.conversation_id);
        const conversationTitle = conversation?.title || 'Unknown';

        // Create snippet (first 150 chars)
        const snippet = this.createSnippet(message.content, query);

        results.push({
          messageId: message.id,
          conversationId: message.conversation_id,
          conversationTitle,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          similarity,
          snippet,
        });
      }

      // Step 5: Sort by similarity (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const topResults = results.slice(0, maxResults);

      console.log(`[Search] Found ${topResults.length} results for "${query}"`);

      return topResults;
    } catch (error) {
      console.error('[Search] Search failed:', error);
      throw error;
    }
  }

  /**
   * Get all messages from all conversations
   */
  private getAllMessages() {
    const conversations = dbService.getConversations();
    const allMessages = conversations.flatMap(conv =>
      dbService.getConversationHistory(conv.id)
    );
    return allMessages;
  }

  /**
   * Find governance entry closest to message timestamp
   */
  private findClosestGovernanceEntry(
    messageTimestamp: number,
    governanceEntries: Array<{ id: number; timestamp: number }>
  ) {
    if (governanceEntries.length === 0) return null;

    let closest = governanceEntries[0];
    let minDiff = Math.abs(messageTimestamp - closest.timestamp);

    for (const entry of governanceEntries) {
      const diff = Math.abs(messageTimestamp - entry.timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = entry;
      }
    }

    // Only return if within 5 seconds (otherwise not a match)
    return minDiff < 5000 ? closest : null;
  }

  /**
   * Get embedding by governance log ID
   */
  private getEmbeddingById(id: number): Uint8Array | null {
    try {
      const results = dbService.query<{ prompt_embedding: Uint8Array }>(
        'SELECT prompt_embedding FROM governance_log WHERE id = ? AND prompt_embedding IS NOT NULL',
        [id]
      );
      return results.length > 0 ? results[0].prompt_embedding : null;
    } catch (error) {
      console.error('[Search] Failed to get embedding:', error);
      return null;
    }
  }

  /**
   * Create a snippet from message content
   */
  private createSnippet(content: string, query: string, maxLength = 150): string {
    // Try to find query keywords in content
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    // Find first occurrence of any query word
    let startIndex = 0;
    for (const word of queryWords) {
      const index = contentLower.indexOf(word);
      if (index >= 0) {
        // Start snippet a bit before the match
        startIndex = Math.max(0, index - 30);
        break;
      }
    }

    // Create snippet
    let snippet = content.substring(startIndex, startIndex + maxLength);

    // Add ellipsis if truncated
    if (startIndex > 0) snippet = '...' + snippet;
    if (startIndex + maxLength < content.length) snippet = snippet + '...';

    return snippet.trim();
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    if (partialQuery.length < 3) return [];

    // Get recent user messages as suggestions
    const allMessages = this.getAllMessages();
    const userMessages = allMessages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content);

    // Find messages containing the partial query
    const matches = userMessages.filter(content =>
      content.toLowerCase().includes(partialQuery.toLowerCase())
    );

    // Return unique, limited suggestions
    return Array.from(new Set(matches)).slice(0, 5);
  }

  /**
   * Find similar conversations to the current one
   */
  async findSimilarConversations(conversationId: string, limit = 5): Promise<{
    conversationId: string;
    title: string;
    similarity: number;
  }[]> {
    // Get messages from current conversation
    const currentMessages = dbService.getConversationHistory(conversationId);
    if (currentMessages.length === 0) return [];

    // Use first user message as representative of conversation
    const firstUserMessage = currentMessages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return [];

    // Search for similar messages in other conversations
    const results = await this.search(firstUserMessage.content, {
      maxResults: 20,
      minSimilarity: 0.5,
    });

    // Group by conversation and calculate average similarity
    const conversationSimilarities = new Map<string, { title: string; similarities: number[] }>();

    for (const result of results) {
      if (result.conversationId === conversationId) continue; // Skip current conversation

      if (!conversationSimilarities.has(result.conversationId)) {
        conversationSimilarities.set(result.conversationId, {
          title: result.conversationTitle,
          similarities: [],
        });
      }

      conversationSimilarities.get(result.conversationId)!.similarities.push(result.similarity);
    }

    // Calculate average similarity per conversation
    const similar = Array.from(conversationSimilarities.entries()).map(([id, data]) => ({
      conversationId: id,
      title: data.title,
      similarity: data.similarities.reduce((a, b) => a + b, 0) / data.similarities.length,
    }));

    // Sort by similarity and limit
    similar.sort((a, b) => b.similarity - a.similarity);
    return similar.slice(0, limit);
  }
}

// Export singleton instance
export const searchService = new SearchService();
