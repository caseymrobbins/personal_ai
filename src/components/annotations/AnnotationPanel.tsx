/**
 * Annotation Panel Component
 *
 * Displays and manages all annotations for a conversation:
 * - List of all annotations
 * - Filter by type and status
 * - Search annotations
 * - View and edit annotation details
 * - Manage replies
 * - Resolve annotations
 */

import { useState } from 'react';
import { annotationService, type Annotation, type AnnotationType, type AnnotationStatus } from '../../services/annotation.service';
import './AnnotationPanel.css';

export interface AnnotationPanelProps {
  conversationId: string;
  annotations: Annotation[];
  isOpen: boolean;
  onClose: () => void;
  onAnnotationClick: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
}

export function AnnotationPanel({
  conversationId: _conversationId,
  annotations,
  isOpen,
  onClose,
  onAnnotationClick,
  onAnnotationUpdate,
}: AnnotationPanelProps) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AnnotationType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AnnotationStatus | 'all'>('all');
  const [replyText, setReplyText] = useState('');
  const [_editingId, _setEditingId] = useState<string | null>(null);

  // Filter annotations based on search and filter criteria
  const filteredAnnotations = annotations.filter((annotation) => {
    if (filterType !== 'all' && annotation.type !== filterType) return false;
    if (filterStatus !== 'all' && annotation.status !== filterStatus) return false;
    if (
      searchQuery &&
      !annotation.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !annotation.textRange.text.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleAddReply = (annotationId: string) => {
    if (!replyText.trim()) return;

    const annotation = annotationService.addReply(
      annotationId,
      'current-user', // TODO: Get from auth service
      'You',
      replyText
    );

    setReplyText('');
    if (onAnnotationUpdate) {
      onAnnotationUpdate(annotation);
    }

    // Update selected annotation if it's the one we replied to
    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation(annotation);
    }
  };

  const handleResolveAnnotation = (annotationId: string) => {
    const annotation = annotationService.updateAnnotationStatus(
      annotationId,
      'resolved',
      'current-user'
    );

    if (onAnnotationUpdate) {
      onAnnotationUpdate(annotation);
    }

    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation(annotation);
    }
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    if (confirm('Delete this annotation? This cannot be undone.')) {
      annotationService.deleteAnnotation(annotationId);
      if (selectedAnnotation?.id === annotationId) {
        setSelectedAnnotation(null);
      }
      if (onAnnotationUpdate) {
        // Trigger UI refresh
        setSearchQuery('');
      }
    }
  };

  // const getTypeColor = (type: AnnotationType): string => {
  //   const colors: Record<AnnotationType, string> = {
  //     comment: '#FFE5B4',
  //     highlight: '#B4D7FF',
  //     question: '#D7FFB4',
  //     flag: '#FFB4B4',
  //   };
  //   return colors[type];
  // };

  const getTypeIcon = (type: AnnotationType): string => {
    const icons: Record<AnnotationType, string> = {
      comment: '💬',
      highlight: '🔍',
      question: '❓',
      flag: '🚩',
    };
    return icons[type];
  };

  if (!isOpen) return null;

  return (
    <div className="annotation-panel-overlay" onClick={onClose}>
      <div className="annotation-panel" onClick={(e) => e.stopPropagation()}>
        {/* Panel Header */}
        <div className="annotation-panel-header">
          <h2>Annotations ({filteredAnnotations.length})</h2>
          <button className="annotation-panel-close" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>

        {/* Search and Filters */}
        <div className="annotation-panel-controls">
          <div className="annotation-search">
            <input
              type="text"
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="annotation-search-input"
            />
          </div>

          <div className="annotation-filters">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AnnotationType | 'all')}
              className="annotation-filter-select"
            >
              <option value="all">All Types</option>
              <option value="comment">Comments</option>
              <option value="highlight">Highlights</option>
              <option value="question">Questions</option>
              <option value="flag">Flags</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AnnotationStatus | 'all')}
              className="annotation-filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Annotations List and Detail View */}
        <div className="annotation-panel-content">
          {selectedAnnotation ? (
            // Annotation Detail View
            <div className="annotation-detail">
              <button
                className="annotation-back-btn"
                onClick={() => setSelectedAnnotation(null)}
              >
                ← Back to List
              </button>

              <div className="annotation-detail-header">
                <span className="annotation-type-icon">{getTypeIcon(selectedAnnotation.type)}</span>
                <h3>{selectedAnnotation.type}</h3>
                <span
                  className={`annotation-status-label annotation-status-${selectedAnnotation.status}`}
                >
                  {selectedAnnotation.status}
                </span>
              </div>

              <div className="annotation-detail-meta">
                <div className="meta-item">
                  <span className="meta-label">By:</span>
                  <span className="meta-value">{selectedAnnotation.userName}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Created:</span>
                  <span className="meta-value">
                    {new Date(selectedAnnotation.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="annotation-detail-text">
                <span className="detail-label">Highlighted Text:</span>
                <div
                  className="highlighted-text"
                  style={{ backgroundColor: selectedAnnotation.color }}
                >
                  {selectedAnnotation.textRange.text}
                </div>
              </div>

              <div className="annotation-detail-content">
                <span className="detail-label">Comment:</span>
                <div className="annotation-content-text">{selectedAnnotation.content}</div>
              </div>

              {/* Replies */}
              <div className="annotation-replies">
                <h4>
                  Replies ({selectedAnnotation.replies.length})
                </h4>

                <div className="replies-list">
                  {selectedAnnotation.replies.length === 0 ? (
                    <p className="no-replies">No replies yet</p>
                  ) : (
                    selectedAnnotation.replies.map((reply) => (
                      <div key={reply.id} className="reply-item">
                        <div className="reply-header">
                          <span className="reply-user">{reply.userName}</span>
                          <span className="reply-time">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="reply-content">{reply.content}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Reply */}
                {selectedAnnotation.status === 'active' && (
                  <div className="reply-input-section">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Add a reply..."
                      className="reply-textarea"
                      rows={3}
                    />
                    <button
                      onClick={() => handleAddReply(selectedAnnotation.id)}
                      disabled={!replyText.trim()}
                      className="reply-submit-btn"
                    >
                      Post Reply
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="annotation-actions">
                {selectedAnnotation.status === 'active' && (
                  <button
                    onClick={() => handleResolveAnnotation(selectedAnnotation.id)}
                    className="action-btn action-btn-primary"
                  >
                    ✓ Resolve
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAnnotation(selectedAnnotation.id)}
                  className="action-btn action-btn-danger"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ) : (
            // Annotations List View
            <div className="annotations-list">
              {filteredAnnotations.length === 0 ? (
                <div className="empty-state">
                  <p>No annotations found</p>
                  <p className="empty-hint">Select text in messages to create annotations</p>
                </div>
              ) : (
                filteredAnnotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="annotation-list-item"
                    onClick={() => {
                      setSelectedAnnotation(annotation);
                      onAnnotationClick(annotation);
                    }}
                  >
                    <div className="list-item-type" style={{ backgroundColor: annotation.color }}>
                      {getTypeIcon(annotation.type)}
                    </div>

                    <div className="list-item-content">
                      <div className="list-item-header">
                        <span className="list-item-type-label">{annotation.type}</span>
                        <span className={`list-item-status annotation-status-${annotation.status}`}>
                          {annotation.status}
                        </span>
                      </div>

                      <div className="list-item-text">{annotation.textRange.text}</div>

                      <div className="list-item-preview">{annotation.content.substring(0, 80)}...</div>

                      <div className="list-item-meta">
                        <span className="meta-user">{annotation.userName}</span>
                        <span className="meta-replies">
                          {annotation.replies.length} {annotation.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      </div>
                    </div>

                    <div className="list-item-arrow">→</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnnotationPanel;
