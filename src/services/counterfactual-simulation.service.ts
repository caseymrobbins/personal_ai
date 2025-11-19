/**
 * COUNTERFACTUAL SIMULATION ENGINE SERVICE
 * ========================================
 * Simulates alternative scenarios and outcomes
 * Explores "what if" scenarios to improve decision-making
 *
 * Inspired by human imagination and mental simulation:
 * - Counterfactual thinking: What would have happened if...?
 * - Scenario exploration: Multiple possible futures
 * - Decision analysis: Compare outcomes of different choices
 * - Learning from hypotheticals: Extract lessons from simulations
 */

export type ScenarioType =
  | 'alternative_response'
  | 'different_decision'
  | 'avoided_mistake'
  | 'future_possibility'
  | 'historical_replay'
  | 'optimal_outcome';

export type SimulationModality =
  | 'emotional_consequence'
  | 'relational_impact'
  | 'goal_progression'
  | 'learning_outcome'
  | 'resource_allocation';

export interface CounterfactualScenario {
  scenarioId: string;
  scenarioType: ScenarioType;
  originalSituation: string;
  hypotheticalModification: string;
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  createdAt: Date;
}

export interface SimulationVariable {
  variableName: string;
  originalValue: string | number | boolean;
  hypotheticalValue: string | number | boolean;
  mutability: 'high' | 'medium' | 'low'; // How changeable this is
  impactScore: number; // 0.0-1.0
}

export interface CounterfactualSimulation {
  simulationId: string;
  scenarioId: string;
  scenario: CounterfactualScenario;
  modality: SimulationModality;
  variables: SimulationVariable[];
  simulatedOutcomes: {
    category: string;
    originalOutcome: string;
    counterfactualOutcome: string;
    differenceScore: number; // -1.0 (worse) to +1.0 (better)
    confidence: number; // 0.0-1.0
  }[];
  keyInsights: string[];
  lessonLearned: string;
  applicability: number; // 0.0-1.0: How applicable to real situations
  simulatedAt: Date;
  executionTimeMs: number;
}

export interface SimulationBatch {
  batchId: string;
  batchType: 'exploration' | 'optimization' | 'recovery' | 'growth';
  numScenarios: number;
  scenarios: CounterfactualScenario[];
  simulations: CounterfactualSimulation[];
  overallInsight: string;
  batchMetrics: {
    totalBenefitScore: number;
    averageConfidence: number;
    applicabilityScore: number;
    recommendedActions: string[];
  };
  createdAt: Date;
}

export interface CounterfactualMetrics {
  totalSimulations: number;
  totalScenarios: number;
  averageConfidence: number;
  averageApplicability: number;
  insightsGenerated: number;
  lessonsBatchesCreated: number;
  mostCommonModality: SimulationModality | null;
  simulationHistory: CounterfactualSimulation[];
}

/**
 * Counterfactual Simulation Engine Service
 * Explores alternative scenarios and hypothetical outcomes
 */
class CounterfactualSimulationService {
  private static instance: CounterfactualSimulationService;
  private scenarios: Map<string, CounterfactualScenario> = new Map();
  private simulations: Map<string, CounterfactualSimulation> = new Map();
  private simulationBatches: Map<string, SimulationBatch> = new Map();
  private metrics: CounterfactualMetrics = {
    totalSimulations: 0,
    totalScenarios: 0,
    averageConfidence: 0,
    averageApplicability: 0,
    insightsGenerated: 0,
    lessonsBatchesCreated: 0,
    mostCommonModality: null,
    simulationHistory: [],
  };

  static getInstance(): CounterfactualSimulationService {
    if (!CounterfactualSimulationService.instance) {
      CounterfactualSimulationService.instance = new CounterfactualSimulationService();
    }
    return CounterfactualSimulationService.instance;
  }

  /**
   * Initialize the counterfactual simulation service
   */
  initialize(): void {
    console.log('🔮 Counterfactual Simulation Engine initialized');
  }

  /**
   * Create a new counterfactual scenario
   */
  createScenario(
    situationDescription: string,
    scenarioType: ScenarioType,
    modification: string,
    timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term' = 'medium-term'
  ): CounterfactualScenario {
    const scenario: CounterfactualScenario = {
      scenarioId: this.generateScenarioId(),
      scenarioType,
      originalSituation: situationDescription,
      hypotheticalModification: modification,
      timeframe,
      createdAt: new Date(),
    };

    this.scenarios.set(scenario.scenarioId, scenario);
    this.metrics.totalScenarios++;

    console.log(`📌 Created scenario: ${scenarioType} (${scenario.scenarioId.slice(0, 8)})`);

    return scenario;
  }

  /**
   * Run a counterfactual simulation on a scenario
   */
  async simulateScenario(
    scenario: CounterfactualScenario,
    modality: SimulationModality
  ): Promise<CounterfactualSimulation> {
    const startTime = Date.now();
    const simulationId = this.generateSimulationId();

    console.log(`🔄 Running simulation: ${modality}`);

    // Step 1: Extract simulation variables
    const variables = this.extractVariables(scenario);

    // Step 2: Simulate outcomes across dimensions
    const outcomes = this.simulateOutcomes(scenario, variables, modality);

    // Step 3: Generate insights from simulation
    const insights = this.generateInsights(scenario, outcomes, modality);

    // Step 4: Extract lesson learned
    const lesson = this.extractLesson(scenario, outcomes, insights);

    // Step 5: Assess applicability
    const applicability = this.assessApplicability(scenario, modality);

    const executionTime = Date.now() - startTime;

    const simulation: CounterfactualSimulation = {
      simulationId,
      scenarioId: scenario.scenarioId,
      scenario,
      modality,
      variables,
      simulatedOutcomes: outcomes,
      keyInsights: insights,
      lessonLearned: lesson,
      applicability,
      simulatedAt: new Date(),
      executionTimeMs: executionTime,
    };

    this.simulations.set(simulationId, simulation);
    this.metrics.totalSimulations++;
    this.metrics.insightsGenerated += insights.length;
    this.updateMetrics();

    console.log(`✅ Simulation complete (${executionTime}ms)`);
    console.log(`   Insights: ${insights.length}`);
    console.log(`   Lesson: ${lesson.substring(0, 60)}...`);

    return simulation;
  }

  /**
   * Run batch simulations with multiple modalities
   */
  async runSimulationBatch(
    batchType: 'exploration' | 'optimization' | 'recovery' | 'growth',
    scenarios: CounterfactualScenario[]
  ): Promise<SimulationBatch> {
    const batchId = this.generateBatchId();
    const simulations: CounterfactualSimulation[] = [];
    const modalities: SimulationModality[] = [
      'emotional_consequence',
      'relational_impact',
      'goal_progression',
      'learning_outcome',
    ];

    console.log(`🌊 Starting simulation batch: ${batchType} (${scenarios.length} scenarios)`);

    // Run simulations for each scenario with different modalities
    for (const scenario of scenarios) {
      for (const modality of modalities) {
        const simulation = await this.simulateScenario(scenario, modality);
        simulations.push(simulation);
      }
    }

    // Analyze batch results
    const batchMetrics = this.analyzeBatch(simulations);
    const overallInsight = this.generateBatchInsight(simulations, batchType);

    const batch: SimulationBatch = {
      batchId,
      batchType,
      numScenarios: scenarios.length,
      scenarios,
      simulations,
      overallInsight,
      batchMetrics,
      createdAt: new Date(),
    };

    this.simulationBatches.set(batchId, batch);
    this.metrics.lessonsBatchesCreated++;

    console.log(`✨ Batch complete: ${simulations.length} simulations`);
    console.log(`   Overall insight: ${overallInsight.substring(0, 80)}...`);

    return batch;
  }

  /**
   * Extract simulation variables from scenario
   */
  private extractVariables(scenario: CounterfactualScenario): SimulationVariable[] {
    const variables: SimulationVariable[] = [];

    // Variable 1: Response approach
    variables.push({
      variableName: 'response_approach',
      originalValue: 'original_strategy',
      hypotheticalValue: 'alternative_strategy',
      mutability: 'high',
      impactScore: 0.8,
    });

    // Variable 2: Timing
    variables.push({
      variableName: 'timing',
      originalValue: 'as_occurred',
      hypotheticalValue: 'earlier_or_later',
      mutability: 'medium',
      impactScore: 0.6,
    });

    // Variable 3: Communication
    variables.push({
      variableName: 'communication_style',
      originalValue: 'actual_style',
      hypotheticalValue: 'alternative_style',
      mutability: 'high',
      impactScore: 0.7,
    });

    // Variable 4: Preparation
    variables.push({
      variableName: 'preparation_level',
      originalValue: 'actual_level',
      hypotheticalValue: 'improved_level',
      mutability: 'high',
      impactScore: 0.75,
    });

    // Variable 5: Resource allocation
    variables.push({
      variableName: 'resource_allocation',
      originalValue: 'actual_allocation',
      hypotheticalValue: 'optimal_allocation',
      mutability: 'medium',
      impactScore: 0.65,
    });

    return variables;
  }

  /**
   * Simulate outcomes based on scenario and variables
   */
  private simulateOutcomes(
    scenario: CounterfactualScenario,
    variables: SimulationVariable[],
    modality: SimulationModality
  ): CounterfactualSimulation['simulatedOutcomes'] {
    const outcomes: CounterfactualSimulation['simulatedOutcomes'] = [];

    const outcomeCategories = this.getOutcomeCategories(modality);

    for (const category of outcomeCategories) {
      const differenceScore = this.calculateDifferenceScore(
        scenario,
        variables,
        category
      );
      const confidence = this.estimateConfidence(scenario, category, variables);

      outcomes.push({
        category,
        originalOutcome: this.describeOutcome(scenario, category, false),
        counterfactualOutcome: this.describeOutcome(scenario, category, true),
        differenceScore,
        confidence,
      });
    }

    return outcomes;
  }

  /**
   * Get outcome categories based on modality
   */
  private getOutcomeCategories(modality: SimulationModality): string[] {
    const categoriesMap: { [key in SimulationModality]: string[] } = {
      emotional_consequence: [
        'emotional_intensity',
        'emotional_valence',
        'emotional_recovery_time',
      ],
      relational_impact: ['relationship_quality', 'trust_level', 'conflict_resolution'],
      goal_progression: ['goal_achievement', 'progress_rate', 'goal_alignment'],
      learning_outcome: ['knowledge_gain', 'skill_development', 'pattern_recognition'],
      resource_allocation: ['efficiency', 'time_saved', 'resource_optimization'],
    };

    return categoriesMap[modality] || [];
  }

  /**
   * Calculate difference score for outcome
   */
  private calculateDifferenceScore(
    scenario: CounterfactualScenario,
    variables: SimulationVariable[],
    category: string
  ): number {
    let score = 0;

    // Base score from variable impacts
    for (const variable of variables) {
      score += variable.impactScore * 0.15; // Each variable contributes 15%
    }

    // Scenario type modifier
    if (scenario.scenarioType === 'optimal_outcome') {
      score += 0.3; // Optimal scenarios typically show better outcomes
    } else if (scenario.scenarioType === 'avoided_mistake') {
      score += 0.25; // Avoiding mistakes shows improvement
    }

    // Normalize to -1.0 to +1.0 range
    score = Math.min(Math.max(score - 0.5, -1.0), 1.0);

    // Add some randomness for realism
    score += (Math.random() - 0.5) * 0.2;

    return Math.min(Math.max(score, -1.0), 1.0);
  }

  /**
   * Estimate confidence in simulation
   */
  private estimateConfidence(
    scenario: CounterfactualScenario,
    category: string,
    variables: SimulationVariable[]
  ): number {
    let confidence = 0.6; // Base confidence

    // More recent scenarios are more confident
    const daysSinceCreated = (Date.now() - scenario.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    confidence += Math.max(0, (30 - daysSinceCreated) / 300); // Decay over 30 days

    // More variables increase confidence
    confidence += Math.min(variables.length * 0.05, 0.2);

    // Normalize
    confidence = Math.min(Math.max(confidence, 0), 1.0);

    // Add slight randomness
    confidence += (Math.random() - 0.5) * 0.1;

    return Math.min(Math.max(confidence, 0), 1.0);
  }

  /**
   * Describe simulated outcome
   */
  private describeOutcome(
    scenario: CounterfactualScenario,
    category: string,
    counterfactual: boolean
  ): string {
    const prefix = counterfactual ? 'Would have resulted in' : 'Actually resulted in';
    const descriptions: { [key: string]: string } = {
      emotional_intensity: counterfactual
        ? 'Reduced emotional intensity and faster recovery'
        : 'Significant emotional impact',
      emotional_valence: counterfactual
        ? 'More positive emotional experience'
        : 'Mixed emotional response',
      emotional_recovery_time: counterfactual
        ? 'Quicker recovery (days instead of weeks)'
        : 'Prolonged emotional processing needed',
      relationship_quality: counterfactual
        ? 'Strengthened relationship bonds'
        : 'Relationship maintained but strained',
      trust_level: counterfactual
        ? 'Increased mutual trust and understanding'
        : 'Trust slightly diminished',
      conflict_resolution: counterfactual
        ? 'Conflict resolved constructively'
        : 'Conflict partially addressed',
      goal_achievement: counterfactual
        ? 'Faster progress toward goals'
        : 'Steady but slower progress',
      progress_rate: counterfactual
        ? '50% faster improvement'
        : 'Standard improvement rate',
      goal_alignment: counterfactual
        ? 'Better alignment with core values'
        : 'Moderate value alignment',
      knowledge_gain: counterfactual
        ? 'Deeper understanding acquired'
        : 'Surface-level learning',
      skill_development: counterfactual
        ? 'Accelerated skill mastery'
        : 'Gradual skill improvement',
      pattern_recognition: counterfactual
        ? 'Clear patterns identified and learned'
        : 'Subtle patterns observed',
      efficiency: counterfactual
        ? 'Optimized resource use'
        : 'Current resource allocation',
      time_saved: counterfactual
        ? '30-40% time savings possible'
        : 'Time used as planned',
      resource_optimization: counterfactual
        ? 'Better resource distribution'
        : 'Resources spread across needs',
    };

    return `${prefix}: ${descriptions[category] || 'Significant change'}`;
  }

  /**
   * Generate insights from simulation outcomes
   */
  private generateInsights(
    scenario: CounterfactualScenario,
    outcomes: CounterfactualSimulation['simulatedOutcomes'],
    modality: SimulationModality
  ): string[] {
    const insights: string[] = [];

    // Identify high-impact variables
    const positiveOutcomes = outcomes.filter((o) => o.differenceScore > 0.3);
    if (positiveOutcomes.length > 0) {
      insights.push(
        `${positiveOutcomes.length} outcomes show significant improvement potential`
      );
    }

    // Identify confidence level
    const avgConfidence =
      outcomes.reduce((sum, o) => sum + o.confidence, 0) / outcomes.length;
    if (avgConfidence > 0.75) {
      insights.push('High confidence in simulation predictions');
    } else if (avgConfidence < 0.5) {
      insights.push('Low confidence - requires validation from real experiences');
    }

    // Modality-specific insights
    if (modality === 'emotional_consequence') {
      insights.push('Alternative response would significantly reduce emotional burden');
    } else if (modality === 'goal_progression') {
      insights.push('Different approach could accelerate goal achievement');
    } else if (modality === 'learning_outcome') {
      insights.push('Opportunity to deepen learning from this experience');
    }

    // Time-based insight
    if (scenario.timeframe === 'immediate') {
      insights.push('Immediate action could prevent negative outcomes');
    } else if (scenario.timeframe === 'long-term') {
      insights.push('Long-term impact of this decision is significant');
    }

    return insights;
  }

  /**
   * Extract lesson learned from simulation
   */
  private extractLesson(
    scenario: CounterfactualScenario,
    outcomes: CounterfactualSimulation['simulatedOutcomes'],
    insights: string[]
  ): string {
    const lessons: { [key in ScenarioType]: string } = {
      alternative_response: 'Different communication approaches can lead to vastly different outcomes. Consider practicing alternative responses.',
      different_decision: 'Decision timing and approach significantly influence outcomes. Planning ahead improves decision quality.',
      avoided_mistake: 'Avoiding past mistakes requires awareness of patterns. Build prevention systems to catch similar situations early.',
      future_possibility: 'Multiple positive futures are possible with intentional action. Focus on the desired outcome and work backward.',
      historical_replay: 'Past events offer learning opportunities. Similar situations will arise; apply lessons learned.',
      optimal_outcome: 'Optimal outcomes require alignment of strategy, timing, and effort. Small improvements compound over time.',
    };

    return lessons[scenario.scenarioType];
  }

  /**
   * Assess applicability of simulation to real situations
   */
  private assessApplicability(
    scenario: CounterfactualScenario,
    modality: SimulationModality
  ): number {
    let applicability = 0.6; // Base applicability

    // Newer scenarios are more applicable
    const daysSinceCreated = (Date.now() - scenario.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    applicability += Math.max(0, (30 - daysSinceCreated) / 300);

    // Certain modalities are more universally applicable
    if (
      modality === 'learning_outcome' ||
      modality === 'goal_progression'
    ) {
      applicability += 0.15;
    }

    // Normalize
    return Math.min(Math.max(applicability, 0), 1.0);
  }

  /**
   * Analyze batch of simulations
   */
  private analyzeBatch(
    simulations: CounterfactualSimulation[]
  ): SimulationBatch['batchMetrics'] {
    const confidences = simulations.map((s) =>
      s.simulatedOutcomes.reduce((sum, o) => sum + o.confidence, 0) /
      s.simulatedOutcomes.length
    );
    const applicabilities = simulations.map((s) => s.applicability);

    const totalBenefitScore = simulations.reduce((sum, s) => {
      const avgDifference =
        s.simulatedOutcomes.reduce((sum, o) => sum + o.differenceScore, 0) /
        s.simulatedOutcomes.length;
      return sum + Math.max(avgDifference, 0);
    }, 0);

    const recommendations: string[] = [];
    if (totalBenefitScore > 2.0) {
      recommendations.push('Strong positive outcomes possible - prioritize implementation');
    }
    if (
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length > 0.8
    ) {
      recommendations.push('High confidence in predictions - trust the analysis');
    }

    return {
      totalBenefitScore,
      averageConfidence:
        confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
      applicabilityScore:
        applicabilities.reduce((sum, a) => sum + a, 0) / applicabilities.length,
      recommendedActions: recommendations,
    };
  }

  /**
   * Generate overall insight from batch
   */
  private generateBatchInsight(
    simulations: CounterfactualSimulation[],
    batchType: string
  ): string {
    const insightTemplates: { [key: string]: string } = {
      exploration:
        'Exploration simulations reveal multiple viable paths forward. Each offers unique advantages.',
      optimization:
        'Optimization analysis shows where small adjustments yield significant improvements.',
      recovery:
        'Recovery simulations demonstrate clear pathways to restore equilibrium and growth.',
      growth:
        'Growth simulations show substantial potential for advancement through intentional effort.',
    };

    return (
      insightTemplates[batchType] ||
      'Simulations reveal valuable insights for improved decision-making.'
    );
  }

  /**
   * Update overall metrics
   */
  private updateMetrics(): void {
    if (this.simulations.size > 0) {
      const allSimulations = Array.from(this.simulations.values());

      this.metrics.averageConfidence =
        allSimulations.reduce((sum, s) => {
          const avgConfidence =
            s.simulatedOutcomes.reduce((sum, o) => sum + o.confidence, 0) /
            s.simulatedOutcomes.length;
          return sum + avgConfidence;
        }, 0) / allSimulations.length;

      this.metrics.averageApplicability =
        allSimulations.reduce((sum, s) => sum + s.applicability, 0) /
        allSimulations.length;

      this.metrics.simulationHistory = allSimulations.slice(-20); // Keep last 20
    }

    // Find most common modality
    if (this.simulations.size > 0) {
      const modalities = Array.from(this.simulations.values()).map((s) => s.modality);
      const modCounts = new Map<SimulationModality, number>();
      for (const mod of modalities) {
        modCounts.set(mod, (modCounts.get(mod) || 0) + 1);
      }
      this.metrics.mostCommonModality = Array.from(modCounts.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || null;
    }
  }

  /**
   * Get simulation by ID
   */
  getSimulation(simulationId: string): CounterfactualSimulation | undefined {
    return this.simulations.get(simulationId);
  }

  /**
   * Get all simulations
   */
  getAllSimulations(): CounterfactualSimulation[] {
    return Array.from(this.simulations.values());
  }

  /**
   * Get batch by ID
   */
  getBatch(batchId: string): SimulationBatch | undefined {
    return this.simulationBatches.get(batchId);
  }

  /**
   * Get all batches
   */
  getAllBatches(): SimulationBatch[] {
    return Array.from(this.simulationBatches.values());
  }

  /**
   * Get metrics
   */
  getMetrics(): CounterfactualMetrics {
    return { ...this.metrics };
  }

  /**
   * Find scenarios by type
   */
  getScenariosByType(type: ScenarioType): CounterfactualScenario[] {
    return Array.from(this.scenarios.values()).filter((s) => s.scenarioType === type);
  }

  /**
   * Generate scenario ID
   */
  private generateScenarioId(): string {
    return `scn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate simulation ID
   */
  private generateSimulationId(): string {
    return `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.scenarios.clear();
    this.simulations.clear();
    this.simulationBatches.clear();
    this.metrics = {
      totalSimulations: 0,
      totalScenarios: 0,
      averageConfidence: 0,
      averageApplicability: 0,
      insightsGenerated: 0,
      lessonsBatchesCreated: 0,
      mostCommonModality: null,
      simulationHistory: [],
    };
    console.log('🔄 Counterfactual Simulation Engine reset');
  }
}

export const counterfactualSimulationService = CounterfactualSimulationService.getInstance();
export { CounterfactualSimulationService };
