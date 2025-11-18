/**
 * Export Dialog Component
 *
 * Allows users to export conversation data in various formats:
 * - PDF, Excel, CSV, JSON
 * - Custom date ranges
 * - Metadata inclusion options
 */

import { useState, useEffect } from 'react';
import {
  exportService,
  type ExportFormat,
  type ExportOptions,
  type DateRange,
} from '../../services/export.service';
import { dbService, type Conversation } from '../../services/db.service';
import './ExportDialog.css';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string; // Pre-select a specific conversation
}

export function ExportDialog({
  isOpen,
  onClose,
  conversationId,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | 'all'
  >(conversationId || 'all');
  const [dateRangeOption, setDateRangeOption] = useState<string>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeGovernance, setIncludeGovernance] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const convs = await dbService.getConversations();
      setConversations(convs);
    } catch (err) {
      console.error('[ExportDialog] Failed to load conversations:', err);
      setError('Failed to load conversations');
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      // Build export options
      const options: ExportOptions = {
        format,
        conversationId:
          selectedConversationId === 'all' ? undefined : selectedConversationId,
        includeMetadata,
        includeGovernanceMetrics: includeGovernance,
      };

      // Add date range if not "all-time"
      if (dateRangeOption !== 'all-time') {
        options.dateRange = getDateRange();
      }

      // Perform export
      await exportService.exportData(options);

      // Close dialog on success
      setTimeout(() => {
        onClose();
        setIsExporting(false);
      }, 500);
    } catch (err) {
      console.error('[ExportDialog] Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const getDateRange = (): DateRange | undefined => {
    if (dateRangeOption === 'custom') {
      if (!customStartDate || !customEndDate) {
        throw new Error('Please select both start and end dates');
      }
      return {
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate),
      };
    }

    const quickRanges = exportService.getQuickDateRanges();
    const selected = quickRanges.find((r) => r.label.toLowerCase().replace(/\s/g, '-') === dateRangeOption);
    return selected?.range;
  };

  const formatOptions: { value: ExportFormat; label: string; description: string }[] = [
    {
      value: 'pdf',
      label: 'PDF',
      description: 'Formatted document with conversations',
    },
    {
      value: 'excel',
      label: 'Excel',
      description: 'Spreadsheet with multiple sheets',
    },
    {
      value: 'csv',
      label: 'CSV',
      description: 'Comma-separated values for data analysis',
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'Raw data for programmatic use',
    },
  ];

  const quickDateRanges = exportService.getQuickDateRanges();

  if (!isOpen) return null;

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog-header">
          <h2>Export Conversations</h2>
          <button className="export-dialog-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="export-dialog-content">
          {/* Format Selection */}
          <div className="export-section">
            <label className="export-label">Export Format</label>
            <div className="export-format-grid">
              {formatOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`export-format-option ${
                    format === opt.value ? 'selected' : ''
                  }`}
                  onClick={() => setFormat(opt.value)}
                >
                  <div className="export-format-label">{opt.label}</div>
                  <div className="export-format-description">
                    {opt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Selection */}
          <div className="export-section">
            <label className="export-label" htmlFor="conversation-select">
              Conversation
            </label>
            <select
              id="conversation-select"
              className="export-select"
              value={selectedConversationId}
              onChange={(e) => setSelectedConversationId(e.target.value)}
            >
              <option value="all">All Conversations</option>
              {conversations.map((conv) => (
                <option key={conv.id} value={conv.id}>
                  {conv.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selection */}
          <div className="export-section">
            <label className="export-label" htmlFor="date-range-select">
              Date Range
            </label>
            <select
              id="date-range-select"
              className="export-select"
              value={dateRangeOption}
              onChange={(e) => setDateRangeOption(e.target.value)}
            >
              {quickDateRanges.map((range) => (
                <option
                  key={range.label}
                  value={range.label.toLowerCase().replace(/\s/g, '-')}
                >
                  {range.label}
                </option>
              ))}
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom Date Range */}
            {dateRangeOption === 'custom' && (
              <div className="export-custom-dates">
                <div className="export-date-input">
                  <label htmlFor="start-date">Start Date</label>
                  <input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="export-date-input">
                  <label htmlFor="end-date">End Date</label>
                  <input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="export-section">
            <label className="export-label">Options</label>
            <div className="export-checkboxes">
              <label className="export-checkbox">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                />
                <span>Include metadata (tokens, timestamps)</span>
              </label>
              <label className="export-checkbox">
                <input
                  type="checkbox"
                  checked={includeGovernance}
                  onChange={(e) => setIncludeGovernance(e.target.checked)}
                />
                <span>Include governance metrics</span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="export-error">{error}</div>}
        </div>

        <div className="export-dialog-footer">
          <button
            className="export-button export-button-secondary"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            className="export-button export-button-primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
