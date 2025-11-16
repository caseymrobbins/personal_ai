/**
 * Message Bubble Component
 *
 * Displays a single chat message with role-based styling
 */

import './MessageBubble.css';

export interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  moduleUsed?: string | null;
}

export function MessageBubble({ role, content, timestamp, moduleUsed }: MessageBubbleProps) {
  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message-bubble message-${role}`}>
      <div className="message-header">
        <span className="message-role">
          {role === 'user' ? '👤 You' : role === 'assistant' ? '🤖 AI' : '⚙️ System'}
        </span>
        {timestamp && (
          <span className="message-time">{formatTime(timestamp)}</span>
        )}
      </div>

      <div className="message-content">{content}</div>

      {moduleUsed && role === 'assistant' && (
        <div className="message-footer">
          <span className="message-module">via {moduleUsed}</span>
        </div>
      )}
    </div>
  );
}
