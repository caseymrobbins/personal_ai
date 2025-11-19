/**
 * MEMORY CONSOLIDATION ENGINE SERVICE
 * ===================================
 * Manages memory consolidation during dream cycles
 * Extracts learnings, patterns, and insights from interactions
 *
 * Inspired by biological memory consolidation:
 * - Memory encoding: Capturing key information from interactions
 * - Pattern extraction: Identifying recurring themes and connections
 * - Integration: Connecting new learnings with existing knowledge
 * - Strengthening: Reinforcing important memories and patterns
 */

export interface RawMemory {
  memoryId: string;
  timestamp: Date;
  type: 'interaction' | 'emotion' | 'response' | 'outcome' | 'learning';
  userId: string;
  context: string;
  content: string;
  emotionalValence: number; // -1.0 to 1.0
  significance: number; // 0.0 to 1.0
  tags: string[];
}

export interface ConsolidatedMemory {
  memoryId: string;
  originalMemoryId: string;
  consolidatedAt: Date;
  memoryType:
    | 'success_pattern'
    | 'challenge_pattern'
    | 'emotional_trigger'
    | 'response_strategy'
    | 'learning_moment'
    | 'relationship_insight';
  summary: string;
  keyInsights: string[];
  connectedMemories: string[];
  strengthScore: number; // 0.0 to 1.0
  recallFrequency: number; // How often this memory was accessed
  lastAccessedAt: Date;
  evolutionPotential: number; // 0.0 to 1.0
  relatedConcepts: string[];
}

export interface MemoryPattern {
  patternId: string;
  patternName: string;
  patternType: 'user_behavior' | 'emotional_cycle' | 'response_effectiveness' | 'trigger_response';
  frequency: number; // How many times this pattern occurred
  memoryIds: string[];
  description: string;
  instances: {
    timestamp: Date;
    context: string;
    outcome: string;
  }[];
  effectiveness: number; // 0.0 to 1.0
  nextOptimization: string;
}

export interface MemoryCluster {
  clusterId: string;
  clusterName: string;
  theme: string;
  memories: ConsolidatedMemory[];
  patterns: MemoryPattern[];
  centrality: number; // How central this cluster is to user model
  evolutionPath: string;
}

export interface ConsolidationResult {
  consolidationId: string;
  timestamp: Date;
  cycleId: string;
  rawMemoriesProcessed: number;
  memoriesConsolidated: number;
  patternsIdentified: number;
  clustersCreated: number;
  insightsGenerated: string[];
  evolutionDetected: boolean;
  memorabilityScore: number; // Overall quality of consolidation
}

export interface ConsolidationMetrics {
  totalMemoriesConsolidated: number;
  totalPatternsIdentified: number;
  totalClusters: number;
  averageMemoryStrength: number;
  averagePatternFrequency: number;
  insightsGenerated: number;
  lastConsolidationTime: Date | null;
  consolidationHistory: ConsolidationResult[];
}

/**
 * Memory Consolidation Engine Service
 * Processes raw memories and extracts meaningful patterns
 */
class MemoryConsolidationService {
  private static instance: MemoryConsolidationService;
  private consolidatedMemories: Map<string, ConsolidatedMemory> = new Map();
  private memoryPatterns: Map<string, MemoryPattern> = new Map();
  private memoryClusters: Map<string, MemoryCluster> = new Map();
  private rawMemoryQueue: RawMemory[] = [];
  private metrics: ConsolidationMetrics = {
    totalMemoriesConsolidated: 0,
    totalPatternsIdentified: 0,
    totalClusters: 0,
    averageMemoryStrength: 0,
    averagePatternFrequency: 0,
    insightsGenerated: 0,
    lastConsolidationTime: null,
    consolidationHistory: [],
  };

  static getInstance(): MemoryConsolidationService {
    if (!MemoryConsolidationService.instance) {
      MemoryConsolidationService.instance = new MemoryConsolidationService();
    }
    return MemoryConsolidationService.instance;
  }

  /**
   * Initialize the memory consolidation service
   */
  initialize(): void {
    console.log('🧠 Memory Consolidation Engine initialized');
  }

  /**
   * Add a raw memory to the consolidation queue
   */
  addMemory(memory: RawMemory): void {
    this.rawMemoryQueue.push(memory);
    console.log(`📝 Memory added: ${memory.type} (${memory.content.substring(0, 50)}...)`);
  }

  /**
   * Add multiple memories to the queue
   */
  addMemories(memories: RawMemory[]): void {
    this.rawMemoryQueue.push(...memories);
    console.log(`📝 Added ${memories.length} memories to consolidation queue`);
  }

  /**
   * Process and consolidate memories from the queue
   */
  async consolidateMemories(cycleId: string): Promise<ConsolidationResult> {
    const startTime = Date.now();
    const consolidationId = this.generateConsolidationId();

    console.log(`🔄 Starting memory consolidation (${this.rawMemoryQueue.length} memories)`);

    // Step 1: Encode memories
    const encodedMemories = this.encodeMemories(this.rawMemoryQueue);

    // Step 2: Extract patterns
    const patterns = this.extractPatterns(encodedMemories);

    // Step 3: Consolidate memories
    const consolidatedCount = this.consolidateEncodedMemories(
      encodedMemories,
      patterns,
      cycleId
    );

    // Step 4: Create memory clusters
    const clusterCount = this.createMemoryClusters(this.consolidatedMemories);

    // Step 5: Generate insights
    const insights = this.generateConsolidationInsights();

    // Step 6: Detect evolution
    const evolutionDetected = this.detectEvolution();

    const consolidationDuration = Date.now() - startTime;
    const memorabilityScore = this.calculateMemorabilityScore(consolidatedCount);

    // Create consolidation result
    const result: ConsolidationResult = {
      consolidationId,
      timestamp: new Date(),
      cycleId,
      rawMemoriesProcessed: this.rawMemoryQueue.length,
      memoriesConsolidated: consolidatedCount,
      patternsIdentified: patterns.size,
      clustersCreated: clusterCount,
      insightsGenerated: insights,
      evolutionDetected,
      memorabilityScore,
    };

    // Update metrics
    this.updateMetrics(result);

    // Clear raw memory queue
    this.rawMemoryQueue = [];

    console.log(`✅ Consolidation complete in ${consolidationDuration}ms`);
    console.log(`   Memories consolidated: ${consolidatedCount}`);
    console.log(`   Patterns identified: ${patterns.size}`);
    console.log(`   Clusters created: ${clusterCount}`);
    console.log(`   Memorability: ${(memorabilityScore * 100).toFixed(0)}%`);

    return result;
  }

  /**
   * Encode raw memories into processable format
   */
  private encodeMemories(rawMemories: RawMemory[]): ConsolidatedMemory[] {
    const encoded: ConsolidatedMemory[] = [];

    for (const memory of rawMemories) {
      const consolidatedMemory: ConsolidatedMemory = {
        memoryId: this.generateMemoryId(),
        originalMemoryId: memory.memoryId,
        consolidatedAt: new Date(),
        memoryType: this.classifyMemoryType(memory),
        summary: this.generateMemorySummary(memory),
        keyInsights: this.extractKeyInsights(memory),
        connectedMemories: [],
        strengthScore: this.calculateStrengthScore(memory),
        recallFrequency: 0,
        lastAccessedAt: new Date(),
        evolutionPotential: this.calculateEvolutionPotential(memory),
        relatedConcepts: this.extractConcepts(memory),
      };

      encoded.push(consolidatedMemory);
      this.consolidatedMemories.set(consolidatedMemory.memoryId, consolidatedMemory);
    }

    return encoded;
  }

  /**
   * Classify the type of memory based on content and context
   */
  private classifyMemoryType(
    memory: RawMemory
  ): ConsolidatedMemory['memoryType'] {
    const content = memory.content.toLowerCase();

    if (
      content.includes('success') ||
      content.includes('achieved') ||
      memory.emotionalValence > 0.5
    ) {
      return 'success_pattern';
    }
    if (content.includes('challenge') || content.includes('difficult')) {
      return 'challenge_pattern';
    }
    if (memory.type === 'emotion') {
      return 'emotional_trigger';
    }
    if (memory.type === 'response') {
      return 'response_strategy';
    }
    if (content.includes('learned') || content.includes('realized')) {
      return 'learning_moment';
    }

    return 'relationship_insight';
  }

  /**
   * Generate a summary of the memory
   */
  private generateMemorySummary(memory: RawMemory): string {
    const type = memory.type.charAt(0).toUpperCase() + memory.type.slice(1);
    return `${type}: ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}`;
  }

  /**
   * Extract key insights from memory
   */
  private extractKeyInsights(memory: RawMemory): string[] {
    const insights: string[] = [];

    if (memory.emotionalValence > 0.7) {
      insights.push('Positive emotional experience');
    } else if (memory.emotionalValence < -0.7) {
      insights.push('Challenging emotional experience');
    }

    if (memory.significance > 0.7) {
      insights.push('Significant event with learning potential');
    }

    if (memory.type === 'learning') {
      insights.push('New learning or realization');
    }

    // Generate concept-based insights
    const concepts = this.extractConcepts(memory);
    if (concepts.length > 0) {
      insights.push(`Key concepts: ${concepts.join(', ')}`);
    }

    return insights;
  }

  /**
   * Calculate strength score for a memory
   */
  private calculateStrengthScore(memory: RawMemory): number {
    let score = 0.5; // Base score

    // Significance adds to strength
    score += memory.significance * 0.3;

    // Emotional valence (both positive and negative) increases strength
    score += Math.abs(memory.emotionalValence) * 0.2;

    // Normalize to 0-1 range
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Calculate evolution potential of a memory
   */
  private calculateEvolutionPotential(memory: RawMemory): number {
    let potential = 0;

    if (memory.type === 'learning') {
      potential += 0.4;
    }
    if (memory.significance > 0.6) {
      potential += 0.3;
    }
    if (Math.abs(memory.emotionalValence) > 0.6) {
      potential += 0.2;
    }

    return Math.min(potential, 1.0);
  }

  /**
   * Extract key concepts from memory content
   */
  private extractConcepts(memory: RawMemory): string[] {
    const conceptKeywords = [
      'goal',
      'emotion',
      'relationship',
      'achievement',
      'challenge',
      'learning',
      'growth',
      'resilience',
      'strategy',
      'pattern',
      'trigger',
      'response',
    ];

    const concepts: string[] = [];
    const lowerContent = memory.content.toLowerCase();

    for (const keyword of conceptKeywords) {
      if (lowerContent.includes(keyword)) {
        concepts.push(keyword);
      }
    }

    return concepts;
  }

  /**
   * Extract patterns from consolidated memories
   */
  private extractPatterns(
    memories: ConsolidatedMemory[]
  ): Map<string, MemoryPattern> {
    const patterns = new Map<string, MemoryPattern>();

    // Group memories by type
    const typeGroups = new Map<string, ConsolidatedMemory[]>();
    for (const memory of memories) {
      const key = memory.memoryType;
      if (!typeGroups.has(key)) {
        typeGroups.set(key, []);
      }
      typeGroups.get(key)!.push(memory);
    }

    // Create patterns from groups
    for (const [type, typeMemories] of typeGroups) {
      if (typeMemories.length >= 2) {
        const patternId = this.generatePatternId();
        const pattern: MemoryPattern = {
          patternId,
          patternName: `${type.replace(/_/g, ' ')} Pattern`,
          patternType: 'user_behavior',
          frequency: typeMemories.length,
          memoryIds: typeMemories.map((m) => m.memoryId),
          description: `Pattern of ${type} occurrences (${typeMemories.length} instances)`,
          instances: typeMemories.map((m) => ({
            timestamp: m.consolidatedAt,
            context: m.summary,
            outcome: m.strengthScore > 0.7 ? 'Positive' : 'Needs improvement',
          })),
          effectiveness: this.calculatePatternEffectiveness(typeMemories),
          nextOptimization: this.suggestOptimization(type),
        };

        patterns.set(patternId, pattern);
        this.memoryPatterns.set(patternId, pattern);
      }
    }

    // Extract concept co-occurrence patterns
    const conceptPatterns = this.extractConceptPatterns(memories);
    for (const [id, pattern] of conceptPatterns) {
      patterns.set(id, pattern);
    }

    return patterns;
  }

  /**
   * Extract patterns from concept co-occurrences
   */
  private extractConceptPatterns(
    memories: ConsolidatedMemory[]
  ): Map<string, MemoryPattern> {
    const patterns = new Map<string, MemoryPattern>();
    const conceptCounts = new Map<string, number>();

    // Count concept frequencies
    for (const memory of memories) {
      for (const concept of memory.relatedConcepts) {
        conceptCounts.set(concept, (conceptCounts.get(concept) || 0) + 1);
      }
    }

    // Create patterns for high-frequency concepts
    for (const [concept, count] of conceptCounts) {
      if (count >= 2) {
        const patternId = this.generatePatternId();
        const relatedMemories = memories.filter((m) =>
          m.relatedConcepts.includes(concept)
        );

        const pattern: MemoryPattern = {
          patternId,
          patternName: `${concept} Concept Pattern`,
          patternType: 'response_effectiveness',
          frequency: count,
          memoryIds: relatedMemories.map((m) => m.memoryId),
          description: `Recurring concept: ${concept}`,
          instances: relatedMemories.map((m) => ({
            timestamp: m.consolidatedAt,
            context: m.summary,
            outcome: m.strengthScore > 0.7 ? 'Strong' : 'Moderate',
          })),
          effectiveness: this.calculatePatternEffectiveness(relatedMemories),
          nextOptimization: `Deepen understanding of ${concept}`,
        };

        patterns.set(patternId, pattern);
        this.memoryPatterns.set(patternId, pattern);
      }
    }

    return patterns;
  }

  /**
   * Calculate pattern effectiveness
   */
  private calculatePatternEffectiveness(memories: ConsolidatedMemory[]): number {
    if (memories.length === 0) return 0;

    const avgStrength =
      memories.reduce((sum, m) => sum + m.strengthScore, 0) / memories.length;
    const avgEvolution =
      memories.reduce((sum, m) => sum + m.evolutionPotential, 0) / memories.length;

    return (avgStrength + avgEvolution) / 2;
  }

  /**
   * Suggest optimization for a memory type
   */
  private suggestOptimization(type: string): string {
    const suggestions: { [key: string]: string } = {
      success_pattern: 'Reinforce successful strategies and build on strengths',
      challenge_pattern: 'Develop coping strategies and resilience techniques',
      emotional_trigger: 'Monitor triggers and develop emotional regulation skills',
      response_strategy: 'Refine most effective responses and retire ineffective ones',
      learning_moment: 'Document learnings and integrate into user model',
      relationship_insight: 'Build deeper understanding of relationship patterns',
    };

    return suggestions[type] || 'Continue monitoring this pattern';
  }

  /**
   * Consolidate encoded memories with pattern information
   */
  private consolidateEncodedMemories(
    encoded: ConsolidatedMemory[],
    patterns: Map<string, MemoryPattern>,
    _cycleId: string
  ): number {
    let consolidatedCount = 0;

    // Connect memories to patterns
    for (const memory of encoded) {
      for (const pattern of patterns.values()) {
        if (pattern.memoryIds.includes(memory.memoryId)) {
          memory.connectedMemories.push(pattern.patternId);
        }
      }

      consolidatedCount++;
    }

    return consolidatedCount;
  }

  /**
   * Create memory clusters from consolidated memories
   */
  private createMemoryClusters(memories: Map<string, ConsolidatedMemory>): number {
    const clusters = new Map<string, MemoryCluster>();

    // Group by theme
    const themeGroups = new Map<string, ConsolidatedMemory[]>();
    for (const memory of memories.values()) {
      const theme = memory.memoryType;
      if (!themeGroups.has(theme)) {
        themeGroups.set(theme, []);
      }
      themeGroups.get(theme)!.push(memory);
    }

    // Create clusters
    for (const [theme, themeMemories] of themeGroups) {
      const clusterId = this.generateClusterId();
      const relatedPatterns = Array.from(this.memoryPatterns.values()).filter((p) =>
        p.memoryIds.some((id) => themeMemories.some((m) => m.memoryId === id))
      );

      const cluster: MemoryCluster = {
        clusterId,
        clusterName: `${theme} Cluster`,
        theme,
        memories: themeMemories,
        patterns: relatedPatterns,
        centrality: this.calculateClusterCentrality(themeMemories),
        evolutionPath: this.suggestEvolutionPath(theme),
      };

      clusters.set(clusterId, cluster);
      this.memoryClusters.set(clusterId, cluster);
    }

    return clusters.size;
  }

  /**
   * Calculate cluster centrality
   */
  private calculateClusterCentrality(memories: ConsolidatedMemory[]): number {
    if (memories.length === 0) return 0;

    const avgStrength =
      memories.reduce((sum, m) => sum + m.strengthScore, 0) / memories.length;
    const avgEvolution =
      memories.reduce((sum, m) => sum + m.evolutionPotential, 0) / memories.length;
    const frequency = memories.length / 10; // Normalize

    return Math.min((avgStrength + avgEvolution + frequency) / 3, 1);
  }

  /**
   * Suggest evolution path for a memory cluster
   */
  private suggestEvolutionPath(theme: string): string {
    const paths: { [key: string]: string } = {
      success_pattern: 'Build mastery and advance to new challenges',
      challenge_pattern: 'Develop resilience and transform challenges into growth',
      emotional_trigger: 'Understand roots and develop emotional maturity',
      response_strategy: 'Refine and personalize effective strategies',
      learning_moment: 'Integrate learning and apply to new contexts',
      relationship_insight: 'Deepen understanding and strengthen connections',
    };

    return paths[theme] || 'Continue growth and development';
  }

  /**
   * Generate consolidation insights
   */
  private generateConsolidationInsights(): string[] {
    const insights: string[] = [];

    if (this.memoryPatterns.size > 0) {
      const topPattern = Array.from(this.memoryPatterns.values()).sort(
        (a, b) => b.effectiveness - a.effectiveness
      )[0];
      insights.push(`Most effective pattern: ${topPattern.patternName}`);
    }

    if (this.consolidatedMemories.size > 0) {
      const strongMemories = Array.from(this.consolidatedMemories.values()).filter(
        (m) => m.strengthScore > 0.8
      );
      if (strongMemories.length > 0) {
        insights.push(`${strongMemories.length} strong memories to leverage`);
      }
    }

    if (this.memoryClusters.size > 0) {
      const topCluster = Array.from(this.memoryClusters.values()).sort(
        (a, b) => b.centrality - a.centrality
      )[0];
      insights.push(`Central theme: ${topCluster.theme}`);
    }

    insights.push('Memory consolidation strengthens learning and growth');

    return insights;
  }

  /**
   * Detect if evolution occurred during consolidation
   */
  private detectEvolution(): boolean {
    if (this.consolidatedMemories.size === 0) return false;

    const avgEvolutionPotential =
      Array.from(this.consolidatedMemories.values()).reduce(
        (sum, m) => sum + m.evolutionPotential,
        0
      ) / this.consolidatedMemories.size;

    return avgEvolutionPotential > 0.5;
  }

  /**
   * Calculate overall memorability score
   */
  private calculateMemorabilityScore(consolidatedCount: number): number {
    if (consolidatedCount === 0) return 0;

    const avgStrength =
      Array.from(this.consolidatedMemories.values()).reduce(
        (sum, m) => sum + m.strengthScore,
        0
      ) / this.consolidatedMemories.size;

    const patternQuality =
      this.memoryPatterns.size > 0
        ? Array.from(this.memoryPatterns.values()).reduce(
            (sum, p) => sum + p.effectiveness,
            0
          ) / this.memoryPatterns.size
        : 0;

    return (avgStrength + patternQuality) / 2;
  }

  /**
   * Update metrics after consolidation
   */
  private updateMetrics(result: ConsolidationResult): void {
    this.metrics.totalMemoriesConsolidated += result.memoriesConsolidated;
    this.metrics.totalPatternsIdentified += result.patternsIdentified;
    this.metrics.totalClusters += result.clustersCreated;
    this.metrics.insightsGenerated += result.insightsGenerated.length;
    this.metrics.lastConsolidationTime = result.timestamp;
    this.metrics.consolidationHistory.push(result);

    if (this.consolidatedMemories.size > 0) {
      this.metrics.averageMemoryStrength =
        Array.from(this.consolidatedMemories.values()).reduce(
          (sum, m) => sum + m.strengthScore,
          0
        ) / this.consolidatedMemories.size;
    }

    if (this.memoryPatterns.size > 0) {
      this.metrics.averagePatternFrequency =
        Array.from(this.memoryPatterns.values()).reduce(
          (sum, p) => sum + p.frequency,
          0
        ) / this.memoryPatterns.size;
    }
  }

  /**
   * Get consolidated memory by ID
   */
  getMemory(memoryId: string): ConsolidatedMemory | undefined {
    return this.consolidatedMemories.get(memoryId);
  }

  /**
   * Get all consolidated memories
   */
  getAllMemories(): ConsolidatedMemory[] {
    return Array.from(this.consolidatedMemories.values());
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): MemoryPattern | undefined {
    return this.memoryPatterns.get(patternId);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): MemoryPattern[] {
    return Array.from(this.memoryPatterns.values());
  }

  /**
   * Get cluster by ID
   */
  getCluster(clusterId: string): MemoryCluster | undefined {
    return this.memoryClusters.get(clusterId);
  }

  /**
   * Get all clusters
   */
  getAllClusters(): MemoryCluster[] {
    return Array.from(this.memoryClusters.values());
  }

  /**
   * Get consolidation metrics
   */
  getMetrics(): ConsolidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Search memories by concept
   */
  searchByConcept(concept: string): ConsolidatedMemory[] {
    return Array.from(this.consolidatedMemories.values()).filter((m) =>
      m.relatedConcepts.includes(concept)
    );
  }

  /**
   * Search memories by strength threshold
   */
  searchByStrength(minStrength: number): ConsolidatedMemory[] {
    return Array.from(this.consolidatedMemories.values()).filter(
      (m) => m.strengthScore >= minStrength
    );
  }

  /**
   * Generate unique memory ID
   */
  private generateMemoryId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return `pat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique cluster ID
   */
  private generateClusterId(): string {
    return `clst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique consolidation ID
   */
  private generateConsolidationId(): string {
    return `cons-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.consolidatedMemories.clear();
    this.memoryPatterns.clear();
    this.memoryClusters.clear();
    this.rawMemoryQueue = [];
    this.metrics = {
      totalMemoriesConsolidated: 0,
      totalPatternsIdentified: 0,
      totalClusters: 0,
      averageMemoryStrength: 0,
      averagePatternFrequency: 0,
      insightsGenerated: 0,
      lastConsolidationTime: null,
      consolidationHistory: [],
    };
    console.log('🔄 Memory Consolidation Engine reset');
  }
}

export const memoryConsolidationService = MemoryConsolidationService.getInstance();
export { MemoryConsolidationService };
