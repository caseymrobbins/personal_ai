/**
 * Document Parsing Service for SML Guardian
 *
 * Handles document file parsing:
 * - Plain text (.txt)
 * - Markdown (.md, .markdown)
 * - PDF (.pdf)
 * - Extracts content and metadata
 * - Syntax highlighting support
 */

import { marked } from 'marked';
import * as pdfjsLib from 'pdfjs-dist';
import { dbService } from './db.service';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Document configuration
 */
export interface DocumentConfig {
  maxSizeBytes: number;
  allowedDocumentTypes: string[];
  maxPDFPages: number;
}

/**
 * Parsed document result
 */
export interface ParsedDocument {
  content: string; // Extracted text content
  html?: string; // HTML content (for markdown)
  mimeType: string;
  filename: string;
  size: number;
  metadata?: {
    pageCount?: number; // For PDFs
    title?: string;
    author?: string;
    language?: string;
  };
}

/**
 * Document attachment (stored in DB)
 */
export interface DocumentAttachment {
  id: string;
  message_id: string;
  type: 'document';
  mime_type: string;
  filename: string;
  content: string; // Extracted text
  html_content?: string; // Rendered HTML (for markdown)
  size: number;
  metadata?: string; // JSON string
  created_at: number;
}

class DocumentParsingService {
  private readonly config: DocumentConfig = {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedDocumentTypes: [
      'text/plain',
      'text/markdown',
      'application/pdf',
    ],
    maxPDFPages: 100,
  };

  /**
   * Parse document file
   */
  async parseDocument(file: File): Promise<ParsedDocument> {
    try {
      console.log(`[Documents] Parsing: ${file.name} (${file.type}, ${file.size} bytes)`);

      // Validate
      if (!this.config.allowedDocumentTypes.includes(file.type)) {
        throw new Error(`Unsupported document type: ${file.type}`);
      }

      if (file.size > this.config.maxSizeBytes) {
        throw new Error(`Document too large: ${this.formatBytes(file.size)}. Maximum: ${this.formatBytes(this.config.maxSizeBytes)}`);
      }

      // Parse based on type
      let result: ParsedDocument;

      if (file.type === 'application/pdf') {
        result = await this.parsePDF(file);
      } else if (file.type === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        result = await this.parseMarkdown(file);
      } else if (file.type === 'text/plain') {
        result = await this.parseText(file);
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      console.log(`[Documents] ✅ Parsed: ${result.content.length} characters`);
      return result;
    } catch (err) {
      console.error('[Documents] ❌ Parsing failed:', err);
      throw err;
    }
  }

  /**
   * Parse plain text file
   */
  private async parseText(file: File): Promise<ParsedDocument> {
    const content = await file.text();

    return {
      content,
      mimeType: file.type,
      filename: file.name,
      size: file.size,
    };
  }

  /**
   * Parse markdown file
   */
  private async parseMarkdown(file: File): Promise<ParsedDocument> {
    const content = await file.text();

    // Configure marked for syntax highlighting
    marked.setOptions({
      breaks: true,
      gfm: true, // GitHub Flavored Markdown
    });

    // Parse markdown to HTML
    const html = await marked.parse(content);

    return {
      content,
      html,
      mimeType: 'text/markdown',
      filename: file.name,
      size: file.size,
    };
  }

  /**
   * Parse PDF file
   */
  private async parsePDF(file: File): Promise<ParsedDocument> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageCount = pdf.numPages;

    if (pageCount > this.config.maxPDFPages) {
      throw new Error(`PDF has too many pages: ${pageCount}. Maximum: ${this.config.maxPDFPages}`);
    }

    // Extract text from all pages
    const textParts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    const content = textParts.join('\n\n');

    // Get PDF metadata
    const metadata = await pdf.getMetadata();
    const info = metadata.info as any; // PDF.js metadata types are complex

    return {
      content,
      mimeType: file.type,
      filename: file.name,
      size: file.size,
      metadata: {
        pageCount,
        title: info?.Title,
        author: info?.Author,
      },
    };
  }

  /**
   * Add document attachment to a message
   */
  async addDocumentAttachment(messageId: string, file: File): Promise<string> {
    try {
      const parsed = await this.parseDocument(file);

      const attachmentId = dbService.addAttachment({
        message_id: messageId,
        type: 'document' as any, // Extend the type
        mime_type: parsed.mimeType,
        filename: parsed.filename,
        data: parsed.content, // Store content as data
        size: parsed.size,
      });

      console.log(`[Documents] ✅ Attached: ${file.name} → ${attachmentId}`);

      return attachmentId;
    } catch (err) {
      console.error('[Documents] ❌ Failed to add document:', err);
      throw err;
    }
  }

  /**
   * Validate document file before processing
   */
  validateDocumentFile(file: File): { valid: boolean; error?: string } {
    // Check type
    const isValidType = this.config.allowedDocumentTypes.includes(file.type) ||
      file.name.endsWith('.md') || file.name.endsWith('.markdown');

    if (!isValidType) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Supported: TXT, Markdown, PDF`,
      };
    }

    // Check size
    if (file.size > this.config.maxSizeBytes) {
      return {
        valid: false,
        error: `File too large: ${this.formatBytes(file.size)}. Maximum: ${this.formatBytes(this.config.maxSizeBytes)}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(mimeType: string, filename: string): string {
    if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType === 'text/markdown' || filename.endsWith('.md') || filename.endsWith('.markdown')) {
      return '📝';
    } else if (mimeType === 'text/plain') {
      return '📃';
    }
    return '📄';
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export const documentParsingService = new DocumentParsingService();
