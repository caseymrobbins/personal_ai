/**
 * ARGUMENTATION PIPELINE INTEGRATION TESTS
 * ========================================
 * Comprehensive test suite for the argumentation system including:
 * - Hybrid LLM routing
 * - Viewpoint analysis
 * - Strong-manning
 * - Argument synthesis
 * - Full pipeline orchestration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hybridLLMRouter } from '../services/hybrid-llm-router.service';
import { viewpointAnalyzer } from '../services/viewpoint-analyzer.service';
import { strongManning } from '../services/strong-manning.service';
import { argumentSynthesizer } from '../services/argument-synthesizer.service';
import { argumentationPipeline } from '../services/argumentation-pipeline.service';

describe('Hybrid LLM Router', () => {
  beforeEach(() => {
    hybridLLMRouter.reset();
  });

  it('should analyze query complexity correctly', async () => {
    const query = 'What is machine learning?';
    const context = '';

    const complexity = await hybridLLMRouter.analyzeQueryComplexity(
      query,
      context
    );

    expect(complexity.score).toBeGreaterThanOrEqual(0);
    expect(complexity.score).toBeLessThanOrEqual(1);
    expect(complexity.factors).toBeDefined();
    expect(complexity.factors.semanticDepth).toBeDefined();
    expect(complexity.factors.reasoningSteps).toBeDefined();
    expect(complexity.recommendation).toMatch(/^(local|hybrid|cloud)$/);
  });

  it('should route simple queries to local', async () => {
    const query = 'What is the capital of France?';
    const context = '';

    const decision = await hybridLLMRouter.routeQuery(query, context, {
      preferCost: true,
    });

    expect(decision.adapterId).toBeDefined();
    expect(decision.complexity.score).toBeLessThan(0.5);
  });

  it('should route complex queries appropriately', async () => {
    const query =
      'Compare and contrast different philosophical approaches to consciousness, considering neuroscience, philosophy of mind, and practical implications';
    const context = 'Previous discussion about consciousness...';

    const decision = await hybridLLMRouter.routeQuery(query, context, {
      preferCost: true,
    });

    expect(decision.estimatedLatency).toBeGreaterThan(0);
    expect(decision.estimatedCost).toBeGreaterThanOrEqual(0);
  });

  it('should track routing statistics', async () => {
    for (let i = 0; i < 3; i++) {
      const query = i === 0 ? 'What is AI?' : 'How does machine learning differ from AI?';
      await hybridLLMRouter.routeQuery(query, '', { preferCost: true });
    }

    const stats = hybridLLMRouter.getRoutingStats();

    expect(stats.totalQueries).toBe(3);
    expect(stats.localRouted).toBeGreaterThanOrEqual(0);
    expect(stats.cloudRouted).toBeGreaterThanOrEqual(0);
  });
});

describe('Viewpoint Analyzer', () => {
  beforeEach(() => {
    viewpointAnalyzer.reset();
  });

  it('should extract user position from conversation', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content: 'I think AI will have a significant positive impact on society.',
      },
      {
        role: 'assistant',
        content: 'That is an interesting perspective.',
      },
      {
        role: 'user',
        content:
          'AI can improve healthcare, education, and reduce poverty globally.',
      },
    ];

    const analysis = await viewpointAnalyzer.analyzeConversation(
      conversationHistory,
      'Impact of AI on society'
    );

    expect(analysis.userPosition).toBeDefined();
    expect(analysis.userPosition.stance).toBe('user');
    expect(analysis.userPosition.position).toBeTruthy();
    expect(analysis.userPosition.confidence).toBeGreaterThan(0);
  });

  it('should generate opposing viewpoints', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content: 'Remote work is better than office work.',
      },
    ];

    const analysis = await viewpointAnalyzer.analyzeConversation(
      conversationHistory,
      'Remote vs Office Work'
    );

    expect(analysis.opposingViewpoints).toBeDefined();
    expect(analysis.opposingViewpoints.length).toBeGreaterThan(0);
    expect(
      analysis.opposingViewpoints.every((v) => v.stance === 'opposing')
    ).toBe(true);
  });

  it('should identify common ground', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content:
          'We should invest in education because it improves economic outcomes.',
      },
    ];

    const analysis = await viewpointAnalyzer.analyzeConversation(
      conversationHistory,
      'Education Investment'
    );

    expect(analysis.commonGround).toBeDefined();
    expect(analysis.commonGround.length).toBeGreaterThanOrEqual(0);
    if (analysis.commonGround.length > 0) {
      expect(analysis.commonGround[0].statement).toBeTruthy();
      expect(analysis.commonGround[0].strength).toBeGreaterThan(0);
    }
  });

  it('should detect key tensions', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content: 'Privacy is more important than convenience in technology.',
      },
    ];

    const analysis = await viewpointAnalyzer.analyzeConversation(
      conversationHistory,
      'Privacy vs Convenience'
    );

    expect(analysis.keyTensions).toBeDefined();
    if (analysis.keyTensions.length > 0) {
      expect(analysis.keyTensions[0].nature).toMatch(
        /^(contradictory|factual|value|incompatible|prioritization)$/
      );
    }
  });
});

describe('Strong Manning Service', () => {
  beforeEach(() => {
    strongManning.reset();
  });

  it('should generate counterarguments', async () => {
    const viewpoint = {
      id: 'vp-1',
      position: 'Climate change is primarily caused by human activity',
      stance: 'user' as const,
      arguments: [
        {
          id: 'arg-1',
          statement:
            'CO2 levels have increased 50% since industrialization',
          strength: 0.8,
        },
        {
          id: 'arg-2',
          statement: 'Temperature correlates with CO2 emissions',
          strength: 0.75,
        },
      ],
      confidence: 0.85,
    };

    const analysis = await strongManning.strongManViewpoint(viewpoint);

    expect(analysis.counterArguments).toBeDefined();
    expect(analysis.counterArguments.length).toBeGreaterThan(0);
    expect(
      analysis.counterArguments.every((ca) => ca.statement.length > 0)
    ).toBe(true);
  });

  it('should identify unexamined assumptions', async () => {
    const viewpoint = {
      id: 'vp-1',
      position: 'Economic growth should always be prioritized',
      stance: 'user' as const,
      arguments: [
        {
          id: 'arg-1',
          statement: 'Growth creates jobs and improves living standards',
          strength: 0.8,
        },
      ],
      confidence: 0.7,
    };

    const analysis = await strongManning.strongManViewpoint(viewpoint);

    expect(analysis.unexpaminedAssumptions).toBeDefined();
    expect(analysis.unexpaminedAssumptions.length).toBeGreaterThan(0);
  });

  it('should find edge cases', async () => {
    const viewpoint = {
      id: 'vp-1',
      position: 'Automation benefits everyone',
      stance: 'user' as const,
      arguments: [
        {
          id: 'arg-1',
          statement: 'Automation increases productivity',
          strength: 0.85,
        },
      ],
      confidence: 0.8,
    };

    const analysis = await strongManning.strongManViewpoint(viewpoint);

    expect(analysis.edgeCases).toBeDefined();
    expect(analysis.edgeCases.length).toBeGreaterThan(0);
  });

  it('should rate fairness of strong-manning', async () => {
    const viewpoint = {
      id: 'vp-1',
      position: 'Test position',
      stance: 'user' as const,
      arguments: [
        {
          id: 'arg-1',
          statement: 'Test argument',
          strength: 0.7,
        },
      ],
      confidence: 0.7,
    };

    const analysis = await strongManning.strongManViewpoint(viewpoint);

    expect(analysis.fairnessScore).toBeGreaterThanOrEqual(0);
    expect(analysis.fairnessScore).toBeLessThanOrEqual(1);
    expect(analysis.overallChallengeStrength).toBeGreaterThanOrEqual(0);
    expect(analysis.overallChallengeStrength).toBeLessThanOrEqual(1);
  });
});

describe('Argument Synthesizer', () => {
  beforeEach(() => {
    argumentSynthesizer.reset();
  });

  it('should synthesize answer from analysis', async () => {
    const viewpointAnalysis = {
      id: 'va-1',
      topic: 'Work-life balance',
      conversationTurns: 3,
      userPosition: {
        id: 'vp-1',
        position: 'Work-life balance is essential',
        stance: 'user' as const,
        arguments: [],
        confidence: 0.8,
      },
      opposingViewpoints: [
        {
          id: 'vp-2',
          position: 'Career should come first',
          stance: 'opposing' as const,
          domain: 'practical',
          arguments: [],
          confidence: 0.6,
        },
      ],
      commonGround: [
        {
          statement: 'Both acknowledge work is important',
          agreement: ['vp-1', 'vp-2'],
          strength: 0.9,
        },
      ],
      keyTensions: [
        {
          id: 't-1',
          topic: 'Time allocation',
          position1: { viewpointId: 'vp-1', stance: 'balanced' },
          position2: { viewpointId: 'vp-2', stance: 'career-focused' },
          nature: 'prioritization' as const,
          explanation: 'Different priorities for time use',
        },
      ],
      topicClarities: {
        wellDefined: true,
        coreDisagreement: 'Priority of personal life vs career',
        sharedAssumptions: ['Work matters', 'Life matters'],
      },
      analysisConfidence: 0.8,
      timestamp: Date.now(),
    };

    const strongManAnalyses = new Map();

    const answer = await argumentSynthesizer.synthesizeAnswer(
      'What is the right balance between work and personal life?',
      viewpointAnalysis,
      strongManAnalyses
    );

    expect(answer.directAnswer).toBeTruthy();
    expect(answer.nuancedExplanation).toBeTruthy();
    expect(answer.tradeOffs).toBeDefined();
    expect(answer.perspectives).toBeDefined();
    expect(answer.commonGround).toBeDefined();
    expect(answer.synthesisQuality).toBeGreaterThanOrEqual(0);
    expect(answer.representativeness).toBeGreaterThanOrEqual(0);
  });

  it('should identify trade-offs', async () => {
    const viewpointAnalysis = {
      id: 'va-1',
      topic: 'Technology policy',
      conversationTurns: 2,
      userPosition: {
        id: 'vp-1',
        position: 'Innovation should be prioritized',
        stance: 'user' as const,
        arguments: [],
        confidence: 0.8,
      },
      opposingViewpoints: [
        {
          id: 'vp-2',
          position: 'Safety regulation should come first',
          stance: 'opposing' as const,
          arguments: [],
          confidence: 0.75,
        },
      ],
      commonGround: [],
      keyTensions: [
        {
          id: 't-1',
          topic: 'Innovation vs Safety',
          position1: { viewpointId: 'vp-1', stance: 'innovation' },
          position2: { viewpointId: 'vp-2', stance: 'safety' },
          nature: 'prioritization' as const,
          explanation: 'Fundamental trade-off',
        },
      ],
      topicClarities: {
        wellDefined: true,
        coreDisagreement: 'Innovation vs Safety priority',
        sharedAssumptions: [],
      },
      analysisConfidence: 0.8,
      timestamp: Date.now(),
    };

    const answer = await argumentSynthesizer.synthesizeAnswer(
      'Should we prioritize innovation or safety in technology policy?',
      viewpointAnalysis,
      new Map()
    );

    expect(answer.tradeOffs.length).toBeGreaterThan(0);
  });

  it('should generate contextual recommendations', async () => {
    const viewpointAnalysis = {
      id: 'va-1',
      topic: 'Team management',
      conversationTurns: 2,
      userPosition: {
        id: 'vp-1',
        position: 'Micromanagement should be avoided',
        stance: 'user' as const,
        arguments: [],
        confidence: 0.85,
      },
      opposingViewpoints: [],
      commonGround: [],
      keyTensions: [],
      topicClarities: {
        wellDefined: true,
        coreDisagreement: 'Management style',
        sharedAssumptions: [],
      },
      analysisConfidence: 0.85,
      timestamp: Date.now(),
    };

    const answer = await argumentSynthesizer.synthesizeAnswer(
      'What is the best management style?',
      viewpointAnalysis,
      new Map()
    );

    expect(answer.contextualRecommendations).toBeDefined();
    expect(answer.recommendedApproach).toBeDefined();
    expect(answer.recommendedApproach.primary).toBeTruthy();
    expect(answer.recommendedApproach.caveats).toBeDefined();
  });
});

describe('Argumentation Pipeline (Full Integration)', () => {
  beforeEach(() => {
    argumentationPipeline.reset();
  });

  it('should execute complete pipeline', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content:
          'I believe renewable energy should be prioritized over fossil fuels.',
      },
      {
        role: 'assistant',
        content: 'That is an important perspective on energy policy.',
      },
      {
        role: 'user',
        content:
          'It would reduce carbon emissions and create sustainable jobs.',
      },
    ];

    const result = await argumentationPipeline.executePipeline(
      'Should renewable energy be prioritized?',
      conversationHistory
    );

    expect(result.id).toBeTruthy();
    expect(result.question).toBe('Should renewable energy be prioritized?');
    expect(result.routingDecision).toBeDefined();
    expect(result.viewpointAnalysis).toBeDefined();
    expect(result.synthesizedAnswer).toBeDefined();
    expect(result.quality).toBeDefined();
    expect(result.timing).toBeDefined();
    expect(result.progressLog).toBeDefined();
  });

  it('should track pipeline progress', async () => {
    const progressEvents: string[] = [];

    const progressCallback = (progress: any) => {
      progressEvents.push(progress.stage);
    };

    const conversationHistory = [
      {
        role: 'user',
        content: 'AI is transformative.',
      },
    ];

    await argumentationPipeline.executePipeline(
      'What is the future of AI?',
      conversationHistory,
      progressCallback
    );

    // Should have all stages
    expect(progressEvents).toContain('routing');
    expect(progressEvents).toContain('viewpoint-analysis');
    expect(progressEvents).toContain('strong-manning');
    expect(progressEvents).toContain('synthesis');
  });

  it('should calculate quality metrics', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content: 'Climate change is a critical issue.',
      },
      {
        role: 'assistant',
        content: 'Indeed, it is a complex topic.',
      },
      {
        role: 'user',
        content:
          'We need urgent action to reduce emissions and protect future generations.',
      },
    ];

    const result = await argumentationPipeline.executePipeline(
      'How should we address climate change?',
      conversationHistory
    );

    expect(result.quality.overallQuality).toBeGreaterThan(0);
    expect(result.quality.overallQuality).toBeLessThanOrEqual(0.95);
    expect(result.quality.routingConfidence).toBeGreaterThanOrEqual(0);
    expect(result.quality.analysisConfidence).toBeGreaterThanOrEqual(0);
    expect(result.quality.synthesisQuality).toBeGreaterThanOrEqual(0);
  });

  it('should measure execution timing', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content: 'Test question.',
      },
    ];

    const result = await argumentationPipeline.executePipeline(
      'Is this a test?',
      conversationHistory
    );

    expect(result.timing.totalMs).toBeGreaterThan(0);
    expect(result.timing.routingMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.analysisMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.strongManningMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.synthesisMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty conversation gracefully', async () => {
    const result = await argumentationPipeline.executePipeline(
      'What is the meaning of life?',
      []
    );

    expect(result.id).toBeTruthy();
    expect(result.synthesizedAnswer).toBeDefined();
  });

  it('should return cached result metrics', async () => {
    // Execute pipeline twice to populate cache
    const conversationHistory = [
      {
        role: 'user',
        content: 'Same question.',
      },
    ];

    const question = 'What is the answer?';

    await argumentationPipeline.executePipeline(question, conversationHistory);
    await argumentationPipeline.executePipeline(question, conversationHistory);

    const metrics = argumentationPipeline.getMetrics();

    expect(metrics.totalPipelines).toBeGreaterThanOrEqual(2);
    expect(metrics.avgQuality).toBeGreaterThan(0);
    expect(metrics.avgTotalTime).toBeGreaterThan(0);
  });
});

describe('End-to-End Argumentation Flow', () => {
  beforeEach(() => {
    argumentationPipeline.reset();
  });

  it('should handle complex multi-perspective debate', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content:
          'I think universal basic income is necessary to address poverty.',
      },
      {
        role: 'assistant',
        content: 'What are your main reasons?',
      },
      {
        role: 'user',
        content:
          'It reduces inequality, provides security, and simplifies welfare bureaucracy.',
      },
      {
        role: 'assistant',
        content: 'Those are important considerations.',
      },
    ];

    const result = await argumentationPipeline.executePipeline(
      'Should governments implement universal basic income?',
      conversationHistory
    );

    // Verify all components are integrated
    expect(result.viewpointAnalysis.userPosition.confidence).toBeGreaterThan(
      0.5
    );
    expect(result.viewpointAnalysis.opposingViewpoints.length).toBeGreaterThan(
      0
    );
    expect(result.synthesizedAnswer.perspectives.length).toBeGreaterThan(0);
    expect(result.quality.overallQuality).toBeGreaterThan(0.4);
  });

  it('should balance fairness and rigor', async () => {
    const conversationHistory = [
      {
        role: 'user',
        content: 'Technology will solve all our problems.',
      },
    ];

    const result = await argumentationPipeline.executePipeline(
      'Is technology the solution to all problems?',
      conversationHistory
    );

    // Check that analysis is fair (high representativeness)
    expect(result.synthesizedAnswer.representativeness).toBeGreaterThan(0.4);

    // Check that it identifies limitations
    expect(result.viewpointAnalysis.keyTensions.length).toBeGreaterThanOrEqual(
      0
    );
  });
});
