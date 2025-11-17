/**
 * Conversation Importer Component
 *
 * Allows users to import conversations from ChatGPT and Claude
 * Provides file upload, format selection, progress tracking, and results display
 */

import { useState, useRef } from 'react';
import { importService, type ImportStats, type ImportOptions } from '../services/import.service';
import './ConversationImporter.css';

type ImportFormat = 'auto' | 'chatgpt' | 'claude';
type ImportState = 'idle' | 'importing' | 'completed' | 'error';

export function ConversationImporter() {
  const [format, setFormat] = useState<ImportFormat>('auto');
  const [state, setState] = useState<ImportState>('idle');
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    skipDuplicates: true,
    preserveTimestamps: true,
    createNewConversations: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState('importing');
    setStats(null);

    try {
      const content = await file.text();

      let result: ImportStats;
      switch (format) {
        case 'chatgpt':
          result = await importService.importChatGPT(content, options);
          break;
        case 'claude':
          result = await importService.importClaude(content, options);
          break;
        case 'auto':
        default:
          result = await importService.importAuto(content, options);
          break;
      }

      setStats(result);
      setState(result.errors.length > 0 ? 'error' : 'completed');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('[Import] Failed:', err);
      setStats({
        conversationsImported: 0,
        messagesImported: 0,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
        warnings: [],
      });
      setState('error');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setState('idle');
    setStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="conversation-importer">
      <div className="importer-header">
        <h3>📥 Import Conversations</h3>
        <p className="importer-description">
          Import your conversation history from ChatGPT or Claude. Your data will be stored locally
          and never leaves your device.
        </p>
      </div>

      {state === 'idle' && (
        <div className="importer-config">
          {/* Format Selection */}
          <div className="import-section">
            <label className="import-label">Source Format</label>
            <div className="format-selector">
              <button
                className={`format-button ${format === 'auto' ? 'active' : ''}`}
                onClick={() => setFormat('auto')}
              >
                🔍 Auto-Detect
              </button>
              <button
                className={`format-button ${format === 'chatgpt' ? 'active' : ''}`}
                onClick={() => setFormat('chatgpt')}
              >
                <span className="format-icon">💬</span> ChatGPT
              </button>
              <button
                className={`format-button ${format === 'claude' ? 'active' : ''}`}
                onClick={() => setFormat('claude')}
              >
                <span className="format-icon">🤖</span> Claude
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="import-section">
            <label className="import-label">Import Options</label>
            <div className="import-options">
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={options.preserveTimestamps}
                  onChange={(e) =>
                    setOptions({ ...options, preserveTimestamps: e.target.checked })
                  }
                />
                <span>Preserve original timestamps</span>
              </label>
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={options.skipDuplicates}
                  onChange={(e) => setOptions({ ...options, skipDuplicates: e.target.checked })}
                />
                <span>Skip duplicate conversations</span>
              </label>
            </div>
          </div>

          {/* Instructions */}
          <div className="import-section">
            <label className="import-label">How to Export</label>
            <div className="export-instructions">
              {format === 'chatgpt' || format === 'auto' ? (
                <div className="instruction-block">
                  <strong>From ChatGPT:</strong>
                  <ol>
                    <li>Go to ChatGPT Settings → Data Controls</li>
                    <li>Click "Export data"</li>
                    <li>Wait for email with download link</li>
                    <li>Extract ZIP and upload conversations.json</li>
                  </ol>
                </div>
              ) : null}

              {format === 'claude' || format === 'auto' ? (
                <div className="instruction-block">
                  <strong>From Claude:</strong>
                  <ol>
                    <li>Go to Claude Settings → Data & Privacy</li>
                    <li>Click "Export conversations"</li>
                    <li>Wait for download to complete</li>
                    <li>Upload the exported JSON file</li>
                  </ol>
                </div>
              ) : null}
            </div>
          </div>

          {/* File Upload */}
          <div className="import-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button className="upload-button" onClick={handleUploadClick}>
              📁 Select JSON File
            </button>
          </div>
        </div>
      )}

      {state === 'importing' && (
        <div className="importer-status importing">
          <div className="spinner"></div>
          <p>Importing conversations...</p>
        </div>
      )}

      {(state === 'completed' || state === 'error') && stats && (
        <div className={`importer-results ${state}`}>
          <div className="results-header">
            <h4>{state === 'completed' ? '✅ Import Complete' : '⚠️ Import Completed with Errors'}</h4>
          </div>

          <div className="results-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.conversationsImported}</span>
              <span className="stat-label">Conversations</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.messagesImported}</span>
              <span className="stat-label">Messages</span>
            </div>
          </div>

          {stats.errors.length > 0 && (
            <div className="results-section errors">
              <h5>❌ Errors ({stats.errors.length})</h5>
              <ul>
                {stats.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {stats.warnings.length > 0 && (
            <div className="results-section warnings">
              <h5>⚠️ Warnings ({stats.warnings.length})</h5>
              <ul>
                {stats.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="results-actions">
            <button className="action-button primary" onClick={handleReset}>
              Import Another File
            </button>
            <button className="action-button secondary" onClick={() => window.location.reload()}>
              Refresh to See Imported Conversations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
