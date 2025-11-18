/**
 * Import Dialog Component
 *
 * Allows users to import conversation data from external platforms:
 * - ChatGPT (OpenAI export format)
 * - Claude (Anthropic export format)
 * - Auto-detection of format
 *
 * Features:
 * - File upload with drag-and-drop
 * - Format selection (auto/manual)
 * - Import options configuration
 * - Progress tracking
 * - Error reporting
 */

import { useState, useRef } from 'react';
import { importService, type ImportStats, type ImportOptions } from '../../services/import.service';
import './ImportDialog.css';

export interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (stats: ImportStats) => void;
}

type ImportFormat = 'auto' | 'chatgpt' | 'claude';

export function ImportDialog({
  isOpen,
  onClose,
  onImportComplete,
}: ImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormat>('auto');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [preserveTimestamps, setPreserveTimestamps] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setImportStats(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    try {
      setIsImporting(true);
      setError(null);
      setImportStats(null);

      // Read file content
      const fileContent = await readFileAsText(selectedFile);

      // Build import options
      const options: ImportOptions = {
        skipDuplicates,
        preserveTimestamps,
        createNewConversations: true,
      };

      // Import based on selected format
      let stats: ImportStats;

      switch (format) {
        case 'auto':
          stats = await importService.importAuto(fileContent, options);
          break;
        case 'chatgpt':
          stats = await importService.importChatGPT(fileContent, options);
          break;
        case 'claude':
          stats = await importService.importClaude(fileContent, options);
          break;
        default:
          throw new Error(`Unknown format: ${format}`);
      }

      setImportStats(stats);

      // Check for errors
      if (stats.errors.length > 0) {
        setError(stats.errors.join('\n'));
      }

      // Notify parent
      if (onImportComplete) {
        onImportComplete(stats);
      }

      // Close dialog after short delay if successful
      if (stats.errors.length === 0 && stats.conversationsImported > 0) {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (err) {
      console.error('[ImportDialog] Import failed:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setSelectedFile(null);
    setFormat('auto');
    setSkipDuplicates(true);
    setPreserveTimestamps(true);
    setImportStats(null);
    setError(null);
    setIsDragging(false);

    onClose();
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="import-dialog-overlay" onClick={handleClose}>
      <div className="import-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="import-dialog-header">
          <h2>Import Conversations</h2>
          <button className="import-dialog-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="import-dialog-content">
          {/* File Upload Area */}
          <div className="import-section">
            <label className="import-label">Select Export File</label>
            <div
              className={`import-dropzone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              {selectedFile ? (
                <div className="file-selected">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-size">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dropzone-placeholder">
                  <div className="upload-icon">⬆️</div>
                  <p>Drag & drop your export file here</p>
                  <p className="dropzone-hint">or click to browse</p>
                  <p className="dropzone-formats">Supported: .json files</p>
                </div>
              )}
            </div>
          </div>

          {/* Format Selection */}
          <div className="import-section">
            <label className="import-label">Import Format</label>
            <div className="import-format-options">
              <button
                className={`format-option ${format === 'auto' ? 'selected' : ''}`}
                onClick={() => setFormat('auto')}
              >
                <div className="format-label">Auto-Detect</div>
                <div className="format-description">Automatically detect format</div>
              </button>
              <button
                className={`format-option ${format === 'chatgpt' ? 'selected' : ''}`}
                onClick={() => setFormat('chatgpt')}
              >
                <div className="format-label">ChatGPT</div>
                <div className="format-description">OpenAI conversation export</div>
              </button>
              <button
                className={`format-option ${format === 'claude' ? 'selected' : ''}`}
                onClick={() => setFormat('claude')}
              >
                <div className="format-label">Claude</div>
                <div className="format-description">Anthropic conversation export</div>
              </button>
            </div>
          </div>

          {/* Import Options */}
          <div className="import-section">
            <label className="import-label">Options</label>
            <div className="import-checkboxes">
              <label className="import-checkbox">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                <span>Skip duplicate conversations</span>
              </label>
              <label className="import-checkbox">
                <input
                  type="checkbox"
                  checked={preserveTimestamps}
                  onChange={(e) => setPreserveTimestamps(e.target.checked)}
                />
                <span>Preserve original timestamps</span>
              </label>
            </div>
          </div>

          {/* Import Stats */}
          {importStats && (
            <div className="import-stats">
              <h3>Import Results</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{importStats.conversationsImported}</div>
                  <div className="stat-label">Conversations</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{importStats.messagesImported}</div>
                  <div className="stat-label">Messages</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{importStats.errors.length}</div>
                  <div className="stat-label">Errors</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{importStats.warnings.length}</div>
                  <div className="stat-label">Warnings</div>
                </div>
              </div>
              {importStats.errors.length > 0 && (
                <div className="import-errors">
                  <h4>Errors:</h4>
                  <ul>
                    {importStats.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importStats.warnings.length > 0 && (
                <div className="import-warnings">
                  <h4>Warnings:</h4>
                  <ul>
                    {importStats.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && <div className="import-error">{error}</div>}
        </div>

        <div className="import-dialog-footer">
          <button
            className="import-button import-button-secondary"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            className="import-button import-button-primary"
            onClick={handleImport}
            disabled={isImporting || !selectedFile}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
