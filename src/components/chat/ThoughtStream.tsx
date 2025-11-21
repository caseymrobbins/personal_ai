/**
 * Thought Stream Component (Enhanced UX)
 *
 * Displays the AI's continuous thinking process and code analysis.
 * Shows reasoning, planning, reflections, and code analysis in real-time.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastThoughtRef = useRef<HTMLDivElement>(null);

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
    if (autoScroll && isExpanded && thoughts.length > 0 && lastThoughtRef.current) {
      lastThoughtRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [thoughts, autoScroll, isExpanded]);

  // Copy thought to clipboard
  const copyThought = useCallback(async (thought: ParsedThought) => {
    try {
      await navigator.clipboard.writeText(thought.content);
      setCopiedId(thought.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle with 't' key when focused
      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setIsExpanded(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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

  const getThoughtColor = (type: string): string => {
    switch (type) {
      case 'reasoning': return '#0366d6';
      case 'code_analysis': return '#6f42c1';
      case 'planning': return '#28a745';
      case 'reflection': return '#ffd33d';
      default: return '#0366d6';
    }
  };

  return (
    <div className="thought-stream-container">
      <button
        className="thought-stream-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} AI thought process (${thoughts.length} thoughts)`}
        type="button"
      >
        <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
        <span className="toggle-label">
          <span className="label-text">AI Thought Process</span>
          {isStreaming && (
            <span className="streaming-badge">
              <span className="streaming-dot"></span>
              Live
            </span>
          )}
        </span>
        <span className="thought-count-badge">
          {thoughts.length}
          <span className="badge-label">thought{thoughts.length !== 1 ? 's' : ''}</span>
        </span>
      </button>

      {isExpanded && (
        <div
          ref={contentRef}
          className="thought-stream-content"
          role="region"
          aria-label="AI thinking process"
        >
          {thoughts.map((thought, index) => {
            const isLast = index === thoughts.length - 1;
            return (
              <div
                key={thought.id}
                ref={isLast ? lastThoughtRef : null}
                data-thought-id={thought.id}
                className={`thought-item thought-type-${thought.thought_type}`}
                style={{ '--thought-color': getThoughtColor(thought.thought_type) } as any}
              >
                <div className="thought-header">
                  <div className="thought-header-left">
                    <span className="thought-icon" aria-hidden="true">
                      {getThoughtIcon(thought.thought_type)}
                    </span>
                    <span className="thought-type-label">{getThoughtLabel(thought.thought_type)}</span>
                    <span className="thought-sequence">#{thought.sequence_order + 1}</span>
                  </div>
                  <div className="thought-header-right">
                    <button
                      className={`copy-button ${copiedId === thought.id ? 'copied' : ''}`}
                      onClick={() => copyThought(thought)}
                      aria-label="Copy thought"
                      title="Copy to clipboard"
                      type="button"
                    >
                      {copiedId === thought.id ? '✓' : '📋'}
                    </button>
                    <span className="thought-timestamp">
                      {new Date(thought.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="thought-content">
                  {thought.content.split('\n').map((line, idx) => (
                    line.trim() ? <p key={idx}>{line}</p> : <br key={idx} />
                  ))}
                </div>

                {/* Enhanced code analysis metadata */}
                {thought.thought_type === 'code_analysis' && thought.metadata && (
                  <div className="thought-metadata">
                    <div className="metadata-row">
                      {(thought.metadata as any).language && (
                        <span className="metadata-badge language-badge">
                          <span className="badge-icon">💻</span>
                          {(thought.metadata as any).language}
                        </span>
                      )}
                      {(thought.metadata as any).complexity?.cyclomaticComplexity !== undefined && (
                        <span
                          className={`metadata-badge complexity-badge ${
                            (thought.metadata as any).complexity.cyclomaticComplexity > 10 ? 'high' :
                            (thought.metadata as any).complexity.cyclomaticComplexity > 5 ? 'medium' : 'low'
                          }`}
                        >
                          <span className="badge-icon">📊</span>
                          Complexity: {(thought.metadata as any).complexity.cyclomaticComplexity}
                        </span>
                      )}
                    </div>
                    {(thought.metadata as any).issues && (thought.metadata as any).issues.length > 0 && (
                      <div className="issues-summary">
                        {(thought.metadata as any).issues.length} issue{(thought.metadata as any).issues.length !== 1 ? 's' : ''} found
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isStreaming && (
            <div className="thought-stream-loading">
              <div className="loading-pulse">
                <div className="pulse-ring"></div>
                <div className="pulse-dot"></div>
              </div>
              <span className="loading-text">
                <span className="loading-text-content">AI is thinking</span>
                <span className="loading-ellipsis">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
