/**
 * Chat Interface Component
 *
 * Main chat UI that integrates message display and input
 * This component will be connected to the Local Guardian Adapter in TASK-011
 */

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import type { ChatMessage } from '../../services/db.service';
import './ChatInterface.css';

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  loadingMessage = 'AI is thinking...',
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <h2>Start a Conversation</h2>
            <p>Your messages are stored locally and privately on your device.</p>
            <p className="empty-state-hint">
              Try asking: "Explain quantum computing" or "Help me write a function"
            </p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                moduleUsed={msg.module_used}
              />
            ))}

            {isLoading && (
              <div className="loading-indicator">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="loading-text">{loadingMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageInput
        onSendMessage={onSendMessage}
        disabled={isLoading}
        placeholder={
          isLoading
            ? 'Please wait for the AI to respond...'
            : 'Type your message... (Enter to send, Shift+Enter for new line)'
        }
      />
    </div>
  );
}
