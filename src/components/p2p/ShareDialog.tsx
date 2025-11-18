/**
 * Share Dialog Component
 *
 * Allows users to share conversations via P2P
 * - Generate shareable links
 * - Choose permission level (read-only, read-write)
 * - Set expiration and usage limits
 * - Copy share link to clipboard
 * - Revoke share links
 * - View active share links
 */

import { useState } from 'react';
import { p2pService, type SharePermission, type ShareLink } from '../../services/p2p.service';
import './ShareDialog.css';

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle: string;
}

export function ShareDialog({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
}: ShareDialogProps) {
  const [selectedPermission, setSelectedPermission] = useState<SharePermission>('read-only');
  const [expiryHours, setExpiryHours] = useState(24);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'active'>('create');

  const handleGenerateLink = () => {
    try {
      const shareLink = p2pService.generateShareLink(
        conversationId,
        selectedPermission,
        expiryHours * 60,
        maxUses
      );

      setShareLinks([...shareLinks, shareLink]);
      console.log('[ShareDialog] Generated share link:', shareLink.shareCode);
    } catch (error) {
      console.error('[ShareDialog] Failed to generate share link:', error);
      alert('Failed to generate share link');
    }
  };

  const handleCopyLink = (shareCode: string) => {
    const shareUrl = `${window.location.origin}?share=${shareCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(shareCode);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleRevokeLink = (shareId: string) => {
    p2pService.revokeShareLink(shareId);
    setShareLinks(shareLinks.filter((link) => link.id !== shareId));
    console.log('[ShareDialog] Revoked share link:', shareId);
  };

  const formatExpiryTime = (expiresAt: number): string => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffHours = Math.floor((expiresAt - now.getTime()) / (1000 * 60 * 60));

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
    <div className="share-dialog-overlay" onClick={onClose}>
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-dialog-header">
          <h2>Share Conversation</h2>
          <button
            className="share-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Conversation Info */}
        <div className="share-conversation-info">
          <span className="conversation-name">{conversationTitle}</span>
        </div>

        {/* Tabs */}
        <div className="share-tabs">
          <button
            className={`share-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Link
          </button>
          <button
            className={`share-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Links ({shareLinks.length})
          </button>
        </div>

        {/* Content */}
        <div className="share-dialog-content">
          {activeTab === 'create' && (
            <div className="share-create-section">
              {/* Permission Selection */}
              <div className="share-setting">
                <label className="share-label">Permission Level</label>
                <div className="share-permission-options">
                  <label className="share-radio">
                    <input
                      type="radio"
                      value="read-only"
                      checked={selectedPermission === 'read-only'}
                      onChange={(e) => setSelectedPermission(e.target.value as SharePermission)}
                    />
                    <span className="radio-label">
                      <strong>Read Only</strong>
                      <span className="radio-description">View conversation only</span>
                    </span>
                  </label>
                  <label className="share-radio">
                    <input
                      type="radio"
                      value="read-write"
                      checked={selectedPermission === 'read-write'}
                      onChange={(e) => setSelectedPermission(e.target.value as SharePermission)}
                    />
                    <span className="radio-label">
                      <strong>Read & Write</strong>
                      <span className="radio-description">View and edit conversation</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Expiry Setting */}
              <div className="share-setting">
                <label htmlFor="share-expiry" className="share-label">
                  Link Expires In
                </label>
                <select
                  id="share-expiry"
                  value={expiryHours}
                  onChange={(e) => setExpiryHours(Number(e.target.value))}
                  className="share-select"
                >
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>1 week</option>
                  <option value={720}>1 month</option>
                </select>
              </div>

              {/* Max Uses Setting */}
              <div className="share-setting">
                <label htmlFor="share-max-uses" className="share-label">
                  Max Uses (Optional)
                </label>
                <input
                  id="share-max-uses"
                  type="number"
                  min="1"
                  value={maxUses ?? ''}
                  onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Unlimited"
                  className="share-input"
                />
                <span className="share-hint">Leave empty for unlimited uses</span>
              </div>

              {/* Generate Button */}
              <button className="share-generate-btn" onClick={handleGenerateLink}>
                Generate Share Link
              </button>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="share-active-section">
              {shareLinks.length === 0 ? (
                <div className="share-empty">
                  <p>No active share links yet</p>
                  <p className="share-empty-hint">Create a new share link to get started</p>
                </div>
              ) : (
                <div className="share-links-list">
                  {shareLinks.map((link) => (
                    <div key={link.id} className="share-link-item">
                      <div className="share-link-info">
                        <div className="share-link-code">{link.shareCode}</div>
                        <div className="share-link-meta">
                          <span className="share-link-permission">
                            {link.permission === 'read-only' ? '🔒 Read Only' : '✏️ Read & Write'}
                          </span>
                          <span className="share-link-expiry">
                            Expires in {formatExpiryTime(link.expiresAt)}
                          </span>
                          {link.maxUses && (
                            <span className="share-link-uses">
                              {link.usedCount}/{link.maxUses} uses
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="share-link-actions">
                        <button
                          className="share-link-copy-btn"
                          onClick={() => handleCopyLink(link.shareCode)}
                          aria-label="Copy share link"
                        >
                          {copiedLink === link.shareCode ? '✓ Copied' : '📋 Copy'}
                        </button>
                        <button
                          className="share-link-revoke-btn"
                          onClick={() => handleRevokeLink(link.id)}
                          aria-label="Revoke share link"
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

export default ShareDialog;
