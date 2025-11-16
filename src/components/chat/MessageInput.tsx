/**
 * Message Input Component
 *
 * Chat input box with send button
 */

import { useState, KeyboardEvent } from 'react';
import './MessageInput.css';

export interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSendMessage(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-container">
      <textarea
        className="message-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={{
          minHeight: '44px',
          maxHeight: '200px',
          resize: 'none',
          overflow: 'auto',
        }}
      />

      <button
        className="send-button"
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        aria-label="Send message"
      >
        {disabled ? (
          <span className="loading-spinner">⏳</span>
        ) : (
          <span className="send-icon">▶</span>
        )}
      </button>
    </div>
  );
}
