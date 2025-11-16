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

  // ============================================================================
  // API KEY METHODS (Sprint 2: TASK-004)
  // ============================================================================

  /**
   * Store or update an encrypted API key for a provider
   * @param provider Provider name (e.g., 'openai', 'anthropic')
   * @param encryptedKey Encrypted API key (as JSON string)
   */
  upsertAPIKey(provider: string, encryptedKey: string): void {
    if (!this.db) throw new Error('Database not initialized');

    // Use INSERT OR REPLACE for upsert behavior
    this.db.run(
      'INSERT OR REPLACE INTO api_keys (provider, encrypted_key) VALUES (?, ?)',
      [provider, encryptedKey]
    );

    // Auto-save after updating API key
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Stored API key for provider: ${provider}`);
  }

  /**
   * Retrieve encrypted API key for a provider
   * @param provider Provider name
   * @returns Encrypted key as JSON string, or null if not found
   */
  getAPIKey(provider: string): string | null {
    if (!this.db) throw new Error('Database not initialized');

    const results = this.query<{ encrypted_key: string }>(
      'SELECT encrypted_key FROM api_keys WHERE provider = ?',
      [provider]
    );

    return results.length > 0 ? results[0].encrypted_key : null;
  }

  /**
   * Delete API key for a provider
   * @param provider Provider name
   */
  deleteAPIKey(provider: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM api_keys WHERE provider = ?', [provider]);

    // Auto-save after deleting
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Deleted API key for provider: ${provider}`);
  }

  /**
   * List all providers with stored API keys
   * @returns Array of provider names
   */
  listAPIKeyProviders(): string[] {
    if (!this.db) throw new Error('Database not initialized');

    const results = this.query<{ provider: string }>(
      'SELECT provider FROM api_keys ORDER BY provider ASC'
    );

    return results.map(row => row.provider);
  }

  // ============================================================================
  // GOVERNANCE LOG METHODS (Sprint 5: Conscience Engine)
  // ============================================================================

  /**
   * Add governance metrics to the log
   * @param metrics Governance metrics (ARI)
   */
  addGovernanceMetrics(metrics: {
    timestamp: number;
    userPromptHash: string;
    lexicalDensity: number;
    syntacticComplexity: number;
  }): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO governance_log (timestamp, user_prompt_hash, lexical_density, syntactic_complexity)
       VALUES (?, ?, ?, ?)`,
      [
        metrics.timestamp,
        metrics.userPromptHash,
        metrics.lexicalDensity,
        metrics.syntacticComplexity
      ]
    );

    // Auto-save after adding metrics
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Added governance metrics (ARI: ${((metrics.lexicalDensity * 0.6) + (metrics.syntacticComplexity * 0.4)).toFixed(2)})`);
  }

  /**
   * Get recent governance metrics for trend analysis
   * @param limit Number of recent entries to fetch (default: 100)
   * @returns Array of governance metrics, ordered by timestamp DESC
   */
  getRecentGovernanceMetrics(limit: number = 100): Array<{
    id: number;
    timestamp: number;
    userPromptHash: string;
    lexicalDensity: number;
    syntacticComplexity: number;
    ariScore: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const results = this.query<{
      id: number;
      timestamp: number;
      user_prompt_hash: string;
      lexical_density: number;
      syntactic_complexity: number;
    }>(
      `SELECT id, timestamp, user_prompt_hash, lexical_density, syntactic_complexity
       FROM governance_log
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    );

    // Calculate ARI score for each entry
    return results.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      userPromptHash: row.user_prompt_hash,
      lexicalDensity: row.lexical_density,
      syntacticComplexity: row.syntactic_complexity,
      ariScore: (row.lexical_density * 0.6) + (row.syntactic_complexity * 0.4),
    }));
  }

  /**
   * Get governance statistics
   * @returns Overall statistics (count, averages, trends)
   */
  getGovernanceStats(): {
    totalEntries: number;
    avgLexicalDensity: number;
    avgSyntacticComplexity: number;
    avgARI: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    if (!this.db) throw new Error('Database not initialized');

    const stats = this.query<{
      count: number;
      avg_lexical: number;
      avg_syntactic: number;
      oldest: number;
      newest: number;
    }>(
      `SELECT
         COUNT(*) as count,
         AVG(lexical_density) as avg_lexical,
         AVG(syntactic_complexity) as avg_syntactic,
         MIN(timestamp) as oldest,
         MAX(timestamp) as newest
       FROM governance_log`
    );

    if (stats.length === 0 || stats[0].count === 0) {
      return {
        totalEntries: 0,
        avgLexicalDensity: 0,
        avgSyntacticComplexity: 0,
        avgARI: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const row = stats[0];
    const avgLexicalDensity = row.avg_lexical || 0;
    const avgSyntacticComplexity = row.avg_syntactic || 0;
    const avgARI = (avgLexicalDensity * 0.6) + (avgSyntacticComplexity * 0.4);

    return {
      totalEntries: row.count,
      avgLexicalDensity,
      avgSyntacticComplexity,
      avgARI,
      oldestEntry: row.oldest,
      newestEntry: row.newest,
    };
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
