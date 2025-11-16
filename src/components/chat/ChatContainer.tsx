/**
 * Chat Container (Sprint 2 Enhanced)
 *
 * This component connects the Chat UI to multiple AI adapters (local and external).
 * It manages:
 * - Multi-adapter support (Local Guardian, OpenAI, Anthropic)
 * - PII anonymization for external adapters
 * - Message persistence
 * - Module state tracking for transparency
 *
 * Sprint 2: Privacy and Modularity Framework
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './ChatInterface';
import { AdapterSelector } from '../AdapterSelector';
import { dbService, type ChatMessage, type Conversation } from '../../services/db.service';
import { initializeDatabase } from '../../db/init';
import { adapterRegistry } from '../../modules/adapters';
import { anonymizerService, type ScrubMapping } from '../../services/anonymizer.service';
import { useChatState } from '../../store/chat.store';
import type { IChatCompletionRequest } from '../../modules/adapters';

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<{
    ready: boolean;
    loading?: boolean;
    progress?: number;
    error?: string;
  }>({ ready: false, loading: false, progress: 0 });

  const { selectedAdapterId, setModuleState, setAbortController } = useChatState();

  // Initialize database on mount
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[ChatContainer] Initializing...');

        // Initialize database and schema
        await initializeDatabase();

        // Get or create a conversation
        const conversations = dbService.getConversations();
        let conversation: Conversation;

        if (conversations.length > 0) {
          // Use the most recent conversation
          conversation = conversations[0];
          console.log(`[ChatContainer] Using existing conversation: ${conversation.id}`);
        } else {
          // Create a new conversation
          conversation = dbService.createConversation('My First Chat');
          console.log(`[ChatContainer] Created new conversation: ${conversation.id}`);
        }

        setCurrentConversation(conversation);

        // Load conversation history
        const history = dbService.getConversationHistory(conversation.id);
        setMessages(history);
        console.log(`[ChatContainer] Loaded ${history.length} messages`);
      } catch (error) {
        console.error('[ChatContainer] Initialization failed:', error);
      }
    };

    init();
  }, []);

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
    async (content: string) => {
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

        // STEP 2: Get conversation history
        const history = dbService.getConversationHistory(currentConversation.id);

        // STEP 3: Anonymization for external adapters
        let scrubMappings: ScrubMapping[] = [];
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

        // STEP 4: Query the AI adapter
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

        // STEP 5: Extract assistant response
        if (!('choices' in response) || response.choices.length === 0) {
          throw new Error('Invalid response from adapter');
        }

        let assistantContent = response.choices[0].message.content;

        // STEP 6: Unscrub PII for external adapters
        if (isExternalAdapter && scrubMappings.length > 0) {
          setModuleState('UNSCRUBBING');
          console.log('[ChatContainer] Restoring PII from response...');

          const unscrubResult = anonymizerService.unscrub(assistantContent, scrubMappings);
          assistantContent = unscrubResult.unscrubedText;

          if (unscrubResult.restoredCount > 0) {
            console.log(`[ChatContainer] Restored ${unscrubResult.restoredCount} PII items`);
          }
        }

        // STEP 7: Add assistant message to database
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
        }
      } finally {
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

  // Show chat interface with adapter selector
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AdapterSelector />
      <div style={{ flex: 1, overflow: 'hidden' }}>
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
    </div>
  );
}
