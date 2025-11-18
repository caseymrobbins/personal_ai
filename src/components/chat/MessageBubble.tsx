/**
 * Message Bubble Component
 *
 * Displays a single chat message with role-based styling and image attachments
 */

import { useEffect, useState } from 'react';
import { attachmentsService } from '../../services/attachments.service';
import type { MessageAttachment } from '../../services/db.service';
import './MessageBubble.css';

export interface MessageBubbleProps {
  messageId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  moduleUsed?: string | null;
}

export function MessageBubble({ messageId, role, content, timestamp, moduleUsed }: MessageBubbleProps) {
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!messageId) return;

    // Load attachments for this message
    const loadAttachments = async () => {
      try {
        const atts = attachmentsService.getMessageAttachments(messageId);
        setAttachments(atts);

        // Convert to data URLs for display
        const urls = atts.map(att => attachmentsService.getAttachmentDataUrl(att));
        setImageUrls(urls);
      } catch (error) {
        console.error('[MessageBubble] Failed to load attachments:', error);
      }
    };

    loadAttachments();
  }, [messageId]);

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

      {/* Image attachments */}
      {imageUrls.length > 0 && (
        <div className="message-attachments">
          {imageUrls.map((url, index) => (
            <div key={index} className="message-attachment-image">
              <img
                src={url}
                alt={attachments[index]?.filename || `Attachment ${index + 1}`}
                loading="lazy"
              />
              <div className="attachment-filename">
                {attachments[index]?.filename || 'Image'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message text content */}
      {content && <div className="message-content">{content}</div>}

      {moduleUsed && role === 'assistant' && (
        <div className="message-footer">
          <span className="message-module">via {moduleUsed}</span>
        </div>
      )}
    </div>
  );
}
