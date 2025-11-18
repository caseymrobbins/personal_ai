/**
 * Export Link Dialog Component
 *
 * Allows users to:
 * - Generate encrypted shareable links for conversations
 * - Set permissions (read-only, preview)
 * - Configure expiration time
 * - Set access limits
 * - Copy share link to clipboard
 * - View and manage active export links
 * - Revoke links
 */

import { useState, useEffect } from 'react';
import { exportLinkService, type ExportLink } from '../../services/export-link.service';
import './ExportLinkDialog.css';

export interface ExportLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle: string;
}

export function ExportLinkDialog({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
}: ExportLinkDialogProps) {
  const [permission, setPermission] = useState<'read-only' | 'preview'>('read-only');
  const [expiryHours, setExpiryHours] = useState<number | null>(24);
  const [maxAccess, setMaxAccess] = useState<number | null>(null);
  const [exportLinks, setExportLinks] = useState<ExportLink[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'active'>('create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing export links when dialog opens
  useEffect(() => {
    if (isOpen) {
      const links = exportLinkService.getConversationExportLinks(conversationId);
      setExportLinks(links);
      setError(null);
    }
  }, [isOpen, conversationId]);

  const handleGenerateLink = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const result = await exportLinkService.generateExportLink(
        conversationId,
        permission,
        expiryHours,
        maxAccess
      );

      setExportLinks([...exportLinks, result.link]);
      console.log('[ExportLinkDialog] Generated export link');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
      console.error('[ExportLinkDialog] Error generating link:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = (linkId: string) => {
    const shareUrl = `${window.location.origin}?export=${linkId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleRevokeLink = (linkId: string) => {
    exportLinkService.revokeExportLink(linkId);
    setExportLinks(exportLinks.filter(link => link.id !== linkId));
    console.log('[ExportLinkDialog] Revoked export link:', linkId);
  };

  const formatExpiryTime = (expiresAt: number | null): string => {
    if (!expiresAt) return 'Never';

    const now = new Date().getTime();
    const diffHours = Math.floor((expiresAt - now) / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Expired';
    }
    if (diffHours < 24) {
      return `${diffHours}h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  if (!isOpen) return null;

  return (
    <div className="export-link-dialog-overlay" onClick={onClose}>
      <div className="export-link-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-link-dialog-header">
          <h2>Export Encrypted Link</h2>
          <button
            className="export-link-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Conversation Info */}
        <div className="export-link-conversation-info">
          <span className="conversation-name">{conversationTitle}</span>
          <span className="conversation-note">Encrypted with AES-256-GCM</span>
        </div>

        {/* Tabs */}
        <div className="export-link-tabs">
          <button
            className={`export-link-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Link
          </button>
          <button
            className={`export-link-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Links ({exportLinks.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="export-link-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="export-link-dialog-content">
          {activeTab === 'create' && (
            <div className="export-link-create-section">
              {/* Permission Selection */}
              <div className="export-link-setting">
                <label className="export-link-label">Permission Level</label>
                <div className="export-link-permission-options">
                  <label className="export-link-radio">
                    <input
                      type="radio"
                      value="read-only"
                      checked={permission === 'read-only'}
                      onChange={(e) => setPermission(e.target.value as 'read-only')}
                    />
                    <span className="radio-label">
                      <strong>Read Only</strong>
                      <span className="radio-description">View conversation messages</span>
                    </span>
                  </label>
                  <label className="export-link-radio">
                    <input
                      type="radio"
                      value="preview"
                      checked={permission === 'preview'}
                      onChange={(e) => setPermission(e.target.value as 'preview')}
                    />
                    <span className="radio-label">
                      <strong>Preview</strong>
                      <span className="radio-description">Limited preview without search</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Expiry Setting */}
              <div className="export-link-setting">
                <label htmlFor="export-link-expiry" className="export-link-label">
                  Link Expires In
                </label>
                <select
                  id="export-link-expiry"
                  value={expiryHours ?? 'never'}
                  onChange={(e) =>
                    setExpiryHours(e.target.value === 'never' ? null : Number(e.target.value))
                  }
                  className="export-link-select"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>1 week</option>
                  <option value={720}>1 month</option>
                  <option value="never">Never expires</option>
                </select>
              </div>

              {/* Max Access Setting */}
              <div className="export-link-setting">
                <label htmlFor="export-link-max-access" className="export-link-label">
                  Max Access (Optional)
                </label>
                <input
                  id="export-link-max-access"
                  type="number"
                  min="1"
                  value={maxAccess ?? ''}
                  onChange={(e) => setMaxAccess(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Unlimited"
                  className="export-link-input"
                />
                <span className="export-link-hint">Leave empty for unlimited access</span>
              </div>

              {/* Security Info */}
              <div className="export-link-security-info">
                <span className="security-icon">🔒</span>
                <div className="security-text">
                  <strong>Encrypted Link</strong>
                  <p>Conversation is encrypted with AES-256-GCM. Decryption happens locally in the recipient's browser.</p>
                </div>
              </div>

              {/* Generate Button */}
              <button
                className="export-link-generate-btn"
                onClick={handleGenerateLink}
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ Generating...' : '🔗 Generate Link'}
              </button>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="export-link-active-section">
              {exportLinks.length === 0 ? (
                <div className="export-link-empty">
                  <p>No active export links yet</p>
                  <p className="export-link-empty-hint">Create a new link to get started</p>
                </div>
              ) : (
                <div className="export-link-list">
                  {exportLinks.map((link) => (
                    <div key={link.id} className="export-link-item">
                      <div className="export-link-info">
                        <div className="export-link-id">
                          <span className="id-prefix">export=</span>
                          <span className="id-value">{link.id.substring(0, 12)}...</span>
                        </div>
                        <div className="export-link-meta">
                          <span className="export-link-permission">
                            {link.permission === 'read-only' ? '📖 Read Only' : '👁️ Preview'}
                          </span>
                          <span className="export-link-expiry">
                            Expires in {formatExpiryTime(link.expiresAt)}
                          </span>
                          {link.maxAccess && (
                            <span className="export-link-access">
                              {link.accessCount}/{link.maxAccess} accessed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="export-link-actions">
                        <button
                          className="export-link-copy-btn"
                          onClick={() => handleCopyLink(link.id)}
                          aria-label="Copy export link"
                        >
                          {copiedLink === link.id ? '✓ Copied' : '📋 Copy'}
                        </button>
                        <button
                          className="export-link-revoke-btn"
                          onClick={() => handleRevokeLink(link.id)}
                          aria-label="Revoke export link"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExportLinkDialog;
