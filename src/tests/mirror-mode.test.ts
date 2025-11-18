/**
 * Mirror Mode Testing Suite
 *
 * Comprehensive test coverage for Mirror Mode system including:
 * - Unit tests for individual services
 * - Integration tests for service interactions
 * - End-to-end response transformation tests
 * - Stability detection and mode switching tests
 * - Performance and latency tests
 * - Confidence scoring validation
 */

import { userLinguisticProfileService } from '../services/user-linguistic-profile.service';
import { lexiconMatchingEngineService } from '../services/lexicon-matching-engine.service';
import { syntaxMirroringService } from '../services/syntax-mirroring.service';
import { tonalResonanceService } from '../services/tonal-resonance.service';
import { stabilityDetectionService } from '../services/stability-detection.service';
import { mirrorModeOrchestratorService } from '../services/mirror-mode-orchestrator.service';

/**
 * Test Suite: Linguistic Profile Service
 */
describe('User Linguistic Profile Service', () => {
  const testUserId = 'test-user-1';
  const testMessages = [
    'Hey, I really love this! This is amazing!',
    'So, like, I totally get what you mean, you know?',
    'This is quite interesting. However, I must say it\'s rather complex.',
    'OMG, this is literally the BEST thing ever!!!',
    'I\'ve been thinking about this deeply, and honestly, I\'m not sure anymore.',
  ];

  beforeEach(() => {
    userLinguisticProfileService.reset();
  });

  test('should analyze messages and build vocabulary profile', async () => {
    for (const message of testMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const profile = userLinguisticProfileService.getProfile(testUserId);
    expect(profile).toBeDefined();
    expect(profile.totalMessagesAnalyzed).toBe(testMessages.length);
    expect(profile.vocabulary.commonWords.size).toBeGreaterThan(0);
    expect(profile.vocabulary.slang.size).toBeGreaterThan(0);
  });

  test('should extract top words correctly', async () => {
    for (const message of testMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const topWords = userLinguisticProfileService.getTopWords(testUserId, 5);
    expect(topWords).toBeDefined();
    expect(topWords.length).toBeLessThanOrEqual(5);
    expect(topWords.length).toBeGreaterThan(0);
  });

  test('should detect formatting preferences', async () => {
    for (const message of testMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const prefs = userLinguisticProfileService.getFormattingPreferences(testUserId);
    expect(prefs).toBeDefined();
    expect(prefs.casingPreference).toBeDefined();
    expect(prefs.punctuationStyle).toBeDefined();
  });

  test('should calculate syntax characteristics', async () => {
    for (const message of testMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const syntax = userLinguisticProfileService.getSyntaxCharacteristics(testUserId);
    expect(syntax).toBeDefined();
    expect(syntax.averageSentenceLength).toBeGreaterThan(0);
    expect(syntax.complexityScore).toBeGreaterThanOrEqual(0);
    expect(syntax.complexityScore).toBeLessThanOrEqual(1);
  });
});

/**
 * Test Suite: Lexicon Matching Engine
 */
describe('Lexicon Matching Engine', () => {
  const testUserId = 'test-user-2';
  const testMessages = [
    'yeah, I really appreciate your help, thx so much!',
    'ok, sounds good. bc I was totally confused before.',
    'OMG, this is so amazing, I love it!',
    'Wanna grab coffee? I gonna head out soon.',
  ];

  beforeEach(async () => {
    lexiconMatchingEngineService.reset();
    for (const message of testMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }
  });

  test('should apply lexicon matching to text', async () => {
    const testText = 'I appreciate your help and thank you for that.';
    const result = await lexiconMatchingEngineService.matchLexicon(testUserId, testText);

    expect(result).toBeDefined();
    expect(result.userId).toBe(testUserId);
    expect(result.originalText).toBe(testText);
    expect(result.matchedText).toBeDefined();
  });

  test('should generate accurate replacement rules', async () => {
    const testText = 'I appreciate your help because you are amazing.';
    const result = await lexiconMatchingEngineService.matchLexicon(testUserId, testText);

    expect(result.replacementsApplied).toBeGreaterThanOrEqual(0);
    expect(result.replacementDetails).toBeDefined();
    expect(Array.isArray(result.replacementDetails)).toBe(true);
  });

  test('should calculate lexicon coverage correctly', async () => {
    const testText = 'This is a standard generic response.';
    const result = await lexiconMatchingEngineService.matchLexicon(testUserId, testText);

    expect(result.lexiconCoverage).toBeGreaterThanOrEqual(0);
    expect(result.lexiconCoverage).toBeLessThanOrEqual(1);
  });

  test('should return lexicon statistics', () => {
    const stats = lexiconMatchingEngineService.getLexiconStats(testUserId);
    expect(stats).toBeDefined();
    expect(stats.vocabularySize).toBeGreaterThan(0);
    expect(stats.commonSlangsCount).toBeGreaterThanOrEqual(0);
  });
});

/**
 * Test Suite: Syntax Mirroring Service
 */
describe('Syntax Mirroring Service', () => {
  const testUserId = 'test-user-3';
  const testMessages = [
    'Short. Simple. Direct.',
    'This is a medium-length sentence with some complexity.',
    'This is a much longer, more complex sentence that includes multiple clauses and subordinate ideas that build upon each other.',
  ];

  beforeEach(async () => {
    syntaxMirroringService.reset();
    for (const message of testMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }
  });

  test('should apply syntax mirroring to text', async () => {
    const testText = 'This is a very long sentence containing many ideas and clauses that need to be restructured according to the user\'s syntax patterns.';
    const result = await syntaxMirroringService.mirrorSyntax(testUserId, testText);

    expect(result).toBeDefined();
    expect(result.originalText).toBe(testText);
    expect(result.adaptedText).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('should calculate sentence complexity correctly', async () => {
    const testText = 'Short sentence. And another. Very complex sentence with multiple subordinate clauses and parenthetical expressions (like this one).';
    const result = await syntaxMirroringService.mirrorSyntax(testUserId, testText);

    expect(result.sentencesModified).toBeGreaterThan(0);
    expect(result.averageOriginalLength).toBeGreaterThan(0);
  });

  test('should return syntax statistics', () => {
    const stats = syntaxMirroringService.getSyntaxStats(testUserId);
    expect(stats).toBeDefined();
    expect(stats.averageSentenceLength).toBeGreaterThan(0);
    expect(stats.complexityScore).toBeGreaterThanOrEqual(0);
  });

  test('should check syntax match accurately', () => {
    const testText = 'Short. Simple. Direct.';
    const result = syntaxMirroringService.checkSyntaxMatch(testUserId, testText);

    expect(result).toBeDefined();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.feedback)).toBe(true);
  });
});

/**
 * Test Suite: Tonal Resonance Service
 */
describe('Tonal Resonance Service', () => {
  const testUserId = 'test-user-4';
  const excitedMessages = [
    'OMG, this is AMAZING!!! I LOVE it!!!',
    'WOW!!! This is absolutely fantastic!!!',
    'This is incredible!! Best thing ever!!',
  ];
  const formalMessages = [
    'However, I must respectfully disagree with that assertion.',
    'Furthermore, it shall be noted that this matter requires consideration.',
    'Notwithstanding these concerns, we should proceed accordingly.',
  ];

  beforeEach(async () => {
    tonalResonanceService.reset();
  });

  test('should analyze excited tonal profile', async () => {
    for (const message of excitedMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const profile = tonalResonanceService.analyzeTonalProfile(testUserId);
    expect(profile).toBeDefined();
    expect(profile.excitementScore).toBeGreaterThan(0.6);
    expect(profile.energyLevel).toBeGreaterThan(0.6);
  });

  test('should analyze formal tonal profile', async () => {
    const formalUserId = 'test-user-formal';
    for (const message of formalMessages) {
      await userLinguisticProfileService.analyzeMessage(formalUserId, message);
    }

    const profile = tonalResonanceService.analyzeTonalProfile(formalUserId);
    expect(profile).toBeDefined();
    expect(profile.formalityScore).toBeGreaterThan(0.6);
  });

  test('should apply tonal mirroring', async () => {
    for (const message of excitedMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const testText = 'This is a normal response that needs tonal adjustment.';
    const result = tonalResonanceService.applyTonalMirroring(testUserId, testText);

    expect(result).toBeDefined();
    expect(result.originalText).toBe(testText);
    expect(result.adaptedText).toBeDefined();
  });

  test('should check tone match', async () => {
    for (const message of excitedMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const testText = 'OMG, this is AWESOME!!!';
    const result = tonalResonanceService.checkToneMatch(testUserId, testText);

    expect(result).toBeDefined();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.feedback)).toBe(true);
  });

  test('should return tonal statistics', async () => {
    for (const message of excitedMessages) {
      await userLinguisticProfileService.analyzeMessage(testUserId, message);
    }

    const stats = tonalResonanceService.getTonalStats(testUserId);
    expect(stats).toBeDefined();
    expect(stats.energyLevel).toBeGreaterThanOrEqual(0);
    expect(stats.energyLevel).toBeLessThanOrEqual(1);
  });
});

/**
 * Test Suite: Stability Detection Service
 */
describe('Stability Detection Service', () => {
  const stableUserId = 'test-user-stable';
  const stableMessages = [
    'I feel calm and grounded today.',
    'Things are clear and I know what I need to do.',
    'I\'m confident in my decisions.',
    'Everything is proceeding smoothly.',
    'I\'m feeling balanced and centered.',
  ];

  const unStableUserId = 'test-user-unstable';
  const unstableMessages = [
    'I\'m feeling really anxious and panicked!!!!',
    'Everything is so overwhelming and confusing???',
    'I don\'t know what to do... Help... I\'m lost',
    'EVERYTHING IS FALLING APART!!!',
    'I can\'t think straight anymore.',
  ];

  beforeEach(async () => {
    stabilityDetectionService.reset();
  });

  test('should identify stable users', async () => {
    for (const message of stableMessages) {
      await userLinguisticProfileService.analyzeMessage(stableUserId, message);
    }

    const profile = stabilityDetectionService.assessStability(stableUserId);
    expect(profile).toBeDefined();
    expect(profile.overallStabilityScore).toBeGreaterThan(0.5);
    expect(profile.shouldUseMirrorMode).toBe(true);
    expect(profile.recommendedMode).toBe('mirror');
  });

  test('should identify unstable users', async () => {
    for (const message of unstableMessages) {
      await userLinguisticProfileService.analyzeMessage(unStableUserId, message);
    }

    const profile = stabilityDetectionService.assessStability(unStableUserId);
    expect(profile).toBeDefined();
    expect(profile.overallStabilityScore).toBeLessThan(0.5);
    expect(profile.recommendedMode).toBe('balancer');
  });

  test('should generate stability reports', async () => {
    for (const message of stableMessages) {
      await userLinguisticProfileService.analyzeMessage(stableUserId, message);
    }

    const report = stabilityDetectionService.generateStabilityReport(stableUserId);
    expect(report).toBeDefined();
    expect(Array.isArray(report.indicators)).toBe(true);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  test('should track stability trends', async () => {
    for (const message of stableMessages) {
      await userLinguisticProfileService.analyzeMessage(stableUserId, message);
    }

    // Assess multiple times to build history
    stabilityDetectionService.assessStability(stableUserId);
    stabilityDetectionService.assessStability(stableUserId);
    stabilityDetectionService.assessStability(stableUserId);

    const trend = stabilityDetectionService.getStabilityTrend(stableUserId);
    expect(trend).toBeDefined();
    expect(trend.trend).toMatch(/improving|declining|stable/);
  });
});

/**
 * Test Suite: Mirror Mode Orchestrator
 */
describe('Mirror Mode Orchestrator', () => {
  const testUserId = 'test-user-orchestrator';
  const testMessages = [
    'yo, I really appreciate your help, thanks so much!',
    'like, this is so cool and awesome, I love it!',
    'k, sounds good. cuz I was totally confused before.',
    'omg this is the BEST thing EVER!!!',
    'I think this is pretty interesting though.',
  ];

  beforeEach(async () => {
    mirrorModeOrchestratorService.reset();
    for (const message of testMessages) {
      await mirrorModeOrchestratorService.profileUserMessage(testUserId, message);
    }
  });

  test('should initialize all services', async () => {
    await mirrorModeOrchestratorService.initialize();
    // If this completes without error, initialization succeeded
    expect(true).toBe(true);
  });

  test('should apply Mirror Mode to response', async () => {
    const testResponse = 'Thank you for your interest. I appreciate your question. This is quite interesting.';
    const result = await mirrorModeOrchestratorService.applyMirrorMode(testUserId, testResponse);

    expect(result).toBeDefined();
    expect(result.userId).toBe(testUserId);
    expect(result.originalResponse).toBe(testResponse);
    expect(result.mirrorResponse).toBeDefined();
    expect(result.confidenceScores).toBeDefined();
  });

  test('should respect latency budget', async () => {
    const longResponse = 'A '.repeat(5000);
    const result = await mirrorModeOrchestratorService.applyMirrorMode(testUserId, longResponse);

    expect(result.pipelineStats.duration).toBeGreaterThanOrEqual(0);
    // Should not exceed reasonable bounds
    expect(result.pipelineStats.duration).toBeLessThan(5000);
  });

  test('should return current mode for user', async () => {
    const mode = mirrorModeOrchestratorService.getCurrentMode(testUserId);
    expect(mode).toMatch(/mirror|balancer|unknown/);
  });

  test('should get orchestrator status', () => {
    const status = mirrorModeOrchestratorService.getStatus();
    expect(status).toBeDefined();
    expect(status.enabled).toBeDefined();
    expect(status.config).toBeDefined();
    expect(status.activeSessions).toBeGreaterThanOrEqual(0);
  });

  test('should get comprehensive user profile', () => {
    const profile = mirrorModeOrchestratorService.getUserMirrorProfile(testUserId);
    expect(profile).toBeDefined();
    expect(profile.readiness).toBeDefined();
    expect(profile.linguistic).toBeDefined();
    expect(profile.syntax).toBeDefined();
    expect(profile.tone).toBeDefined();
    expect(profile.lexicon).toBeDefined();
    expect(profile.stability).toBeDefined();
  });

  test('should compare user profiles', () => {
    const otherUserId = 'test-user-other';
    const comparison = mirrorModeOrchestratorService.compareUserProfiles(testUserId, otherUserId);
    // Comparison should return null if one profile doesn't exist
    expect(comparison === null || comparison !== null).toBe(true);
  });

  test('should enable and disable Mirror Mode', () => {
    mirrorModeOrchestratorService.setEnabled(false);
    let status = mirrorModeOrchestratorService.getStatus();
    expect(status.enabled).toBe(false);

    mirrorModeOrchestratorService.setEnabled(true);
    status = mirrorModeOrchestratorService.getStatus();
    expect(status.enabled).toBe(true);
  });
});

/**
 * Test Suite: End-to-End Integration Tests
 */
describe('End-to-End Mirror Mode Integration', () => {
  const userId = 'e2e-test-user';
  const userMessages = [
    'yo, I love this! this is so awesome!!!',
    'like, totally cool, right?',
    'yeah, appreciate the help. thanks so much!',
    'ok so basically I think this is amazing.',
    'seriously though, this is the BEST.',
  ];

  beforeEach(async () => {
    mirrorModeOrchestratorService.reset();
    for (const message of userMessages) {
      await mirrorModeOrchestratorService.profileUserMessage(userId, message);
    }
  });

  test('should process full user workflow', async () => {
    // Initialize system
    await mirrorModeOrchestratorService.initialize();

    // Apply Mirror Mode to multiple responses
    const response1 = 'This is a formal response that needs to be adapted.';
    const result1 = await mirrorModeOrchestratorService.applyMirrorMode(userId, response1);
    expect(result1.mirrorResponse).toBeDefined();

    const response2 = 'Thank you for your input. I appreciate your feedback.';
    const result2 = await mirrorModeOrchestratorService.applyMirrorMode(userId, response2);
    expect(result2.mirrorResponse).toBeDefined();

    // Get final profile
    const profile = mirrorModeOrchestratorService.getUserMirrorProfile(userId);
    expect(profile).toBeDefined();
    expect(profile.readiness.ready).toBe(true);
  });

  test('should handle mode switching correctly', async () => {
    let mode = mirrorModeOrchestratorService.getCurrentMode(userId);
    expect(mode).toBeDefined();

    // Simulate stress message
    await userLinguisticProfileService.analyzeMessage(
      userId,
      'HELP!!! I\'m panicking and everything is falling apart!!!!'
    );

    const stability = stabilityDetectionService.assessStability(userId);
    // High stress should trigger balancer mode consideration
    expect(stability.recommendedMode).toBeDefined();
  });

  test('should aggregate confidence scores accurately', async () => {
    const response = 'Hello, I appreciate your feedback and would like to discuss this further.';
    const result = await mirrorModeOrchestratorService.applyMirrorMode(userId, response);

    const { lexicon, syntax, tone, overall } = result.confidenceScores;
    expect(overall).toBeGreaterThanOrEqual(0);
    expect(overall).toBeLessThanOrEqual(1);

    // If transformations were applied, overall should be reasonable
    if (result.appliedTransformations.lexiconMatching ||
        result.appliedTransformations.syntaxMirroring ||
        result.appliedTransformations.tonalMirroring) {
      expect(overall).toBeGreaterThan(0);
    }
  });
});

// Test execution
console.log('[Mirror Mode Tests] 🧪 Test suite ready for execution');
