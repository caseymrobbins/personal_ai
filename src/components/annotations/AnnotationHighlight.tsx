/**
 * Annotation Highlight Component
 *
 * Renders message content with annotation highlights and handles:
 * - Text range highlighting
 * - Hover effects for annotations
 * - Click to show annotation details
 * - Multiple overlapping annotations
 */

import { useState } from 'react';
import { type Annotation } from '../../services/annotation.service';
import './AnnotationHighlight.css';

export interface AnnotationHighlightProps {
  messageId: string;
  content: string;
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  onSelectionAnnotate?: (start: number, end: number, selectedText: string) => void;
}

export function AnnotationHighlight({
  messageId,
  content,
  annotations,
  onAnnotationClick,
  onSelectionAnnotate,
}: AnnotationHighlightProps) {
  const [_selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);

  // Handle text selection for creating new annotations
  const handleSelection = () => {
    if (!onSelectionAnnotate) return;

    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
      setSelectedRange(null);
      return;
    }

    // Get the selected text and range
    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(document.getElementById(`message-${messageId}`) || document.body);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const start = preCaretRange.toString().length - selectedText.length;
    const end = start + selectedText.length;

    setSelectedRange({ start, end });
    onSelectionAnnotate(start, end, selectedText);
  };

  // Build array of text segments with annotation info
  interface Segment {
    text: string;
    annotations: Annotation[];
    startIndex: number;
  }

  const segments: Segment[] = [];
  let lastIndex = 0;

  // Sort annotations by start position
  const sortedAnnotations = [...annotations].sort((a, b) => a.textRange.start - b.textRange.start);

  // Create segments for content and annotations
  for (const annotation of sortedAnnotations) {
    const { start, end } = annotation.textRange;

    // Add text before annotation
    if (lastIndex < start) {
      segments.push({
        text: content.substring(lastIndex, start),
        annotations: [],
        startIndex: lastIndex,
      });
    }

    // Find all overlapping annotations at this position
    const overlappingAnnotations = sortedAnnotations.filter(
      (ann) => ann.textRange.start <= start && ann.textRange.end > start
    );

    // Add annotated text
    segments.push({
      text: content.substring(start, end),
      annotations: overlappingAnnotations,
      startIndex: start,
    });

    lastIndex = end;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    segments.push({
      text: content.substring(lastIndex),
      annotations: [],
      startIndex: lastIndex,
    });
  }

  // If no annotations, just show plain content
  if (segments.length === 0) {
    return (
      <div
        id={`message-${messageId}`}
        className="annotation-highlight-container"
        onMouseUp={handleSelection}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      id={`message-${messageId}`}
      className="annotation-highlight-container"
      onMouseUp={handleSelection}
    >
      {segments.map((segment, index) => {
        if (segment.annotations.length === 0) {
          return (
            <span key={index} className="annotation-text-plain">
              {segment.text}
            </span>
          );
        }

        // Show main annotation with tooltip for others
        const mainAnnotation = segment.annotations[0];
        const hasMultiple = segment.annotations.length > 1;

        return (
          <span
            key={index}
            className="annotation-highlighted"
            style={{
              backgroundColor: mainAnnotation.color,
            }}
            onClick={() => onAnnotationClick(mainAnnotation)}
          >
            {segment.text}

            {hasMultiple && (
              <span className="annotation-overlay-count" title={`${segment.annotations.length} annotations`}>
                {segment.annotations.length}
              </span>
            )}

            {/* Tooltip showing annotation info */}
            <div className="annotation-tooltip">
              <div className="annotation-tooltip-header">
                <span className="annotation-type-badge">{mainAnnotation.type}</span>
                <span className="annotation-status-badge" data-status={mainAnnotation.status}>
                  {mainAnnotation.status}
                </span>
              </div>
              <div className="annotation-user">
                <span className="annotation-user-name">{mainAnnotation.userName}</span>
                <span className="annotation-timestamp">
                  {new Date(mainAnnotation.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="annotation-preview">{mainAnnotation.content.substring(0, 100)}...</div>
              {mainAnnotation.replies.length > 0 && (
                <div className="annotation-replies-count">
                  {mainAnnotation.replies.length} {mainAnnotation.replies.length === 1 ? 'reply' : 'replies'}
                </div>
              )}
            </div>
          </span>
        );
      })}
    </div>
  );
}

export default AnnotationHighlight;
