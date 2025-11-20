/**
 * Thought Stream Component
 *
 * Displays the AI's continuous thinking process and code analysis.
 * Shows reasoning, planning, reflections, and code analysis in real-time.
 */

import { useEffect, useState } from 'react';
import { thoughtStreamService } from '../../services/thought-stream.service';
import type { ParsedThought, ThoughtStreamEvent } from '../../types/thought-stream.types';
import './ThoughtStream.css';

export interface ThoughtStreamProps {
  messageId: string;
  autoScroll?: boolean;
  expandByDefault?: boolean;
}

export function ThoughtStream({
  messageId,
  autoScroll = true,
  expandByDefault = false
}: ThoughtStreamProps) {
  const [thoughts, setThoughts] = useState<ParsedThought[]>([]);
  const [isExpanded, setIsExpanded] = useState(expandByDefault);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load initial thoughts and subscribe to updates
  useEffect(() => {
    // Load existing thoughts
    const existingThoughts = thoughtStreamService.getMessageThoughts(messageId);
    setThoughts(existingThoughts);

    // Set streaming state if there are thoughts
    if (existingThoughts.length > 0) {
      setIsStreaming(true);
    }

    // Subscribe to new thoughts
    const handleEvent = (event: ThoughtStreamEvent) => {
      if (event.messageId === messageId) {
        if (event.type === 'thought-added' && event.thought) {
          setThoughts(prev => [...prev, event.thought!]);
          setIsStreaming(true);
        } else if (event.type === 'stream-complete') {
          setIsStreaming(false);
        }
      }
    };

    thoughtStreamService.addEventListener(handleEvent);

    return () => {
      thoughtStreamService.removeEventListener(handleEvent);
    };
  }, [messageId]);

  // Auto-scroll to latest thought
  useEffect(() => {
    if (autoScroll && isExpanded && thoughts.length > 0) {
      const lastThought = document.querySelector(`[data-thought-id="${thoughts[thoughts.length - 1].id}"]`);
      lastThought?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [thoughts, autoScroll, isExpanded]);

  // Don't render if no thoughts
  if (thoughts.length === 0) {
    return null;
  }

  const getThoughtIcon = (type: string): string => {
    switch (type) {
      case 'reasoning': return '🧠';
      case 'code_analysis': return '🔍';
      case 'planning': return '📋';
      case 'reflection': return '💭';
      default: return '💡';
    }
  };

  const getThoughtLabel = (type: string): string => {
    switch (type) {
      case 'reasoning': return 'Reasoning';
      case 'code_analysis': return 'Code Analysis';
      case 'planning': return 'Planning';
      case 'reflection': return 'Reflection';
      default: return 'Thought';
    }
  };

  return (
    <div className="thought-stream-container">
      <button
        className="thought-stream-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        type="button"
      >
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="toggle-label">
          AI Thought Process
          {isStreaming && <span className="streaming-indicator">●</span>}
        </span>
        <span className="thought-count">{thoughts.length}</span>
      </button>

      {isExpanded && (
        <div className="thought-stream-content">
          {thoughts.map((thought) => (
            <div
              key={thought.id}
              data-thought-id={thought.id}
              className={`thought-item thought-type-${thought.thought_type}`}
            >
              <div className="thought-header">
                <span className="thought-icon">{getThoughtIcon(thought.thought_type)}</span>
                <span className="thought-type-label">{getThoughtLabel(thought.thought_type)}</span>
                <span className="thought-timestamp">
                  {new Date(thought.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>

              <div className="thought-content">
                {thought.content.split('\n').map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>

              {/* Display code analysis metadata */}
              {thought.thought_type === 'code_analysis' && thought.metadata && (
                <div className="thought-metadata">
                  {(thought.metadata as any).language && (
                    <span className="metadata-badge">
                      {(thought.metadata as any).language}
                    </span>
                  )}
                  {(thought.metadata as any).complexity?.cyclomaticComplexity && (
                    <span className="metadata-badge">
                      Complexity: {(thought.metadata as any).complexity.cyclomaticComplexity}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="thought-stream-loading">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="loading-text">Thinking...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
