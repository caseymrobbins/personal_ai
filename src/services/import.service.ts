/**
 * Import Service - Data Portability for SML Guardian
 *
 * Allows users to import conversations from:
 * - ChatGPT (OpenAI export format)
 * - Claude (Anthropic export format)
 *
 * Maps external formats to SML Guardian schema while preserving
 * timestamps, metadata, and conversation structure.
 */

import { dbService } from './db.service';

/**
 * ChatGPT Export Format (conversations.json from OpenAI)
 */
interface ChatGPTExport {
  title: string;
  create_time: number;
  update_time: number;
  mapping: {
    [id: string]: {
      id: string;
      message?: {
        id: string;
        author: {
          role: 'user' | 'assistant' | 'system';
        };
        content: {
          content_type: 'text';
          parts: string[];
        };
        create_time: number;
        metadata?: any;
      };
      parent?: string;
      children: string[];
    };
  };
  moderation_results?: any[];
  current_node?: string;
  conversation_id?: string;
}

/**
 * Claude Export Format (from Claude.ai)
 */
interface ClaudeExport {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  chat_messages: Array<{
    uuid: string;
    text: string;
    sender: 'human' | 'assistant';
    created_at: string;
    updated_at: string;
    attachments?: any[];
  }>;
}

/**
 * Import statistics
 */
export interface ImportStats {
  conversationsImported: number;
  messagesImported: number;
  errors: string[];
  warnings: string[];
}

/**
 * Import options
 */
export interface ImportOptions {
  skipDuplicates?: boolean;
  preserveTimestamps?: boolean;
  createNewConversations?: boolean;
}

class ImportService {
  /**
   * Import ChatGPT conversations from JSON export
   */
  async importChatGPT(
    fileContent: string,
    options: ImportOptions = {}
  ): Promise<ImportStats> {
    const stats: ImportStats = {
      conversationsImported: 0,
      messagesImported: 0,
      errors: [],
      warnings: [],
    };

    const {
      skipDuplicates = true,
      preserveTimestamps = true,
      createNewConversations = true,
    } = options;

    try {
      // Parse the JSON file
      let conversations: ChatGPTExport[];

      try {
        const parsed = JSON.parse(fileContent);
        // Handle both single conversation and array of conversations
        conversations = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        stats.errors.push('Invalid JSON format');
        return stats;
      }

      console.log(`[Import] Processing ${conversations.length} ChatGPT conversations`);

      for (const conv of conversations) {
        try {
          await this.importSingleChatGPTConversation(conv, {
            preserveTimestamps,
            skipDuplicates,
            stats,
          });
          stats.conversationsImported++;
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          stats.errors.push(`Failed to import conversation "${conv.title}": ${error}`);
          console.error(`[Import] Error importing conversation:`, err);
        }
      }

      await dbService.save();
      console.log(`[Import] Completed. ${stats.conversationsImported} conversations, ${stats.messagesImported} messages`);

    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      stats.errors.push(`Import failed: ${error}`);
      console.error('[Import] ChatGPT import failed:', err);
    }

    return stats;
  }

  /**
   * Import a single ChatGPT conversation
   */
  private async importSingleChatGPTConversation(
    conv: ChatGPTExport,
    context: {
      preserveTimestamps: boolean;
      skipDuplicates: boolean;
      stats: ImportStats;
    }
  ): Promise<void> {
    const { preserveTimestamps, stats } = context;

    // Create conversation
    const title = conv.title || 'Imported Conversation';
    const createdAt = preserveTimestamps
      ? conv.create_time * 1000 // ChatGPT uses seconds
      : Date.now();

    const conversation = dbService.createConversation(title);
    console.log(`[Import] Created conversation: ${title}`);

    // Extract messages from the mapping tree
    const messages = this.extractChatGPTMessages(conv.mapping);

    // Sort by creation time
    messages.sort((a, b) => a.create_time - b.create_time);

    // Import messages
    for (const msg of messages) {
      try {
        // Skip system messages if they're empty or metadata-only
        if (msg.message.author.role === 'system' && msg.message.content.parts.join('').trim() === '') {
          continue;
        }

        const content = msg.message.content.parts.join('\n');
        const role = this.mapChatGPTRole(msg.message.author.role);
        const timestamp = preserveTimestamps
          ? msg.message.create_time * 1000
          : Date.now();

        // Add message to database
        dbService.addMessage({
          conversation_id: conversation.id,
          role,
          content,
          module_used: 'imported_chatgpt',
          trace_data: JSON.stringify({
            imported: true,
            original_id: msg.id,
            original_timestamp: msg.message.create_time,
          }),
        });

        stats.messagesImported++;
      } catch (err) {
        console.error('[Import] Failed to import message:', err);
        stats.warnings.push(`Skipped message in "${conversation.title}"`);
      }
    }
  }

  /**
   * Extract messages from ChatGPT's tree structure
   */
  private extractChatGPTMessages(mapping: ChatGPTExport['mapping']): Array<{
    id: string;
    message: NonNullable<ChatGPTExport['mapping'][string]['message']>;
    create_time: number;
  }> {
    const messages: Array<{
      id: string;
      message: NonNullable<ChatGPTExport['mapping'][string]['message']>;
      create_time: number;
    }> = [];

    for (const [id, node] of Object.entries(mapping)) {
      if (node.message && node.message.content.parts.length > 0) {
        messages.push({
          id,
          message: node.message,
          create_time: node.message.create_time,
        });
      }
    }

    return messages;
  }

  /**
   * Map ChatGPT role to SML Guardian role
   */
  private mapChatGPTRole(role: string): 'user' | 'assistant' | 'system' {
    if (role === 'user') return 'user';
    if (role === 'assistant') return 'assistant';
    return 'system';
  }

  /**
   * Import Claude conversations from JSON export
   */
  async importClaude(
    fileContent: string,
    options: ImportOptions = {}
  ): Promise<ImportStats> {
    const stats: ImportStats = {
      conversationsImported: 0,
      messagesImported: 0,
      errors: [],
      warnings: [],
    };

    const {
      skipDuplicates = true,
      preserveTimestamps = true,
    } = options;

    try {
      // Parse the JSON file
      let conversations: ClaudeExport[];

      try {
        const parsed = JSON.parse(fileContent);
        // Handle both single conversation and array of conversations
        conversations = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        stats.errors.push('Invalid JSON format');
        return stats;
      }

      console.log(`[Import] Processing ${conversations.length} Claude conversations`);

      for (const conv of conversations) {
        try {
          await this.importSingleClaudeConversation(conv, {
            preserveTimestamps,
            stats,
          });
          stats.conversationsImported++;
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Unknown error';
          stats.errors.push(`Failed to import conversation "${conv.name}": ${error}`);
          console.error(`[Import] Error importing conversation:`, err);
        }
      }

      await dbService.save();
      console.log(`[Import] Completed. ${stats.conversationsImported} conversations, ${stats.messagesImported} messages`);

    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      stats.errors.push(`Import failed: ${error}`);
      console.error('[Import] Claude import failed:', err);
    }

    return stats;
  }

  /**
   * Import a single Claude conversation
   */
  private async importSingleClaudeConversation(
    conv: ClaudeExport,
    context: {
      preserveTimestamps: boolean;
      stats: ImportStats;
    }
  ): Promise<void> {
    const { preserveTimestamps, stats } = context;

    // Create conversation
    const title = conv.name || 'Imported Conversation';
    const conversation = dbService.createConversation(title);
    console.log(`[Import] Created conversation: ${title}`);

    // Sort messages by creation time
    const messages = [...conv.chat_messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Import messages
    for (const msg of messages) {
      try {
        const content = msg.text;
        const role = msg.sender === 'human' ? 'user' : 'assistant';
        const timestamp = preserveTimestamps
          ? new Date(msg.created_at).getTime()
          : Date.now();

        // Add message to database
        dbService.addMessage({
          conversation_id: conversation.id,
          role,
          content,
          module_used: 'imported_claude',
          trace_data: JSON.stringify({
            imported: true,
            original_uuid: msg.uuid,
            original_timestamp: msg.created_at,
          }),
        });

        stats.messagesImported++;
      } catch (err) {
        console.error('[Import] Failed to import message:', err);
        stats.warnings.push(`Skipped message in "${conversation.title}"`);
      }
    }
  }

  /**
   * Auto-detect import format and import accordingly
   */
  async importAuto(
    fileContent: string,
    options: ImportOptions = {}
  ): Promise<ImportStats> {
    try {
      const parsed = JSON.parse(fileContent);

      // Detect format by structure
      if (this.isChatGPTFormat(parsed)) {
        console.log('[Import] Detected ChatGPT format');
        return await this.importChatGPT(fileContent, options);
      } else if (this.isClaudeFormat(parsed)) {
        console.log('[Import] Detected Claude format');
        return await this.importClaude(fileContent, options);
      } else {
        return {
          conversationsImported: 0,
          messagesImported: 0,
          errors: ['Unknown format. Please select ChatGPT or Claude explicitly.'],
          warnings: [],
        };
      }
    } catch (err) {
      return {
        conversationsImported: 0,
        messagesImported: 0,
        errors: ['Failed to parse JSON file'],
        warnings: [],
      };
    }
  }

  /**
   * Detect if JSON is ChatGPT format
   */
  private isChatGPTFormat(parsed: any): boolean {
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    return item && typeof item === 'object' && 'mapping' in item && 'title' in item;
  }

  /**
   * Detect if JSON is Claude format
   */
  private isClaudeFormat(parsed: any): boolean {
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    return item && typeof item === 'object' && 'chat_messages' in item && 'uuid' in item;
  }
}

export const importService = new ImportService();
