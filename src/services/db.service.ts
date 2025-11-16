/**
 * Database Service - WASM-SQLite for SML Guardian
 *
 * This service provides all database operations for the SML Guardian:
 * 1. Full SQL query support (for Step 4 ARI/RDI analytics)
 * 2. High-performance local persistence
 * 3. Database export for "Exit & Portability" (Step 3)
 * 4. Chat message and conversation management (Sprint 1)
 *
 * Using sql.js for the initial implementation
 */

import initSqlJs, { Database } from 'sql.js';

/**
 * Conversation interface
 */
export interface Conversation {
  id: string;
  title: string;
  created_at: number;
}

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  module_used: string | null;
  trace_data: string | null;
  timestamp: number;
}

class DatabaseService {
  private db: Database | null = null;
  private initialized = false;

  /**
   * Initialize the SQLite WASM database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[DB] Already initialized');
      return;
    }

    try {
      console.log('[DB] Initializing WASM-SQLite...');

      // Initialize sql.js
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });

      // Check if we have a saved database in localStorage
      const savedDb = localStorage.getItem('sml_guardian_db');

      if (savedDb) {
        // Restore from saved database
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(uint8Array);
        console.log('[DB] Restored database from localStorage');
      } else {
        // Create new database
        this.db = new SQL.Database();
        console.log('[DB] Created new database');
      }

      this.initialized = true;
      console.log('[DB] ✅ WASM-SQLite initialized successfully');
    } catch (error) {
      console.error('[DB] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query
   */
  exec(sql: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql);
  }

  /**
   * Execute a SQL query and return results
   */
  query<T = unknown>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();

    return results;
  }

  /**
   * Save the database to localStorage (persistence)
   */
  async save(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const data = this.db.export();
      const buffer = JSON.stringify(Array.from(data));
      localStorage.setItem('sml_guardian_db', buffer);
      console.log('[DB] ✅ Database saved to localStorage');
    } catch (error) {
      console.error('[DB] ❌ Failed to save:', error);
      throw error;
    }
  }

  /**
   * Export database as .db file (AC-AI: "Exit & Portability")
   * This is a critical feature that guarantees users can always export their data
   */
  async exportToFile(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const data = this.db.export();
      // Convert Uint8Array to proper ArrayBuffer for Blob
      const buffer = data.buffer instanceof ArrayBuffer
        ? data.buffer
        : data.buffer.slice(0);
      const blob = new Blob([buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `sml-guardian-${Date.now()}.db`;
      a.click();

      URL.revokeObjectURL(url);
      console.log('[DB] ✅ Database exported to file');
    } catch (error) {
      console.error('[DB] ❌ Failed to export:', error);
      throw error;
    }
  }

  /**
   * Get database statistics (for debugging)
   */
  getStats(): { size: number; tables: string[] } {
    if (!this.db) throw new Error('Database not initialized');

    const tables = this.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).map(row => row.name);

    const data = this.db.export();
    const size = data.length;

    return { size, tables };
  }

  // ============================================================================
  // CHAT METHODS (Sprint 1: TASK-009)
  // ============================================================================

  /**
   * Create a new conversation
   * @param title Optional title for the conversation
   * @returns The created conversation
   */
  createConversation(title?: string): Conversation {
    if (!this.db) throw new Error('Database not initialized');

    const id = `conv-${crypto.randomUUID()}`;
    const created_at = Date.now();
    const conversationTitle = title || 'New Conversation';

    this.db.run(
      'INSERT INTO conversations (id, title, created_at) VALUES (?, ?, ?)',
      [id, conversationTitle, created_at]
    );

    // Auto-save after creating conversation
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Created conversation: ${id}`);

    return { id, title: conversationTitle, created_at };
  }

  /**
   * Get all conversations, ordered by most recent first
   * @returns Array of conversations
   */
  getConversations(): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Conversation>(
      'SELECT id, title, created_at FROM conversations ORDER BY created_at DESC'
    );
  }

  /**
   * Get a specific conversation by ID
   * @param id Conversation ID
   * @returns The conversation or null if not found
   */
  getConversation(id: string): Conversation | null {
    if (!this.db) throw new Error('Database not initialized');

    const results = this.query<Conversation>(
      'SELECT id, title, created_at FROM conversations WHERE id = ?',
      [id]
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Add a message to a conversation
   * @param message Message to add
   * @returns The message ID
   */
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): string {
    if (!this.db) throw new Error('Database not initialized');

    const id = `msg-${crypto.randomUUID()}`;
    const timestamp = Date.now();

    this.db.run(
      `INSERT INTO chat_messages (id, conversation_id, role, content, module_used, trace_data, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        message.conversation_id,
        message.role,
        message.content,
        message.module_used,
        message.trace_data,
        timestamp
      ]
    );

    // Auto-save after adding message
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Added message: ${id} (${message.role})`);

    return id;
  }

  /**
   * Get conversation history (all messages for a conversation)
   * @param conversationId Conversation ID
   * @returns Array of messages, ordered chronologically
   */
  getConversationHistory(conversationId: string): ChatMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<ChatMessage>(
      `SELECT id, conversation_id, role, content, module_used, trace_data, timestamp
       FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY timestamp ASC`,
      [conversationId]
    );
  }

  /**
   * Update conversation title
   * @param id Conversation ID
   * @param title New title
   */
  updateConversationTitle(id: string, title: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      'UPDATE conversations SET title = ? WHERE id = ?',
      [title, id]
    );

    // Auto-save after updating
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Updated conversation title: ${id}`);
  }

  /**
   * Delete a conversation and all its messages
   * @param id Conversation ID
   */
  deleteConversation(id: string): void {
    if (!this.db) throw new Error('Database not initialized');

    // Delete messages first (CASCADE should handle this, but being explicit)
    this.db.run('DELETE FROM chat_messages WHERE conversation_id = ?', [id]);

    // Delete conversation
    this.db.run('DELETE FROM conversations WHERE id = ?', [id]);

    // Auto-save after deleting
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Deleted conversation: ${id}`);
  }

  /**
   * Close and cleanup the database
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[DB] Database closed');
    }
  }
}

// Export singleton instance
export const dbService = new DatabaseService();
