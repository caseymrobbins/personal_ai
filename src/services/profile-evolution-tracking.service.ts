/**
 * PROFILE EVOLUTION TRACKING SERVICE
 * ==================================
 * Tracks how the user's cognitive and emotional profile evolves over time
 * based on dream cycle learnings, memory consolidation, and simulation outcomes
 *
 * Evolution is measured across multiple dimensions:
 * - Emotional patterns and regulation capacity
 * - Cognitive patterns and thinking style
 * - Response strategies and their effectiveness
 * - Relationship patterns and social tendencies
 * - Goal progression and value alignment
 * - Self-awareness and metacognitive abilities
 */

export interface EvolutionDimension {
  name: string;
  description: string;
  baselineValue: number; // 0-1
  currentValue: number; // 0-1
  historicalValues: Array<{ timestamp: Date; value: number }>;
  trendDirection: 'improving' | 'declining' | 'stable';
  changeRate: number; // per week
  lastUpdated: Date;
}

export interface ProfileSnapshot {
  snapshotId: string;
  timestamp: Date;
  cycleId?: string; // Associated dream cycle if triggered by one
  dimensions: {
    emotionalRegulation: EvolutionDimension;
    emotionalAwareness: EvolutionDimension;
    cognitiveClarityAndLogic: EvolutionDimension;
    thinkingFlexibility: EvolutionDimension;
    responseAdaptability: EvolutionDimension;
    relationshipEmpathy: EvolutionDimension;
    relationshipAssertivenessAndBoundaries: EvolutionDimension;
    goalAlignmentAndProgress: EvolutionDimension;
    resilienceAndCopingCapacity: EvolutionDimension;
    metacognitiveAwareness: EvolutionDimension;
  };
  overallEvolutionScore: number; // 0-1
  keyInsights: string[];
  evolutionTriggers: string[]; // What caused this evolution
  breakthroughMoments: string[];
}

export interface EvolutionPattern {
  patternId: string;
  pattern: string; // Description of the pattern
  firstDetected: Date;
  occurrenceCount: number;
  affectedDimensions: string[];
  strength: number; // 0-1 confidence that this is a real pattern
  directionality: 'positive' | 'negative' | 'neutral';
  relatedCycles: string[];
}

export interface EvolutionMetrics {
  totalSnapshotsRecorded: number;
  totalEvolutionEvents: number;
  averageEvolutionScore: number;
  strongestDimension: string;
  weakestDimension: string;
  dimensionWithMostGrowth: string;
  totalPatternsIdentified: number;
  breakthroughMomentsCount: number;
  lastSnapshotTime: Date | null;
  nextProjectedMilestone?: string;
}

/**
 * Profile Evolution Tracking Service
 * Monitors and documents the user's growth and change over time
 */
class ProfileEvolutionTrackingService {
  private static instance: ProfileEvolutionTrackingService;
  private snapshots: ProfileSnapshot[] = [];
  private patterns: EvolutionPattern[] = [];
  private currentSnapshot: ProfileSnapshot | null = null;
  private metrics: EvolutionMetrics = {
    totalSnapshotsRecorded: 0,
    totalEvolutionEvents: 0,
    averageEvolutionScore: 0,
    strongestDimension: '',
    weakestDimension: '',
    dimensionWithMostGrowth: '',
    totalPatternsIdentified: 0,
    breakthroughMomentsCount: 0,
    lastSnapshotTime: null,
  };

  static getInstance(): ProfileEvolutionTrackingService {
    if (!ProfileEvolutionTrackingService.instance) {
      ProfileEvolutionTrackingService.instance = new ProfileEvolutionTrackingService();
    }
    return ProfileEvolutionTrackingService.instance;
  }

  /**
   * Initialize profile evolution tracking
   */
  initialize(): void {
    console.log('📊 Profile Evolution Tracking Service initialized');
  }

  /**
   * Create a new profile snapshot based on current state
   * This is typically called after a dream cycle completes
   */
  createProfileSnapshot(
    cycleId?: string,
    consolidationInsights?: string[],
    simulationLessons?: string[]
  ): ProfileSnapshot {
    const now = new Date();

    // Get baseline from previous snapshot or initialize
    const previousSnapshot = this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;

    // Create dimension snapshots with evolution calculations
    const snapshot: ProfileSnapshot = {
      snapshotId: this.generateSnapshotId(),
      timestamp: now,
      cycleId,
      dimensions: {
        emotionalRegulation: this.createDimension(
          'Emotional Regulation',
          previousSnapshot?.dimensions.emotionalRegulation,
          consolidationInsights,
          0.15
        ),
        emotionalAwareness: this.createDimension(
          'Emotional Awareness',
          previousSnapshot?.dimensions.emotionalAwareness,
          consolidationInsights,
          0.12
        ),
        cognitiveClarityAndLogic: this.createDimension(
          'Cognitive Clarity & Logic',
          previousSnapshot?.dimensions.cognitiveClarityAndLogic,
          consolidationInsights,
          0.10
        ),
        thinkingFlexibility: this.createDimension(
          'Thinking Flexibility',
          previousSnapshot?.dimensions.thinkingFlexibility,
          simulationLessons,
          0.14
        ),
        responseAdaptability: this.createDimension(
          'Response Adaptability',
          previousSnapshot?.dimensions.responseAdaptability,
          simulationLessons,
          0.13
        ),
        relationshipEmpathy: this.createDimension(
          'Relationship Empathy',
          previousSnapshot?.dimensions.relationshipEmpathy,
          consolidationInsights,
          0.11
        ),
        relationshipAssertivenessAndBoundaries: this.createDimension(
          'Relationship Assertiveness & Boundaries',
          previousSnapshot?.dimensions.relationshipAssertivenessAndBoundaries,
          consolidationInsights,
          0.12
        ),
        goalAlignmentAndProgress: this.createDimension(
          'Goal Alignment & Progress',
          previousSnapshot?.dimensions.goalAlignmentAndProgress,
          simulationLessons,
          0.10
        ),
        resilienceAndCopingCapacity: this.createDimension(
          'Resilience & Coping Capacity',
          previousSnapshot?.dimensions.resilienceAndCopingCapacity,
          consolidationInsights,
          0.14
        ),
        metacognitiveAwareness: this.createDimension(
          'Metacognitive Awareness',
          previousSnapshot?.dimensions.metacognitiveAwareness,
          consolidationInsights,
          0.09
        ),
      },
      overallEvolutionScore: 0,
      keyInsights: [],
      evolutionTriggers: cycleId ? [cycleId] : [],
      breakthroughMoments: [],
    };

    // Calculate overall evolution score
    snapshot.overallEvolutionScore = this.calculateOverallEvolutionScore(snapshot.dimensions);

    // Identify key insights and breakthrough moments
    snapshot.keyInsights = this.extractKeyInsights(snapshot.dimensions, previousSnapshot);
    snapshot.breakthroughMoments = this.identifyBreakthroughMoments(
      snapshot.dimensions,
      previousSnapshot
    );

    // Store snapshot
    this.snapshots.push(snapshot);
    this.currentSnapshot = snapshot;
    this.metrics.totalSnapshotsRecorded++;
    this.metrics.lastSnapshotTime = now;

    // Update overall metrics
    this.updateMetrics();

    // Identify patterns
    if (this.snapshots.length > 1) {
      this.identifyEvolutionPatterns();
    }

    console.log(`📊 Profile Snapshot ${snapshot.snapshotId.slice(0, 8)} created`);
    console.log(`   Overall Evolution Score: ${(snapshot.overallEvolutionScore * 100).toFixed(1)}%`);
    console.log(`   Key Insights: ${snapshot.keyInsights.length}`);
    console.log(`   Breakthrough Moments: ${snapshot.breakthroughMoments.length}`);

    return snapshot;
  }

  /**
   * Create a dimension with evolution calculation
   */
  private createDimension(
    name: string,
    previousDimension: EvolutionDimension | undefined,
    insights: string[] | undefined,
    baseImprovement: number
  ): EvolutionDimension {
    const previous = previousDimension || {
      name,
      description: '',
      baselineValue: 0.5,
      currentValue: 0.5,
      historicalValues: [],
      trendDirection: 'stable' as const,
      changeRate: 0,
      lastUpdated: new Date(),
    };

    // Calculate improvement based on insights and base improvement rate
    const insightBoost = insights ? Math.min(insights.length * 0.02, 0.1) : 0;
    const randomVariation = (Math.random() - 0.5) * 0.05; // ±2.5%
    const totalImprovement = baseImprovement + insightBoost + randomVariation;

    const newValue = Math.min(1, Math.max(0, previous.currentValue + totalImprovement));

    // Calculate trend direction
    const change = newValue - previous.currentValue;
    const trendDirection: 'improving' | 'declining' | 'stable' =
      change > 0.02 ? 'improving' : change < -0.02 ? 'declining' : 'stable';

    // Calculate change rate (per week, assuming snapshots are roughly weekly)
    const changeRate = change;

    return {
      name,
      description: this.getDescription(name),
      baselineValue: previous.baselineValue,
      currentValue: newValue,
      historicalValues: [
        ...previous.historicalValues,
        { timestamp: new Date(), value: newValue },
      ].slice(-52), // Keep last 52 snapshots (~1 year)
      trendDirection,
      changeRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get description for each dimension
   */
  private getDescription(dimensionName: string): string {
    const descriptions: { [key: string]: string } = {
      'Emotional Regulation':
        'Ability to manage and balance emotional responses, stay calm under pressure',
      'Emotional Awareness':
        'Understanding and recognizing emotions as they arise, emotional literacy',
      'Cognitive Clarity & Logic':
        'Clear thinking, logical reasoning, ability to analyze situations objectively',
      'Thinking Flexibility':
        'Adaptability in thought patterns, openness to new perspectives and ideas',
      'Response Adaptability':
        'Ability to adjust responses based on context and situation',
      'Relationship Empathy':
        'Understanding others\' perspectives, emotional connection, compassion',
      'Relationship Assertiveness & Boundaries':
        'Ability to express needs, set boundaries, advocate for oneself respectfully',
      'Goal Alignment & Progress':
        'Clarity of goals, progress toward meaningful objectives, value alignment',
      'Resilience & Coping Capacity':
        'Ability to bounce back from challenges, effective coping strategies',
      'Metacognitive Awareness':
        'Self-awareness about thinking patterns, ability to observe own thought processes',
    };

    return descriptions[dimensionName] || '';
  }

  /**
   * Calculate overall evolution score across all dimensions
   */
  private calculateOverallEvolutionScore(dimensions: ProfileSnapshot['dimensions']): number {
    const dimensionValues = Object.values(dimensions).map((d) => d.currentValue);
    const sum = dimensionValues.reduce((a, b) => a + b, 0);
    return sum / dimensionValues.length;
  }

  /**
   * Extract key insights from the snapshot
   */
  private extractKeyInsights(
    dimensions: ProfileSnapshot['dimensions'],
    previousSnapshot: ProfileSnapshot | null
  ): string[] {
    const insights: string[] = [];

    // Find dimensions with most improvement
    const improvingDimensions = Object.entries(dimensions)
      .filter(([_, dim]) => dim.trendDirection === 'improving')
      .sort((a, b) => b[1].changeRate - a[1].changeRate)
      .slice(0, 2);

    improvingDimensions.forEach(([_, dim]) => {
      insights.push(
        `Strong growth in ${dim.name.toLowerCase()} (${(dim.changeRate * 100).toFixed(1)}% improvement)`
      );
    });

    // Find dimensions approaching high values
    const reachingMastery = Object.values(dimensions).filter((d) => d.currentValue > 0.85);
    if (reachingMastery.length > 0) {
      insights.push(
        `Approaching mastery in ${reachingMastery.map((d) => d.name.toLowerCase()).join(', ')}`
      );
    }

    // Find dimensions that need attention
    const needingAttention = Object.values(dimensions).filter((d) => d.currentValue < 0.45);
    if (needingAttention.length > 0) {
      insights.push(
        `Areas for focused growth: ${needingAttention.map((d) => d.name.toLowerCase()).join(', ')}`
      );
    }

    // Consistency check
    const consistentGrowth = Object.values(dimensions).filter((d) => d.trendDirection === 'improving')
      .length;
    if (consistentGrowth >= 7) {
      insights.push('Demonstrating broad-based growth across multiple dimensions');
    }

    return insights.slice(0, 5); // Return top 5 insights
  }

  /**
   * Identify breakthrough moments (significant jumps in evolution)
   */
  private identifyBreakthroughMoments(
    dimensions: ProfileSnapshot['dimensions'],
    previousSnapshot: ProfileSnapshot | null
  ): string[] {
    const breakthroughs: string[] = [];

    if (!previousSnapshot) {
      return breakthroughs;
    }

    // Find dimensions with significant improvement (>0.15 change)
    Object.entries(dimensions).forEach(([key, dimension]) => {
      const previousDim = previousSnapshot.dimensions[key as keyof typeof dimensions];
      const improvement = dimension.currentValue - previousDim.currentValue;

      if (improvement > 0.15) {
        breakthroughs.push(
          `Major breakthrough in ${dimension.name}: ${(improvement * 100).toFixed(1)}% improvement`
        );
      }
    });

    // Find dimensions reaching specific milestones
    Object.values(dimensions).forEach((dim) => {
      const previousValue = previousSnapshot ?
        Object.values(previousSnapshot.dimensions).find((d) => d.name === dim.name)?.currentValue : 0;

      if (previousValue && previousValue < 0.7 && dim.currentValue >= 0.7) {
        breakthroughs.push(`Reached 70% proficiency in ${dim.name}`);
      }
      if (previousValue && previousValue < 0.9 && dim.currentValue >= 0.9) {
        breakthroughs.push(`Achieved mastery (90%+) in ${dim.name}`);
      }
    });

    return breakthroughs.slice(0, 4); // Return top 4 breakthrough moments
  }

  /**
   * Identify patterns in evolution across snapshots
   */
  private identifyEvolutionPatterns(): void {
    if (this.snapshots.length < 3) {
      return; // Need at least 3 snapshots to identify patterns
    }

    const recentSnapshots = this.snapshots.slice(-5); // Analyze last 5 snapshots

    // Pattern 1: Correlated dimension growth
    const dimensionKeys = Object.keys(
      recentSnapshots[0].dimensions
    ) as (keyof ProfileSnapshot['dimensions'])[];

    for (let i = 0; i < dimensionKeys.length; i++) {
      for (let j = i + 1; j < dimensionKeys.length; j++) {
        const dimKey1 = dimensionKeys[i];
        const dimKey2 = dimensionKeys[j];

        let correlation = 0;
        let correlatedSnapshots = 0;

        for (const snapshot of recentSnapshots) {
          const dim1 = snapshot.dimensions[dimKey1];
          const dim2 = snapshot.dimensions[dimKey2];

          if (
            (dim1.trendDirection === 'improving' && dim2.trendDirection === 'improving') ||
            (dim1.trendDirection === 'declining' && dim2.trendDirection === 'declining')
          ) {
            correlation++;
          }
          correlatedSnapshots++;
        }

        const correlationStrength = correlation / correlatedSnapshots;
        if (correlationStrength > 0.6) {
          const patternId = this.generatePatternId();
          const pattern: EvolutionPattern = {
            patternId,
            pattern: `Co-evolution of ${recentSnapshots[0].dimensions[dimKey1].name} and ${recentSnapshots[0].dimensions[dimKey2].name}`,
            firstDetected: recentSnapshots[0].timestamp,
            occurrenceCount: correlation,
            affectedDimensions: [
              recentSnapshots[0].dimensions[dimKey1].name,
              recentSnapshots[0].dimensions[dimKey2].name,
            ],
            strength: correlationStrength,
            directionality: recentSnapshots[0].dimensions[dimKey1].trendDirection === 'improving'
              ? 'positive'
              : 'negative',
            relatedCycles: recentSnapshots
              .filter((s) => s.cycleId)
              .map((s) => s.cycleId!)
              .slice(0, 3),
          };

          // Check if pattern already exists
          const existingPattern = this.patterns.find(
            (p) =>
              p.pattern === pattern.pattern &&
              p.firstDetected.getTime() > new Date().getTime() - 30 * 24 * 60 * 60 * 1000 // Last 30 days
          );

          if (existingPattern) {
            existingPattern.occurrenceCount++;
            existingPattern.strength = Math.min(1, existingPattern.strength + 0.05);
          } else {
            this.patterns.push(pattern);
            this.metrics.totalPatternsIdentified++;
          }
        }
      }
    }
  }

  /**
   * Get the current profile snapshot
   */
  getCurrentSnapshot(): ProfileSnapshot | null {
    return this.currentSnapshot;
  }

  /**
   * Get snapshot history
   */
  getSnapshotHistory(limit: number = 10): ProfileSnapshot[] {
    return this.snapshots.slice(-limit);
  }

  /**
   * Get evolution patterns
   */
  getEvolutionPatterns(limit: number = 10): EvolutionPattern[] {
    return this.patterns
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }

  /**
   * Get dimension evolution over time
   */
  getDimensionEvolution(
    dimensionName: keyof ProfileSnapshot['dimensions'],
    snapshotLimit: number = 20
  ): EvolutionDimension[] {
    return this.snapshots
      .slice(-snapshotLimit)
      .map((snapshot) => snapshot.dimensions[dimensionName]);
  }

  /**
   * Calculate overall growth trajectory
   */
  getGrowthTrajectory(): {
    overallTrend: 'improving' | 'declining' | 'stable';
    growthRate: number;
    projectedMilestone?: string;
    daysToMilestone?: number;
  } {
    if (this.snapshots.length < 2) {
      return {
        overallTrend: 'stable',
        growthRate: 0,
      };
    }

    const recentSnapshots = this.snapshots.slice(-10);
    const scores = recentSnapshots.map((s) => s.overallEvolutionScore);

    const earliestScore = scores[0];
    const latestScore = scores[scores.length - 1];
    const growth = latestScore - earliestScore;

    // Calculate weekly growth rate
    const weeksOfData = Math.max(1, Math.floor(recentSnapshots.length / 4.33)); // Rough conversion
    const growthRate = growth / Math.max(1, weeksOfData);

    // Determine trend
    const trend: 'improving' | 'declining' | 'stable' =
      growthRate > 0.01 ? 'improving' : growthRate < -0.01 ? 'declining' : 'stable';

    // Project when next milestone might be reached (e.g., 90% overall score)
    let projectedMilestone: string | undefined;
    let daysToMilestone: number | undefined;

    if (trend === 'improving' && latestScore < 0.9) {
      const scoreNeeded = 0.9 - latestScore;
      const weeksNeeded = scoreNeeded / Math.max(growthRate, 0.001);
      const daysNeeded = weeksNeeded * 7;
      daysToMilestone = Math.ceil(daysNeeded);
      projectedMilestone = `Overall Evolution Score: 90% (in ~${Math.ceil(weeksNeeded)} weeks)`;
    }

    return {
      overallTrend: trend,
      growthRate,
      projectedMilestone,
      daysToMilestone,
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): EvolutionMetrics {
    return { ...this.metrics };
  }

  /**
   * Update service metrics
   */
  private updateMetrics(): void {
    // Update average evolution score
    const scores = this.snapshots.map((s) => s.overallEvolutionScore);
    this.metrics.averageEvolutionScore = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;

    // Find strongest and weakest dimensions (from latest snapshot)
    if (this.currentSnapshot) {
      const dimensionEntries = Object.entries(this.currentSnapshot.dimensions);

      const strongest = dimensionEntries.reduce((a, b) =>
        a[1].currentValue > b[1].currentValue ? a : b
      );
      this.metrics.strongestDimension = strongest[0];

      const weakest = dimensionEntries.reduce((a, b) =>
        a[1].currentValue < b[1].currentValue ? a : b
      );
      this.metrics.weakestDimension = weakest[0];

      // Find dimension with most growth
      if (this.snapshots.length > 1) {
        const previousSnapshot = this.snapshots[this.snapshots.length - 2];
        const mostGrowth = dimensionEntries.reduce((a, b) => {
          const aGrowth =
            a[1].currentValue - previousSnapshot.dimensions[a[0] as keyof ProfileSnapshot['dimensions']].currentValue;
          const bGrowth =
            b[1].currentValue - previousSnapshot.dimensions[b[0] as keyof ProfileSnapshot['dimensions']].currentValue;
          return aGrowth > bGrowth ? a : b;
        });
        this.metrics.dimensionWithMostGrowth = mostGrowth[0];
      }
    }

    // Count breakthrough moments
    this.metrics.breakthroughMomentsCount = this.snapshots.reduce(
      (sum, s) => sum + s.breakthroughMoments.length,
      0
    );

    // Count evolution events (snapshots with significant change)
    this.metrics.totalEvolutionEvents = this.snapshots.filter((s) =>
      s.breakthroughMoments.length > 0
    ).length;
  }

  /**
   * Generate unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.snapshots = [];
    this.patterns = [];
    this.currentSnapshot = null;
    this.metrics = {
      totalSnapshotsRecorded: 0,
      totalEvolutionEvents: 0,
      averageEvolutionScore: 0,
      strongestDimension: '',
      weakestDimension: '',
      dimensionWithMostGrowth: '',
      totalPatternsIdentified: 0,
      breakthroughMomentsCount: 0,
      lastSnapshotTime: null,
    };
    console.log('🔄 Profile Evolution Tracking Service reset');
  }
}

export const profileEvolutionTracker = ProfileEvolutionTrackingService.getInstance();
export { ProfileEvolutionTrackingService };
