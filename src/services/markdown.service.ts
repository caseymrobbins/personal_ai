/**
 * Markdown Rendering Service for SML Guardian
 *
 * Provides rich text formatting for messages:
 * - Markdown rendering with GitHub Flavored Markdown
 * - Code syntax highlighting with highlight.js
 * - LaTeX math expressions with KaTeX
 * - Table support
 * - Safe HTML sanitization
 */

import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import katex from 'katex';

/**
 * Markdown rendering configuration
 */
export interface MarkdownConfig {
  enableMath: boolean;
  enableCodeHighlight: boolean;
  enableTables: boolean;
  sanitizeHtml: boolean;
}

/**
 * Rendered markdown result
 */
export interface RenderedMarkdown {
  html: string;
  plainText: string;
  hasMath: boolean;
  hasCode: boolean;
  hasTables: boolean;
}

class MarkdownService {
  private readonly config: MarkdownConfig = {
    enableMath: true,
    enableCodeHighlight: true,
    enableTables: true,
    sanitizeHtml: true,
  };

  constructor() {
    this.configureMarked();
  }

  /**
   * Configure marked with extensions and options
   */
  private configureMarked(): void {
    // Configure syntax highlighting
    marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight: (code, lang) => {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          try {
            return hljs.highlight(code, { language }).value;
          } catch (err) {
            console.error('[Markdown] Syntax highlighting error:', err);
            return code;
          }
        },
      })
    );

    // Configure marked options
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert \n to <br>
      pedantic: false,
    });
  }

  /**
   * Render markdown to HTML
   * @param content Markdown content
   * @returns Rendered HTML and metadata
   */
  async renderMarkdown(content: string): Promise<RenderedMarkdown> {
    try {
      let processedContent = content;
      let hasMath = false;
      let hasCode = false;
      let hasTables = false;

      // Detect features
      hasMath = this.detectMath(content);
      hasCode = this.detectCode(content);
      hasTables = this.detectTables(content);

      // Process LaTeX math if enabled and detected
      if (this.config.enableMath && hasMath) {
        processedContent = this.processMath(processedContent);
      }

      // Parse markdown to HTML
      const html = await marked.parse(processedContent);

      // Extract plain text (for search, etc.)
      const plainText = this.stripHtml(html);

      return {
        html,
        plainText,
        hasMath,
        hasCode,
        hasTables,
      };
    } catch (err) {
      console.error('[Markdown] Rendering error:', err);
      // Fallback: return content as escaped HTML
      return {
        html: this.escapeHtml(content),
        plainText: content,
        hasMath: false,
        hasCode: false,
        hasTables: false,
      };
    }
  }

  /**
   * Detect if content contains LaTeX math
   */
  private detectMath(content: string): boolean {
    // Check for inline math: $...$
    // Check for display math: $$...$$
    return /\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$/g.test(content);
  }

  /**
   * Detect if content contains code blocks
   */
  private detectCode(content: string): boolean {
    // Check for fenced code blocks or inline code
    return /```[\s\S]*?```|`[^`]+?`/g.test(content);
  }

  /**
   * Detect if content contains markdown tables
   */
  private detectTables(content: string): boolean {
    // Check for table syntax: | ... |
    return /\|.*\|/g.test(content);
  }

  /**
   * Process LaTeX math expressions
   * Converts $...$ and $$...$$ to rendered KaTeX HTML
   */
  private processMath(content: string): string {
    // Process display math ($$...$$) first
    content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
      try {
        return katex.renderToString(tex.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
      } catch (err) {
        console.error('[Markdown] KaTeX display math error:', err);
        return `<span class="math-error">$$${tex}$$</span>`;
      }
    });

    // Process inline math ($...$)
    content = content.replace(/\$([^\$\n]+?)\$/g, (match, tex) => {
      try {
        return katex.renderToString(tex.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
      } catch (err) {
        console.error('[Markdown] KaTeX inline math error:', err);
        return `<span class="math-error">$${tex}$</span>`;
      }
    });

    return content;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render inline markdown (for previews, snippets)
   * Strips block-level elements
   */
  async renderInline(content: string): Promise<string> {
    const rendered = await this.renderMarkdown(content);
    // Remove block elements (p, div, etc.) for inline display
    return rendered.html
      .replace(/<\/?p>/g, '')
      .replace(/<\/?div>/g, '')
      .trim();
  }

  /**
   * Check if content appears to be markdown
   */
  isMarkdown(content: string): boolean {
    // Heuristic: check for common markdown patterns
    const patterns = [
      /^#{1,6}\s/m, // Headers
      /^\*\s/m, // Unordered list
      /^\d+\.\s/m, // Ordered list
      /```/, // Code blocks
      /\*\*.*\*\*/, // Bold
      /\*.*\*/, // Italic
      /\[.*\]\(.*\)/, // Links
      /\|.*\|/, // Tables
      /\$.*\$/, // Math
    ];

    return patterns.some((pattern) => pattern.test(content));
  }

  /**
   * Update markdown configuration
   */
  updateConfig(updates: Partial<MarkdownConfig>): void {
    Object.assign(this.config, updates);
    console.log('[Markdown] Configuration updated:', updates);
  }

  /**
   * Get current configuration
   */
  getConfig(): MarkdownConfig {
    return { ...this.config };
  }
}

export const markdownService = new MarkdownService();
