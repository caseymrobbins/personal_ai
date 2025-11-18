/**
 * Message Bubble Component
 *
 * Displays a single chat message with role-based styling and image attachments
 */

import { useEffect, useState } from 'react';
import { attachmentsService } from '../../services/attachments.service';
import { voiceService, type VoiceServiceEvent } from '../../services/voice.service';
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
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Check TTS support
  const ttsSupported = voiceService.isSpeechSynthesisSupported();

  // Load attachments
  useEffect(() => {
    if (!messageId) return;

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

  // Listen for TTS events
  useEffect(() => {
    const handleVoiceEvent = (event: VoiceServiceEvent) => {
      switch (event.type) {
        case 'tts-start':
          // Check if this is our message being spoken
          if (event.text === content) {
            setIsSpeaking(true);
          }
          break;
        case 'tts-end':
        case 'tts-error':
          setIsSpeaking(false);
          break;
      }
    };

    voiceService.addEventListener(handleVoiceEvent);
    return () => voiceService.removeEventListener(handleVoiceEvent);
  }, [content]);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      voiceService.stopSpeaking();
    } else {
      voiceService.speak(content);
    }
  };

  return (
    <div className={`message-bubble message-${role}`}>
      <div className="message-header">
        <span className="message-role">
          {role === 'user' ? '👤 You' : role === 'assistant' ? '🤖 AI' : '⚙️ System'}
        </span>
        <div className="message-header-actions">
          {/* TTS button - only show for messages with content */}
          {content && ttsSupported && (
            <button
              className={`tts-button ${isSpeaking ? 'speaking' : ''}`}
              onClick={toggleSpeech}
              aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              type="button"
            >
              {isSpeaking ? '🔇' : '🔊'}
            </button>
          )}
          {timestamp && (
            <span className="message-time">{formatTime(timestamp)}</span>
          )}
        </div>
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
