# Hybrid-First SLM Orchestrator - Test Plan

## Overview

This document provides a comprehensive test plan for the hybrid-first SLM orchestrator implementation. Execute these tests once the development environment is properly set up.

## Pre-Test Checklist

- [ ] npm dependencies installed successfully (`npm install`)
- [ ] Development server starts without errors (`npm run dev`)
- [ ] Local model (Phi-3) downloads and initializes
- [ ] Browser console accessible for logging
- [ ] Network tab accessible for monitoring API calls

---

## Test Suite 1: Basic Orchestration

### Test 1.1: Simple Query (Local Execution)
**Objective**: Verify local SLM handles simple queries

**Steps**:
1. Open the application in browser
2. Wait for local model to initialize (check console for "Local Guardian ready")
3. Send a simple greeting: "Hello, how are you?"
4. Monitor console logs

**Expected Results**:
```
✅ [ChatContainer] 🤖 Getting orchestration decision from local SLM...
✅ [ChatContainer] Orchestration decision: {
     strategy: 'local',
     reasoning: 'Simple conversational query',
     confidence: 0.9+
   }
✅ [ChatContainer] Querying Local Guardian (Phi-3)...
✅ Response received in <500ms
✅ Cost: $0.00
```

**Success Criteria**:
- Strategy === 'local'
- Confidence >= 0.8
- No cloud API calls in Network tab
- Fast response (<500ms)

---

### Test 1.2: Factual Query (Local Execution)
**Objective**: Verify local model handles simple factual queries

**Steps**:
1. Send query: "What is the capital of France?"
2. Monitor console logs

**Expected Results**:
```
✅ Strategy: 'local'
✅ Confidence: 0.85-0.95
✅ Response: "Paris"
✅ Quality validation: passed
```

**Success Criteria**:
- Correct answer
- Local execution
- Quality score >= 0.7

---

### Test 1.3: Complex Coding Query (Cloud Delegation)
**Objective**: Verify orchestrator delegates complex queries to cloud

**Steps**:
1. Ensure Claude adapter is selected and API key configured
2. Send query: "Write a React component with TypeScript that implements a binary search tree with insert, delete, and in-order traversal methods."
3. Monitor console logs and network tab

**Expected Results**:
```
✅ [ChatContainer] Orchestration decision: {
     strategy: 'delegate',
     selectedModel: 'claude',
     reasoning: 'Complex coding task requiring detailed implementation',
     confidence: 0.3-0.5
   }
✅ [ChatContainer] Querying Anthropic (Claude)...
✅ Network tab shows call to anthropic API
✅ Response contains complete, working TypeScript code
```

**Success Criteria**:
- Strategy === 'delegate'
- selectedModel === 'claude'
- Confidence < 0.5 (knows it can't handle locally)
- Cloud API call made
- High-quality code response

---

## Test Suite 2: Privacy-First Routing

### Test 2.1: PII Detection - Email
**Objective**: Verify PII detection triggers local execution

**Steps**:
1. Send query with email: "My email is john.doe@example.com - can you help me?"
2. Monitor console logs

**Expected Results**:
```
✅ [ChatContainer] 🔒 PII detected - forcing local model
✅ Orchestration decision: {
     strategy: 'local',
     reasoning: 'PII detected - privacy-first routing',
     confidence: 1.0,
     requiresPrivacy: true
   }
✅ [ChatContainer] Querying Local Guardian (Phi-3)...
✅ No cloud API calls in Network tab
```

**Success Criteria**:
- PII detected correctly
- Strategy forced to 'local'
- requiresPrivacy === true
- Zero cloud exposure
- No API calls in Network tab

---

### Test 2.2: PII Detection - SSN
**Objective**: Verify SSN triggers privacy protection

**Steps**:
1. Send query: "I need help, my SSN is 123-45-6789"
2. Monitor console and network

**Expected Results**:
```
✅ PII detected: true
✅ Strategy: 'local' (forced)
✅ No cloud API calls
✅ Response handled locally
```

**Success Criteria**:
- SSN pattern detected
- Local execution enforced
- Privacy maintained

---

### Test 2.3: PII Detection - Phone Number
**Objective**: Verify phone number detection

**Steps**:
1. Send query: "Call me at (555) 123-4567"
2. Monitor console

**Expected Results**:
```
✅ PII detected
✅ Local execution
✅ Privacy preserved
```

---

## Test Suite 3: Quality Gates

### Test 3.1: Quality Gate Pass (Local Response Accepted)
**Objective**: Verify quality validator accepts good local responses

**Steps**:
1. Send query: "Explain what TypeScript is in one sentence"
2. Monitor console for quality validation logs

**Expected Results**:
```
✅ [LocalSLMOrchestrator] Quality validation: {
     passed: true,
     score: 0.75+,
     recommendation: 'accept',
     reasoning: 'All quality checks passed'
   }
✅ Local response delivered to user
✅ No escalation to cloud
```

**Success Criteria**:
- Quality validation runs
- Overall score >= 0.7
- Passed === true
- No cloud escalation

---

### Test 3.2: Quality Gate Fail (Escalation to Cloud)
**Objective**: Verify low-quality local responses escalate to cloud

**Steps**:
1. Send a medium-complexity query that local model struggles with
2. Example: "Explain the difference between event capturing and event bubbling in JavaScript DOM, with code examples"
3. Monitor console for quality validation and escalation

**Expected Results**:
```
✅ Strategy: 'hybrid' (local with validation)
✅ Local response generated
✅ [LocalSLMOrchestrator] Quality validation: {
     passed: false,
     score: 0.5-0.69,
     recommendation: 'escalate',
     reasoning: 'low completeness (0.55), low accuracy (0.60)'
   }
✅ [LocalSLMOrchestrator] Quality gate failed, escalating to cloud
✅ Cloud query initiated
✅ Final response from cloud model
```

**Success Criteria**:
- Local response attempted first
- Quality score < 0.7
- Automatic escalation triggered
- Cloud provides better response
- User receives high-quality answer

---

### Test 3.3: Quality Validation Scoring
**Objective**: Verify quality validator scoring is accurate

**Steps**:
1. Send query: "What is React?"
2. Check quality validation breakdown

**Expected Results**:
```
✅ Quality validation: {
     scores: {
       coherence: 0.8+,    // Flows well
       completeness: 0.75+, // Answers the question
       relevance: 0.85+,    // On-topic
       accuracy: 0.75+,     // Factually correct
       safety: 1.0         // No harmful content
     },
     overallScore: 0.78+
   }
```

**Success Criteria**:
- All 5 factors scored
- Scores make sense for response quality
- Overall score is weighted average

---

## Test Suite 4: Orchestration Strategies

### Test 4.1: Local Strategy
**Objective**: Test pure local execution

**Steps**:
1. Send simple queries that trigger local strategy
2. Examples:
   - "Hi"
   - "What's 2+2?"
   - "Define 'recursion'"

**Expected Results**:
```
✅ Strategy: 'local'
✅ Fast responses (<300ms)
✅ Cost: $0.00
✅ No cloud calls
```

---

### Test 4.2: Delegate Strategy
**Objective**: Test cloud delegation

**Steps**:
1. Send complex queries requiring cloud expertise
2. Examples:
   - "Write a production-ready authentication system in Node.js"
   - "Explain quantum entanglement"
   - "Create a detailed business plan for a SaaS startup"

**Expected Results**:
```
✅ Strategy: 'delegate'
✅ selectedModel: 'claude' or 'gpt4' or 'gemini'
✅ Reasoning explains why cloud is needed
✅ High-quality response
```

---

### Test 4.3: Hybrid Strategy
**Objective**: Test local-first with cloud validation

**Steps**:
1. Send medium-complexity queries
2. Examples:
   - "Explain the MVC pattern"
   - "What are React hooks?"
   - "How does DNS work?"

**Expected Results**:
```
✅ Strategy: 'hybrid'
✅ Confidence: 0.5-0.8
✅ Local response generated first
✅ Quality validation runs
✅ Either accepted or escalated based on quality
```

---

### Test 4.4: Iterative Strategy
**Objective**: Test progressive enhancement

**Steps**:
1. Send query that benefits from refinement
2. Monitor multi-stage execution

**Expected Results**:
```
✅ Strategy: 'iterative'
✅ Local attempt first
✅ Quality check
✅ Refinement if needed
```

---

## Test Suite 5: Model Selection

### Test 5.1: Claude for Coding
**Objective**: Verify orchestrator selects Claude for code tasks

**Steps**:
1. Send coding query: "Implement a linked list in Python"
2. Check selected model

**Expected Results**:
```
✅ selectedModel: 'claude'
✅ reasoning: 'Coding task, Claude excels at implementation'
```

---

### Test 5.2: GPT-4 for Creative
**Objective**: Verify GPT-4 selected for creative tasks

**Steps**:
1. Send creative query: "Write a short story about AI and humanity"
2. Check selected model

**Expected Results**:
```
✅ selectedModel: 'gpt4'
✅ reasoning: 'Creative writing task'
```

---

### Test 5.3: Gemini for Math
**Objective**: Verify Gemini selected for mathematical tasks

**Steps**:
1. Send math query: "Solve this calculus problem: ∫(3x² + 2x + 1)dx"
2. Check selected model

**Expected Results**:
```
✅ selectedModel: 'gemini'
✅ reasoning: 'Mathematical calculation'
```

---

## Test Suite 6: Metrics & Observability

### Test 6.1: Orchestration Metrics
**Objective**: Verify metrics are tracked correctly

**Steps**:
1. Open browser console
2. Execute in console:
```javascript
const orchestrator = window.orchestratorService ||
  (await import('/src/services/local-slm-orchestrator.service.ts')).LocalSLMOrchestratorService.getInstance();
const metrics = orchestrator.getMetrics();
console.table(metrics);
```

**Expected Results**:
```
✅ Metrics object contains:
   - totalQueries: number
   - localHandled: number
   - delegated: number
   - hybrid: number
   - escalations: number
   - averageConfidence: 0.0-1.0
   - averageLatency: number (ms)
   - totalCost: number (USD)
   - cacheHitRate: 0.0-1.0
   - qualityGatePassRate: 0.0-1.0
```

**Success Criteria**:
- All metrics populated
- Numbers make sense
- Running averages calculated correctly

---

### Test 6.2: Governance Logging
**Objective**: Verify orchestration decisions logged to database

**Steps**:
1. Send several queries
2. Open browser console
3. Query governance log:
```javascript
const db = await (await import('/src/db/index.ts')).db;
const logs = await db.execute(
  `SELECT * FROM governance_log
   WHERE event_type = 'orchestration_decision'
   ORDER BY timestamp DESC
   LIMIT 10`
);
console.table(logs);
```

**Expected Results**:
```
✅ Governance logs contain:
   - timestamp
   - event_type: 'orchestration_decision'
   - metadata with:
     - decision.strategy
     - decision.confidence
     - decision.selectedModel
     - decision.reasoning
     - result.latency
     - result.cost
     - result.escalated
```

---

### Test 6.3: Console Logging
**Objective**: Verify comprehensive console logging

**Steps**:
1. Open browser console with verbose logging
2. Send a query
3. Review console output

**Expected Results**:
```
✅ Logs visible:
   [ChatContainer] 🤖 Getting orchestration decision from local SLM...
   [ChatContainer] Orchestration decision: {...}
   [ChatContainer] Querying [Model Name]...
   [LocalSLMOrchestrator] Quality validation: {...}
   [ChatContainer] Response completed
```

**Success Criteria**:
- Clear, emoji-annotated logs
- Decision reasoning visible
- Quality validation results shown
- Performance metrics logged

---

## Test Suite 7: Edge Cases

### Test 7.1: Empty Query
**Objective**: Handle empty/invalid input gracefully

**Steps**:
1. Send empty query: ""
2. Monitor behavior

**Expected Results**:
```
✅ Graceful handling
✅ No errors
✅ Appropriate response or validation message
```

---

### Test 7.2: Very Long Query
**Objective**: Handle queries exceeding context limits

**Steps**:
1. Send very long query (>4000 tokens)
2. Monitor orchestration decision

**Expected Results**:
```
✅ Recognizes context limit issue
✅ Delegates to cloud model with larger context
✅ selectedModel: 'gemini' (1M context) or 'claude' (200K context)
```

---

### Test 7.3: Adapter Unavailable
**Objective**: Handle missing/failed adapters

**Steps**:
1. Ensure local model not initialized
2. Send query
3. Check fallback behavior

**Expected Results**:
```
✅ Fallback to available adapter
✅ Error logged but not thrown
✅ User receives response
```

---

### Test 7.4: Orchestration Error
**Objective**: Handle orchestration failures gracefully

**Steps**:
1. Trigger orchestration error (e.g., local model crash)
2. Monitor fallback

**Expected Results**:
```
✅ [ChatContainer] Orchestration failed, using selected adapter
✅ Fallback to Claude by default
✅ User receives response
✅ No UX disruption
```

---

## Test Suite 8: Performance

### Test 8.1: Latency Measurement
**Objective**: Verify performance targets

**Test Queries & Expected Latency**:
1. Simple local: <300ms
2. Hybrid (quality pass): <600ms
3. Hybrid (escalation): <2500ms
4. Cloud delegate: <2000ms

**Measurement**:
```javascript
// In console:
const start = performance.now();
// Send message
// On response received:
const latency = performance.now() - start;
console.log(`Latency: ${latency.toFixed(0)}ms`);
```

---

### Test 8.2: Cost Tracking
**Objective**: Verify cost estimation accuracy

**Steps**:
1. Send 10 queries (mix of local and cloud)
2. Check metrics:
```javascript
const metrics = orchestrator.getMetrics();
console.log(`Total cost: $${metrics.totalCost.toFixed(4)}`);
console.log(`Average cost per query: $${(metrics.totalCost / metrics.totalQueries).toFixed(4)}`);
```

**Expected Results**:
```
✅ Local queries: $0.00
✅ Cloud queries: $0.001-0.01
✅ Average: $0.001-0.003 (should be lower than pure cloud)
```

---

### Test 8.3: Cache Effectiveness
**Objective**: Verify response caching works

**Steps**:
1. Send query: "What is TypeScript?"
2. Wait for response
3. Send EXACT same query again
4. Monitor console and latency

**Expected Results**:
```
✅ First query: normal latency, cache miss
✅ Second query: <50ms, cache hit
✅ [ChatContainer] ✅ Cache hit! Using cached response
✅ No orchestration decision made (cache bypass)
```

---

## Test Suite 9: User Experience

### Test 9.1: Transparency
**Objective**: Verify user sees which model was used

**Steps**:
1. Send query
2. Check UI for model indicator
3. Look for trace data in message

**Expected Results**:
```
✅ UI shows "Model: Phi-3" or "Model: Claude" etc.
✅ Trace data includes orchestration decision
✅ User can see why routing decision was made
```

---

### Test 9.2: Stop/Abort
**Objective**: Verify humanity override works during orchestration

**Steps**:
1. Send long query to cloud model
2. Click "Stop" button immediately
3. Monitor behavior

**Expected Results**:
```
✅ Query aborted successfully
✅ No orphaned requests
✅ UI returns to ready state
```

---

## Test Suite 10: Regression Testing

### Test 10.1: Existing Features Still Work
**Objective**: Verify orchestrator doesn't break existing functionality

**Tests**:
- [ ] Conversation switching works
- [ ] Image attachments work
- [ ] Document parsing works
- [ ] Socratic mode triggers correctly
- [ ] PII anonymization still works (for cloud)
- [ ] Thought streams extracted
- [ ] Memory bridge records interactions
- [ ] Entity extraction functions

---

## Performance Benchmarks

After running all tests, calculate these benchmarks:

### Benchmark 1: Local Handling Rate
**Target**: ≥80%

```
Local Handling Rate = (localHandled / totalQueries) × 100%
```

### Benchmark 2: Average Latency
**Target**: <800ms

```
Average Latency = sum(all query latencies) / totalQueries
```

### Benchmark 3: Cost Reduction
**Target**: ≥60% vs cloud-only

```
Cost Reduction = (cloudOnlyCost - actualCost) / cloudOnlyCost × 100%
```

### Benchmark 4: Quality Gate Pass Rate
**Target**: ≥70%

```
Quality Pass Rate = (qualityGatePasses / qualityGateValidations) × 100%
```

### Benchmark 5: Privacy Compliance
**Target**: 100%

```
Privacy Compliance = (PII queries handled locally / total PII queries) × 100%
```

---

## Success Criteria Summary

The hybrid-first orchestrator implementation is considered **successful** if:

- ✅ **80%+ local handling** (vs ~40% baseline)
- ✅ **Latency <800ms** average (vs ~1500ms baseline)
- ✅ **Cost reduction ≥60%** vs cloud-only
- ✅ **Quality maintained** (user satisfaction ≥4.5/5)
- ✅ **100% PII privacy** (zero cloud exposure)
- ✅ **Quality gate pass rate ≥70%**
- ✅ **Zero regressions** in existing features
- ✅ **Graceful error handling** for all edge cases

---

## Testing Checklist

### Pre-Flight
- [ ] Dependencies installed
- [ ] Dev server running
- [ ] Local model initialized
- [ ] API keys configured (if testing cloud)
- [ ] Browser console open
- [ ] Network tab open

### Core Tests
- [ ] Test Suite 1: Basic Orchestration
- [ ] Test Suite 2: Privacy-First Routing
- [ ] Test Suite 3: Quality Gates
- [ ] Test Suite 4: Orchestration Strategies
- [ ] Test Suite 5: Model Selection
- [ ] Test Suite 6: Metrics & Observability
- [ ] Test Suite 7: Edge Cases
- [ ] Test Suite 8: Performance
- [ ] Test Suite 9: User Experience
- [ ] Test Suite 10: Regression Testing

### Benchmarks
- [ ] Calculate local handling rate
- [ ] Measure average latency
- [ ] Compute cost reduction
- [ ] Check quality gate pass rate
- [ ] Verify privacy compliance

### Documentation
- [ ] Document any issues found
- [ ] Note actual vs expected results
- [ ] Record performance metrics
- [ ] Update README if needed

---

## Reporting Template

```markdown
# Hybrid Orchestrator Test Results

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Browser, OS]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Warnings: W

## Benchmarks
- Local Handling: X%
- Avg Latency: Xms
- Cost Reduction: X%
- Quality Pass Rate: X%
- Privacy Compliance: X%

## Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs actual

## Recommendations
[Any improvements or fixes needed]

## Conclusion
[Pass/Fail with reasoning]
```

---

**Test Plan Version**: 1.0
**Last Updated**: 2025-11-23
**Status**: Ready for Execution
