/**
 * Thought Stream Types
 *
 * Types for the continuous thought and code analysis stream feature.
 * This enables transparent AI reasoning and real-time code analysis.
 */

/**
 * Type of thought in the stream
 */
export type ThoughtType =
  | 'reasoning'        // General reasoning and problem-solving
  | 'code_analysis'    // Code analysis results
  | 'planning'         // Planning and strategy
  | 'reflection';      // Self-reflection and evaluation

/**
 * Metadata for code analysis thoughts
 */
export interface CodeAnalysisMetadata {
  language?: string;
  lineStart?: number;
  lineEnd?: number;
  issues?: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
  }>;
  complexity?: {
    cyclomaticComplexity?: number;
    cognitiveComplexity?: number;
  };
  suggestions?: string[];
}

/**
 * A single thought in the stream
 */
export interface ThoughtStream {
  id: string;
  message_id: string;
  thought_type: ThoughtType;
  content: string;
  metadata?: string; // JSON-encoded metadata
  sequence_order: number;
  timestamp: number;
}

/**
 * Parsed thought with typed metadata
 */
export interface ParsedThought extends Omit<ThoughtStream, 'metadata'> {
  metadata?: CodeAnalysisMetadata | Record<string, unknown>;
}

/**
 * Event emitted when a new thought is added to the stream
 */
export interface ThoughtStreamEvent {
  type: 'thought-added' | 'thought-updated' | 'stream-complete';
  thought?: ParsedThought;
  messageId: string;
}

/**
 * Options for thought stream display
 */
export interface ThoughtStreamOptions {
  showThoughts: boolean;
  showCodeAnalysis: boolean;
  autoScroll: boolean;
  expandByDefault: boolean;
}
