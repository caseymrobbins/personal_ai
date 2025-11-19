/**
 * Network Graph Service
 *
 * Analyzes conversation relationships and builds network graph:
 * - Extracts shared keywords/topics between conversations
 * - Detects conversation relationships (merge, split, branch)
 * - Calculates similarity scores
 * - Builds force-directed graph data
 * - Tracks conversation metadata for visualization
 */

import { dbService, type Conversation } from './db.service';

export interface GraphNode {
  id: string;
  label: string;
  title: string;
  messageCount: number;
  keywords: string[];
  size: number; // For visualization sizing
  color: string; // Based on topic or user
}

export interface GraphLink {
  source: string; // Conversation ID
  target: string; // Conversation ID
  weight: number; // 0-1 similarity score
  type: 'keyword-match' | 'explicit-relation' | 'entity-overlap';
  sharedKeywords?: string[];
}

export interface NetworkGraph {
  nodes: GraphNode[];
  links: GraphLink[];
  centrality: Map<string, number>; // Node importance scores
  clusters: Map<string, string[]>; // Conversation groups
}

export interface ConversationMetrics {
  conversationId: string;
  messageCount: number;
  keywords: string[];
  entities: string[];
  avgMessageLength: number;
  timeSpan: number; // milliseconds
}

class NetworkGraphService {
  private readonly STOPWORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'can',
    'may',
    'might',
    'must',
    'that',
    'this',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
  ]);

  private readonly MIN_KEYWORD_LENGTH = 3;
  private readonly MIN_SIMILARITY_THRESHOLD = 0.2;

  /**
   * Build network graph from all conversations
   */
  buildNetworkGraph(): NetworkGraph {
    try {
      const conversations = dbService.getAllConversations();

      if (conversations.length === 0) {
        return {
          nodes: [],
          links: [],
          centrality: new Map(),
          clusters: new Map(),
        };
      }

      // Extract metrics for each conversation
      const metricsMap = new Map<string, ConversationMetrics>();
      conversations.forEach((conv) => {
        const metrics = this.extractConversationMetrics(conv);
        metricsMap.set(conv.id, metrics);
      });

      // Build nodes
      const nodes = this.buildNodes(conversations, metricsMap);

      // Build links (relationships)
      const links = this.buildLinks(metricsMap, conversations);

      // Calculate centrality scores
      const centrality = this.calculateCentrality(nodes, links);

      // Detect clusters
      const clusters = this.detectClusters(nodes, links);

      console.log('[NetworkGraph] Built graph with', nodes.length, 'nodes and', links.length, 'links');

      return {
        nodes,
        links,
        centrality,
        clusters,
      };
    } catch (err) {
      console.error('[NetworkGraph] Failed to build network graph:', err);
      throw new Error(`Failed to build network graph: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract metrics from a conversation
   */
  private extractConversationMetrics(conversation: Conversation): ConversationMetrics {
    const messages = dbService.getConversationHistory(conversation.id);

    if (messages.length === 0) {
      return {
        conversationId: conversation.id,
        messageCount: 0,
        keywords: [],
        entities: [],
        avgMessageLength: 0,
        timeSpan: 0,
      };
    }

    // Extract keywords from messages
    const allText = messages.map((m) => m.content).join(' ');
    const keywords = this.extractKeywords(allText);

    // Extract entities (capitalized words, likely proper nouns)
    const entities = this.extractEntities(allText);

    // Calculate metrics
    const avgMessageLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    const timeSpan = Math.max(...messages.map((m) => m.timestamp)) - Math.min(...messages.map((m) => m.timestamp));

    return {
      conversationId: conversation.id,
      messageCount: messages.length,
      keywords,
      entities,
      avgMessageLength,
      timeSpan,
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string, limit: number = 15): string[] {
    // Simple keyword extraction: split by word, filter stopwords
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => {
        const clean = word.replace(/[^\w]/g, '');
        return (
          clean.length >= this.MIN_KEYWORD_LENGTH &&
          !this.STOPWORDS.has(clean) &&
          !/^\d+$/.test(clean)
        );
      });

    // Count frequencies
    const frequencies = new Map<string, number>();
    words.forEach((word) => {
      const clean = word.replace(/[^\w]/g, '');
      frequencies.set(clean, (frequencies.get(clean) || 0) + 1);
    });

    // Get top keywords by frequency
    return Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  /**
   * Extract entities (proper nouns) from text
   */
  private extractEntities(text: string, limit: number = 10): string[] {
    // Simple entity extraction: capitalized words
    const words = text.split(/\s+/).filter((word) => {
      const clean = word.replace(/[^\w]/g, '');
      return clean.length > 2 && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase();
    });

    // Remove duplicates (case-insensitive) and count
    const entities = new Map<string, number>();
    words.forEach((word) => {
      const clean = word.replace(/[^\w]/g, '');
      const lower = clean.toLowerCase();
      entities.set(lower, (entities.get(lower) || 0) + 1);
    });

    // Get top entities by frequency
    return Array.from(entities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([entity]) => entity);
  }

  /**
   * Build graph nodes
   */
  private buildNodes(
    conversations: Conversation[],
    metricsMap: Map<string, ConversationMetrics>
  ): GraphNode[] {
    return conversations.map((conv) => {
      const metrics = metricsMap.get(conv.id)!;

      // Size based on message count (log scale for better distribution)
      const size = Math.max(10, Math.log(metrics.messageCount + 1) * 10);

      // Color based on keyword count (topic diversity)
      const color = this.getNodeColor(metrics.keywords.length);

      return {
        id: conv.id,
        label: conv.title,
        title: conv.title,
        messageCount: metrics.messageCount,
        keywords: metrics.keywords,
        size,
        color,
      };
    });
  }

  /**
   * Get color for node based on its properties
   */
  private getNodeColor(keywordCount: number): string {
    // Color spectrum based on keyword diversity
    const colors = [
      '#667eea', // Blue - low diversity
      '#764ba2', // Purple
      '#f093fb', // Pink
      '#f5576c', // Red - high diversity
    ];

    const index = Math.min(Math.floor((keywordCount / 15) * colors.length), colors.length - 1);
    return colors[index];
  }

  /**
   * Build links between conversations
   */
  private buildLinks(metricsMap: Map<string, ConversationMetrics>, conversations: Conversation[]): GraphLink[] {
    const links: GraphLink[] = [];
    const conversationIds = conversations.map((c) => c.id);

    // Check keyword overlap
    for (let i = 0; i < conversationIds.length; i++) {
      for (let j = i + 1; j < conversationIds.length; j++) {
        const convId1 = conversationIds[i];
        const convId2 = conversationIds[j];

        const metrics1 = metricsMap.get(convId1)!;
        const metrics2 = metricsMap.get(convId2)!;

        // Calculate keyword similarity
        const similarity = this.calculateSimilarity(metrics1.keywords, metrics2.keywords);

        if (similarity >= this.MIN_SIMILARITY_THRESHOLD) {
          const sharedKeywords = metrics1.keywords.filter((k) => metrics2.keywords.includes(k));

          links.push({
            source: convId1,
            target: convId2,
            weight: similarity,
            type: 'keyword-match',
            sharedKeywords,
          });
        }
      }
    }

    // Check explicit relations from database
    conversationIds.forEach((convId) => {
      const relations = dbService.getConversationRelations(convId);
      relations.forEach((rel) => {
        const existingLink = links.find(
          (l) =>
            (l.source === rel.source_conversation_id && l.target === rel.target_conversation_id) ||
            (l.source === rel.target_conversation_id && l.target === rel.source_conversation_id)
        );

        if (!existingLink) {
          links.push({
            source: rel.source_conversation_id,
            target: rel.target_conversation_id,
            weight: 0.8, // Explicit relations have high weight
            type: 'explicit-relation',
          });
        }
      });
    });

    return links;
  }

  /**
   * Calculate Jaccard similarity between two keyword lists
   */
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    const intersection = Array.from(set1).filter((k) => set2.has(k)).length;
    const union = new Set([...set1, ...set2]).size;

    return intersection / union;
  }

  /**
   * Calculate node centrality scores (betweenness approximation)
   */
  private calculateCentrality(nodes: GraphNode[], links: GraphLink[]): Map<string, number> {
    const centrality = new Map<string, number>();

    // Initialize all nodes with 0
    nodes.forEach((node) => centrality.set(node.id, 0));

    // Count degree (simple centrality metric)
    links.forEach((link) => {
      const sourceCentrality = centrality.get(link.source) || 0;
      const targetCentrality = centrality.get(link.target) || 0;

      centrality.set(link.source, sourceCentrality + link.weight);
      centrality.set(link.target, targetCentrality + link.weight);
    });

    // Normalize by max centrality
    if (centrality.size > 0) {
      const maxCentrality = Math.max(...Array.from(centrality.values()));
      if (maxCentrality > 0) {
        centrality.forEach((value, key) => {
          centrality.set(key, value / maxCentrality);
        });
      }
    }

    return centrality;
  }

  /**
   * Detect clusters in the graph using simple community detection
   */
  private detectClusters(nodes: GraphNode[], links: GraphLink[]): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    const visited = new Set<string>();

    // Simple greedy clustering
    nodes.forEach((node) => {
      if (visited.has(node.id)) return;

      const cluster: string[] = [node.id];
      visited.add(node.id);

      // Find connected nodes
      const queue = [node.id];
      while (queue.length > 0) {
        const current = queue.shift()!;

        const connectedLinks = links.filter(
          (l) => (l.source === current || l.target === current) && l.weight > this.MIN_SIMILARITY_THRESHOLD
        );

        connectedLinks.forEach((link) => {
          const neighbor = link.source === current ? link.target : link.source;
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            cluster.push(neighbor);
            queue.push(neighbor);
          }
        });
      }

      clusters.set(`cluster_${clusters.size}`, cluster);
    });

    return clusters;
  }

  /**
   * Get graph statistics
   */
  getGraphStatistics(graph: NetworkGraph): {
    nodeCount: number;
    linkCount: number;
    density: number;
    clusterCount: number;
    avgClusterSize: number;
  } {
    const nodeCount = graph.nodes.length;
    const linkCount = graph.links.length;
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
    const clusterCount = graph.clusters.size;
    const avgClusterSize =
      clusterCount > 0
        ? Array.from(graph.clusters.values()).reduce((sum, cluster) => sum + cluster.length, 0) /
          clusterCount
        : 0;

    return {
      nodeCount,
      linkCount,
      density,
      clusterCount,
      avgClusterSize,
    };
  }

  /**
   * Find related conversations for a given conversation
   */
  findRelatedConversations(conversationId: string, graph: NetworkGraph, limit: number = 5): string[] {
    const links = graph.links.filter(
      (l) => l.source === conversationId || l.target === conversationId
    );

    return links
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map((l) => (l.source === conversationId ? l.target : l.source));
  }
}

// Export singleton instance
export const networkGraphService = new NetworkGraphService();
