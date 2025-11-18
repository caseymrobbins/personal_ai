/**
 * Export Service for SML Guardian
 *
 * Provides data export functionality:
 * - PDF exports with formatted conversations
 * - Excel/CSV exports with structured data
 * - JSON exports for data portability
 * - Custom date range filtering
 * - Metadata inclusion (timestamps, governance metrics)
 */

import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { dbService, type Message, type Conversation } from './db.service';
import { analyticsService } from './analytics.service';

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

/**
 * Date range for filtering exports
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Export options configuration
 */
export interface ExportOptions {
  format: ExportFormat;
  conversationId?: string; // If not provided, exports all conversations
  dateRange?: DateRange;
  includeMetadata?: boolean;
  includeGovernanceMetrics?: boolean;
  includeAttachments?: boolean; // For JSON exports
}

/**
 * Exported conversation data structure
 */
export interface ExportedConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  messages: ExportedMessage[];
  metadata?: {
    totalTokens?: number;
    avgResponseTime?: number;
    tags?: string[];
  };
}

/**
 * Exported message structure
 */
export interface ExportedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  moduleUsed?: string | null;
}

class ExportService {
  private readonly PDF_MARGIN = 20;
  private readonly PDF_LINE_HEIGHT = 7;
  private readonly PDF_PAGE_WIDTH = 210; // A4 width in mm
  private readonly PDF_PAGE_HEIGHT = 297; // A4 height in mm
  private readonly PDF_CONTENT_WIDTH = this.PDF_PAGE_WIDTH - 2 * this.PDF_MARGIN;

  /**
   * Export conversations based on provided options
   */
  async exportData(options: ExportOptions): Promise<void> {
    try {
      console.log('[Export] Starting export with options:', options);

      // Get conversations to export
      const conversations = await this.getConversationsForExport(options);

      if (conversations.length === 0) {
        throw new Error('No conversations found matching export criteria');
      }

      // Export based on format
      switch (options.format) {
        case 'pdf':
          await this.exportToPDF(conversations, options);
          break;
        case 'excel':
          await this.exportToExcel(conversations, options);
          break;
        case 'csv':
          await this.exportToCSV(conversations, options);
          break;
        case 'json':
          await this.exportToJSON(conversations, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      console.log('[Export] Export completed successfully');
    } catch (error) {
      console.error('[Export] Export failed:', error);
      throw error;
    }
  }

  /**
   * Get conversations matching export criteria
   */
  private async getConversationsForExport(
    options: ExportOptions
  ): Promise<ExportedConversation[]> {
    const db = await dbService.getDatabase();
    let conversations: Conversation[] = [];

    // Get specific conversation or all conversations
    if (options.conversationId) {
      const conv = await dbService.getConversation(options.conversationId);
      if (conv) {
        conversations = [conv];
      }
    } else {
      conversations = await dbService.getConversations();
    }

    // Filter by date range if provided
    if (options.dateRange) {
      const { startDate, endDate } = options.dateRange;
      conversations = conversations.filter(
        (conv) =>
          conv.createdAt >= startDate.getTime() &&
          conv.createdAt <= endDate.getTime()
      );
    }

    // Convert to exported format
    const exportedConversations: ExportedConversation[] = [];

    for (const conv of conversations) {
      const messages = await dbService.getMessages(conv.id);

      const exportedMessages: ExportedMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        moduleUsed: msg.moduleUsed,
      }));

      const exported: ExportedConversation = {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: messages.length,
        messages: exportedMessages,
      };

      // Add metadata if requested
      if (options.includeMetadata) {
        exported.metadata = {
          totalTokens: messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
        };
      }

      exportedConversations.push(exported);
    }

    return exportedConversations;
  }

  /**
   * Export to PDF format
   */
  private async exportToPDF(
    conversations: ExportedConversation[],
    options: ExportOptions
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPosition = this.PDF_MARGIN;
    let isFirstPage = true;

    // Add title page
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SML Guardian - Conversation Export', this.PDF_MARGIN, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      this.PDF_MARGIN,
      yPosition
    );
    yPosition += 10;

    doc.text(
      `Total Conversations: ${conversations.length}`,
      this.PDF_MARGIN,
      yPosition
    );
    yPosition += 10;

    if (options.dateRange) {
      doc.text(
        `Date Range: ${options.dateRange.startDate.toLocaleDateString()} - ${options.dateRange.endDate.toLocaleDateString()}`,
        this.PDF_MARGIN,
        yPosition
      );
      yPosition += 10;
    }

    // Add conversations
    for (const conv of conversations) {
      // Start new page for each conversation
      doc.addPage();
      yPosition = this.PDF_MARGIN;

      // Conversation header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(conv.title, this.PDF_MARGIN, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Created: ${new Date(conv.createdAt).toLocaleString()}`,
        this.PDF_MARGIN,
        yPosition
      );
      yPosition += 6;
      doc.text(
        `Messages: ${conv.messageCount}`,
        this.PDF_MARGIN,
        yPosition
      );
      yPosition += 10;

      // Messages
      for (const message of conv.messages) {
        // Check if we need a new page
        if (yPosition > this.PDF_PAGE_HEIGHT - this.PDF_MARGIN - 30) {
          doc.addPage();
          yPosition = this.PDF_MARGIN;
        }

        // Message header (role + timestamp)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const roleText =
          message.role === 'user'
            ? 'User'
            : message.role === 'assistant'
            ? 'AI Assistant'
            : 'System';
        const timestampText = new Date(message.timestamp).toLocaleString();
        doc.text(`${roleText} - ${timestampText}`, this.PDF_MARGIN, yPosition);
        yPosition += 6;

        if (message.moduleUsed) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.text(`(via ${message.moduleUsed})`, this.PDF_MARGIN, yPosition);
          yPosition += 5;
        }

        // Message content
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Split content into lines that fit the page width
        const lines = doc.splitTextToSize(
          message.content,
          this.PDF_CONTENT_WIDTH
        );

        for (const line of lines) {
          // Check page overflow
          if (yPosition > this.PDF_PAGE_HEIGHT - this.PDF_MARGIN - 10) {
            doc.addPage();
            yPosition = this.PDF_MARGIN;
          }

          doc.text(line, this.PDF_MARGIN, yPosition);
          yPosition += this.PDF_LINE_HEIGHT;
        }

        yPosition += 5; // Space between messages
      }

      // Add metadata if requested
      if (options.includeMetadata && conv.metadata) {
        yPosition += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');

        if (conv.metadata.totalTokens) {
          doc.text(
            `Total Tokens: ${conv.metadata.totalTokens}`,
            this.PDF_MARGIN,
            yPosition
          );
          yPosition += 6;
        }
      }
    }

    // Save PDF
    const filename = this.generateFilename('pdf', options);
    doc.save(filename);
  }

  /**
   * Export to Excel format
   */
  private async exportToExcel(
    conversations: ExportedConversation[],
    options: ExportOptions
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = conversations.map((conv) => ({
      'Conversation ID': conv.id,
      'Title': conv.title,
      'Created': new Date(conv.createdAt).toLocaleString(),
      'Updated': new Date(conv.updatedAt).toLocaleString(),
      'Message Count': conv.messageCount,
      'Total Tokens': conv.metadata?.totalTokens || 0,
    }));

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create messages sheet
    const messagesData: any[] = [];

    for (const conv of conversations) {
      for (const msg of conv.messages) {
        messagesData.push({
          'Conversation Title': conv.title,
          'Conversation ID': conv.id,
          'Role': msg.role,
          'Content': msg.content,
          'Timestamp': new Date(msg.timestamp).toLocaleString(),
          'Module': msg.moduleUsed || '',
        });
      }
    }

    const messagesSheet = XLSX.utils.json_to_sheet(messagesData);
    XLSX.utils.book_append_sheet(workbook, messagesSheet, 'Messages');

    // Add governance metrics sheet if requested
    if (options.includeGovernanceMetrics) {
      const metrics = analyticsService.getGovernanceMetrics();
      const metricsData = [
        { 'Metric': 'Privacy Score', 'Value': metrics.privacyScore },
        { 'Metric': 'Transparency Score', 'Value': metrics.transparencyScore },
        { 'Metric': 'Accountability Score', 'Value': metrics.accountabilityScore },
        { 'Metric': 'Overall Score', 'Value': metrics.overallScore },
      ];

      const metricsSheet = XLSX.utils.json_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Governance');
    }

    // Save workbook
    const filename = this.generateFilename('xlsx', options);
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    conversations: ExportedConversation[],
    options: ExportOptions
  ): Promise<void> {
    // Create flat data structure for CSV
    const csvData: any[] = [];

    for (const conv of conversations) {
      for (const msg of conv.messages) {
        csvData.push({
          'Conversation Title': conv.title,
          'Conversation ID': conv.id,
          'Created': new Date(conv.createdAt).toLocaleString(),
          'Role': msg.role,
          'Content': msg.content,
          'Timestamp': new Date(msg.timestamp).toLocaleString(),
          'Module': msg.moduleUsed || '',
        });
      }
    }

    // Convert to worksheet then to CSV
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Download CSV
    const filename = this.generateFilename('csv', options);
    this.downloadTextFile(csv, filename, 'text/csv');
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    conversations: ExportedConversation[],
    options: ExportOptions
  ): Promise<void> {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      conversations,
    };

    // Add governance metrics if requested
    if (options.includeGovernanceMetrics) {
      const metrics = analyticsService.getGovernanceMetrics();
      (exportData as any).governanceMetrics = metrics;
    }

    const json = JSON.stringify(exportData, null, 2);
    const filename = this.generateFilename('json', options);
    this.downloadTextFile(json, filename, 'application/json');
  }

  /**
   * Generate filename for export
   */
  private generateFilename(extension: string, options: ExportOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const prefix = options.conversationId
      ? `conversation-${options.conversationId.slice(0, 8)}`
      : 'conversations';
    return `sml-guardian-${prefix}-${timestamp}.${extension}`;
  }

  /**
   * Download text file (for CSV and JSON)
   */
  private downloadTextFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get available date ranges for quick selection
   */
  getQuickDateRanges(): { label: string; range: DateRange }[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return [
      {
        label: 'Today',
        range: {
          startDate: today,
          endDate: now,
        },
      },
      {
        label: 'Last 7 Days',
        range: {
          startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: now,
        },
      },
      {
        label: 'Last 30 Days',
        range: {
          startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now,
        },
      },
      {
        label: 'Last 90 Days',
        range: {
          startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
          endDate: now,
        },
      },
      {
        label: 'This Year',
        range: {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: now,
        },
      },
      {
        label: 'All Time',
        range: {
          startDate: new Date(0),
          endDate: now,
        },
      },
    ];
  }
}

export const exportService = new ExportService();
