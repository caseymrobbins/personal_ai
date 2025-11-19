/**
 * ARGUMENTATION DATABASE SCHEMA
 * =============================
 * Database schema for storing argumentation analysis results.
 * Extends the existing persistence layer with argumentation-specific collections.
 */

/**
 * Collections to initialize for argumentation system
 */
export const argumentationCollections = [
  'viewpoint_analyses',
  'strong_man_analyses',
  'synthesized_answers',
  'pipeline_results',
  'argument_metadata',
];

/**
 * Initialize argumentation collections in database
 */
export async function initializeArgumentationSchema(database: any): Promise<void> {
  // Viewpoint Analyses Collection
  const viewpointAnalyses = database.getCollection('viewpoint_analyses');
  await viewpointAnalyses.createIndex({ topic: 1, timestamp: -1 });
  await viewpointAnalyses.createIndex({ 'userPosition.confidence': -1 });
  await viewpointAnalyses.createIndex({ analysisConfidence: -1 });

  // Strong-Man Analyses Collection
  const strongManAnalyses = database.getCollection('strong_man_analyses');
  await strongManAnalyses.createIndex({ 'targetViewpoint.id': 1 });
  await strongManAnalyses.createIndex({ overallChallengeStrength: -1 });
  await strongManAnalyses.createIndex({ fairnessScore: -1 });
  await strongManAnalyses.createIndex({ timestamp: -1 });

  // Synthesized Answers Collection
  const synthesizedAnswers = database.getCollection('synthesized_answers');
  await synthesizedAnswers.createIndex({ originalQuestion: 1, timestamp: -1 });
  await synthesizedAnswers.createIndex({ synthesisQuality: -1 });
  await synthesizedAnswers.createIndex({ representativeness: -1 });

  // Pipeline Results Collection
  const pipelineResults = database.getCollection('pipeline_results');
  await pipelineResults.createIndex({ question: 1, timestamp: -1 });
  await pipelineResults.createIndex({ 'quality.overallQuality': -1 });
  await pipelineResults.createIndex({ timestamp: -1 });

  // Argument Metadata Collection (for caching and quick lookups)
  const argumentMetadata = database.getCollection('argument_metadata');
  await argumentMetadata.createIndex({ 'analysis.id': 1 });
  await argumentMetadata.createIndex({ userId: 1, timestamp: -1 });
}

/**
 * Schema definitions for type safety
 */

export interface ViewpointAnalysisRecord {
  _id?: string;
  topic: string;
  conversationTurns: number;
  userPosition: {
    id: string;
    position: string;
    stance: 'user';
    arguments: Array<{ id: string; statement: string; strength: number }>;
    confidence: number;
  };
  opposingViewpoints: Array<{
    id: string;
    position: string;
    stance: 'opposing';
    domain?: string;
    arguments: Array<{ id: string; statement: string; strength: number }>;
    confidence: number;
  }>;
  commonGround: Array<{
    statement: string;
    strength: number;
  }>;
  keyTensions: Array<{
    id: string;
    topic: string;
    nature: 'contradictory' | 'factual' | 'value' | 'incompatible' | 'prioritization';
  }>;
  analysisConfidence: number;
  timestamp: number;
}

export interface StrongManAnalysisRecord {
  _id?: string;
  targetViewpoint: {
    id: string;
    position: string;
    stance: 'user' | 'opposing';
  };
  counterArguments: Array<{
    id: string;
    statement: string;
    counterType:
      | 'logical-fallacy'
      | 'empirical-challenge'
      | 'value-conflict'
      | 'assumption-challenge'
      | 'edge-case'
      | 'practical-problem';
    strength: number;
    fairnessScore: number;
  }>;
  unexaminedAssumptions: Array<{
    assumption: string;
    importance: number;
  }>;
  edgeCases: Array<{
    scenario: string;
    severity: 'critical' | 'significant' | 'minor';
  }>;
  probingQuestions: Array<{
    question: string;
    difficulty: number;
  }>;
  overallChallengeStrength: number;
  fairnessScore: number;
  timestamp: number;
}

export interface SynthesizedAnswerRecord {
  _id?: string;
  originalQuestion: string;
  directAnswer: string;
  nuancedExplanation: string;
  tradeOffs: Array<{
    id: string;
    dimension1: { name: string };
    dimension2: { name: string };
  }>;
  perspectives: Array<{
    title: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  commonGround: string[];
  synthesisQuality: number;
  representativeness: number;
  timestamp: number;
}

export interface PipelineResultRecord {
  _id?: string;
  question: string;
  routingAdapterId: 'local' | 'claude' | 'gpt4' | 'gemini' | 'cohere';
  queryCovmplexity: number;
  viewpointAnalysisId?: string;
  synthesizedAnswerId?: string;
  quality: {
    routingConfidence: number;
    analysisConfidence: number;
    synthesisQuality: number;
    overallQuality: number;
  };
  timing: {
    totalMs: number;
    routingMs: number;
    analysisMs: number;
    strongManningMs: number;
    synthesisMs: number;
  };
  conversationLength: number;
  timestamp: number;
}

export interface ArgumentMetadataRecord {
  _id?: string;
  userId: string;
  analysisId: string;
  analysisType: 'viewpoint' | 'strong_man' | 'synthesis' | 'pipeline';
  question: string;
  quality: number;
  cached: boolean;
  cacheHit?: boolean;
  reusableFor?: string[]; // Questions similar enough to reuse this analysis
  timestamp: number;
  expiresAt: number; // TTL for cache
}

/**
 * Migration functions for schema updates
 */

export async function migrationAddArgumentationTables(
  database: any
): Promise<void> {
  console.log('Running argumentation schema migration...');

  try {
    await initializeArgumentationSchema(database);
    console.log('✓ Argumentation schema initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize argumentation schema:', error);
    throw error;
  }
}

/**
 * Retention policies for argumentation data
 */
export const argumentationRetentionPolicies = {
  viewpoint_analyses: {
    retentionDays: 90,
    category: 'analysis',
    description: 'Viewpoint analysis results',
  },
  strong_man_analyses: {
    retentionDays: 90,
    category: 'analysis',
    description: 'Strong-man analysis results',
  },
  synthesized_answers: {
    retentionDays: 180,
    category: 'analysis',
    description: 'Synthesized answers - kept longer for reference',
  },
  pipeline_results: {
    retentionDays: 180,
    category: 'analysis',
    description: 'Complete pipeline execution results',
  },
  argument_metadata: {
    retentionDays: 30,
    category: 'cache',
    description: 'Argument metadata cache - short lived',
  },
};

/**
 * Helper function to create an argumentation record
 */
export function createViewpointAnalysisRecord(
  analysis: any
): ViewpointAnalysisRecord {
  return {
    topic: analysis.topic,
    conversationTurns: analysis.conversationTurns,
    userPosition: {
      id: analysis.userPosition.id,
      position: analysis.userPosition.position,
      stance: 'user',
      arguments: analysis.userPosition.arguments.map(
        (arg: any) => ({
          id: arg.id,
          statement: arg.statement,
          strength: arg.strength,
        })
      ),
      confidence: analysis.userPosition.confidence,
    },
    opposingViewpoints: analysis.opposingViewpoints.map(
      (v: any) => ({
        id: v.id,
        position: v.position,
        stance: 'opposing' as const,
        domain: v.domain,
        arguments: v.arguments.map(
          (arg: any) => ({
            id: arg.id,
            statement: arg.statement,
            strength: arg.strength,
          })
        ),
        confidence: v.confidence,
      })
    ),
    commonGround: analysis.commonGround.map(
      (cg: any) => ({
        statement: cg.statement,
        strength: cg.strength,
      })
    ),
    keyTensions: analysis.keyTensions.map(
      (t: any) => ({
        id: t.id,
        topic: t.topic,
        nature: t.nature,
      })
    ),
    analysisConfidence: analysis.analysisConfidence,
    timestamp: analysis.timestamp,
  };
}

export function createStrongManAnalysisRecord(
  analysis: any
): StrongManAnalysisRecord {
  return {
    targetViewpoint: {
      id: analysis.targetViewpoint.id,
      position: analysis.targetViewpoint.position,
      stance: analysis.targetViewpoint.stance,
    },
    counterArguments: analysis.counterArguments.map(
      (ca: any) => ({
        id: ca.id,
        statement: ca.statement,
        counterType: ca.counterType,
        strength: ca.strength,
        fairnessScore: ca.fairnessScore,
      })
    ),
    unexaminedAssumptions: analysis.unexpaminedAssumptions.map(
      (ua: any) => ({
        assumption: ua.assumption,
        importance: ua.importance,
      })
    ),
    edgeCases: analysis.edgeCases.map(
      (ec: any) => ({
        scenario: ec.scenario,
        severity: ec.severity,
      })
    ),
    probingQuestions: analysis.probingQuestions.map(
      (pq: any) => ({
        question: pq.question,
        difficulty: pq.difficulty,
      })
    ),
    overallChallengeStrength: analysis.overallChallengeStrength,
    fairnessScore: analysis.fairnessScore,
    timestamp: analysis.timestamp,
  };
}

export function createSynthesizedAnswerRecord(
  answer: any
): SynthesizedAnswerRecord {
  return {
    originalQuestion: answer.originalQuestion,
    directAnswer: answer.directAnswer,
    nuancedExplanation: answer.nuancedExplanation,
    tradeOffs: answer.tradeOffs.map(
      (to: any) => ({
        id: to.id,
        dimension1: { name: to.dimension1.name },
        dimension2: { name: to.dimension2.name },
      })
    ),
    perspectives: answer.perspectives.map(
      (p: any) => ({
        title: p.title,
        description: p.description,
        strengths: p.strengths,
        weaknesses: p.weaknesses,
      })
    ),
    commonGround: answer.commonGround,
    synthesisQuality: answer.synthesisQuality,
    representativeness: answer.representativeness,
    timestamp: answer.timestamp,
  };
}

export function createPipelineResultRecord(result: any): PipelineResultRecord {
  return {
    question: result.question,
    routingAdapterId: result.routingDecision.adapterId,
    queryCovmplexity: result.routingDecision.complexity.score,
    viewpointAnalysisId: result.viewpointAnalysis.id,
    synthesizedAnswerId: result.synthesizedAnswer.id,
    quality: result.quality,
    timing: result.timing,
    conversationLength: result.conversationHistory.length,
    timestamp: result.timestamp,
  };
}

export function createArgumentMetadataRecord(
  userId: string,
  analysisId: string,
  analysisType: 'viewpoint' | 'strong_man' | 'synthesis' | 'pipeline',
  question: string,
  quality: number,
  reusableFor?: string[]
): ArgumentMetadataRecord {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

  return {
    userId,
    analysisId,
    analysisType,
    question,
    quality,
    cached: true,
    reusableFor,
    timestamp: Date.now(),
    expiresAt,
  };
}
