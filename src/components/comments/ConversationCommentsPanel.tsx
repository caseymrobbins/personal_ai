/**
 * Conversation Comments Panel Component
 *
 * Displays and manages comments on conversations:
 * - Add new comments
 * - Edit and delete comments
 * - Search and filter comments
 * - Tag-based organization
 * - Comment timestamps and user info
 */

import { useState, useEffect } from 'react';
import {
  conversationCommentService,
  type ConversationComment,
} from '../../services/conversation-comment.service';
import './ConversationCommentsPanel.css';

export interface ConversationCommentsPanelProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationCommentsPanel({
  conversationId,
  isOpen,
  onClose,
}: ConversationCommentsPanelProps) {
  const [comments, setComments] = useState<ConversationComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load comments when panel opens
  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, conversationId]);

  const loadComments = () => {
    const loadedComments = conversationCommentService.getConversationComments(conversationId);
    setComments(loadedComments);
    const tags = conversationCommentService.getConversationTags(conversationId);
    setAvailableTags(tags);
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;

    try {
      conversationCommentService.createComment(
        conversationId,
        newCommentText,
        'current-user', // TODO: Get from auth service
        'You',
        newTag ? [newTag] : []
      );

      setNewCommentText('');
      setNewTag('');
      loadComments();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleEditComment = (comment: ConversationComment) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editingText.trim()) return;

    try {
      conversationCommentService.updateComment(commentId, editingText);
      setEditingId(null);
      setEditingText('');
      loadComments();
    } catch (err) {
      console.error('Error updating comment:', err);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Delete this comment?')) {
      try {
        conversationCommentService.deleteComment(commentId);
        loadComments();
      } catch (err) {
        console.error('Error deleting comment:', err);
      }
    }
  };

  // const handleAddTag = (commentId: string, tag: string) => {
  //   if (!tag.trim()) return;
  //
  //   try {
  //     conversationCommentService.addTags(commentId, [tag.trim()]);
  //     loadComments();
  //   } catch (err) {
  //     console.error('Error adding tag:', err);
  //   }
  // };

  const handleRemoveTag = (commentId: string, tag: string) => {
    try {
      conversationCommentService.removeTag(commentId, tag);
      loadComments();
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  // Filter comments
  const filteredComments = comments.filter((comment) => {
    if (selectedTag && !(comment.tags || []).includes(selectedTag)) return false;
    if (
      searchQuery &&
      !comment.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(comment.tags || []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="comments-panel-overlay" onClick={onClose}>
      <div className="comments-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comments-panel-header">
          <h2>Comments ({comments.length})</h2>
          <button className="comments-panel-close" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>

        {/* New Comment Input */}
        <div className="comments-new-section">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add a comment about this conversation..."
            className="comments-textarea"
            rows={3}
          />

          <div className="comments-new-controls">
            <div className="comments-tag-input-wrapper">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Tag will be added with the comment
                  }
                }}
                placeholder="Optional tag..."
                className="comments-tag-input"
              />
            </div>

            <button
              onClick={handleAddComment}
              disabled={!newCommentText.trim()}
              className="comments-add-btn"
            >
              💬 Add Comment
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="comments-controls">
          <input
            type="text"
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="comments-search-input"
          />

          {availableTags.length > 0 && (
            <div className="comments-tag-filter">
              <button
                className={`tag-filter-btn ${selectedTag === null ? 'active' : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                All
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comments List */}
        <div className="comments-list">
          {filteredComments.length === 0 ? (
            <div className="comments-empty">
              <p>
                {comments.length === 0 ? 'No comments yet' : 'No comments match your search'}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div key={comment.id} className="comment-item">
                {editingId === comment.id ? (
                  <div className="comment-edit">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="comment-edit-textarea"
                      rows={3}
                      autoFocus
                    />

                    <div className="comment-edit-actions">
                      <button
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editingText.trim()}
                        className="edit-save-btn"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingText('');
                        }}
                        className="edit-cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="comment-header">
                      <span className="comment-user">{comment.userName}</span>
                      <span className="comment-time">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                      {comment.updatedAt > comment.createdAt && (
                        <span className="comment-edited">(edited)</span>
                      )}
                    </div>

                    <div className="comment-content">{comment.content}</div>

                    {/* Tags */}
                    {(comment.tags && comment.tags.length > 0) && (
                      <div className="comment-tags">
                        {comment.tags && comment.tags.map((tag) => (
                          <span
                            key={tag}
                            className="comment-tag"
                            onClick={() => handleRemoveTag(comment.id, tag)}
                            title="Click to remove tag"
                          >
                            #{tag}
                            <span className="tag-remove">×</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="comment-actions">
                      <button
                        onClick={() => handleEditComment(comment)}
                        className="comment-action-btn"
                        title="Edit comment"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="comment-action-btn comment-delete-btn"
                        title="Delete comment"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationCommentsPanel;
