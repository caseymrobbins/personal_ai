/**
 * Chat Container
 *
 * This component connects the Chat UI to the Local Guardian Adapter and Database Service.
 * It manages the chat state, message persistence, and AI interactions.
 *
 * Sprint 1 TASK-011: Connect chat UI to Local_Guardian_Adapter and db.service
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './ChatInterface';
import { dbService, type ChatMessage, type Conversation } from '../../services/db.service';
import { initializeDatabase } from '../../db/init';
import { localGuardianAdapter } from '../../modules/adapters';
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

  const { setModuleState } = useChatState();

  // Initialize database and model on mount
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

        // Start initializing the model (asynchronously)
        initializeModel();
      } catch (error) {
        console.error('[ChatContainer] Initialization failed:', error);
      }
    };

    init();
  }, []);

  // Initialize the local AI model
  const initializeModel = async () => {
    try {
      setModelStatus({ ready: false, loading: true, progress: 0 });
      setModuleState('LOCAL_ROUTING');

      console.log('[ChatContainer] Initializing Local Guardian...');

      // Poll for model status during initialization
      const statusInterval = setInterval(() => {
        const status = localGuardianAdapter.getStatus();
        setModelStatus(status);

        if (status.ready || status.error) {
          clearInterval(statusInterval);
          setModuleState('IDLE');
        }
      }, 100);

      await localGuardianAdapter.initialize();

      console.log('[ChatContainer] ✅ Local Guardian ready');
      setModelStatus({ ready: true, loading: false, progress: 1 });
    } catch (error) {
      console.error('[ChatContainer] ❌ Model initialization failed:', error);
      setModelStatus({
        ready: false,
        loading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to initialize',
      });
      setModuleState('IDLE');
    }
  };

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
      setModuleState('LOCAL_PROCESSING');

      try {
        // 1. Add user message to database
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

        // 2. Get conversation history for context
        const history = dbService.getConversationHistory(currentConversation.id);

        // 3. Build request for Local Guardian
        const request: IChatCompletionRequest = {
          model: 'phi-3-mini',
          messages: history.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          })),
          temperature: 0.7,
        };

        // 4. Query the local AI
        console.log('[ChatContainer] Querying Local Guardian...');
        const response = await localGuardianAdapter.query(request);

        // 5. Extract assistant response
        if ('choices' in response && response.choices.length > 0) {
          const assistantContent = response.choices[0].message.content;

          // 6. Add assistant message to database
          const assistantMessageId = dbService.addMessage({
            conversation_id: currentConversation.id,
            role: 'assistant',
            content: assistantContent,
            module_used: 'local_guardian',
            trace_data: JSON.stringify({
              model: response.model,
              usage: response.usage,
            }),
          });

          // Update UI with assistant message
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            conversation_id: currentConversation.id,
            role: 'assistant',
            content: assistantContent,
            module_used: 'local_guardian',
            trace_data: null,
            timestamp: Date.now(),
          };

          setMessages(prev => [...prev, assistantMessage]);
          console.log('[ChatContainer] ✅ Response received and saved');
        }
      } catch (error) {
        console.error('[ChatContainer] ❌ Failed to get response:', error);

        // Add error message to UI
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
      } finally {
        setIsLoading(false);
        setModuleState('IDLE');
      }
    },
    [currentConversation, modelStatus.ready, setModuleState]
  );

  // Show model loading status
  if (modelStatus.loading) {
    const progress = modelStatus.progress || 0;
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
        <h2>Loading Local AI Model...</h2>
        <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>
          Downloading Phi-3-mini ({Math.round(progress * 100)}%)
        </p>
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
      </div>
    );
  }

  // Show error state
  if (modelStatus.error) {
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
          {modelStatus.error}
        </p>
        <button
          onClick={initializeModel}
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
          Retry Initialization
        </button>
      </div>
    );
  }

  // Show chat interface
  return (
    <ChatInterface
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      loadingMessage="Local AI is thinking..."
    />
  );
}
