/**
 * Annotation Button Component
 *
 * Simple button to open/toggle the annotation panel
 * Shows badge with count of active annotations
 */

import { annotationService } from '../../services/annotation.service';
import './AnnotationButton.css';

export interface AnnotationButtonProps {
  conversationId: string;
  onClick: () => void;
  isActive?: boolean;
}

export function AnnotationButton({ conversationId, onClick, isActive = false }: AnnotationButtonProps) {
  const unresolvedCount = annotationService.getUnresolvedCount(conversationId);
  const stats = annotationService.getConversationStats(conversationId);

  return (
    <button
      className={`annotation-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-label={`Annotations (${stats.total} total, ${stats.active} active)`}
      title={`Annotations: ${stats.total} total, ${stats.active} active`}
    >
      <span className="annotation-icon">💬</span>
      {stats.total > 0 && <span className="annotation-badge">{stats.total}</span>}
      {unresolvedCount > 0 && <span className="annotation-unresolved-badge">{unresolvedCount}</span>}
    </button>
  );
}

export default AnnotationButton;
