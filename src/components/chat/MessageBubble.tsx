/**
 * Message Bubble Component
 *
 * Displays a single chat message with role-based styling and image attachments
 */

import { useEffect, useState } from 'react';
import { attachmentsService } from '../../services/attachments.service';
import { voiceService, type VoiceServiceEvent } from '../../services/voice.service';
import { markdownService } from '../../services/markdown.service';
import type { MessageAttachment } from '../../services/db.service';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
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
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [isMarkdownContent, setIsMarkdownContent] = useState(false);

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

  // Render markdown content
  useEffect(() => {
    const renderContent = async () => {
      if (!content) {
        setRenderedHtml('');
        return;
      }

      // Check if content appears to be markdown
      const isMarkdown = markdownService.isMarkdown(content);
      setIsMarkdownContent(isMarkdown);

      if (isMarkdown) {
        try {
          const rendered = await markdownService.renderMarkdown(content);
          setRenderedHtml(rendered.html);
        } catch (error) {
          console.error('[MessageBubble] Markdown rendering failed:', error);
          setRenderedHtml(content);
        }
      }
    };

    renderContent();
  }, [content]);

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
      {content && (
        <div className="message-content">
          {isMarkdownContent ? (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <div className="plain-text-content">{content}</div>
          )}
        </div>
      )}

      {moduleUsed && role === 'assistant' && (
        <div className="message-footer">
          <span className="message-module">via {moduleUsed}</span>
        </div>
      )}
    </div>
  );
}
