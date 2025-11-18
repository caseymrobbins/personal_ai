/**
 * Conversation Sidebar Component (Sprint 4 + Sprint 11)
 *
 * Provides conversation management:
 * - List all conversations
 * - Create new conversation
 * - Switch between conversations
 * - Rename conversations
 * - Delete conversations
 * - Export conversations
 * - Semantic search across conversations (Sprint 11)
 */

import { useState } from 'react';
import { dbService, type Conversation } from '../services/db.service';
import { searchService, type SearchResult } from '../services/search.service';
import { attachmentsService } from '../services/attachments.service';
import { SearchResults } from './SearchResults';
import { ImportDialog } from './import/ImportDialog';
import { BackupDialog } from './backup/BackupDialog';
import { ThemeDialog } from './theme/ThemeDialog';
import { ShareDialog } from './p2p/ShareDialog';
import './ConversationSidebar.css';

export interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (conversation: Conversation) => void;
  onConversationCreate: () => void;
  onConversationUpdate: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationCreate,
  onConversationUpdate,
  isOpen,
  onToggle,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareConversationId, setShareConversationId] = useState<string | null>(null);
  const [shareConversationTitle, setShareConversationTitle] = useState('');

  const handleNewConversation = () => {
    onConversationCreate();
  };

  const handleImportComplete = (stats: any) => {
    console.log('[ConversationSidebar] Import completed:', stats);
    // Refresh conversation list
    onConversationUpdate();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const results = await searchService.search(searchQuery.trim(), {
        maxResults: 30,
        minSimilarity: 0.3,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('[ConversationSidebar] Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    // Find and select the conversation
    const conversation = conversations.find(c => c.id === result.conversationId);
    if (conversation) {
      onConversationSelect(conversation);
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const handleCloseSearch = () => {
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleRename = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      dbService.updateConversationTitle(id, editingTitle.trim());
      onConversationUpdate();
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleDelete = (conversation: Conversation) => {
    if (confirm(`Delete conversation "${conversation.title}"?\n\nThis cannot be undone.`)) {
      dbService.deleteConversation(conversation.id);
      onConversationUpdate();
    }
  };

  const handleExport = (conversation: Conversation) => {
    // Get all messages for this conversation
    const messages = dbService.getConversationHistory(conversation.id);

    // Create export object with attachments
    const exportData = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        created_date: new Date(conversation.created_at).toISOString(),
      },
      messages: messages.map(msg => {
        // Get attachments for this message
        const attachments = attachmentsService.getMessageAttachments(msg.id);

        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          module_used: msg.module_used,
          timestamp: msg.timestamp,
          timestamp_date: new Date(msg.timestamp).toISOString(),
          attachments: attachments.map(att => ({
            id: att.id,
            type: att.type,
            mime_type: att.mime_type,
            filename: att.filename,
            data: att.data, // base64 encoded
            size: att.size,
            created_at: att.created_at,
          })),
        };
      }),
      exported_at: new Date().toISOString(),
      exported_by: 'SML Guardian',
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = (conversation: Conversation) => {
    setShareConversationId(conversation.id);
    setShareConversationTitle(conversation.title);
    setShowShareDialog(true);
  };

  const handleExportAll = () => {
    if (!confirm('Export all conversations?\n\nThis will create a JSON file with all your conversations and messages.')) {
      return;
    }

    // Get all conversations and their messages with attachments
    const allConversations = conversations.map(conv => ({
      conversation: {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        created_date: new Date(conv.created_at).toISOString(),
      },
      messages: dbService.getConversationHistory(conv.id).map(msg => {
        // Get attachments for this message
        const attachments = attachmentsService.getMessageAttachments(msg.id);

        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          module_used: msg.module_used,
          timestamp: msg.timestamp,
          timestamp_date: new Date(msg.timestamp).toISOString(),
          attachments: attachments.map(att => ({
            id: att.id,
            type: att.type,
            mime_type: att.mime_type,
            filename: att.filename,
            data: att.data, // base64 encoded
            size: att.size,
            created_at: att.created_at,
          })),
        };
      }),
    }));

    const exportData = {
      conversations: allConversations,
      total_conversations: allConversations.length,
      total_messages: allConversations.reduce((sum, c) => sum + c.messages.length, 0),
      exported_at: new Date().toISOString(),
      exported_by: 'SML Guardian',
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sml-guardian-conversations-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Toggle button for mobile */}
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label="Toggle conversations sidebar"
        aria-expanded={isOpen}
        aria-controls="conversations-nav"
      >
        <span aria-hidden="true">{isOpen ? '✕' : '💬'}</span>
      </button>

      {/* Sidebar */}
      <nav
        id="conversations-nav"
        className={`conversation-sidebar ${isOpen ? 'open' : 'closed'}`}
        role="navigation"
        aria-label="Conversations navigation"
      >
        <div className="sidebar-header">
          <h2>Conversations</h2>
          <div className="sidebar-header-actions">
            <button
              className="import-conversation-btn"
              onClick={() => setShowImportDialog(true)}
              title="Import conversations from ChatGPT or Claude"
            >
              📥 Import
            </button>
            <button className="new-conversation-btn" onClick={handleNewConversation} title="New conversation">
              ➕ New
            </button>
          </div>
        </div>

        {/* Search Bar (Sprint 11) */}
        <div className="sidebar-search" role="search">
          <label htmlFor="conversation-search" className="sr-only">
            Search conversations
          </label>
          <input
            id="conversation-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search conversations..."
            className="search-input"
            aria-label="Search conversations"
            aria-describedby="search-instructions"
          />
          <span id="search-instructions" className="sr-only">
            Type at least 3 characters and press Enter to search
          </span>
          <button
            onClick={handleSearch}
            disabled={isSearching || searchQuery.trim().length < 3}
            className="search-btn"
            aria-label={isSearching ? 'Searching...' : 'Search conversations'}
          >
            <span aria-hidden="true">{isSearching ? '⏳' : '🔍'}</span>
          </button>
        </div>

        {/* Search Results Overlay */}
        {showSearchResults && (
          <SearchResults
            results={searchResults}
            query={searchQuery}
            onResultClick={handleSearchResultClick}
            onClose={handleCloseSearch}
          />
        )}

        <div className="conversations-list" role="list" aria-label="Conversation history">
          {conversations.length === 0 ? (
            <div className="empty-conversations" role="status">
              <p>No conversations yet</p>
              <p className="empty-hint">Click "New" to start</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  conversation.id === currentConversationId ? 'active' : ''
                }`}
                role="listitem"
                aria-current={conversation.id === currentConversationId ? 'page' : undefined}
              >
                {editingId === conversation.id ? (
                  <div className="conversation-edit">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(conversation.id);
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      autoFocus
                      className="conversation-edit-input"
                    />
                    <div className="conversation-edit-actions">
                      <button
                        onClick={() => handleSaveRename(conversation.id)}
                        className="edit-save-btn"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelRename}
                        className="edit-cancel-btn"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="conversation-main"
                      onClick={() => onConversationSelect(conversation)}
                    >
                      <div className="conversation-title">{conversation.title}</div>
                      <div className="conversation-date">{formatDate(conversation.created_at)}</div>
                    </div>
                    <div className="conversation-actions" role="group" aria-label="Conversation actions">
                      <button
                        onClick={() => handleRename(conversation)}
                        className="conversation-action-btn"
                        aria-label={`Rename conversation ${conversation.title}`}
                      >
                        <span aria-hidden="true">✏️</span>
                      </button>
                      <button
                        onClick={() => handleShare(conversation)}
                        className="conversation-action-btn"
                        aria-label={`Share conversation ${conversation.title}`}
                      >
                        <span aria-hidden="true">🔗</span>
                      </button>
                      <button
                        onClick={() => handleExport(conversation)}
                        className="conversation-action-btn"
                        aria-label={`Export conversation ${conversation.title}`}
                      >
                        <span aria-hidden="true">💾</span>
                      </button>
                      <button
                        onClick={() => handleDelete(conversation)}
                        className="conversation-action-btn delete-btn"
                        aria-label={`Delete conversation ${conversation.title}`}
                      >
                        <span aria-hidden="true">🗑️</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-buttons">
            <button
              className="export-all-btn"
              onClick={handleExportAll}
              aria-label="Export all conversations"
            >
              <span aria-hidden="true">📦</span> Export All
            </button>
            <button
              className="backup-btn"
              onClick={() => setShowBackupDialog(true)}
              aria-label="Encrypted backups"
            >
              <span aria-hidden="true">🔐</span> Backup
            </button>
            <button
              className="theme-btn"
              onClick={() => setShowThemeDialog(true)}
              aria-label="Themes and appearance settings"
            >
              <span aria-hidden="true">🎨</span> Theme
            </button>
          </div>
          <div className="sidebar-stats" role="status" aria-live="polite">
            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
          </div>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Backup Dialog */}
      <BackupDialog
        isOpen={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
      />

      {/* Theme Dialog */}
      <ThemeDialog
        isOpen={showThemeDialog}
        onClose={() => setShowThemeDialog(false)}
      />

      {/* Share Dialog */}
      {shareConversationId && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => {
            setShowShareDialog(false);
            setShareConversationId(null);
            setShareConversationTitle('');
          }}
          conversationId={shareConversationId}
          conversationTitle={shareConversationTitle}
        />
      )}
    </>
  );
}
