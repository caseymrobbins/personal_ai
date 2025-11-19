# Mirror Mode Documentation

## Overview

Mirror Mode (Agent 1 - The Mirror) is the first of two complementary subsystems in the enhanced SML Guardian agent. It provides adaptive linguistic resonance by mirroring the user's natural communication patterns to create authentic, personalized responses.

**Core Philosophy**: When users are stable and grounded, responding in their own linguistic style creates deeper connection and more effective communication.

---

## System Architecture

### Service Layer

Mirror Mode consists of five interconnected services that work in concert:

```
User Message
    ↓
[Linguistic Profile Analyzer] → Extract patterns
    ↓
[Lexicon Matcher] → Apply vocabulary
    ↓
[Syntax Mirrorer] → Adjust structure
    ↓
[Tonal Resonance] → Match emotions
    ↓
[Stability Detector] → Check readiness
    ↓
[Orchestrator] → Decide: Mirror or Balancer?
```

### 1. User Linguistic Profile Analyzer (`user-linguistic-profile.service.ts`)

**Purpose**: Builds a comprehensive linguistic profile from user messages.

**Key Metrics**:
- **Vocabulary**: Common words, slang, acronyms, technical terms, unique words
- **Syntax**: Average sentence length, complexity score, clause patterns
- **Formatting**: Casing preferences, punctuation style, line break frequency
- **Style**: Dominant communication style (casual, formal, technical, playful)

**Confidence Growth**:
- 1-2 messages: 0% confidence (learning)
- 3-5 messages: 50% confidence (emerging pattern)
- 10+ messages: 80-90% confidence (strong pattern)
- 20+ messages: 95%+ confidence (consistent style)

**Key Methods**:
```typescript
await analyzeMessage(userId, message)  // Add message to profile
getProfile(userId)                      // Get full profile object
getTopWords(userId, limit)             // Most frequently used words
getFormattingPreferences(userId)       // Casing, punctuation, spacing
getSyntaxCharacteristics(userId)       // Sentence length, complexity
```

**Example**: User says "yo, I totally love this, thanks so much!" over multiple interactions:
- Vocabulary: "yo" (slang), "totally" (intensifier), common abbreviations
- Syntax: Mixed short and medium sentences, casual connectors
- Formatting: Commas, exclamations, lowercase-first sentences
- Style: Casual + enthusiastic

---

### 2. Lexicon Matching Engine (`lexicon-matching-engine.service.ts`)

**Purpose**: Replaces or augments words in AI responses to match user vocabulary.

**Transformation Categories**:
1. **Vocabulary Variants**: hello→hi, thank→thanks, okay→ok
2. **Slang Terms**: "really"→"rlly", "because"→"cuz"
3. **Acronyms**: "artificial intelligence"→"AI", "API"
4. **Technical Terms**: How user expresses technical concepts
5. **Phrase Replacements**: User's preferred multi-word expressions

**Confidence Scoring**:
- Individual replacements: 0.7-0.85 confidence
- Overall confidence: Average of applied replacements
- Requires minimum 2 messages for activation

**Key Methods**:
```typescript
await matchLexicon(userId, text)       // Apply vocabulary matching
getLexiconStats(userId)                // Vocabulary statistics
compareLexicons(userId1, userId2)      // Compare users' vocabularies
```

**Example Transformation**:
- Original: "I appreciate your help because this was confusing."
- Profile: User prefers "thanks", "bc", casual tone
- Matched: "thanks for the help bc I was totally confused."

---

### 3. Syntax Mirroring Service (`syntax-mirroring.service.ts`)

**Purpose**: Adjusts sentence structure, length, and complexity to match user patterns.

**Metrics**:
- **Sentence Length**: Distribution of short/medium/long/very-long sentences
- **Complexity**: Word length (30%) + Sentence length (30%) + Clause complexity (20%) + Parenthetical expressions (20%)
- **Punctuation**: Patterns of commas, semicolons, dashes, ellipsis
- **Formatting**: Paragraph breaks, casing, spacing preferences

**Sentence Length Categories**:
- Very Short: 1-5 words
- Short: 6-10 words
- Medium: 11-20 words
- Long: 21-40 words
- Very Long: 40+ words

**Confidence Scoring**:
- Based on user profile consistency
- Requires minimum 3 messages for activation

**Key Methods**:
```typescript
await mirrorSyntax(userId, text)       // Adjust sentence structure
getSyntaxStats(userId)                 // Syntax metrics
compareSyntax(userId1, userId2)        // Compare users' styles
checkSyntaxMatch(userId, text)         // Evaluate match quality
```

**Example Transformation**:
- Original: "Here are the reasons why this approach works well and should be considered."
- User Profile: Average 8-word sentences, prefers simple structures
- Mirrored: "This works well. Here's why. You should consider it."

---

### 4. Tonal Resonance Service (`tonal-resonance.service.ts`)

**Purpose**: Detects and applies user's emotional tone and energy level.

**Key Dimensions**:
1. **Energy Level**: excited (0.7-1.0) → casual (0.4-0.7) → tired (0.0-0.3)
2. **Formality**: Formal (0.6-1.0) → Casual (0.2-0.6) → Playful (varies)
3. **Confidence**: High (0.7+) → Moderate (0.4-0.7) → Hesitant (0.0-0.3)
4. **Sentiment**: Positive (+0.5 to +1.0) → Neutral (±0.2) → Negative (-0.5 to -1.0)
5. **Stability**: Grounded (0.7+) → Stable (0.4-0.7) → Unstable (0.0-0.3)

**Emotional Markers**:
- **Excitement**: Multiple exclamations, ALL CAPS words, positive adjectives
- **Hesitation**: Question marks, ellipsis, uncertainty words
- **Confidence**: Definitive language, assertive markers
- **Formality**: Transitional phrases (however, furthermore), passive voice
- **Dissociation**: Grounding loss markers (floating, numb, unreal)

**Tonal Registers**:
- Academic: High formality, complex structures
- Professional: Moderate formality, organized
- Casual: Low formality, conversational
- Playful: Low formality, high energy
- Intimate: Low formality, personal

**Key Methods**:
```typescript
analyzeTonalProfile(userId)            // Get complete tonal analysis
applyTonalMirroring(userId, text)      // Adjust text tone
getTonalStats(userId)                  // Tone metrics
compareTonalProfiles(userId1, userId2) // Compare users' tones
checkToneMatch(userId, text)           // Evaluate tone quality
```

**Example Transformation**:
- Original: "This is definitely a good approach to consider."
- User Profile: High energy, excited tone, positive sentiment
- Mirrored: "OMG, this is SUCH a good approach!!! Love it!!!"

---

### 5. Stability Detection Service (`stability-detection.service.ts`)

**Purpose**: Assesses user's emotional and cognitive stability to determine mode.

**Stability Factors** (weighted):
1. **Emotional Stability** (25%): Sentiment consistency, emotional markers
2. **Cognitive Stability** (25%): Clarity indicators vs. confusion markers
3. **Conversational Stability** (15%): Topic coherence, message consistency
4. **Stress Level** (20%): Inverse - high stress = low stability
5. **Grounding Level** (15%): Reality-based language vs. dissociation

**Thresholds**:
- **Mirror Mode**: Overall score > 0.65 + emotional > 0.6 + grounded > 0.5 + stress < 0.4
- **Balancer Mode**: Overall < 0.55 OR emotional < 0.45 OR grounded < 0.4 OR stress > 0.6
- **Neutral/Gray Zone**: All other cases (default to Mirror)

**Stability Scoring**:
- 0.0-0.3: Critical - Needs Balancer Mode support
- 0.3-0.65: Warning - Monitor closely, consider Balancer
- 0.65-1.0: Stable - Mirror Mode active

**Trend Analysis**:
- Improving: Positive slope in recent history
- Declining: Negative slope in recent history
- Stable: No significant trend

**Key Methods**:
```typescript
assessStability(userId)                // Single stability assessment
generateStabilityReport(userId)        // Detailed report with recommendations
shouldSwitchMode(userId, currentMode)  // Check if mode change needed
getStabilityTrend(userId)             // Trend analysis
```

**Example Logic**:
- User: excited tone, high energy, clear thinking → Mirror Mode
- User: anxious language, stressed markers, overwhelmed → Balancer Mode
- User: neutral tone, moderate energy, coherent → Mirror Mode

---

### 6. Mirror Mode Orchestrator (`mirror-mode-orchestrator.service.ts`)

**Purpose**: Central coordination of all services into unified response pipeline.

**Response Pipeline**:
1. **Profile Check**: Ensure user has sufficient data
2. **Stability Assessment**: Determine mode recommendation
3. **Transformation Priority**: Apply in configured order (default: Lexicon → Syntax → Tone)
4. **Confidence Aggregation**: Combine scores from all services
5. **Latency Enforcement**: Respect 100ms budget
6. **Result Merging**: Create final transformed response

**Configuration**:
```typescript
interface MirrorModeConfig {
  enabled: boolean;                      // Master on/off switch
  minConfidenceThreshold: number;        // 0.4 default
  minProfileDataThreshold: number;       // 5 messages default
  latencyBudget: number;                 // 100ms default
  transformationPriority: string[];      // Order of transformations
  useStabilityDetection: boolean;        // Enable mode switching
  autoModeSwitching: boolean;            // Automatic vs. manual mode
}
```

**Key Methods**:
```typescript
await initialize()                      // Initialize all services
await applyMirrorMode(userId, response) // Transform response
getCurrentMode(userId)                  // Get active mode
getStatus()                            // System status report
getUserMirrorProfile(userId)           // Comprehensive user profile
compareUserProfiles(id1, id2)          // Profile comparison
```

**Session Management**:
- Tracks active users and their modes
- 1-hour session timeout
- Performance metrics per user
- Trend tracking across sessions

---

## Usage Guide

### Initialization

```typescript
import { mirrorModeOrchestratorService } from './services/mirror-mode-orchestrator.service';

// Initialize all services
await mirrorModeOrchestratorService.initialize();
```

### Processing User Messages

```typescript
// When user sends a message, update their profile
await mirrorModeOrchestratorService.profileUserMessage(userId, userMessage);
```

### Transforming Responses

```typescript
// Before sending AI response, apply Mirror Mode
const result = await mirrorModeOrchestratorService.applyMirrorMode(
  userId,
  aiGeneratedResponse
);

// Use the transformed response
const finalResponse = result.mirrorResponse;

// Check what was applied
console.log('Applied transformations:', result.appliedTransformations);
console.log('Confidence scores:', result.confidenceScores);
console.log('Active mode:', result.modeActive);
```

### Monitoring System

```typescript
// Check overall system status
const status = mirrorModeOrchestratorService.getStatus();
console.log(`Active sessions: ${status.activeSessions}`);
console.log(`System enabled: ${status.enabled}`);

// Get comprehensive user profile
const profile = mirrorModeOrchestratorService.getUserMirrorProfile(userId);
console.log(`Current mode: ${profile.currentMode}`);
console.log(`Stability: ${profile.stability.overallStabilityScore}`);
console.log(`Readiness: ${profile.readiness.ready}`);

// Compare two users
const comparison = mirrorModeOrchestratorService.compareUserProfiles(userId1, userId2);
console.log(`Similarity: ${comparison.similarityScore}`);
```

### Configuration

```typescript
// Adjust thresholds and priorities
mirrorModeOrchestratorService.updateConfig({
  minConfidenceThreshold: 0.5,
  latencyBudget: 150,
  transformationPriority: ['tone', 'lexicon', 'syntax'],
});

// Enable/disable system
mirrorModeOrchestratorService.setEnabled(false);
```

---

## Confidence Scoring

Each transformation component generates confidence scores (0.0-1.0):

### Lexicon Matching
- Confidence represents how certain we are about vocabulary replacements
- Higher with more messages and consistent word usage
- Penalized for ambiguous replacements

### Syntax Mirroring
- Confidence based on consistency of sentence length patterns
- Higher with 5+ messages
- Penalized for high variation in user's patterns

### Tonal Resonance
- Confidence based on emotional marker consistency
- Higher with 5+ messages
- Penalized for erratic emotional expression

### Overall Confidence
- Average of applied transformations
- Only counted if confidence > threshold (0.4 default)
- Used to decide whether to apply transformation

---

## Performance Considerations

### Latency Budget (100ms default)
- Lexicon matching: ~10-15ms
- Syntax mirroring: ~15-20ms
- Tonal resonance: ~20-25ms
- Orchestration overhead: ~5-10ms
- **Total**: ~50-70ms typical (well under budget)

### Memory Usage
- Per-user profile: ~2-5KB
- 1000 users: ~2-5MB
- Minimal impact on system memory

### Accuracy vs. Data
- 3 messages: Basic patterns emerging
- 5 messages: Good accuracy (80%)
- 10 messages: Very good accuracy (90%)
- 20+ messages: Excellent accuracy (95%+)

---

## Integration Points

### With Balancer Mode (Agent 2)
Mirror Mode and Balancer Mode are mutually exclusive based on stability:
- **Stable users**: Use Mirror Mode (resonance)
- **Unstable users**: Use Balancer Mode (support)
- **Transitions**: Smooth switching based on stability trends

### With SML Guardian Core
Mirror Mode integrates as a response filter:
```typescript
// Standard response flow
const baseResponse = await generateResponse(userId, userMessage);
const finalResponse = await mirrorModeOrchestratorService.applyMirrorMode(userId, baseResponse);
return finalResponse.mirrorResponse;
```

### With Dream Cycle (Phase 7)
Linguistic profiles are used by Dream Cycle for:
- Evolution tracking (how user's style changes over time)
- Counterfactual scenarios
- Memory consolidation patterns

---

## Testing

Comprehensive test suite included in `src/tests/mirror-mode.test.ts`:

```bash
npm test -- mirror-mode.test.ts
```

Test categories:
- Linguistic Profile Service (5 tests)
- Lexicon Matching Engine (4 tests)
- Syntax Mirroring Service (4 tests)
- Tonal Resonance Service (5 tests)
- Stability Detection Service (5 tests)
- Mirror Mode Orchestrator (8 tests)
- End-to-End Integration (3 tests)

**Total**: 34 comprehensive tests

---

## Dashboard

Mirror Mode Dashboard (`src/components/mirror-mode-dashboard.tsx`) provides:

### System Overview
- System status (enabled/disabled)
- Active sessions count
- Monitored users count

### User Profile Views
- Current mode (Mirror/Balancer)
- Profile readiness percentage
- Stability metrics with visual meters
- Linguistic profile data
- Performance metrics

### Stability Assessment
- Overall stability score
- Emotional stability
- Cognitive clarity
- Stress level (inverse)
- Grounding level
- Trend analysis

### Real-time Monitoring
- Updates every 5 seconds
- Per-user performance metrics
- Latency tracking
- Success rate monitoring

---

## Best Practices

### 1. Sufficient Data Before Activation
- Wait for 5+ messages before heavy mirroring
- Early messages may be misleading
- Confidence grows logarithmically

### 2. Monitor Stability
- Frequent stability checks for unstable users
- Consider Balancer Mode activation
- Track stability trends

### 3. Respect User Preferences
- Allow users to opt-out of Mirror Mode
- Provide transparency about transformations
- Make adjustments based on feedback

### 4. Performance Monitoring
- Track latency metrics regularly
- Adjust config based on performance
- Monitor confidence trends

### 5. Privacy Considerations
- Keep all data local
- No external transmission of profiles
- Clear data retention policies
- User access to their own data

---

## Troubleshooting

### Low Confidence Scores
**Problem**: Transformations have <0.5 confidence
**Solution**:
- Collect more user messages (5+ preferred)
- Check if user has inconsistent patterns
- Reduce confidence threshold in config

### Mirror Mode Not Activating
**Problem**: Mode shows "off" or "balancer"
**Causes**:
- Insufficient profile data (< 5 messages)
- User instability detected
- System disabled
**Solution**: Check stability report and collect more data

### High Latency
**Problem**: Transformations exceed 100ms
**Solution**:
- Reduce transformation priority list
- Disable least important service
- Increase latency budget

### Inaccurate Transformations
**Problem**: Vocabulary/syntax changes don't match user
**Solution**:
- Provide feedback to improve patterns
- Collect more diverse user messages
- Review confidence thresholds

---

## Future Enhancements

1. **Multi-language Support**: Extend to non-English users
2. **Cultural Awareness**: Account for cultural communication styles
3. **Context Sensitivity**: Adjust mirroring based on conversation context
4. **User Feedback Loop**: Learn from user reactions to transformations
5. **Advanced Linguistics**: NLP-based sentiment and entity analysis
6. **A/B Testing**: Test which transformations users prefer
7. **Export/Import**: Allow users to export/import profiles

---

## Version History

- **v1.0.0** (Current): Initial Mirror Mode implementation
  - 5 core services
  - Stability detection
  - Orchestrator integration
  - Dashboard UI
  - Comprehensive testing

---

## Support & Feedback

For issues, feature requests, or feedback:
1. Check troubleshooting section
2. Review test cases for expected behavior
3. Enable debug logging
4. Create issue with reproduction steps

---

**Last Updated**: 2025-11-18
**Status**: Production Ready
