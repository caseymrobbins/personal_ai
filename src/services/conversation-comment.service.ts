/**
 * Conversation Comment Service
 *
 * Enables local-only commenting on conversations with:
 * - Add/edit/delete comments on conversations
 * - Multiple comments per conversation
 * - User identification and timestamps
 * - LocalStorage persistence
 * - Comment search and filtering
 */

export interface ConversationComment {
  id: string;
  conversationId: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[]; // Optional tags for organizing comments
}

class ConversationCommentService {
  private comments = new Map<string, ConversationComment>();

  /**
   * Create a new comment on a conversation
   */
  createComment(
    conversationId: string,
    content: string,
    userId: string,
    userName: string,
    tags?: string[]
  ): ConversationComment {
    try {
      if (!content.trim()) {
        throw new Error('Comment cannot be empty');
      }

      const commentId = `comment_${conversationId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const comment: ConversationComment = {
        id: commentId,
        conversationId,
        content: content.trim(),
        userId,
        userName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: tags || [],
      };

      this.comments.set(commentId, comment);
      this.persistComments();

      console.log('[ConversationComment] Created comment:', commentId);
      return comment;
    } catch (err) {
      console.error('[ConversationComment] Failed to create comment:', err);
      throw new Error(
        `Failed to create comment: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get comment by ID
   */
  getComment(commentId: string): ConversationComment | null {
    return this.comments.get(commentId) || null;
  }

  /**
   * Get all comments for a conversation
   */
  getConversationComments(conversationId: string): ConversationComment[] {
    return Array.from(this.comments.values())
      .filter((comment) => comment.conversationId === conversationId)
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
  }

  /**
   * Update comment content
   */
  updateComment(commentId: string, content: string): ConversationComment {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    if (!content.trim()) {
      throw new Error('Comment cannot be empty');
    }

    comment.content = content.trim();
    comment.updatedAt = Date.now();
    this.comments.set(commentId, comment);
    this.persistComments();

    console.log('[ConversationComment] Updated comment:', commentId);
    return comment;
  }

  /**
   * Add tags to comment
   */
  addTags(commentId: string, newTags: string[]): ConversationComment {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    const existingTags = new Set(comment.tags || []);
    newTags.forEach((tag) => existingTags.add(tag));
    comment.tags = Array.from(existingTags);
    comment.updatedAt = Date.now();
    this.comments.set(commentId, comment);
    this.persistComments();

    return comment;
  }

  /**
   * Remove tags from comment
   */
  removeTag(commentId: string, tag: string): ConversationComment {
    const comment = this.comments.get(commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    comment.tags = (comment.tags || []).filter((t) => t !== tag);
    comment.updatedAt = Date.now();
    this.comments.set(commentId, comment);
    this.persistComments();

    return comment;
  }

  /**
   * Delete comment
   */
  deleteComment(commentId: string): void {
    this.comments.delete(commentId);
    this.persistComments();
    console.log('[ConversationComment] Deleted comment:', commentId);
  }

  /**
   * Search comments in a conversation
   */
  searchConversationComments(conversationId: string, searchText: string): ConversationComment[] {
    const searchLower = searchText.toLowerCase();
    return this.getConversationComments(conversationId).filter(
      (comment) =>
        comment.content.toLowerCase().includes(searchLower) ||
        (comment.tags || []).some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Get comments by tag
   */
  getCommentsByTag(conversationId: string, tag: string): ConversationComment[] {
    return this.getConversationComments(conversationId).filter(
      (comment) => (comment.tags || []).includes(tag)
    );
  }

  /**
   * Get all unique tags in a conversation
   */
  getConversationTags(conversationId: string): string[] {
    const tags = new Set<string>();
    this.getConversationComments(conversationId).forEach((comment) => {
      (comment.tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  /**
   * Get comment count for conversation
   */
  getCommentCount(conversationId: string): number {
    return this.getConversationComments(conversationId).length;
  }

  /**
   * Persist comments to localStorage
   */
  private persistComments(): void {
    try {
      const commentsData = Array.from(this.comments.entries());
      localStorage.setItem('conversation_comments', JSON.stringify(commentsData));
    } catch (err) {
      console.error('[ConversationComment] Failed to persist comments:', err);
    }
  }

  /**
   * Load comments from localStorage
   */
  private loadComments(): void {
    try {
      const data = localStorage.getItem('conversation_comments');
      if (data) {
        const commentsData = JSON.parse(data);
        for (const [id, comment] of commentsData) {
          this.comments.set(id, comment as ConversationComment);
        }
        console.log('[ConversationComment] Loaded comments:', this.comments.size);
      }
    } catch (err) {
      console.error('[ConversationComment] Failed to load comments:', err);
    }
  }

  /**
   * Initialize service
   */
  initialize(): void {
    this.loadComments();
    console.log('[ConversationComment] Initialized');
  }

  /**
   * Export comments for a conversation
   */
  exportConversationComments(conversationId: string): string {
    const comments = this.getConversationComments(conversationId);
    const exportData = {
      conversationId,
      exportedAt: new Date().toISOString(),
      comments: comments,
      total: comments.length,
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Export singleton instance
export const conversationCommentService = new ConversationCommentService();
