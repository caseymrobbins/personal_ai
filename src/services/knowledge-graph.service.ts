/**
 * Knowledge Graph Service
 *
 * Extracts concepts and relationships from conversation content:
 * - Identifies key concepts (entities, terms, topics)
 * - Detects concept relationships (co-occurrence, hierarchical, causal)
 * - Ranks concepts by importance (frequency, centrality, context)
 * - Builds semantic graph of knowledge
 * - Tracks concept evolution across conversations
 */

import { dbService, type Conversation, type ChatMessage } from './db.service';
import { embeddingsService } from './embeddings.service';

export interface Concept {
  id: string;
  label: string;
  type: 'entity' | 'topic' | 'technique' | 'question' | 'problem';
  frequency: number; // How many times mentioned
  importance: number; // 0-1 importance score
  contexts: string[]; // Example sentences containing concept
  relatedKeywords: string[];
}

export interface ConceptRelationship {
  sourceConceptId: string;
  targetConceptId: string;
  type: 'co-occurrence' | 'definition' | 'example' | 'causation' | 'analogy';
  strength: number; // 0-1 relationship strength
  evidence: string[]; // Example contexts showing relationship
}

export interface KnowledgeGraph {
  conversationId: string;
  concepts: Concept[];
  relationships: ConceptRelationship[];
  conceptMap: Map<string, Concept>; // For O(1) lookup
  topConcepts: string[]; // Top 10 by importance
}

export interface GlobalKnowledgeGraph {
  concepts: Map<string, Concept>; // Global concept index
  relationships: ConceptRelationship[];
  conceptFrequency: Map<string, number>; // Cross-conversation frequency
  conceptConnections: Map<string, Set<string>>; // Concept adjacency
}

export interface ConceptStats {
  totalConcepts: number;
  conceptsByType: Map<string, number>;
  averageImportance: number;
  densest: string; // Most connected concept
  orphans: string[]; // Concepts with no relationships
}

interface ConversationContext {
  conversationId: string;
  title: string;
  messages: ChatMessage[];
  allText: string;
}

interface ConceptCandidate {
  text: string;
  type: 'entity' | 'topic' | 'technique' | 'question' | 'problem';
  frequency: number;
  positions: number[];
  contexts: string[];
}

class KnowledgeGraphService {
  private readonly MIN_CONCEPT_LENGTH = 2; // Minimum word tokens
  private readonly MIN_FREQUENCY = 2; // Minimum mentions
  private readonly CONTEXT_WINDOW = 50; // Characters around concept
  private readonly STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must',
    'that', 'this', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'by', 'as', 'with', 'from', 'about', 'into',
  ]);

  // Action verbs indicating relationships
  private readonly RELATIONSHIP_MARKERS = {
    causation: ['causes', 'because', 'caused', 'leads to', 'results in', 'due to', 'if', 'then'],
    definition: ['is', 'means', 'defined as', 'refers to', 'called', 'known as'],
    example: ['example', 'such as', 'like', 'for instance', 'e.g.', 'includes'],
    analogy: ['similar to', 'like', 'analogous', 'compared to', 'as', 'than'],
  };

  /**
   * Extract knowledge graph from single conversation
   */
  extractConversationGraph(conversationId: string): KnowledgeGraph {
    try {
      const conversation = dbService.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      const messages = dbService.getConversationHistory(conversationId);
      if (messages.length === 0) {
        return {
          conversationId,
          concepts: [],
          relationships: [],
          conceptMap: new Map(),
          topConcepts: [],
        };
      }

      const context: ConversationContext = {
        conversationId,
        title: conversation.title,
        messages,
        allText: this.preprocessText(messages),
      };

      // Extract concepts with different methods
      const concepts = this.extractConcepts(context);

      // Detect relationships between concepts
      const relationships = this.detectRelationships(context, concepts);

      // Calculate importance scores
      const rankedConcepts = this.rankConcepts(concepts, relationships);

      // Build concept map for O(1) lookup
      const conceptMap = new Map(rankedConcepts.map((c) => [c.id, c]));

      // Get top concepts
      const topConcepts = rankedConcepts
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10)
        .map((c) => c.id);

      console.log('[KnowledgeGraph] Extracted', rankedConcepts.length, 'concepts from', conversationId);

      return {
        conversationId,
        concepts: rankedConcepts,
        relationships,
        conceptMap,
        topConcepts,
      };
    } catch (err) {
      console.error('[KnowledgeGraph] Failed to extract graph:', err);
      throw new Error(`Failed to extract knowledge graph: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Build global knowledge graph across all conversations
   */
  buildGlobalGraph(): GlobalKnowledgeGraph {
    try {
      const conversations = dbService.getAllConversations();
      const conceptIndex = new Map<string, Concept>();
      const conceptConnections = new Map<string, Set<string>>();
      const allRelationships: ConceptRelationship[] = [];
      const conceptFrequency = new Map<string, number>();

      // Extract graphs from each conversation
      conversations.forEach((conv) => {
        const graph = this.extractConversationGraph(conv.id);

        // Merge concepts (deduplicate by label)
        graph.concepts.forEach((concept) => {
          const key = this.normalizeConcept(concept.label);
          const existing = conceptIndex.get(key);

          if (existing) {
            // Merge frequencies and contexts
            existing.frequency += concept.frequency;
            existing.contexts = [...new Set([...existing.contexts, ...concept.contexts])];
            existing.relatedKeywords = [...new Set([...existing.relatedKeywords, ...concept.relatedKeywords])];
            existing.importance = Math.max(existing.importance, concept.importance);
          } else {
            conceptIndex.set(key, { ...concept, id: key });
          }

          const freq = conceptFrequency.get(key) || 0;
          conceptFrequency.set(key, freq + 1);
        });

        // Collect relationships
        allRelationships.push(...graph.relationships);
      });

      // Build concept connection map
      allRelationships.forEach((rel) => {
        const sourceSet = conceptConnections.get(rel.sourceConceptId) || new Set();
        const targetSet = conceptConnections.get(rel.targetConceptId) || new Set();

        sourceSet.add(rel.targetConceptId);
        targetSet.add(rel.sourceConceptId);

        conceptConnections.set(rel.sourceConceptId, sourceSet);
        conceptConnections.set(rel.targetConceptId, targetSet);
      });

      // Recalculate global importance scores
      this.recalculateGlobalImportance(conceptIndex, conceptConnections, conceptFrequency);

      console.log('[KnowledgeGraph] Built global graph with', conceptIndex.size, 'concepts');

      return {
        concepts: conceptIndex,
        relationships: allRelationships,
        conceptFrequency,
        conceptConnections,
      };
    } catch (err) {
      console.error('[KnowledgeGraph] Failed to build global graph:', err);
      throw new Error(`Failed to build global knowledge graph: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Preprocess text for concept extraction
   */
  private preprocessText(messages: ChatMessage[]): string {
    return messages
      .map((m) => m.content)
      .join('\n\n')
      .toLowerCase()
      .replace(/[^\w\s\.\?\!]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract concepts using multiple methods
   */
  private extractConcepts(context: ConversationContext): ConceptCandidate[] {
    const candidates = new Map<string, ConceptCandidate>();

    // Method 1: Named Entity Recognition (proper nouns)
    this.extractEntities(context).forEach((entity) => {
      const key = this.normalizeConcept(entity.text);
      if (!candidates.has(key)) {
        candidates.set(key, {
          text: entity.text,
          type: 'entity',
          frequency: entity.frequency,
          positions: entity.positions,
          contexts: entity.contexts,
        });
      }
    });

    // Method 2: Technical Terms (multi-word phrases)
    this.extractTechnicalTerms(context).forEach((term) => {
      const key = this.normalizeConcept(term.text);
      if (!candidates.has(key)) {
        candidates.set(key, {
          text: term.text,
          type: 'technique',
          frequency: term.frequency,
          positions: term.positions,
          contexts: term.contexts,
        });
      }
    });

    // Method 3: Topic Keywords (frequent meaningful words)
    this.extractTopicKeywords(context).forEach((keyword) => {
      const key = this.normalizeConcept(keyword.text);
      if (!candidates.has(key)) {
        candidates.set(key, {
          text: keyword.text,
          type: 'topic',
          frequency: keyword.frequency,
          positions: keyword.positions,
          contexts: keyword.contexts,
        });
      }
    });

    // Method 4: Questions (interrogative clauses)
    this.extractQuestions(context).forEach((question) => {
      const key = this.normalizeConcept(question.text);
      if (!candidates.has(key)) {
        candidates.set(key, {
          text: question.text,
          type: 'question',
          frequency: question.frequency,
          positions: question.positions,
          contexts: question.contexts,
        });
      }
    });

    // Method 5: Problems (patterns indicating problems)
    this.extractProblems(context).forEach((problem) => {
      const key = this.normalizeConcept(problem.text);
      if (!candidates.has(key)) {
        candidates.set(key, {
          text: problem.text,
          type: 'problem',
          frequency: problem.frequency,
          positions: problem.positions,
          contexts: problem.contexts,
        });
      }
    });

    // Filter by minimum frequency and return
    return Array.from(candidates.values()).filter((c) => c.frequency >= this.MIN_FREQUENCY);
  }

  /**
   * Extract named entities (proper nouns, capitalized terms)
   */
  private extractEntities(context: ConversationContext): ConceptCandidate[] {
    const entities = new Map<string, ConceptCandidate>();
    const text = context.allText;
    const words = text.split(/\s+/);

    // Look for capitalized words (proper nouns)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const clean = word.replace(/[^\w]/g, '');

      if (clean.length > 2 && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase()) {
        const key = this.normalizeConcept(clean);

        if (!entities.has(key)) {
          entities.set(key, {
            text: clean,
            type: 'entity',
            frequency: 1,
            positions: [i],
            contexts: [],
          });
        } else {
          const entity = entities.get(key)!;
          entity.frequency++;
          entity.positions.push(i);
        }
      }
    }

    // Extract contexts for each entity
    entities.forEach((entity) => {
      entity.contexts = entity.positions
        .map((pos) => {
          const start = Math.max(0, pos - 5);
          const end = Math.min(words.length, pos + 6);
          return words.slice(start, end).join(' ');
        })
        .slice(0, 3); // Keep first 3 contexts
    });

    return Array.from(entities.values());
  }

  /**
   * Extract technical terms (multi-word phrases, compound nouns)
   */
  private extractTechnicalTerms(context: ConversationContext): ConceptCandidate[] {
    const terms = new Map<string, ConceptCandidate>();
    const text = context.allText;
    const words = text.split(/\s+/);

    // Look for common technical patterns (2-3 word phrases)
    for (let i = 0; i < words.length - 1; i++) {
      // Two-word terms
      const twoWord = [words[i], words[i + 1]].join(' ');
      const cleanTwo = twoWord.replace(/[^\w\s]/g, '');

      if (cleanTwo.split(/\s+/).length === 2 && !this.STOPWORDS.has(cleanTwo.split(/\s+/)[0])) {
        const key = this.normalizeConcept(cleanTwo);
        if (!terms.has(key)) {
          terms.set(key, {
            text: cleanTwo,
            type: 'technique',
            frequency: 1,
            positions: [i],
            contexts: [],
          });
        } else {
          terms.get(key)!.frequency++;
          terms.get(key)!.positions.push(i);
        }
      }

      // Three-word terms
      if (i < words.length - 2) {
        const threeWord = [words[i], words[i + 1], words[i + 2]].join(' ');
        const cleanThree = threeWord.replace(/[^\w\s]/g, '');

        if (
          cleanThree.split(/\s+/).length === 3 &&
          !this.STOPWORDS.has(cleanThree.split(/\s+/)[0]) &&
          !this.STOPWORDS.has(cleanThree.split(/\s+/)[1])
        ) {
          const key = this.normalizeConcept(cleanThree);
          if (!terms.has(key)) {
            terms.set(key, {
              text: cleanThree,
              type: 'technique',
              frequency: 1,
              positions: [i],
              contexts: [],
            });
          } else {
            terms.get(key)!.frequency++;
            terms.get(key)!.positions.push(i);
          }
        }
      }
    }

    // Extract contexts
    terms.forEach((term) => {
      term.contexts = term.positions
        .map((pos) => {
          const start = Math.max(0, pos - 4);
          const end = Math.min(words.length, pos + 5);
          return words.slice(start, end).join(' ');
        })
        .slice(0, 3);
    });

    return Array.from(terms.values()).filter((t) => t.frequency >= this.MIN_FREQUENCY);
  }

  /**
   * Extract topic keywords (frequent meaningful single words)
   */
  private extractTopicKeywords(context: ConversationContext): ConceptCandidate[] {
    const keywords = new Map<string, ConceptCandidate>();
    const text = context.allText;
    const words = text.split(/\s+/);

    // Count word frequencies
    const frequencies = new Map<string, number>();
    const positions = new Map<string, number[]>();

    words.forEach((word, idx) => {
      const clean = word.replace(/[^\w]/g, '').toLowerCase();
      if (
        clean.length >= 3 &&
        !this.STOPWORDS.has(clean) &&
        !/^\d+$/.test(clean)
      ) {
        frequencies.set(clean, (frequencies.get(clean) || 0) + 1);
        const pos = positions.get(clean) || [];
        pos.push(idx);
        positions.set(clean, pos);
      }
    });

    // Get top keywords by frequency
    Array.from(frequencies.entries())
      .filter(([, freq]) => freq >= this.MIN_FREQUENCY)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30) // Top 30 keywords
      .forEach(([keyword, frequency]) => {
        const pos = positions.get(keyword) || [];
        const contexts = pos
          .slice(0, 3)
          .map((p) => {
            const start = Math.max(0, p - 5);
            const end = Math.min(words.length, p + 6);
            return words.slice(start, end).join(' ');
          });

        keywords.set(keyword, {
          text: keyword,
          type: 'topic',
          frequency,
          positions: pos,
          contexts,
        });
      });

    return Array.from(keywords.values());
  }

  /**
   * Extract question concepts
   */
  private extractQuestions(context: ConversationContext): ConceptCandidate[] {
    const questions = new Map<string, ConceptCandidate>();
    const text = context.allText;

    // Find sentences ending with ?
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const questionSentences = sentences.filter((s, idx) => {
      const origText = context.allText;
      const before = origText.substring(0, origText.indexOf(s) + s.length);
      return before.endsWith('?');
    });

    // Extract question patterns
    questionSentences.forEach((question) => {
      // Simple extraction: first few words or question words
      const words = question.trim().split(/\s+/).slice(0, 10).join(' ');
      const key = this.normalizeConcept(words);

      if (!questions.has(key)) {
        questions.set(key, {
          text: words,
          type: 'question',
          frequency: 1,
          positions: [],
          contexts: [question.trim()],
        });
      } else {
        const q = questions.get(key)!;
        q.frequency++;
        q.contexts.push(question.trim());
      }
    });

    return Array.from(questions.values());
  }

  /**
   * Extract problem concepts
   */
  private extractProblems(context: ConversationContext): ConceptCandidate[] {
    const problems = new Map<string, ConceptCandidate>();
    const text = context.allText;
    const words = text.split(/\s+/);

    // Look for problem indicators
    const problemIndicators = [
      'problem', 'issue', 'error', 'bug', 'challenge', 'difficulty',
      'failing', 'broken', 'crash', 'fail', 'failed', 'exception',
    ];

    // Find words near problem indicators
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '').toLowerCase();

      if (problemIndicators.includes(word)) {
        // Extract nearby concepts as problems
        const start = Math.max(0, i - 2);
        const end = Math.min(words.length, i + 3);
        const context_words = words.slice(start, end);

        context_words.forEach((w, offset) => {
          const clean = w.replace(/[^\w]/g, '').toLowerCase();
          if (clean.length > 3 && !this.STOPWORDS.has(clean)) {
            const key = this.normalizeConcept(clean);

            if (!problems.has(key)) {
              problems.set(key, {
                text: clean,
                type: 'problem',
                frequency: 1,
                positions: [],
                contexts: [context_words.join(' ')],
              });
            } else {
              const p = problems.get(key)!;
              p.frequency++;
              p.contexts.push(context_words.join(' '));
            }
          }
        });
      }
    }

    return Array.from(problems.values());
  }

  /**
   * Detect relationships between concepts
   */
  private detectRelationships(
    context: ConversationContext,
    concepts: ConceptCandidate[]
  ): ConceptRelationship[] {
    const relationships: ConceptRelationship[] = [];
    const text = context.allText;

    // Build proximity matrix
    const conceptPositions = new Map<string, number[]>();
    concepts.forEach((concept) => {
      const key = this.normalizeConcept(concept.text);
      conceptPositions.set(key, concept.positions);
    });

    // Detect co-occurrence relationships
    const conceptKeys = Array.from(conceptPositions.keys());
    for (let i = 0; i < conceptKeys.length; i++) {
      for (let j = i + 1; j < conceptKeys.length; j++) {
        const key1 = conceptKeys[i];
        const key2 = conceptKeys[j];
        const positions1 = conceptPositions.get(key1) || [];
        const positions2 = conceptPositions.get(key2) || [];

        // Calculate co-occurrence strength (proximity)
        let minDistance = Infinity;
        let coOccurrences = 0;

        positions1.forEach((pos1) => {
          positions2.forEach((pos2) => {
            const distance = Math.abs(pos1 - pos2);
            if (distance < 20) {
              // Within 20 words
              coOccurrences++;
              minDistance = Math.min(minDistance, distance);
            }
          });
        });

        if (coOccurrences > 0) {
          const strength = Math.min(1, coOccurrences / 10);
          relationships.push({
            sourceConceptId: key1,
            targetConceptId: key2,
            type: 'co-occurrence',
            strength,
            evidence: [`Co-occur ${coOccurrences} times`],
          });
        }
      }
    }

    // Detect causal relationships
    this.detectCausalRelationships(text, conceptKeys).forEach((rel) => {
      relationships.push(rel);
    });

    // Detect definition relationships
    this.detectDefinitionRelationships(text, conceptKeys).forEach((rel) => {
      relationships.push(rel);
    });

    return relationships;
  }

  /**
   * Detect causal relationships
   */
  private detectCausalRelationships(text: string, conceptKeys: string[]): ConceptRelationship[] {
    const relationships: ConceptRelationship[] = [];

    conceptKeys.forEach((key1) => {
      conceptKeys.forEach((key2) => {
        if (key1 !== key2) {
          // Look for causal patterns: "A causes B", "because A, B"
          const causationMarkers = this.RELATIONSHIP_MARKERS.causation;

          causationMarkers.forEach((marker) => {
            const pattern1 = new RegExp(`${key1}[^.]*${marker}[^.]*${key2}`, 'gi');
            const pattern2 = new RegExp(`${key2}[^.]*${marker}[^.]*${key1}`, 'gi');

            const matches1 = text.match(pattern1);
            const matches2 = text.match(pattern2);

            if (matches1) {
              relationships.push({
                sourceConceptId: key1,
                targetConceptId: key2,
                type: 'causation',
                strength: 0.8,
                evidence: matches1.slice(0, 2),
              });
            }

            if (matches2) {
              relationships.push({
                sourceConceptId: key2,
                targetConceptId: key1,
                type: 'causation',
                strength: 0.8,
                evidence: matches2.slice(0, 2),
              });
            }
          });
        }
      });
    });

    return relationships;
  }

  /**
   * Detect definition relationships
   */
  private detectDefinitionRelationships(text: string, conceptKeys: string[]): ConceptRelationship[] {
    const relationships: ConceptRelationship[] = [];

    conceptKeys.forEach((key1) => {
      conceptKeys.forEach((key2) => {
        if (key1 !== key2) {
          const definitionMarkers = this.RELATIONSHIP_MARKERS.definition;

          definitionMarkers.forEach((marker) => {
            const pattern = new RegExp(`${key1}[^.]*${marker}[^.]*${key2}`, 'gi');
            const matches = text.match(pattern);

            if (matches && matches.length > 0) {
              relationships.push({
                sourceConceptId: key1,
                targetConceptId: key2,
                type: 'definition',
                strength: 0.7,
                evidence: matches.slice(0, 1),
              });
            }
          });
        }
      });
    });

    return relationships;
  }

  /**
   * Rank concepts by importance
   */
  private rankConcepts(
    candidates: ConceptCandidate[],
    relationships: ConceptRelationship[]
  ): Concept[] {
    const concepts: Concept[] = [];

    // Build relationship index
    const relationshipCounts = new Map<string, number>();
    relationships.forEach((rel) => {
      const count1 = relationshipCounts.get(rel.sourceConceptId) || 0;
      const count2 = relationshipCounts.get(rel.targetConceptId) || 0;
      relationshipCounts.set(rel.sourceConceptId, count1 + rel.strength);
      relationshipCounts.set(rel.targetConceptId, count2 + rel.strength);
    });

    candidates.forEach((candidate) => {
      const key = this.normalizeConcept(candidate.text);
      const frequencyScore = Math.log(candidate.frequency + 1) / Math.log(100);
      const connectionScore = Math.min(1, (relationshipCounts.get(key) || 0) / 10);
      const typeBoost = this.getTypeBoost(candidate.type);

      const importance = (frequencyScore * 0.4 + connectionScore * 0.3 + typeBoost * 0.3);

      concepts.push({
        id: key,
        label: candidate.text,
        type: candidate.type,
        frequency: candidate.frequency,
        importance: Math.min(1, importance),
        contexts: candidate.contexts.slice(0, 3),
        relatedKeywords: this.extractRelatedKeywords(candidate.text, candidates),
      });
    });

    return concepts;
  }

  /**
   * Get type boost for importance calculation
   */
  private getTypeBoost(type: string): number {
    const boosts: Record<string, number> = {
      entity: 1.0,
      problem: 0.9,
      question: 0.85,
      technique: 0.8,
      topic: 0.6,
    };
    return boosts[type] || 0.5;
  }

  /**
   * Extract related keywords for a concept
   */
  private extractRelatedKeywords(conceptText: string, candidates: ConceptCandidate[]): string[] {
    const conceptWords = new Set(conceptText.toLowerCase().split(/\s+/));

    return candidates
      .filter((c) => c.text !== conceptText)
      .map((c) => c.text.toLowerCase())
      .filter((text) => {
        // Find candidates that share words
        const words = text.split(/\s+/);
        return words.some((w) => conceptWords.has(w));
      })
      .slice(0, 5);
  }

  /**
   * Normalize concept for key generation
   */
  private normalizeConcept(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  /**
   * Recalculate importance scores for global graph
   */
  private recalculateGlobalImportance(
    concepts: Map<string, Concept>,
    connections: Map<string, Set<string>>,
    frequency: Map<string, number>
  ): void {
    concepts.forEach((concept) => {
      const freqScore = Math.log((frequency.get(concept.id) || 0) + 1) / Math.log(concepts.size + 1);
      const connectionScore = Math.min(1, (connections.get(concept.id)?.size || 0) / 10);
      const typeBoost = this.getTypeBoost(concept.type);

      concept.importance = Math.min(1, freqScore * 0.4 + connectionScore * 0.3 + typeBoost * 0.3);
    });
  }

  /**
   * Get concept statistics
   */
  getConceptStats(graph: GlobalKnowledgeGraph): ConceptStats {
    const conceptsByType = new Map<string, number>();
    let totalImportance = 0;
    const conceptDegrees = new Map<string, number>();
    const orphans: string[] = [];

    graph.concepts.forEach((concept, id) => {
      const count = conceptsByType.get(concept.type) || 0;
      conceptsByType.set(concept.type, count + 1);
      totalImportance += concept.importance;

      const degree = graph.conceptConnections.get(id)?.size || 0;
      conceptDegrees.set(id, degree);

      if (degree === 0) {
        orphans.push(concept.label);
      }
    });

    // Find densest (most connected)
    let densest = '';
    let maxConnections = 0;
    conceptDegrees.forEach((degree, id) => {
      if (degree > maxConnections) {
        maxConnections = degree;
        densest = id;
      }
    });

    return {
      totalConcepts: graph.concepts.size,
      conceptsByType,
      averageImportance: graph.concepts.size > 0 ? totalImportance / graph.concepts.size : 0,
      densest,
      orphans: orphans.slice(0, 10),
    };
  }

  /**
   * Find related concepts
   */
  findRelatedConcepts(conceptId: string, graph: GlobalKnowledgeGraph, limit: number = 5): string[] {
    const connections = graph.conceptConnections.get(conceptId) || new Set();
    return Array.from(connections).slice(0, limit);
  }

  /**
   * Search concepts by label
   */
  searchConcepts(query: string, graph: GlobalKnowledgeGraph): Concept[] {
    const queryLower = query.toLowerCase();
    return Array.from(graph.concepts.values()).filter((concept) =>
      concept.label.toLowerCase().includes(queryLower) ||
      concept.relatedKeywords.some((kw) => kw.includes(queryLower))
    );
  }
}

// Export singleton instance
export const knowledgeGraphService = new KnowledgeGraphService();
