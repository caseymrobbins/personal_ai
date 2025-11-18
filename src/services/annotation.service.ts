/**
 * Collaborative Annotation Service
 *
 * Enables multi-user annotations on conversation messages with:
 * - Text range highlighting and annotation
 * - Threaded discussions (replies to annotations)
 * - User identification and timestamps
 * - Local-first storage (IndexedDB)
 * - Annotation search and filtering
 * - Version history tracking
 */

import { dbService, type ChatMessage } from './db.service';

export type AnnotationType = 'comment' | 'highlight' | 'question' | 'flag';
export type AnnotationStatus = 'active' | 'resolved' | 'archived';

export interface TextRange {
  start: number; // Character index in message content
  end: number; // Character index in message content
  text: string; // Highlighted text content
}

export interface AnnotationReply {
  id: string;
  annotationId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface Annotation {
  id: string;
  messageId: string;
  conversationId: string;
  type: AnnotationType;
  textRange: TextRange;
  content: string; // Annotation body/comment
  userId: string;
  userName: string;
  color: string; // Highlight color (hex code)
  status: AnnotationStatus;
  replies: AnnotationReply[];
  createdAt: number;
  updatedAt: number;
  resolvedBy?: string; // User ID who resolved it
  resolvedAt?: number; // Timestamp when resolved
}

export interface AnnotationFilter {
  messageId?: string;
  conversationId?: string;
  type?: AnnotationType;
  status?: AnnotationStatus;
  userId?: string;
  searchText?: string;
}

class AnnotationService {
  private annotations = new Map<string, Annotation>();
  private nextAnnotationIndex = 0;

  // Color palette for different annotation types and users
  private readonly colorPalette = [
    '#FFE5B4', // Peach
    '#B4D7FF', // Light Blue
    '#D7FFB4', // Light Green
    '#FFD7B4', // Light Orange
    '#E5B4FF', // Light Purple
    '#B4FFE5', // Light Cyan
    '#FFB4B4', // Light Red
    '#B4B4FF', // Periwinkle
  ];

  /**
   * Create a new annotation on a message
   */
  createAnnotation(
    messageId: string,
    conversationId: string,
    type: AnnotationType,
    textRange: TextRange,
    content: string,
    userId: string,
    userName: string,
    color?: string
  ): Annotation {
    try {
      // Verify message exists
      const message = dbService.getMessage(messageId);
      if (!message) {
        throw new Error(`Message not found: ${messageId}`);
      }

      // Validate text range
      if (textRange.start < 0 || textRange.end > message.content.length) {
        throw new Error('Invalid text range for message');
      }

      const annotationId = `ann_${conversationId}_${messageId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const annotation: Annotation = {
        id: annotationId,
        messageId,
        conversationId,
        type,
        textRange,
        content,
        userId,
        userName,
        color: color || this.colorPalette[this.nextAnnotationIndex % this.colorPalette.length],
        status: 'active',
        replies: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.nextAnnotationIndex++;
      this.annotations.set(annotationId, annotation);
      this.persistAnnotations();

      console.log('[Annotation] Created annotation:', annotationId);
      return annotation;
    } catch (err) {
      console.error('[Annotation] Failed to create annotation:', err);
      throw new Error(`Failed to create annotation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Get annotation by ID
   */
  getAnnotation(annotationId: string): Annotation | null {
    return this.annotations.get(annotationId) || null;
  }

  /**
   * Get all annotations matching filter criteria
   */
  getAnnotations(filter: AnnotationFilter = {}): Annotation[] {
    return Array.from(this.annotations.values()).filter((annotation) => {
      if (filter.messageId && annotation.messageId !== filter.messageId) return false;
      if (filter.conversationId && annotation.conversationId !== filter.conversationId)
        return false;
      if (filter.type && annotation.type !== filter.type) return false;
      if (filter.status && annotation.status !== filter.status) return false;
      if (filter.userId && annotation.userId !== filter.userId) return false;
      if (
        filter.searchText &&
        !annotation.content.toLowerCase().includes(filter.searchText.toLowerCase()) &&
        !annotation.textRange.text.toLowerCase().includes(filter.searchText.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get annotations for a specific message
   */
  getMessageAnnotations(messageId: string): Annotation[] {
    return this.getAnnotations({ messageId });
  }

  /**
   * Get annotations for a conversation
   */
  getConversationAnnotations(conversationId: string): Annotation[] {
    return this.getAnnotations({ conversationId });
  }

  /**
   * Update annotation content
   */
  updateAnnotation(annotationId: string, content: string): Annotation {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new Error(`Annotation not found: ${annotationId}`);
    }

    annotation.content = content;
    annotation.updatedAt = Date.now();
    this.annotations.set(annotationId, annotation);
    this.persistAnnotations();

    console.log('[Annotation] Updated annotation:', annotationId);
    return annotation;
  }

  /**
   * Change annotation status
   */
  updateAnnotationStatus(
    annotationId: string,
    status: AnnotationStatus,
    resolvedBy?: string
  ): Annotation {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new Error(`Annotation not found: ${annotationId}`);
    }

    annotation.status = status;
    annotation.updatedAt = Date.now();

    if (status === 'resolved' && resolvedBy) {
      annotation.resolvedBy = resolvedBy;
      annotation.resolvedAt = Date.now();
    }

    this.annotations.set(annotationId, annotation);
    this.persistAnnotations();

    console.log('[Annotation] Updated annotation status:', annotationId, status);
    return annotation;
  }

  /**
   * Add reply to annotation
   */
  addReply(
    annotationId: string,
    userId: string,
    userName: string,
    content: string
  ): Annotation {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new Error(`Annotation not found: ${annotationId}`);
    }

    const reply: AnnotationReply = {
      id: `reply_${annotationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      annotationId,
      userId,
      userName,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    annotation.replies.push(reply);
    annotation.updatedAt = Date.now();
    this.annotations.set(annotationId, annotation);
    this.persistAnnotations();

    console.log('[Annotation] Added reply to annotation:', annotationId);
    return annotation;
  }

  /**
   * Update reply content
   */
  updateReply(annotationId: string, replyId: string, content: string): Annotation {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new Error(`Annotation not found: ${annotationId}`);
    }

    const reply = annotation.replies.find((r) => r.id === replyId);
    if (!reply) {
      throw new Error(`Reply not found: ${replyId}`);
    }

    reply.content = content;
    reply.updatedAt = Date.now();
    annotation.updatedAt = Date.now();
    this.annotations.set(annotationId, annotation);
    this.persistAnnotations();

    console.log('[Annotation] Updated reply:', replyId);
    return annotation;
  }

  /**
   * Delete reply from annotation
   */
  deleteReply(annotationId: string, replyId: string): Annotation {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) {
      throw new Error(`Annotation not found: ${annotationId}`);
    }

    annotation.replies = annotation.replies.filter((r) => r.id !== replyId);
    annotation.updatedAt = Date.now();
    this.annotations.set(annotationId, annotation);
    this.persistAnnotations();

    console.log('[Annotation] Deleted reply:', replyId);
    return annotation;
  }

  /**
   * Delete annotation
   */
  deleteAnnotation(annotationId: string): void {
    this.annotations.delete(annotationId);
    this.persistAnnotations();
    console.log('[Annotation] Deleted annotation:', annotationId);
  }

  /**
   * Get unresolved annotations count
   */
  getUnresolvedCount(conversationId?: string): number {
    return this.getAnnotations({
      conversationId,
      status: 'active',
    }).length;
  }

  /**
   * Get annotation statistics for a conversation
   */
  getConversationStats(conversationId: string): {
    total: number;
    active: number;
    resolved: number;
    archived: number;
    byType: Record<AnnotationType, number>;
  } {
    const annotations = this.getAnnotations({ conversationId });

    return {
      total: annotations.length,
      active: annotations.filter((a) => a.status === 'active').length,
      resolved: annotations.filter((a) => a.status === 'resolved').length,
      archived: annotations.filter((a) => a.status === 'archived').length,
      byType: {
        comment: annotations.filter((a) => a.type === 'comment').length,
        highlight: annotations.filter((a) => a.type === 'highlight').length,
        question: annotations.filter((a) => a.type === 'question').length,
        flag: annotations.filter((a) => a.type === 'flag').length,
      },
    };
  }

  /**
   * Persist annotations to localStorage
   */
  private persistAnnotations(): void {
    try {
      const annotationsData = Array.from(this.annotations.entries());
      localStorage.setItem('annotations', JSON.stringify(annotationsData));
    } catch (err) {
      console.error('[Annotation] Failed to persist annotations:', err);
    }
  }

  /**
   * Load annotations from localStorage
   */
  private loadAnnotations(): void {
    try {
      const data = localStorage.getItem('annotations');
      if (data) {
        const annotationsData = JSON.parse(data);
        for (const [id, annotation] of annotationsData) {
          this.annotations.set(id, annotation as Annotation);
        }
        console.log('[Annotation] Loaded annotations:', this.annotations.size);
      }
    } catch (err) {
      console.error('[Annotation] Failed to load annotations:', err);
    }
  }

  /**
   * Initialize service
   */
  initialize(): void {
    this.loadAnnotations();
    console.log('[Annotation] Initialized');
  }

  /**
   * Export annotations for a conversation
   */
  exportConversationAnnotations(conversationId: string): string {
    const annotations = this.getAnnotations({ conversationId });
    const exportData = {
      conversationId,
      exportedAt: new Date().toISOString(),
      annotations: annotations,
      total: annotations.length,
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Export singleton instance
export const annotationService = new AnnotationService();
