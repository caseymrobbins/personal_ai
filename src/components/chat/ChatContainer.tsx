/**
 * Chat Container (Sprint 2-4 Enhanced)
 *
 * This component connects the Chat UI to multiple AI adapters (local and external).
 * It manages:
 * - Multi-adapter support (Local Guardian, OpenAI, Anthropic)
 * - PII anonymization for external adapters
 * - Message persistence
 * - Module state tracking for transparency
 * - Conversation management (Sprint 4)
 *
 * Sprint 2: Privacy and Modularity Framework
 * Sprint 4: Conversation Management
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './ChatInterface';
import { AdapterSelector } from '../AdapterSelector';
import { ConversationSidebar } from '../ConversationSidebar';
import CognitiveStatusDashboard from '../CognitiveStatusDashboard';
import { KeyboardShortcutsProvider } from '../shortcuts/KeyboardShortcutsProvider';
import { dbService, type ChatMessage, type Conversation } from '../../services/db.service';
import { initializeDatabase } from '../../db/init';
import { adapterRegistry } from '../../modules/adapters';
import { anonymizerService, type ScrubMapping } from '../../services/anonymizer.service';
import { governanceService } from '../../services/governance.service';
import { embeddingsService } from '../../services/embeddings.service';
import { rdiService } from '../../services/rdi.service';
import { socraticService } from '../../services/socratic.service';
import { preferencesService } from '../../services/preferences.service';
import { attachmentsService } from '../../services/attachments.service';
import { documentParsingService } from '../../services/document.service';
import { themeService } from '../../services/theme.service';
import { accessibilityService } from '../../services/accessibility.service';
import { useChatState } from '../../store/chat.store';
import type { IChatCompletionRequest } from '../../modules/adapters';
// Phase 2: Cognitive Services Integration
import { interactionMemoryBridgeService } from '../../services/interaction-memory-bridge.service';
import { conversationEntityIntegrationService } from '../../services/conversation-entity-integration.service';
import { goalEvaluationTriggerService } from '../../services/goal-evaluation-trigger.service';

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCognitivePanel, setShowCognitivePanel] = useState(false);
  const [modelStatus, setModelStatus] = useState<{
    ready: boolean;
    loading?: boolean;
    progress?: number;
    error?: string;
  }>({ ready: false, loading: false, progress: 0 });

  const { selectedAdapterId, setModuleState, setAbortController } = useChatState();

  // Load all conversations
  const loadConversations = useCallback(() => {
    const allConversations = dbService.getConversations();
    setConversations(allConversations);
    return allConversations;
  }, []);

  // Switch to a conversation
  const switchToConversation = useCallback((conversation: Conversation) => {
    setCurrentConversation(conversation);
    const history = dbService.getConversationHistory(conversation.id);
    setMessages(history);
    console.log(`[ChatContainer] Switched to conversation: ${conversation.id}`);
    // Close sidebar on mobile after selecting
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Create new conversation
  const createNewConversation = useCallback(() => {
    const newConv = dbService.createConversation('New Conversation');
    loadConversations();
    switchToConversation(newConv);
    console.log(`[ChatContainer] Created new conversation: ${newConv.id}`);
  }, [loadConversations, switchToConversation]);

  // Initialize database on mount
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[ChatContainer] Initializing...');

        // Initialize database and schema
        await initializeDatabase();

        // Initialize user preferences
        await preferencesService.initialize();
        console.log('[ChatContainer] Preferences loaded');

        // Initialize theme service
        themeService.initialize();
        console.log('[ChatContainer] Theme service initialized');

        // Initialize accessibility service
        accessibilityService.initialize();
        console.log('[ChatContainer] Accessibility service initialized');

        // Apply user preferences
        const prefs = preferencesService.getPreferences();
        socraticService.setSocraticMode(prefs.enableSocraticMode);
        console.log(`[ChatContainer] Socratic mode: ${prefs.enableSocraticMode ? 'enabled' : 'disabled'}`);

        // Load all conversations
        const allConversations = loadConversations();
        let conversation: Conversation;

        if (allConversations.length > 0) {
          // Use the most recent conversation
          conversation = allConversations[0];
          console.log(`[ChatContainer] Using existing conversation: ${conversation.id}`);
        } else {
          // Create a new conversation
          conversation = dbService.createConversation('My First Chat');
          loadConversations(); // Refresh list
          console.log(`[ChatContainer] Created new conversation: ${conversation.id}`);
        }

        setCurrentConversation(conversation);

        // Load conversation history
        const history = dbService.getConversationHistory(conversation.id);
        setMessages(history);
        console.log(`[ChatContainer] Loaded ${history.length} messages`);

        // Phase 2: Initialize cognitive services
        try {
          await interactionMemoryBridgeService.initialize();
          console.log('[ChatContainer] ✅ Interaction Memory Bridge initialized');
        } catch (error) {
          console.warn('[ChatContainer] Failed to initialize Interaction Memory Bridge:', error);
        }

        try {
          await conversationEntityIntegrationService.initialize();
          console.log('[ChatContainer] ✅ Conversation Entity Integration initialized');
        } catch (error) {
          console.warn('[ChatContainer] Failed to initialize Conversation Entity Integration:', error);
        }

        try {
          await goalEvaluationTriggerService.initialize();
          console.log('[ChatContainer] ✅ Goal Evaluation Trigger initialized');
        } catch (error) {
          console.warn('[ChatContainer] Failed to initialize Goal Evaluation Trigger:', error);
        }
      } catch (error) {
        console.error('[ChatContainer] Initialization failed:', error);
      }
    };

    init();
  }, [loadConversations]);

  // Phase 2: Periodic goal evaluation cycle
  useEffect(() => {
    if (!currentConversation) return;

    const evaluateGoals = async () => {
      try {
        const result = await goalEvaluationTriggerService.evaluateCycle();

        console.log('[ChatContainer] Goal evaluation cycle complete:', {
          cycleId: result.cycleId,
          goalsEvaluated: result.goalsEvaluated,
          progressUpdates: result.progressUpdates,
          completedGoals: result.goalsCompleted,
          stalledGoals: result.goalsStalled,
          autonomousTasksGenerated: result.autonomousTasksExecuted,
        });
      } catch (error) {
        console.warn('[ChatContainer] Goal evaluation cycle failed:', error);
      }
    };

    // Run goal evaluation immediately on conversation switch
    evaluateGoals();

    // Then run periodically every 5 minutes (300000ms)
    const evaluationInterval = setInterval(evaluateGoals, 5 * 60 * 1000);

    return () => clearInterval(evaluationInterval);
  }, [currentConversation]);

  // Initialize the selected adapter when it changes
  useEffect(() => {
    const initializeAdapter = async () => {
      try {
        setModelStatus({ ready: false, loading: true, progress: 0 });
        setModuleState('LOCAL_ROUTING');

        console.log(`[ChatContainer] Initializing adapter: ${selectedAdapterId}...`);

        // Get the adapter
        const adapter = adapterRegistry.get(selectedAdapterId);
        if (!adapter) {
          throw new Error(`Adapter not found: ${selectedAdapterId}`);
        }

        // Poll for status updates (especially for local models with progress)
        const statusInterval = setInterval(() => {
          const status = adapter.getStatus();
          setModelStatus(status);

          if (status.ready || status.error) {
            clearInterval(statusInterval);
            setModuleState('IDLE');
          }
        }, 100);

        // Initialize the adapter
        await adapterRegistry.initialize(selectedAdapterId);

        console.log(`[ChatContainer] ✅ Adapter ${selectedAdapterId} ready`);
        setModelStatus({ ready: true, loading: false, progress: 1 });
      } catch (error) {
        console.error('[ChatContainer] ❌ Adapter initialization failed:', error);
        setModelStatus({
          ready: false,
          loading: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Failed to initialize',
        });
        setModuleState('IDLE');
      }
    };

    initializeAdapter();
  }, [selectedAdapterId, setModuleState]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string, imageFiles?: File[], documentFiles?: File[]) => {
      if (!currentConversation) {
        console.error('[ChatContainer] No active conversation');
        return;
      }

      if (!modelStatus.ready) {
        console.error('[ChatContainer] Model not ready');
        return;
      }

      setIsLoading(true);

      try {
        // Get the selected adapter
        const adapter = adapterRegistry.get(selectedAdapterId);
        if (!adapter) {
          throw new Error(`Adapter not found: ${selectedAdapterId}`);
        }

        const isExternalAdapter = selectedAdapterId !== 'local_guardian';

        // STEP 1: Add user message to database (original, unmodified)
        const userMessageId = dbService.addMessage({
          conversation_id: currentConversation.id,
          role: 'user',
          content,
          module_used: null,
          trace_data: null,
        });

        // STEP 1.5: Process and attach images if provided
        if (imageFiles && imageFiles.length > 0) {
          console.log(`[ChatContainer] Processing ${imageFiles.length} image(s)...`);

          for (const file of imageFiles) {
            try {
              await attachmentsService.addImageAttachment(userMessageId, file);
              console.log(`[ChatContainer] ✅ Attached image: ${file.name}`);
            } catch (error) {
              console.error(`[ChatContainer] ❌ Failed to attach image ${file.name}:`, error);
              // Continue with other images even if one fails
            }
          }
        }

        // STEP 1.6: Process and attach documents if provided
        if (documentFiles && documentFiles.length > 0) {
          console.log(`[ChatContainer] Processing ${documentFiles.length} document(s)...`);

          for (const file of documentFiles) {
            try {
              await documentParsingService.addDocumentAttachment(userMessageId, file);
              console.log(`[ChatContainer] ✅ Attached document: ${file.name}`);
            } catch (error) {
              console.error(`[ChatContainer] ❌ Failed to attach document ${file.name}:`, error);
              // Continue with other documents even if one fails
            }
          }
        }

        // Update UI with user message
        const userMessage: ChatMessage = {
          id: userMessageId,
          conversation_id: currentConversation.id,
          role: 'user',
          content,
          module_used: null,
          trace_data: null,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);

        // Phase 2: Record user message to memory bridge (async, non-blocking)
        try {
          await interactionMemoryBridgeService.recordMessage(
            currentConversation.id,
            'user',
            content,
            {
              hasAttachments: !!(imageFiles?.length || documentFiles?.length),
              attachmentCount: (imageFiles?.length || 0) + (documentFiles?.length || 0),
            }
          );
        } catch (error) {
          console.warn('[ChatContainer] Failed to record user message to memory bridge:', error);
          // Don't fail the conversation
        }

        // Phase 2: Process user message for entity extraction and learning
        try {
          const extractionResult = await conversationEntityIntegrationService.processUserMessage(
            userMessageId,
            content,
            currentConversation.id,
            {
              timestamp: Date.now(),
              messageIndex: messages.length,
            }
          );

          console.log('[ChatContainer] User message learning:', {
            entitiesFound: extractionResult.entitiesFound,
            newEntities: extractionResult.newEntities,
            insightsDiscovered: extractionResult.userInsightsDiscovered,
            preferencesLearned: extractionResult.preferencesLearned,
            goalsLinked: extractionResult.entitiesLinkedToGoals,
          });
        } catch (error) {
          console.warn('[ChatContainer] Failed to process user message for learning:', error);
          // Don't fail the conversation
        }
        // Announce message sent to screen readers
        accessibilityService.announce('Message sent', 'polite');

        // STEP 2: Track governance metrics (ARI + RDI)
        // ARI: Autonomy Retention Index - measures user autonomy
        // RDI: Reality Drift Index - detects conceptual topic drift
        try {
          // Calculate ARI metrics
          const governanceMetrics = await governanceService.analyzePrompt(content);

          // Generate embedding for RDI (async, may take a moment on first use)
          let promptEmbedding: Uint8Array | undefined;
          let rdiScore = 0;

          try {
            const embedding = await embeddingsService.embed(content);
            promptEmbedding = embeddingsService.serializeEmbedding(embedding);

            // Get recent embeddings for drift comparison
            const recentEmbeddingBlobs = dbService.getRecentEmbeddings(10);
            const recentEmbeddings = recentEmbeddingBlobs.map(blob =>
              embeddingsService.deserializeEmbedding(blob)
            );

            // Calculate RDI
            const rdiMetrics = rdiService.calculateRDI(embedding, recentEmbeddings);
            rdiScore = rdiMetrics.rdiScore;

            // Log drift alert if detected
            if (rdiMetrics.alert) {
              console.warn('[ChatContainer] 🚨 High topic drift detected:', {
                rdiScore: rdiMetrics.rdiScore.toFixed(3),
                driftLevel: rdiMetrics.driftLevel,
                recommendation: rdiService.getRecommendation(rdiMetrics.rdiScore),
              });
            }
          } catch (embeddingError) {
            console.warn('[ChatContainer] Failed to generate embedding for RDI:', embeddingError);
            // Continue without RDI if embeddings fail
          }

          // Store metrics in database
          dbService.addGovernanceMetrics({
            timestamp: governanceMetrics.timestamp,
            userPromptHash: governanceMetrics.userPromptHash,
            lexicalDensity: governanceMetrics.lexicalDensity,
            syntacticComplexity: governanceMetrics.syntacticComplexity,
            promptEmbedding,
          });

          console.log('[ChatContainer] Governance tracked:', {
            ARI: governanceMetrics.ariScore.toFixed(2),
            RDI: rdiScore.toFixed(2),
          });
        } catch (error) {
          console.error('[ChatContainer] Failed to track governance metrics:', error);
          // Don't fail the entire operation if governance tracking fails
        }

        // STEP 3: Get conversation history
        const history = dbService.getConversationHistory(currentConversation.id);

        // STEP 3.5: Socratic Co-pilot Mode (if enabled and ARI is low)
        // Calculate current ARI from recent metrics
        let currentARI = 0.65; // Default to good ARI
        try {
          const recentMetrics = dbService.getRecentGovernanceMetrics(1);
          if (recentMetrics.length > 0) {
            currentARI = recentMetrics[0].ariScore;
          }
        } catch (error) {
          console.warn('[ChatContainer] Failed to get recent ARI:', error);
        }

        // Check if Socratic intervention should occur
        if (socraticService.shouldIntervene(currentARI)) {
          console.log(`[ChatContainer] 🎓 Socratic mode triggered (ARI: ${currentARI.toFixed(2)})`);

          // Generate Socratic prompt based on user's query
          const socraticPrompt = socraticService.generatePrompt(content, currentARI);

          // Add Socratic guidance as a system message (visible to user)
          const socraticMessage: ChatMessage = {
            id: `socratic-${Date.now()}`,
            conversation_id: currentConversation.id,
            role: 'system',
            content: socraticService.formatPrompt(socraticPrompt),
            module_used: 'socratic_copilot',
            trace_data: JSON.stringify({ ariScore: currentARI, promptType: socraticPrompt.type }),
            timestamp: Date.now(),
          };

          // Store in database
          dbService.addMessage({
            conversation_id: currentConversation.id,
            role: 'system',
            content: socraticMessage.content,
            module_used: 'socratic_copilot',
            trace_data: socraticMessage.trace_data,
          });

          // Show to user
          setMessages(prev => [...prev, socraticMessage]);

          console.log(`[ChatContainer] Socratic guidance: ${socraticPrompt.type}`);
        }

        // STEP 4: Anonymization for external adapters
        const scrubMappings: ScrubMapping[] = [];
        let messagesToSend = history.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        }));

        if (isExternalAdapter) {
          // Scrub PII from all messages before sending to external API
          setModuleState('SCRUBBING');
          console.log('[ChatContainer] Scrubbing PII before external API call...');

          const scrubbedMessages = messagesToSend.map(msg => {
            const scrubResult = anonymizerService.scrub(msg.content);
            scrubMappings.push(...scrubResult.mappings);
            return {
              ...msg,
              content: scrubResult.scrubbedText,
            };
          });

          messagesToSend = scrubbedMessages;

          if (scrubMappings.length > 0) {
            console.log(`[ChatContainer] Scrubbed ${scrubMappings.length} PII items`);
          }
        }

        // STEP 5: Query the AI adapter
        const moduleStateDuringQuery = isExternalAdapter ? 'EXTERNAL_API' : 'LOCAL_PROCESSING';
        setModuleState(moduleStateDuringQuery, adapter.name);

        console.log(`[ChatContainer] Querying ${adapter.name}...`);

        const request: IChatCompletionRequest = {
          model: selectedAdapterId === 'local_guardian' ? 'phi-3-mini' :
                 selectedAdapterId === 'openai' ? 'gpt-4' : 'claude-3-5-sonnet-20241022',
          messages: messagesToSend,
          temperature: 0.7,
        };

        // Create AbortController for external API calls (enables "Stop" button)
        let abortController: AbortController | undefined;
        if (isExternalAdapter) {
          abortController = new AbortController();
          setAbortController(abortController);
        }

        const response = await adapter.query(request, abortController?.signal);

        // Clear AbortController after successful completion
        if (isExternalAdapter) {
          setAbortController(null);
        }

        // STEP 6: Extract assistant response
        if (!('choices' in response) || response.choices.length === 0) {
          throw new Error('Invalid response from adapter');
        }

        let assistantContent = response.choices[0].message.content;

        // STEP 7: Unscrub PII for external adapters
        if (isExternalAdapter && scrubMappings.length > 0) {
          setModuleState('UNSCRUBBING');
          console.log('[ChatContainer] Restoring PII from response...');

          const unscrubResult = anonymizerService.unscrub(assistantContent, scrubMappings);
          assistantContent = unscrubResult.unscrubedText;

          if (unscrubResult.restoredCount > 0) {
            console.log(`[ChatContainer] Restored ${unscrubResult.restoredCount} PII items`);
          }
        }

        // STEP 8: Add assistant message to database
        const assistantMessageId = dbService.addMessage({
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: assistantContent,
          module_used: selectedAdapterId,
          trace_data: JSON.stringify({
            model: response.model,
            usage: response.usage,
            scrubbed_pii_count: scrubMappings.length,
          }),
        });

        // Update UI with assistant message
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: assistantContent,
          module_used: selectedAdapterId,
          trace_data: null,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        console.log('[ChatContainer] ✅ Response received and saved');

        // Phase 2: Record agent message to memory bridge
        try {
          await interactionMemoryBridgeService.recordMessage(
            currentConversation.id,
            'assistant',
            assistantContent,
            {
              moduleUsed: selectedAdapterId,
              hasAttachments: false,
            }
          );
        } catch (error) {
          console.warn('[ChatContainer] Failed to record agent message to memory bridge:', error);
        }

        // Phase 2: Process agent response for entity extraction and learning
        try {
          const extractionResult = await conversationEntityIntegrationService.processAgentResponse(
            assistantMessageId,
            assistantContent,
            currentConversation.id,
            selectedAdapterId
          );

          console.log('[ChatContainer] Agent response learning:', {
            entitiesFound: extractionResult.entitiesFound,
            newEntities: extractionResult.newEntities,
            goalsLinked: extractionResult.entitiesLinkedToGoals,
          });
        } catch (error) {
          console.warn('[ChatContainer] Failed to process agent response for learning:', error);
        }
        // Announce response received to screen readers
        accessibilityService.announce('Response received from AI', 'polite');
      } catch (error) {
        console.error('[ChatContainer] ❌ Failed to get response:', error);

        // Check if this was an abort (user clicked "Stop")
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[ChatContainer] Request aborted by user (Humanity Override)');

          const abortMessage: ChatMessage = {
            id: `abort-${Date.now()}`,
            conversation_id: currentConversation.id,
            role: 'system',
            content: '⚠️ Request stopped by user (Humanity Override)',
            module_used: null,
            trace_data: null,
            timestamp: Date.now(),
          };

          setMessages(prev => [...prev, abortMessage]);

          // Announce request stopped
          accessibilityService.announce('Request stopped by user', 'assertive');
        } else {
          // Other errors
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            conversation_id: currentConversation.id,
            role: 'system',
            content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
            module_used: null,
            trace_data: null,
            timestamp: Date.now(),
          };

          setMessages(prev => [...prev, errorMessage]);

          // Announce error
          accessibilityService.announce(`Error: ${error instanceof Error ? error.message : 'Failed to get response'}`, 'assertive');
        }
      } finally{
        setIsLoading(false);
        setModuleState('IDLE');
        setAbortController(null); // Always clear abort controller
      }
    },
    [currentConversation, modelStatus.ready, selectedAdapterId, setModuleState, setAbortController]
  );

  // Show model loading status
  if (modelStatus.loading) {
    const progress = modelStatus.progress || 0;
    const adapterName = adapterRegistry.get(selectedAdapterId)?.name || selectedAdapterId;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🚀</div>
        <h2>Loading AI Model...</h2>
        <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>
          Initializing {adapterName} ({Math.round(progress * 100)}%)
        </p>
        {selectedAdapterId === 'local_guardian' && (
          <>
            <div style={{
              width: '100%',
              maxWidth: '400px',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '1.5rem',
            }}>
              <div style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '1.5rem' }}>
              This is a one-time download (~2-4GB). Subsequent runs load from cache.
            </p>
          </>
        )}
      </div>
    );
  }

  // Show error state
  if (modelStatus.error) {
    const adapterName = adapterRegistry.get(selectedAdapterId)?.name || selectedAdapterId;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⚠️</div>
        <h2>Model Initialization Failed</h2>
        <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>
          {adapterName}: {modelStatus.error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Keyboard shortcut handlers
  const handleFocusInput = () => {
    const inputElement = document.querySelector('textarea[placeholder*="message"]') as HTMLTextAreaElement;
    if (inputElement) {
      inputElement.focus();
    }
  };

  // Show chat interface with adapter selector and conversation sidebar
  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversation?.id || null}
        onConversationSelect={switchToConversation}
        onConversationCreate={createNewConversation}
        onConversationUpdate={loadConversations}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header with adapter selector and dashboard toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem',
          borderBottom: '1px solid rgba(229, 231, 235, 0.3)',
          backgroundColor: 'rgba(249, 250, 251, 0.5)',
        }}>
          <div style={{ flex: 1 }}>
            <AdapterSelector />
          </div>
          {/* Phase 3: Cognitive Status Dashboard Toggle */}
          <button
            onClick={() => setShowCognitivePanel(!showCognitivePanel)}
            style={{
              padding: '0.5rem 1rem',
              margin: '0 0.5rem',
              background: showCognitivePanel
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(102, 126, 234, 0.1)',
              color: showCognitivePanel ? 'white' : '#667eea',
              border: showCognitivePanel ? 'none' : '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!showCognitivePanel) {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showCognitivePanel) {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              }
            }}
          >
            🧠 {showCognitivePanel ? 'Hide' : 'Show'} Dashboard
          </button>
        </div>

        {/* Main chat area with optional dashboard panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '0.5px' }}>
          <div style={{ flex: showCognitivePanel ? 2 : 1, overflow: 'hidden', minWidth: '0' }}>
            <KeyboardShortcutsProvider
              onNewConversation={createNewConversation}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onFocusInput={handleFocusInput}
            >
              {/* Skip Links for Accessibility */}
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <a href="#conversations-nav" className="skip-link">
                Skip to conversations
              </a>

              <div style={{ height: '100%', display: 'flex' }} lang="en">
                {/* Screen reader only heading */}
                <h1 className="sr-only">SML Guardian AI Chat Application</h1>

                <ConversationSidebar
                  conversations={conversations}
                  currentConversationId={currentConversation?.id || null}
                  onConversationSelect={switchToConversation}
                  onConversationCreate={createNewConversation}
                  onConversationUpdate={loadConversations}
                  isOpen={sidebarOpen}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                />

                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  role="main"
                  aria-label="Chat interface"
                >
                  <AdapterSelector />
                  <div id="main-content" style={{ flex: 1, overflow: 'hidden' }}>
                    <ChatInterface
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                      loadingMessage={
                        selectedAdapterId === 'local_guardian'
                          ? 'Local AI is thinking...'
                          : `${adapterRegistry.get(selectedAdapterId)?.name} is thinking...`
                      }
                    />
                  </div>

                  {/* Phase 3: Cognitive Status Dashboard Panel */}
                  {showCognitivePanel && (
                    <div style={{
                      flex: 1,
                      overflow: 'auto',
                      borderLeft: '1px solid rgba(229, 231, 235, 0.5)',
                      backgroundColor: 'rgba(249, 250, 251, 0.8)',
                      minWidth: '0',
                    }}>
                      <CognitiveStatusDashboard />
                    </div>
                  )}
                </div>
              </div>
            </KeyboardShortcutsProvider>
          </div>

          {showCognitivePanel && (
            <div style={{
              flex: 1,
              overflow: 'auto',
              borderLeft: '1px solid rgba(229, 231, 235, 0.5)',
              backgroundColor: 'rgba(249, 250, 251, 0.8)',
              minWidth: '0',
            }}>
              <CognitiveStatusDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
