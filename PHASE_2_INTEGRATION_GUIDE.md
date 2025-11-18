# Phase 2: Interaction Loop Integration Guide

## Overview

This guide shows how to integrate the Phase 1 Cognitive Core with the existing Interaction Loop in ChatContainer.tsx.

## What is the Interaction Memory Bridge?

The **Interaction Memory Bridge** (`interaction-memory-bridge.service.ts`) sits between:
- **ChatContainer** (User interaction, messages)
- **Cognitive Core** (Working memory, LTM, KB, goals)

It automatically:
1. Creates working memory tasks for conversations
2. Records user messages and agent responses
3. Extracts entities for knowledge base population
4. Links conversations to relevant goals
5. Generates insights for user modeling

## Integration Points

### 1. ChatContainer.tsx - Database Initialization

**Location**: Lines 77-121 (first useEffect)

**Add after existing initialization**:
```typescript
// Initialize cognitive bridge
await interactionMemoryBridgeService.initialize();
console.log('[ChatContainer] Cognitive bridge initialized');

// Initialize cognitive core services if not already done
if (!workingMemoryService.initialized) {
  await workingMemoryService.initialize();
}
if (!entityExtractorService.initialized) {
  await entityExtractorService.initialize();
}
if (!goalManagementService.initialized) {
  await goalManagementService.initialize();
}
```

### 2. ChatContainer.tsx - When Conversation Created

**Location**: Lines 68-74 (createNewConversation)

**Add**:
```typescript
const createNewConversation = useCallback(() => {
  const newConv = dbService.createConversation('New Conversation');

  // NEW: Initialize cognitive memory for this conversation
  interactionMemoryBridgeService.onConversationCreated(
    newConv.id,
    'New Conversation'
  ).catch(err => console.warn('Failed to initialize conversation memory:', err));

  loadConversations();
  switchToConversation(newConv);
  console.log(`[ChatContainer] Created new conversation: ${newConv.id}`);
}, [loadConversations, switchToConversation]);
```

### 3. ChatContainer.tsx - When Conversation Switched

**Location**: Lines 56-66 (switchToConversation)

**Add**:
```typescript
const switchToConversation = useCallback((conversation: Conversation) => {
  setCurrentConversation(conversation);
  const history = dbService.getConversationHistory(conversation.id);
  setMessages(history);

  // NEW: Activate this conversation in memory bridge
  if (!interactionMemoryBridgeService.getConversationContext(conversation.id)) {
    interactionMemoryBridgeService.onConversationCreated(
      conversation.id,
      conversation.title
    ).catch(err => console.warn('Failed to initialize conversation memory:', err));
  }

  console.log(`[ChatContainer] Switched to conversation: ${conversation.id}`);
  if (window.innerWidth < 1024) {
    setSidebarOpen(false);
  }
}, []);
```

### 4. ChatContainer.tsx - Record User Message

**Location**: Lines 193-201 (after user message is added to DB)

**Add after STEP 1.6 (document attachment)**:
```typescript
// NEW STEP 2.5: Record in cognitive memory
try {
  await interactionMemoryBridgeService.recordMessage(
    currentConversation.id,
    'user',
    content,
    {
      hasAttachments: (imageFiles?.length || 0) + (documentFiles?.length || 0) > 0,
      attachmentCount: (imageFiles?.length || 0) + (documentFiles?.length || 0),
    }
  );
} catch (error) {
  console.warn('[ChatContainer] Failed to record user message in cognitive memory:', error);
  // Don't fail the conversation if cognitive recording fails
}
```

**Location**: After "setMessages(prev => [...prev, userMessage])" (around line 243)

### 5. ChatContainer.tsx - Record Agent Response

**Location**: Lines 350-400 (after response is generated and stored)

**Find this code** (around line 350+):
```typescript
const assistantMessage: ChatMessage = {
  id: assistantMessageId,
  conversation_id: currentConversation.id,
  role: 'assistant',
  content: assistantMessageContent,
  module_used: selectedAdapterId,
  trace_data: JSON.stringify(traceData),
  timestamp: Date.now(),
};

setMessages(prev => [...prev, assistantMessage]);
```

**Add after setMessages**:
```typescript
// NEW: Record agent response in cognitive memory
try {
  await interactionMemoryBridgeService.recordMessage(
    currentConversation.id,
    'assistant',
    assistantMessageContent,
    {
      moduleUsed: selectedAdapterId,
    }
  );
} catch (error) {
  console.warn('[ChatContainer] Failed to record agent message in cognitive memory:', error);
  // Don't fail the conversation
}
```

### 6. ChatContainer.tsx - When Conversation Ends

**Add a new method**:
```typescript
// Handle conversation completion
const handleConversationComplete = useCallback(async () => {
  if (!currentConversation) return;

  try {
    // Evaluate goals for this conversation
    const relatedGoals = await interactionMemoryBridgeService.evaluateConversationGoals(
      currentConversation.id
    );

    console.log(`[ChatContainer] Conversation complete with ${relatedGoals.length} related goals`);

    // Mark conversation as complete in memory
    await interactionMemoryBridgeService.onConversationCompleted(
      currentConversation.id
    );
  } catch (error) {
    console.error('[ChatContainer] Failed to complete conversation:', error);
  }
}, [currentConversation]);
```

**Call when user archives/closes conversation**

## Integration Code Template

Here's a minimal example showing the key integration points:

```typescript
import { interactionMemoryBridgeService } from '../../services/interaction-memory-bridge.service';
import { workingMemoryService } from '../../services/working-memory.service';
import { entityExtractorService } from '../../services/entity-extractor.service';
import { goalManagementService } from '../../services/goal-management.service';

export function ChatContainer() {
  // ... existing code ...

  // Initialize cognitive core on mount
  useEffect(() => {
    const init = async () => {
      // ... existing initialization ...

      // NEW: Initialize cognitive bridge
      await interactionMemoryBridgeService.initialize();
      await workingMemoryService.initialize();
      await entityExtractorService.initialize();
      await goalManagementService.initialize();

      console.log('[ChatContainer] Cognitive core initialized');
    };
    init();
  }, []);

  // Create conversation with memory
  const createNewConversation = useCallback(() => {
    const newConv = dbService.createConversation('New Conversation');

    // Initialize cognitive memory
    interactionMemoryBridgeService.onConversationCreated(
      newConv.id,
      'New Conversation'
    ).catch(err => console.warn('[ChatContainer]', err));

    loadConversations();
    switchToConversation(newConv);
  }, []);

  // Record message in both DB and cognitive memory
  const handleSendMessage = useCallback(
    async (content: string, imageFiles?: File[]) => {
      // ... existing message handling ...

      // Record user message to cognitive memory
      await interactionMemoryBridgeService.recordMessage(
        currentConversation.id,
        'user',
        content
      );

      // Get response from adapter
      const response = await adapter.query(request);

      // Record agent response to cognitive memory
      await interactionMemoryBridgeService.recordMessage(
        currentConversation.id,
        'assistant',
        response.content,
        { moduleUsed: selectedAdapterId }
      );

      // ... rest of message handling ...
    },
    [currentConversation, selectedAdapterId]
  );

  // ... rest of component ...
}
```

## Data Flow

```
User Types Message
        ↓
ChatContainer.handleSendMessage()
        ├─→ dbService.addMessage() [Store original]
        ├─→ interactionMemoryBridge.recordMessage() [Record to working memory]
        │   ├─→ workingMemoryService.addMemoryItem()
        │   ├─→ entityExtractorService.extractFromText()
        │   └─→ Update conversation_memory_links table
        ├─→ Send to selected adapter
        ├─→ Get response
        ├─→ dbService.addMessage() [Store response]
        └─→ interactionMemoryBridge.recordMessage() [Record agent response]
                ├─→ workingMemoryService.addMemoryItem()
                └─→ Entity extraction on response

When Conversation Closes:
        ↓
interactionMemoryBridge.onConversationCompleted()
        ├─→ workingMemoryService.completeTask()
        ├─→ evaluateConversationGoals()
        │   └─→ Link to relevant goals
        └─→ Consolidation candidates ready for next cognitive cycle
```

## What Happens in the Background

### Every 5 Minutes (Cognitive Cycle)

The `CognitiveLoopService` wakes and:

1. **Consolidates Working Memory**
   - Takes completed conversation tasks
   - Moves important memories to Long-Term Memory
   - Adds vector embeddings for semantic search

2. **Extracts Entities**
   - Learns new technologies, projects, interests
   - Populates knowledge base automatically
   - Updates user model with learned entities

3. **Analyzes Patterns**
   - Detects user interests and capabilities
   - Identifies conversation topics
   - Generates insights

4. **Evaluates Goals**
   - Checks progress on active goals
   - Links relevant conversations to goals
   - Identifies stalled goals

5. **Generates Autonomous Tasks**
   - Creates background research tasks if relevant
   - Schedules goal-related work
   - Prioritizes based on user urgency

## Database Tables Added

The Interaction Memory Bridge creates two new tables:

### `conversation_memory_links`
Links conversations to working memory tasks:
```sql
id TEXT PRIMARY KEY
conversation_id TEXT
working_memory_task_id TEXT
long_term_memories TEXT[] (after consolidation)
extracted_entities TEXT[]
related_goals TEXT[]
created_at INTEGER
last_updated_at INTEGER
```

### `interaction_insights`
Stores insights discovered during conversations:
```sql
id TEXT PRIMARY KEY
conversation_id TEXT
insight_type TEXT (user_preference|capability|interest|pattern|recommendation)
content TEXT
confidence REAL
source TEXT ('interaction_bridge')
created_at INTEGER
```

## Testing Integration

### Test 1: Basic Message Recording
```typescript
// Create conversation
const conv = dbService.createConversation('Test');

// Initialize memory
await interactionMemoryBridgeService.onConversationCreated(conv.id, 'Test');

// Record message
await interactionMemoryBridgeService.recordMessage(
  conv.id,
  'user',
  'Hello, I want to learn Python'
);

// Verify working memory
const stats = workingMemoryService.getStats();
console.assert(stats.totalItems > 0);

// Verify entity extraction
const entities = entityExtractorService.getTopEntities();
console.assert(entities.some(e => e.name === 'Python'));
```

### Test 2: Goal Linking
```typescript
// Create goal
const goal = goalManagementService.createGoal(
  'Learn Python',
  'Master Python programming',
  'user'
);

// Simulate conversation about Python
await interactionMemoryBridgeService.recordMessage(conv.id, 'user', 'Python is cool');
await interactionMemoryBridgeService.recordMessage(conv.id, 'user', 'I want to use Python');

// Evaluate goals
const relatedGoals = await interactionMemoryBridgeService.evaluateConversationGoals(conv.id);
console.assert(relatedGoals.includes(goal.id));
```

## Configuration & Customization

### Entity Extraction Confidence Threshold
```typescript
// In entity-extractor.service.ts
const confidenceThreshold = 0.7; // Only add if confidence >= 0.7

// Can be customized per type:
const technologyThreshold = 0.95;
const conceptThreshold = 0.85;
const capabilityThreshold = 0.7;
```

### Memory Consolidation Trigger
```typescript
// In cognitive-loop.service.ts
const consolidationThreshold = 0.6; // Confidence threshold for consolidation

// In working-memory.service.ts
const minConfidenceForConsolidation = 0.6;
const itemDecayTimeMs = 15 * 60 * 1000; // 15 minutes
```

### Goal Evaluation Heuristic
```typescript
// In interaction-memory-bridge.service.ts
const matchThreshold = 2; // At least 2 words must match between goal and conversation
```

## Imports Required in ChatContainer

Add to imports:
```typescript
import { interactionMemoryBridgeService } from '../../services/interaction-memory-bridge.service';
import { workingMemoryService } from '../../services/working-memory.service';
import { entityExtractorService } from '../../services/entity-extractor.service';
import { goalManagementService } from '../../services/goal-management.service';
```

## Debugging

### Check conversation memory context:
```typescript
const context = interactionMemoryBridgeService.getConversationContext(conversationId);
console.log('Conversation context:', context);
```

### Get bridge statistics:
```typescript
const stats = interactionMemoryBridgeService.getStats();
console.log('Bridge stats:', {
  conversationsTracked: stats.conversationsTracked,
  messagesRecorded: stats.messagesRecorded,
  entitiesExtracted: stats.entitiesExtracted,
  goalsUpdated: stats.goalsUpdated,
});
```

### Monitor cognitive cycles:
```typescript
const loopStatus = cognitiveLoopService.getStatus();
console.log('Cognitive loop:', {
  state: loopStatus.state,
  cycleCount: loopStatus.cycleCount,
  lastCycleTime: loopStatus.lastCycleTime,
});
```

## Next Steps (Phase 2 Continued)

1. **Create UI Dashboard**
   - Show cognitive status
   - Display working memory
   - Show memory consolidation progress
   - Display insights generated

2. **Implement Goal Evaluation Triggers**
   - Link goal progress to conversation milestones
   - Auto-update goal progress based on insights
   - Notify when goals become relevant

3. **Add Autonomous Task Handlers**
   - Research tasks
   - Learning tasks
   - Analysis tasks
   - User preference discovery

4. **Build Testing Suite**
   - Unit tests for memory recording
   - Integration tests for full flow
   - Performance tests for cognitive cycles
   - UI tests for dashboard

---

**Ready to integrate!** Follow the integration points and your cognitive core will automatically learn from conversations while maintaining the existing user experience.
