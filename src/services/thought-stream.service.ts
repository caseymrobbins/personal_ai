/**
 * Thought Stream Service
 *
 * Manages AI thinking process and code analysis storage and retrieval.
 * Enables transparent AI reasoning by capturing and displaying the thought process.
 */

import { dbService } from './db.service';
import type {
  ThoughtStream,
  ParsedThought,
  ThoughtType,
  ThoughtStreamEvent,
  CodeAnalysisMetadata
} from '../types/thought-stream.types';

class ThoughtStreamService {
  private listeners: Array<(event: ThoughtStreamEvent) => void> = [];

  /**
   * Add a thought to the stream for a specific message
   */
  async addThought(
    messageId: string,
    thoughtType: ThoughtType,
    content: string,
    metadata?: CodeAnalysisMetadata | Record<string, unknown>
  ): Promise<ThoughtStream> {
    const db = (dbService as any).db;
    if (!db) {
      throw new Error('[ThoughtStream] Database not initialized');
    }

    // Get the next sequence number for this message
    const result = db.exec(
      `SELECT COALESCE(MAX(sequence_order), -1) + 1 as next_seq
       FROM thought_streams
       WHERE message_id = ?`,
      [messageId]
    );

    const sequenceOrder = result[0]?.values[0]?.[0] ?? 0;

    const thought: ThoughtStream = {
      id: `thought-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message_id: messageId,
      thought_type: thoughtType,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null,
      sequence_order: sequenceOrder as number,
      timestamp: Date.now()
    };

    // Insert into database
    db.run(
      `INSERT INTO thought_streams
       (id, message_id, thought_type, content, metadata, sequence_order, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        thought.id,
        thought.message_id,
        thought.thought_type,
        thought.content,
        thought.metadata,
        thought.sequence_order,
        thought.timestamp
      ]
    );

    // Save to persistent storage
    await (dbService as any).saveToStorage();

    // Emit event
    this.emitEvent({
      type: 'thought-added',
      thought: this.parseThought(thought),
      messageId
    });

    return thought;
  }

  /**
   * Get all thoughts for a specific message
   */
  getMessageThoughts(messageId: string): ParsedThought[] {
    const db = (dbService as any).db;
    if (!db) {
      console.warn('[ThoughtStream] Database not initialized');
      return [];
    }

    try {
      const result = db.exec(
        `SELECT id, message_id, thought_type, content, metadata, sequence_order, timestamp
         FROM thought_streams
         WHERE message_id = ?
         ORDER BY sequence_order ASC`,
        [messageId]
      );

      if (!result[0]) return [];

      const thoughts: ThoughtStream[] = result[0].values.map((row: any[]) => ({
        id: row[0],
        message_id: row[1],
        thought_type: row[2] as ThoughtType,
        content: row[3],
        metadata: row[4],
        sequence_order: row[5],
        timestamp: row[6]
      }));

      return thoughts.map(t => this.parseThought(t));
    } catch (error) {
      console.error('[ThoughtStream] Failed to get message thoughts:', error);
      return [];
    }
  }

  /**
   * Delete all thoughts for a message
   */
  async deleteMessageThoughts(messageId: string): Promise<void> {
    const db = (dbService as any).db;
    if (!db) {
      throw new Error('[ThoughtStream] Database not initialized');
    }

    db.run('DELETE FROM thought_streams WHERE message_id = ?', [messageId]);
    await (dbService as any).saveToStorage();
  }

  /**
   * Complete the thought stream for a message
   */
  async completeStream(messageId: string): Promise<void> {
    this.emitEvent({
      type: 'stream-complete',
      messageId
    });
  }

  /**
   * Parse a thought with typed metadata
   */
  private parseThought(thought: ThoughtStream): ParsedThought {
    let parsedMetadata: CodeAnalysisMetadata | Record<string, unknown> | undefined;

    if (thought.metadata) {
      try {
        parsedMetadata = JSON.parse(thought.metadata);
      } catch (error) {
        console.error('[ThoughtStream] Failed to parse metadata:', error);
      }
    }

    return {
      ...thought,
      metadata: parsedMetadata
    };
  }

  /**
   * Add an event listener for thought stream events
   */
  addEventListener(listener: (event: ThoughtStreamEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(listener: (event: ThoughtStreamEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: ThoughtStreamEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ThoughtStream] Error in event listener:', error);
      }
    });
  }

  /**
   * Extract thoughts from Claude-style streaming response
   * Looks for <thinking>...</thinking> blocks
   */
  extractThoughtsFromStream(chunk: string): {
    thoughts: string[];
    cleanedContent: string;
  } {
    const thoughts: string[] = [];
    let cleanedContent = chunk;

    // Match <thinking>...</thinking> blocks (including partial/streaming)
    const thinkingRegex = /<thinking>([\s\S]*?)(?:<\/thinking>|$)/g;
    let match;

    while ((match = thinkingRegex.exec(chunk)) !== null) {
      const thoughtContent = match[1].trim();
      if (thoughtContent) {
        thoughts.push(thoughtContent);
      }
      // Remove the thinking block from content
      cleanedContent = cleanedContent.replace(match[0], '');
    }

    return {
      thoughts,
      cleanedContent: cleanedContent.trim()
    };
  }

  /**
   * Analyze code in content and create analysis thoughts
   */
  async analyzeCodeInContent(
    messageId: string,
    content: string
  ): Promise<void> {
    // Match code blocks with language specification
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'unknown';
      const code = match[2];

      // Perform basic code analysis
      const analysis = this.performCodeAnalysis(code, language);

      if (analysis.issues.length > 0 || analysis.suggestions.length > 0) {
        const analysisContent = this.formatCodeAnalysis(analysis);

        await this.addThought(
          messageId,
          'code_analysis',
          analysisContent,
          analysis
        );
      }
    }
  }

  /**
   * Perform basic code analysis
   */
  private performCodeAnalysis(
    code: string,
    language: string
  ): CodeAnalysisMetadata {
    const issues: CodeAnalysisMetadata['issues'] = [];
    const suggestions: string[] = [];

    // Basic analysis rules
    const lines = code.split('\n');

    // Check for common issues
    if (language === 'javascript' || language === 'typescript') {
      // Check for console.log
      lines.forEach((line, idx) => {
        if (line.includes('console.log')) {
          issues.push({
            severity: 'warning',
            message: 'Contains console.log statement',
            line: idx + 1
          });
        }

        // Check for var usage
        if (/\bvar\s+/.test(line)) {
          issues.push({
            severity: 'warning',
            message: 'Use const or let instead of var',
            line: idx + 1
          });
        }

        // Check for == instead of ===
        if (line.includes('==') && !line.includes('===')) {
          issues.push({
            severity: 'info',
            message: 'Consider using === for strict equality',
            line: idx + 1
          });
        }
      });

      // Suggestions
      if (code.includes('function') && code.includes('=>')) {
        suggestions.push('Mix of function declarations and arrow functions - consider consistent style');
      }
    }

    // Check code complexity
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code);

    return {
      language,
      issues,
      suggestions,
      complexity: {
        cyclomaticComplexity
      }
    };
  }

  /**
   * Calculate basic cyclomatic complexity
   */
  private calculateCyclomaticComplexity(code: string): number {
    // Count decision points: if, for, while, case, catch, &&, ||, ?
    const patterns = [
      /\bif\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g
    ];

    let complexity = 1; // Base complexity

    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * Format code analysis for display
   */
  private formatCodeAnalysis(analysis: CodeAnalysisMetadata): string {
    const parts: string[] = [];

    if (analysis.issues && analysis.issues.length > 0) {
      parts.push('**Code Issues Found:**');
      analysis.issues.forEach(issue => {
        const emoji = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        const lineInfo = issue.line ? ` (line ${issue.line})` : '';
        parts.push(`${emoji} ${issue.message}${lineInfo}`);
      });
    }

    if (analysis.complexity && analysis.complexity.cyclomaticComplexity > 10) {
      parts.push(`\n⚠️ High complexity: ${analysis.complexity.cyclomaticComplexity} (consider refactoring)`);
    }

    if (analysis.suggestions && analysis.suggestions.length > 0) {
      parts.push('\n**Suggestions:**');
      analysis.suggestions.forEach(suggestion => {
        parts.push(`💡 ${suggestion}`);
      });
    }

    return parts.join('\n');
  }
}

// Export singleton instance
export const thoughtStreamService = new ThoughtStreamService();
