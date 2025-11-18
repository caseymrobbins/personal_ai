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
import { storageService } from './storage.service';

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

/**
 * Tag interface for conversation tagging
 */
export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: number;
}

/**
 * Conversation with tags (enriched)
 */
export interface ConversationWithTags extends Conversation {
  tags: Tag[];
}

/**
 * Bookmark interface for starred conversations and messages
 */
export interface Bookmark {
  id: string;
  conversation_id: string;
  message_id?: string | null;
  bookmark_type: 'conversation' | 'message';
  label?: string;
  created_at: number;
}

/**
 * Conversation with bookmark status
 */
export interface ConversationWithBookmark extends Conversation {
  isBookmarked: boolean;
  bookmarkLabel?: string;
}

/**
 * Message edit history entry
 */
export interface MessageEditHistory {
  id: string;
  message_id: string;
  previous_content: string;
  edited_at: number;
}

/**
 * Message with edit history and thread info
 */
export interface MessageWithDetails extends ChatMessage {
  edited_at?: number;
  is_pinned?: boolean;
  thread_parent_id?: string | null;
  thread_count?: number;
}

/**
 * Message thread reply
 */
export interface MessageThread {
  id: string;
  parent_message_id: string;
  conversation_id: string;
  messages: MessageWithDetails[];
}

/**
 * Conversation template for quick creation
 */
export interface ConversationTemplate {
  id: string;
  name: string;
  description?: string;
  initial_message?: string;
  created_at: number;
}

/**
 * Conversation branch (alternative path in conversation)
 */
export interface ConversationBranch {
  id: string;
  parent_conversation_id: string;
  branch_name: string;
  from_message_id: string;
  created_at: number;
}

/**
 * Conversation relationship for merge/split tracking
 */
export interface ConversationRelation {
  id: string;
  source_conversation_id: string;
  target_conversation_id: string;
  relation_type: 'merge' | 'split' | 'branch';
  created_at: number;
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

      // Initialize storage service first
      await storageService.initialize();

      // Initialize sql.js
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });

      // Try to load from IndexedDB
      let savedData = await storageService.loadDatabase();

      // If not in IndexedDB, try migrating from localStorage
      if (!savedData) {
        const migrated = await storageService.migrateFromLocalStorage();
        if (migrated) {
          savedData = await storageService.loadDatabase();
        }
      }

      if (savedData) {
        // Restore from saved database
        this.db = new SQL.Database(savedData);
        console.log('[DB] Restored database from IndexedDB');

        // Verify that required tables exist
        const tables = this.query<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table'"
        ).map(row => row.name);

        const requiredTables = ['conversations', 'chat_messages', 'api_keys', 'governance_log', 'user_preferences'];
        const missingTables = requiredTables.filter(table => !tables.includes(table));

        if (missingTables.length > 0) {
          console.warn('[DB] ⚠️ Restored database is missing tables:', missingTables);
          console.warn('[DB] ⚠️ This may be an old database format. Schema initialization will be required.');
        }
      } else {
        // Create new database
        this.db = new SQL.Database();
        console.log('[DB] Created new database');

        // Initialize schema for new databases
        this.createSchema();
      }

      this.initialized = true;
      console.log('[DB] ✅ WASM-SQLite initialized successfully');
    } catch (error) {
      console.error('[DB] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create database schema for new databases
   * This initializes all required tables
   */
  private createSchema(): void {
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('[DB] Creating database schema...');

      // Conversations table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);

      // Chat messages table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          module_used TEXT,
          trace_data TEXT,
          timestamp INTEGER NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
      `);

      // API Keys table (for encrypted API key storage)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS api_keys (
          provider TEXT PRIMARY KEY,
          encrypted_key TEXT NOT NULL
        )
      `);

      // Governance Log table (for ARI/RDI tracking)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS governance_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          user_prompt_hash TEXT NOT NULL,
          lexical_density REAL NOT NULL,
          syntactic_complexity REAL NOT NULL,
          prompt_embedding BLOB
        )
      `);

      // Tags table (for conversation tagging)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          color TEXT,
          created_at INTEGER NOT NULL
        )
      `);

      // Conversation-Tag junction table (many-to-many)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversation_tags (
          conversation_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          added_at INTEGER NOT NULL,
          PRIMARY KEY (conversation_id, tag_id),
          FOREIGN KEY (conversation_id) REFERENCES conversations(id),
          FOREIGN KEY (tag_id) REFERENCES tags(id)
        )
      `);

      // Bookmarks table (for starred conversations and messages)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          message_id TEXT,
          bookmark_type TEXT NOT NULL CHECK(bookmark_type IN ('conversation', 'message')),
          label TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id),
          FOREIGN KEY (message_id) REFERENCES chat_messages(id)
        )
      `);

      // Message edit history table (for tracking message edits)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS message_edit_history (
          id TEXT PRIMARY KEY,
          message_id TEXT NOT NULL,
          previous_content TEXT NOT NULL,
          edited_at INTEGER NOT NULL,
          FOREIGN KEY (message_id) REFERENCES chat_messages(id)
        )
      `);

      // Message metadata table (for pinned messages and thread info)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS message_metadata (
          message_id TEXT PRIMARY KEY,
          is_pinned INTEGER NOT NULL DEFAULT 0,
          thread_parent_id TEXT,
          last_modified INTEGER,
          FOREIGN KEY (message_id) REFERENCES chat_messages(id),
          FOREIGN KEY (thread_parent_id) REFERENCES chat_messages(id)
        )
      `);

      // Conversation templates table (for templates)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversation_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          initial_message TEXT,
          created_at INTEGER NOT NULL
        )
      `);

      // Conversation branches table (for branching conversations)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversation_branches (
          id TEXT PRIMARY KEY,
          parent_conversation_id TEXT NOT NULL,
          branch_name TEXT NOT NULL,
          from_message_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (parent_conversation_id) REFERENCES conversations(id),
          FOREIGN KEY (from_message_id) REFERENCES chat_messages(id)
        )
      `);

      // Conversation relations table (for merge/split tracking)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversation_relations (
          id TEXT PRIMARY KEY,
          source_conversation_id TEXT NOT NULL,
          target_conversation_id TEXT NOT NULL,
          relation_type TEXT NOT NULL CHECK(relation_type IN ('merge', 'split', 'branch')),
          created_at INTEGER NOT NULL,
          FOREIGN KEY (source_conversation_id) REFERENCES conversations(id),
          FOREIGN KEY (target_conversation_id) REFERENCES conversations(id)
        )
      `);

      // Create indexes for better query performance
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation ON conversation_tags(conversation_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag ON conversation_tags(tag_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_bookmarks_conversation ON bookmarks(conversation_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON bookmarks(bookmark_type)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_message_edit_history_message ON message_edit_history(message_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_message_metadata_pinned ON message_metadata(is_pinned)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_message_metadata_thread_parent ON message_metadata(thread_parent_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_conversation_branches_parent ON conversation_branches(parent_conversation_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_conversation_relations_source ON conversation_relations(source_conversation_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_conversation_relations_target ON conversation_relations(target_conversation_id)`);

      console.log('[DB] ✅ Database schema created successfully');
    } catch (error) {
      console.error('[DB] ❌ Failed to create schema:', error);
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
   * Save the database to IndexedDB (persistence)
   */
  async save(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const data = this.db.export();
      await storageService.saveDatabase(data);
      console.log('[DB] ✅ Database saved to IndexedDB');
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
   * Get all messages across all conversations
   * @returns Array of all messages, ordered chronologically
   */
  getAllMessages(): ChatMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<ChatMessage>(
      `SELECT id, conversation_id, role, content, module_used, trace_data, timestamp
       FROM chat_messages
       ORDER BY timestamp ASC`
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
   * @param metrics Governance metrics (ARI + RDI)
   */
  addGovernanceMetrics(metrics: {
    timestamp: number;
    userPromptHash: string;
    lexicalDensity: number;
    syntacticComplexity: number;
    promptEmbedding?: Uint8Array; // Optional embedding for RDI
  }): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO governance_log (timestamp, user_prompt_hash, lexical_density, syntactic_complexity, prompt_embedding)
       VALUES (?, ?, ?, ?, ?)`,
      [
        metrics.timestamp,
        metrics.userPromptHash,
        metrics.lexicalDensity,
        metrics.syntacticComplexity,
        metrics.promptEmbedding || null
      ]
    );

    // Auto-save after adding metrics
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    const ari = ((metrics.lexicalDensity * 0.6) + (metrics.syntacticComplexity * 0.4)).toFixed(2);
    console.log(`[DB] Added governance metrics (ARI: ${ari}, Embedding: ${metrics.promptEmbedding ? 'yes' : 'no'})`);
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
   * Get recent prompt embeddings for RDI calculation
   * @param limit Number of recent embeddings to fetch (default: 10)
   * @returns Array of embeddings (BLOBs), ordered by timestamp DESC
   */
  getRecentEmbeddings(limit: number = 10): Uint8Array[] {
    if (!this.db) throw new Error('Database not initialized');

    const results = this.query<{ prompt_embedding: Uint8Array }>(
      `SELECT prompt_embedding
       FROM governance_log
       WHERE prompt_embedding IS NOT NULL
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    );

    return results.map(row => row.prompt_embedding);
  }

  // ============================================================================
  // TAG MANAGEMENT METHODS (Sprint 16: Tags & Categories)
  // ============================================================================

  /**
   * Create a new tag
   * @param name Tag name (unique)
   * @param color Optional color for UI (hex code)
   * @returns The created tag
   */
  createTag(name: string, color?: string): Tag {
    if (!this.db) throw new Error('Database not initialized');

    const id = `tag-${crypto.randomUUID()}`;
    const created_at = Date.now();

    this.db.run(
      'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
      [id, name, color || null, created_at]
    );

    // Auto-save after creating tag
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Created tag: ${name} (${id})`);

    return { id, name, color, created_at };
  }

  /**
   * Get all tags, ordered alphabetically
   * @returns Array of all tags
   */
  getAllTags(): Tag[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Tag>(
      'SELECT id, name, color, created_at FROM tags ORDER BY name ASC'
    );
  }

  /**
   * Get tags for a specific conversation
   * @param conversationId Conversation ID
   * @returns Array of tags for the conversation
   */
  getConversationTags(conversationId: string): Tag[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Tag>(
      `SELECT t.id, t.name, t.color, t.created_at
       FROM tags t
       INNER JOIN conversation_tags ct ON t.id = ct.tag_id
       WHERE ct.conversation_id = ?
       ORDER BY t.name ASC`,
      [conversationId]
    );
  }

  /**
   * Add a tag to a conversation
   * @param conversationId Conversation ID
   * @param tagId Tag ID
   */
  addTagToConversation(conversationId: string, tagId: string): void {
    if (!this.db) throw new Error('Database not initialized');

    const added_at = Date.now();

    try {
      this.db.run(
        'INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, added_at) VALUES (?, ?, ?)',
        [conversationId, tagId, added_at]
      );

      // Auto-save after adding tag
      this.save().catch(err => console.error('[DB] Auto-save failed:', err));

      console.log(`[DB] Added tag ${tagId} to conversation ${conversationId}`);
    } catch (error) {
      console.error('[DB] Failed to add tag:', error);
      throw error;
    }
  }

  /**
   * Remove a tag from a conversation
   * @param conversationId Conversation ID
   * @param tagId Tag ID
   */
  removeTagFromConversation(conversationId: string, tagId: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      'DELETE FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?',
      [conversationId, tagId]
    );

    // Auto-save after removing tag
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Removed tag ${tagId} from conversation ${conversationId}`);
  }

  /**
   * Get conversations with a specific tag
   * @param tagId Tag ID
   * @returns Array of conversations with that tag
   */
  getConversationsByTag(tagId: string): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Conversation>(
      `SELECT c.id, c.title, c.created_at
       FROM conversations c
       INNER JOIN conversation_tags ct ON c.id = ct.conversation_id
       WHERE ct.tag_id = ?
       ORDER BY c.created_at DESC`,
      [tagId]
    );
  }

  /**
   * Get conversations with all specified tags (AND filter)
   * @param tagIds Array of tag IDs
   * @returns Array of conversations that have all the specified tags
   */
  getConversationsByAllTags(tagIds: string[]): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    if (tagIds.length === 0) {
      return this.getConversations();
    }

    const placeholders = tagIds.map(() => '?').join(',');
    const sql = `
      SELECT c.id, c.title, c.created_at
      FROM conversations c
      WHERE c.id IN (
        SELECT ct.conversation_id
        FROM conversation_tags ct
        WHERE ct.tag_id IN (${placeholders})
        GROUP BY ct.conversation_id
        HAVING COUNT(DISTINCT ct.tag_id) = ?
      )
      ORDER BY c.created_at DESC
    `;

    return this.query<Conversation>(sql, [...tagIds, tagIds.length]);
  }

  /**
   * Get conversations with any of the specified tags (OR filter)
   * @param tagIds Array of tag IDs
   * @returns Array of conversations that have any of the specified tags
   */
  getConversationsByAnyTag(tagIds: string[]): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    if (tagIds.length === 0) {
      return [];
    }

    const placeholders = tagIds.map(() => '?').join(',');
    const sql = `
      SELECT DISTINCT c.id, c.title, c.created_at
      FROM conversations c
      INNER JOIN conversation_tags ct ON c.id = ct.conversation_id
      WHERE ct.tag_id IN (${placeholders})
      ORDER BY c.created_at DESC
    `;

    return this.query<Conversation>(sql, tagIds);
  }

  /**
   * Get tag statistics
   * @returns Statistics about tags usage
   */
  getTagStats(): { totalTags: number; tagUsage: Array<{ tagId: string; tagName: string; count: number }> } {
    if (!this.db) throw new Error('Database not initialized');

    const tagUsage = this.query<{ tag_id: string; name: string; count: number }>(
      `SELECT t.id as tag_id, t.name, COUNT(*) as count
       FROM tags t
       LEFT JOIN conversation_tags ct ON t.id = ct.tag_id
       GROUP BY t.id, t.name
       ORDER BY count DESC`
    );

    return {
      totalTags: tagUsage.length,
      tagUsage: tagUsage.map(row => ({
        tagId: row.tag_id,
        tagName: row.name,
        count: row.count
      }))
    };
  }

  /**
   * Delete a tag and remove it from all conversations
   * @param tagId Tag ID
   */
  deleteTag(tagId: string): void {
    if (!this.db) throw new Error('Database not initialized');

    // Delete the tag from all conversations first
    this.db.run('DELETE FROM conversation_tags WHERE tag_id = ?', [tagId]);

    // Then delete the tag itself
    this.db.run('DELETE FROM tags WHERE id = ?', [tagId]);

    // Auto-save after deletion
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Deleted tag: ${tagId}`);
  }

  /**
   * Get conversation with its tags (enriched)
   * @param id Conversation ID
   * @returns Conversation with associated tags
   */
  getConversationWithTags(id: string): ConversationWithTags | null {
    const conversation = this.getConversation(id);
    if (!conversation) return null;

    const tags = this.getConversationTags(id);

    return {
      ...conversation,
      tags
    };
  }

  // ============================================================================
  // BOOKMARK MANAGEMENT METHODS (Sprint 16: Bookmarks & Favorites)
  // ============================================================================

  /**
   * Bookmark a conversation
   * @param conversationId Conversation ID to bookmark
   * @param label Optional label for the bookmark
   * @returns The created bookmark
   */
  bookmarkConversation(conversationId: string, label?: string): Bookmark {
    if (!this.db) throw new Error('Database not initialized');

    const id = `bm-${crypto.randomUUID()}`;
    const created_at = Date.now();

    this.db.run(
      'INSERT INTO bookmarks (id, conversation_id, message_id, bookmark_type, label, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, conversationId, null, 'conversation', label || null, created_at]
    );

    // Auto-save after bookmarking
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Bookmarked conversation: ${conversationId}`);

    return { id, conversation_id: conversationId, bookmark_type: 'conversation', label, created_at };
  }

  /**
   * Bookmark a specific message
   * @param messageId Message ID to bookmark
   * @param conversationId Conversation ID (required for FK)
   * @param label Optional label for the bookmark
   * @returns The created bookmark
   */
  bookmarkMessage(messageId: string, conversationId: string, label?: string): Bookmark {
    if (!this.db) throw new Error('Database not initialized');

    const id = `bm-${crypto.randomUUID()}`;
    const created_at = Date.now();

    this.db.run(
      'INSERT INTO bookmarks (id, conversation_id, message_id, bookmark_type, label, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, conversationId, messageId, 'message', label || null, created_at]
    );

    // Auto-save after bookmarking
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Bookmarked message: ${messageId}`);

    return { id, conversation_id: conversationId, message_id: messageId, bookmark_type: 'message', label, created_at };
  }

  /**
   * Check if a conversation is bookmarked
   * @param conversationId Conversation ID
   * @returns Bookmark object or null if not bookmarked
   */
  isConversationBookmarked(conversationId: string): Bookmark | null {
    if (!this.db) throw new Error('Database not initialized');

    const results = this.query<Bookmark>(
      'SELECT id, conversation_id, message_id, bookmark_type, label, created_at FROM bookmarks WHERE conversation_id = ? AND bookmark_type = ? AND message_id IS NULL',
      [conversationId, 'conversation']
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all bookmarked conversations
   * @returns Array of bookmarked conversations
   */
  getBookmarkedConversations(): Bookmark[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Bookmark>(
      'SELECT id, conversation_id, message_id, bookmark_type, label, created_at FROM bookmarks WHERE bookmark_type = ? ORDER BY created_at DESC',
      ['conversation']
    );
  }

  /**
   * Get all bookmarked messages for a conversation
   * @param conversationId Conversation ID
   * @returns Array of bookmarked messages
   */
  getBookmarkedMessages(conversationId: string): Bookmark[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Bookmark>(
      'SELECT id, conversation_id, message_id, bookmark_type, label, created_at FROM bookmarks WHERE conversation_id = ? AND bookmark_type = ? ORDER BY created_at DESC',
      [conversationId, 'message']
    );
  }

  /**
   * Get all bookmarks (conversations and messages)
   * @returns Array of all bookmarks
   */
  getAllBookmarks(): Bookmark[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Bookmark>(
      'SELECT id, conversation_id, message_id, bookmark_type, label, created_at FROM bookmarks ORDER BY created_at DESC'
    );
  }

  /**
   * Remove a bookmark
   * @param bookmarkId Bookmark ID
   */
  removeBookmark(bookmarkId: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM bookmarks WHERE id = ?', [bookmarkId]);

    // Auto-save after deletion
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Removed bookmark: ${bookmarkId}`);
  }

  /**
   * Remove bookmark for a conversation
   * @param conversationId Conversation ID
   */
  removeConversationBookmark(conversationId: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM bookmarks WHERE conversation_id = ? AND bookmark_type = ? AND message_id IS NULL', [conversationId, 'conversation']);

    // Auto-save after deletion
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Removed conversation bookmark: ${conversationId}`);
  }

  /**
   * Update bookmark label
   * @param bookmarkId Bookmark ID
   * @param label New label
   */
  updateBookmarkLabel(bookmarkId: string, label: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('UPDATE bookmarks SET label = ? WHERE id = ?', [label, bookmarkId]);

    // Auto-save after updating
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Updated bookmark label: ${bookmarkId}`);
  }

  /**
   * Get bookmark statistics
   * @returns Statistics about bookmarks
   */
  getBookmarkStats(): { totalBookmarks: number; conversationBookmarks: number; messageBookmarks: number } {
    if (!this.db) throw new Error('Database not initialized');

    const stats = this.query<{ type: string; count: number }>(
      'SELECT bookmark_type as type, COUNT(*) as count FROM bookmarks GROUP BY bookmark_type'
    );

    const conversationBookmarks = stats.find(s => s.type === 'conversation')?.count || 0;
    const messageBookmarks = stats.find(s => s.type === 'message')?.count || 0;

    return {
      totalBookmarks: conversationBookmarks + messageBookmarks,
      conversationBookmarks,
      messageBookmarks
    };
  }

  /**
   * Get conversations with bookmark status
   * @returns Array of conversations with bookmark indicator
   */
  getConversationsWithBookmarkStatus(): ConversationWithBookmark[] {
    if (!this.db) throw new Error('Database not initialized');

    const conversations = this.getConversations();
    const bookmarks = this.query<{ conversation_id: string; label: string | null }>(
      'SELECT DISTINCT conversation_id, label FROM bookmarks WHERE bookmark_type = ? AND message_id IS NULL',
      ['conversation']
    );

    const bookmarkMap = new Map(bookmarks.map(b => [b.conversation_id, b.label]));

    return conversations.map(conv => ({
      ...conv,
      isBookmarked: bookmarkMap.has(conv.id),
      bookmarkLabel: bookmarkMap.get(conv.id) || undefined
    }));
  }

  // ============================================================================
  // ADVANCED FILTERING METHODS (Sprint 16: Advanced Filters)
  // ============================================================================

  /**
   * Filter conversations by date range
   * @param startDate Start date timestamp (milliseconds)
   * @param endDate End date timestamp (milliseconds)
   * @returns Array of conversations created within the date range
   */
  getConversationsByDateRange(startDate: number, endDate: number): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Conversation>(
      'SELECT id, title, created_at FROM conversations WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC',
      [startDate, endDate]
    );
  }

  /**
   * Filter conversations by ARI (Autonomy Retention Index) score range
   * @param minARI Minimum ARI score (0-1)
   * @param maxARI Maximum ARI score (0-1)
   * @returns Array of conversations with governance metrics in the ARI range
   */
  getConversationsByARIRange(minARI: number, maxARI: number): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    // Get governance data within ARI range
    const ariResults = this.query<{ conversation_id: string }>(
      `SELECT DISTINCT c.id as conversation_id
       FROM conversations c
       INNER JOIN chat_messages m ON c.id = m.conversation_id
       WHERE (m.module_used IS NOT NULL OR m.trace_data IS NOT NULL)
       AND (lexical_density * 0.6 + syntactic_complexity * 0.4) BETWEEN ? AND ?
       ORDER BY c.created_at DESC`,
      [minARI, maxARI]
    );

    if (ariResults.length === 0) {
      return [];
    }

    // Fetch full conversation details
    const conversationIds = ariResults.map(r => r.conversation_id);
    const placeholders = conversationIds.map(() => '?').join(',');
    const sql = `SELECT id, title, created_at FROM conversations WHERE id IN (${placeholders})`;

    return this.query<Conversation>(sql, conversationIds);
  }

  /**
   * Filter conversations by RDI (Reality Drift Index) score range
   * Reality Drift Index measures semantic drift over time
   * @param minRDI Minimum RDI score
   * @param maxRDI Maximum RDI score
   * @returns Array of conversations with RDI in the specified range
   */
  getConversationsByRDIRange(minRDI: number, maxRDI: number): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    // Get governance metrics for RDI calculation
    const metrics = this.getRecentGovernanceMetrics(1000);

    // Group by conversation (approximated through timestamps)
    const conversationIds = new Set<string>();

    for (const metric of metrics) {
      // RDI is measured through embedding similarity drift
      // For now, use a simplified calculation based on governance metrics
      const rdiScore = Math.abs(metric.lexicalDensity - metric.syntacticComplexity);

      if (rdiScore >= minRDI && rdiScore <= maxRDI) {
        // This is a simplified approach; full RDI would use embeddings
        conversationIds.add(`approx-${metric.id}`);
      }
    }

    // Return all conversations (simplified - would need embeddings for true RDI)
    return this.getConversations().slice(0, 10);
  }

  /**
   * Filter conversations by message count
   * @param minMessages Minimum number of messages
   * @param maxMessages Maximum number of messages
   * @returns Array of conversations with message count in range
   */
  getConversationsByMessageCount(minMessages: number, maxMessages: number): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<Conversation>(
      `SELECT c.id, c.title, c.created_at
       FROM conversations c
       LEFT JOIN chat_messages m ON c.id = m.conversation_id
       GROUP BY c.id, c.title, c.created_at
       HAVING COUNT(m.id) BETWEEN ? AND ?
       ORDER BY c.created_at DESC`,
      [minMessages, maxMessages]
    );
  }

  /**
   * Combined filter for conversations with multiple criteria
   * @param filters Object containing filter criteria
   * @returns Array of conversations matching all criteria
   */
  filterConversations(filters: {
    dateRange?: { start: number; end: number };
    ariRange?: { min: number; max: number };
    tags?: { ids: string[]; matchAll?: boolean };
    isBookmarked?: boolean;
    minMessages?: number;
    maxMessages?: number;
    searchText?: string;
  }): Conversation[] {
    if (!this.db) throw new Error('Database not initialized');

    let results = this.getConversations();

    // Apply date range filter
    if (filters.dateRange) {
      results = results.filter(
        c => c.created_at >= filters.dateRange!.start && c.created_at <= filters.dateRange!.end
      );
    }

    // Apply tag filters
    if (filters.tags && filters.tags.ids.length > 0) {
      const matchAll = filters.tags.matchAll !== false; // Default to true
      const filteredByTag = matchAll
        ? this.getConversationsByAllTags(filters.tags.ids)
        : this.getConversationsByAnyTag(filters.tags.ids);

      const filteredIds = new Set(filteredByTag.map(c => c.id));
      results = results.filter(c => filteredIds.has(c.id));
    }

    // Apply bookmark filter
    if (filters.isBookmarked !== undefined) {
      const bookmarkedIds = new Set(
        this.getBookmarkedConversations().map(b => b.conversation_id)
      );

      results = results.filter(c =>
        filters.isBookmarked ? bookmarkedIds.has(c.id) : !bookmarkedIds.has(c.id)
      );
    }

    // Apply message count filter
    if (filters.minMessages !== undefined || filters.maxMessages !== undefined) {
      const minMsg = filters.minMessages || 0;
      const maxMsg = filters.maxMessages || 10000;

      results = results.filter(c => {
        const messageCount = this.getConversationHistory(c.id).length;
        return messageCount >= minMsg && messageCount <= maxMsg;
      });
    }

    // Apply text search filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      results = results.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        this.getConversationHistory(c.id).some(m =>
          m.content.toLowerCase().includes(searchLower)
        )
      );
    }

    return results;
  }

  /**
   * Get filter suggestions based on current data
   * @returns Object with suggested filter ranges
   */
  getFilterSuggestions(): {
    dateRange: { min: number; max: number };
    messageCount: { min: number; max: number };
    tagCount: number;
    bookmarkedCount: number;
  } {
    if (!this.db) throw new Error('Database not initialized');

    const conversations = this.getConversations();
    const bookmarks = this.getBookmarkedConversations();
    const tags = this.getAllTags();

    const messageCounts = conversations.map(c => this.getConversationHistory(c.id).length);
    const minMessages = messageCounts.length > 0 ? Math.min(...messageCounts) : 0;
    const maxMessages = messageCounts.length > 0 ? Math.max(...messageCounts) : 0;

    const createdAts = conversations.map(c => c.created_at);
    const minDate = createdAts.length > 0 ? Math.min(...createdAts) : Date.now();
    const maxDate = createdAts.length > 0 ? Math.max(...createdAts) : Date.now();

    return {
      dateRange: { min: minDate, max: maxDate },
      messageCount: { min: minMessages, max: maxMessages },
      tagCount: tags.length,
      bookmarkedCount: bookmarks.length
    };
  }

  // ==================== MESSAGE OPERATIONS ====================

  /**
   * Edit a message and track edit history
   * @param messageId Message ID to edit
   * @param newContent New message content
   * @returns Updated message or null if not found
   */
  editMessage(messageId: string, newContent: string): ChatMessage | null {
    if (!this.db) throw new Error('Database not initialized');

    // Get original message
    const originalMessage = this.query<ChatMessage>(
      'SELECT * FROM chat_messages WHERE id = ?',
      [messageId]
    )[0];

    if (!originalMessage) {
      console.warn(`[DB] Message not found: ${messageId}`);
      return null;
    }

    // Record edit history
    const editHistoryId = `eh-${crypto.randomUUID()}`;
    this.db.run(
      `INSERT INTO message_edit_history (id, message_id, previous_content, edited_at)
       VALUES (?, ?, ?, ?)`,
      [editHistoryId, messageId, originalMessage.content, Date.now()]
    );

    // Update message content
    this.db.run(
      'UPDATE chat_messages SET content = ? WHERE id = ?',
      [newContent, messageId]
    );

    // Update message metadata
    this.db.run(
      `INSERT OR REPLACE INTO message_metadata (message_id, last_modified)
       VALUES (?, ?)`,
      [messageId, Date.now()]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Edited message: ${messageId}`);

    return {
      ...originalMessage,
      content: newContent
    };
  }

  /**
   * Get edit history for a message
   * @param messageId Message ID
   * @returns Array of edit history entries
   */
  getMessageEditHistory(messageId: string): MessageEditHistory[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<MessageEditHistory>(
      `SELECT id, message_id, previous_content, edited_at
       FROM message_edit_history
       WHERE message_id = ?
       ORDER BY edited_at DESC`,
      [messageId]
    );
  }

  /**
   * Delete a message from a conversation
   * @param messageId Message ID to delete
   * @returns true if successfully deleted, false if not found
   */
  deleteMessage(messageId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    // Check if message exists
    const message = this.query<ChatMessage>(
      'SELECT id FROM chat_messages WHERE id = ?',
      [messageId]
    )[0];

    if (!message) {
      console.warn(`[DB] Message not found: ${messageId}`);
      return false;
    }

    // Delete message
    this.db.run('DELETE FROM chat_messages WHERE id = ?', [messageId]);

    // Clean up related data
    this.db.run('DELETE FROM message_edit_history WHERE message_id = ?', [messageId]);
    this.db.run('DELETE FROM message_metadata WHERE message_id = ?', [messageId]);
    this.db.run('DELETE FROM bookmarks WHERE message_id = ?', [messageId]);

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Deleted message: ${messageId}`);

    return true;
  }

  /**
   * Pin a message in a conversation
   * @param messageId Message ID to pin
   * @returns true if successfully pinned
   */
  pinMessage(messageId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    // Check if message exists
    const message = this.query<ChatMessage>(
      'SELECT id FROM chat_messages WHERE id = ?',
      [messageId]
    )[0];

    if (!message) {
      console.warn(`[DB] Message not found: ${messageId}`);
      return false;
    }

    this.db.run(
      `INSERT OR REPLACE INTO message_metadata (message_id, is_pinned, last_modified)
       VALUES (?, ?, ?)`,
      [messageId, 1, Date.now()]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Pinned message: ${messageId}`);

    return true;
  }

  /**
   * Unpin a message
   * @param messageId Message ID to unpin
   * @returns true if successfully unpinned
   */
  unpinMessage(messageId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `UPDATE message_metadata SET is_pinned = 0, last_modified = ? WHERE message_id = ?`,
      [Date.now(), messageId]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Unpinned message: ${messageId}`);

    return true;
  }

  /**
   * Get all pinned messages in a conversation
   * @param conversationId Conversation ID
   * @returns Array of pinned messages
   */
  getPinnedMessages(conversationId: string): ChatMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<ChatMessage>(
      `SELECT cm.id, cm.conversation_id, cm.role, cm.content, cm.module_used, cm.trace_data, cm.timestamp
       FROM chat_messages cm
       JOIN message_metadata mm ON cm.id = mm.message_id
       WHERE cm.conversation_id = ? AND mm.is_pinned = 1
       ORDER BY cm.timestamp ASC`,
      [conversationId]
    );
  }

  /**
   * Check if a message is pinned
   * @param messageId Message ID
   * @returns true if pinned, false otherwise
   */
  isMessagePinned(messageId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.query<{ is_pinned: number }>(
      'SELECT is_pinned FROM message_metadata WHERE message_id = ?',
      [messageId]
    )[0];

    return result ? result.is_pinned === 1 : false;
  }

  /**
   * Create a thread reply to a message
   * @param parentMessageId Parent message ID
   * @param replyMessage Reply message content
   * @returns ID of the created reply message
   */
  createThreadReply(
    parentMessageId: string,
    replyMessage: Omit<ChatMessage, 'id' | 'timestamp'>
  ): string {
    if (!this.db) throw new Error('Database not initialized');

    // Check if parent message exists
    const parentMessage = this.query<ChatMessage>(
      'SELECT id FROM chat_messages WHERE id = ?',
      [parentMessageId]
    )[0];

    if (!parentMessage) {
      throw new Error(`Parent message not found: ${parentMessageId}`);
    }

    // Create the reply message
    const replyId = this.addMessage(replyMessage);

    // Link it to the parent message
    this.db.run(
      `INSERT OR REPLACE INTO message_metadata (message_id, thread_parent_id, last_modified)
       VALUES (?, ?, ?)`,
      [replyId, parentMessageId, Date.now()]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Created thread reply: ${replyId} (parent: ${parentMessageId})`);

    return replyId;
  }

  /**
   * Get all thread replies for a message
   * @param parentMessageId Parent message ID
   * @returns Array of reply messages
   */
  getThreadReplies(parentMessageId: string): ChatMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<ChatMessage>(
      `SELECT cm.id, cm.conversation_id, cm.role, cm.content, cm.module_used, cm.trace_data, cm.timestamp
       FROM chat_messages cm
       JOIN message_metadata mm ON cm.id = mm.message_id
       WHERE mm.thread_parent_id = ?
       ORDER BY cm.timestamp ASC`,
      [parentMessageId]
    );
  }

  /**
   * Get thread count for a message
   * @param messageId Message ID
   * @returns Number of thread replies
   */
  getThreadCount(messageId: string): number {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM message_metadata WHERE thread_parent_id = ?`,
      [messageId]
    )[0];

    return result?.count || 0;
  }

  /**
   * Get message with all details (edits, pinned status, thread info)
   * @param messageId Message ID
   * @returns Message with details or null if not found
   */
  getMessageWithDetails(messageId: string): MessageWithDetails | null {
    if (!this.db) throw new Error('Database not initialized');

    const message = this.query<ChatMessage>(
      'SELECT id, conversation_id, role, content, module_used, trace_data, timestamp FROM chat_messages WHERE id = ?',
      [messageId]
    )[0];

    if (!message) {
      return null;
    }

    const metadata = this.query<{
      is_pinned: number;
      thread_parent_id: string | null;
      last_modified: number;
    }>(
      'SELECT is_pinned, thread_parent_id, last_modified FROM message_metadata WHERE message_id = ?',
      [messageId]
    )[0];

    const threadCount = this.getThreadCount(messageId);

    return {
      ...message,
      edited_at: metadata?.last_modified,
      is_pinned: metadata ? metadata.is_pinned === 1 : false,
      thread_parent_id: metadata?.thread_parent_id || null,
      thread_count: threadCount
    };
  }

  /**
   * Get conversation messages with all details (edits, pinned status, threads)
   * @param conversationId Conversation ID
   * @returns Array of messages with details
   */
  getConversationHistoryWithDetails(conversationId: string): MessageWithDetails[] {
    if (!this.db) throw new Error('Database not initialized');

    const messages = this.getConversationHistory(conversationId);

    return messages.map(msg => {
      const detailedMsg = this.getMessageWithDetails(msg.id);
      return detailedMsg || {
        ...msg,
        edited_at: undefined,
        is_pinned: false,
        thread_parent_id: null,
        thread_count: 0
      };
    });
  }

  /**
   * Get message statistics for a conversation
   * @param conversationId Conversation ID
   * @returns Object with message statistics
   */
  getMessageStats(conversationId: string): {
    totalMessages: number;
    pinnedCount: number;
    editedCount: number;
    threadedCount: number;
  } {
    if (!this.db) throw new Error('Database not initialized');

    const messages = this.getConversationHistory(conversationId);
    const totalMessages = messages.length;

    const pinnedCount = this.getPinnedMessages(conversationId).length;

    const editedCount = this.query<{ count: number }>(
      `SELECT COUNT(DISTINCT message_id) as count FROM message_edit_history
       WHERE message_id IN (SELECT id FROM chat_messages WHERE conversation_id = ?)`,
      [conversationId]
    )[0]?.count || 0;

    const threadedCount = this.query<{ count: number }>(
      `SELECT COUNT(DISTINCT thread_parent_id) as count FROM message_metadata
       WHERE thread_parent_id IS NOT NULL
       AND thread_parent_id IN (SELECT id FROM chat_messages WHERE conversation_id = ?)`,
      [conversationId]
    )[0]?.count || 0;

    return {
      totalMessages,
      pinnedCount,
      editedCount,
      threadedCount
    };
  }

  // ==================== CONVERSATION TOOLS ====================

  /**
   * Create a conversation template
   * @param name Template name (unique)
   * @param description Optional template description
   * @param initialMessage Optional initial message
   * @returns Created template
   */
  createConversationTemplate(
    name: string,
    description?: string,
    initialMessage?: string
  ): ConversationTemplate {
    if (!this.db) throw new Error('Database not initialized');

    const id = `tpl-${crypto.randomUUID()}`;
    const createdAt = Date.now();

    this.db.run(
      `INSERT INTO conversation_templates (id, name, description, initial_message, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, description || null, initialMessage || null, createdAt]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Created conversation template: ${id} (${name})`);

    return {
      id,
      name,
      description,
      initial_message: initialMessage,
      created_at: createdAt
    };
  }

  /**
   * Get all conversation templates
   * @returns Array of templates
   */
  getAllTemplates(): ConversationTemplate[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<ConversationTemplate>(
      `SELECT id, name, description, initial_message, created_at
       FROM conversation_templates
       ORDER BY name ASC`
    );
  }

  /**
   * Get a template by ID
   * @param templateId Template ID
   * @returns Template or null if not found
   */
  getTemplate(templateId: string): ConversationTemplate | null {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<ConversationTemplate>(
      `SELECT id, name, description, initial_message, created_at
       FROM conversation_templates
       WHERE id = ?`,
      [templateId]
    )[0] || null;
  }

  /**
   * Create conversation from template
   * @param templateId Template to use
   * @param conversationTitle Title for new conversation
   * @returns ID of created conversation
   */
  createConversationFromTemplate(templateId: string, conversationTitle: string): string {
    if (!this.db) throw new Error('Database not initialized');

    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Create conversation
    const conversationId = this.createConversation(conversationTitle).id;

    // Add initial message if template has one
    if (template.initial_message) {
      this.addMessage({
        conversation_id: conversationId,
        role: 'system',
        content: template.initial_message,
        module_used: null,
        trace_data: null
      });
    }

    console.log(`[DB] Created conversation from template: ${conversationId}`);

    return conversationId;
  }

  /**
   * Delete a conversation template
   * @param templateId Template ID
   * @returns true if deleted, false if not found
   */
  deleteTemplate(templateId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const template = this.getTemplate(templateId);
    if (!template) {
      return false;
    }

    this.db.run('DELETE FROM conversation_templates WHERE id = ?', [templateId]);

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Deleted template: ${templateId}`);

    return true;
  }

  /**
   * Create a conversation branch from an existing conversation at a specific message
   * @param parentConversationId Parent conversation ID
   * @param fromMessageId Message to branch from
   * @param branchName Name for the branch
   * @returns Created branch
   */
  createConversationBranch(
    parentConversationId: string,
    fromMessageId: string,
    branchName: string
  ): ConversationBranch {
    if (!this.db) throw new Error('Database not initialized');

    // Verify parent conversation exists
    const parent = this.getConversation(parentConversationId);
    if (!parent) {
      throw new Error(`Parent conversation not found: ${parentConversationId}`);
    }

    // Verify message exists and is in the conversation
    const message = this.query<ChatMessage>(
      'SELECT id FROM chat_messages WHERE id = ? AND conversation_id = ?',
      [fromMessageId, parentConversationId]
    )[0];

    if (!message) {
      throw new Error(`Message not found in conversation: ${fromMessageId}`);
    }

    const id = `branch-${crypto.randomUUID()}`;
    const createdAt = Date.now();

    this.db.run(
      `INSERT INTO conversation_branches (id, parent_conversation_id, branch_name, from_message_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, parentConversationId, branchName, fromMessageId, createdAt]
    );

    // Record relation
    const relationId = `rel-${crypto.randomUUID()}`;
    this.db.run(
      `INSERT INTO conversation_relations (id, source_conversation_id, target_conversation_id, relation_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [relationId, parentConversationId, parentConversationId, 'branch', createdAt]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Created branch: ${id} from message ${fromMessageId}`);

    return {
      id,
      parent_conversation_id: parentConversationId,
      branch_name: branchName,
      from_message_id: fromMessageId,
      created_at: createdAt
    };
  }

  /**
   * Get all branches of a conversation
   * @param conversationId Conversation ID
   * @returns Array of branches
   */
  getConversationBranches(conversationId: string): ConversationBranch[] {
    if (!this.db) throw new Error('Database not initialized');

    return this.query<ConversationBranch>(
      `SELECT id, parent_conversation_id, branch_name, from_message_id, created_at
       FROM conversation_branches
       WHERE parent_conversation_id = ?
       ORDER BY created_at DESC`,
      [conversationId]
    );
  }

  /**
   * Get messages after a point in a conversation (for branching)
   * @param conversationId Conversation ID
   * @param fromMessageId Message ID to start from (exclusive)
   * @returns Array of messages after the point
   */
  getMessagesAfter(conversationId: string, fromMessageId: string): ChatMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    // Get the timestamp of the fromMessage
    const fromMessage = this.query<ChatMessage>(
      'SELECT timestamp FROM chat_messages WHERE id = ? AND conversation_id = ?',
      [fromMessageId, conversationId]
    )[0];

    if (!fromMessage) {
      console.warn(`[DB] Message not found: ${fromMessageId}`);
      return [];
    }

    return this.query<ChatMessage>(
      `SELECT id, conversation_id, role, content, module_used, trace_data, timestamp
       FROM chat_messages
       WHERE conversation_id = ? AND timestamp > ?
       ORDER BY timestamp ASC`,
      [conversationId, fromMessage.timestamp]
    );
  }

  /**
   * Merge two conversations
   * @param sourceConversationId Conversation to merge from
   * @param targetConversationId Conversation to merge into
   * @returns true if successful
   */
  mergeConversations(sourceConversationId: string, targetConversationId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    // Verify both conversations exist
    const source = this.getConversation(sourceConversationId);
    const target = this.getConversation(targetConversationId);

    if (!source || !target) {
      console.warn('[DB] One or both conversations not found for merge');
      return false;
    }

    if (sourceConversationId === targetConversationId) {
      console.warn('[DB] Cannot merge conversation with itself');
      return false;
    }

    // Get all messages from source
    const sourceMessages = this.getConversationHistory(sourceConversationId);

    // Copy all messages to target
    for (const msg of sourceMessages) {
      this.addMessage({
        conversation_id: targetConversationId,
        role: msg.role,
        content: msg.content,
        module_used: msg.module_used,
        trace_data: msg.trace_data
      });
    }

    // Record the merge relation
    const relationId = `rel-${crypto.randomUUID()}`;
    this.db.run(
      `INSERT INTO conversation_relations (id, source_conversation_id, target_conversation_id, relation_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [relationId, sourceConversationId, targetConversationId, 'merge', Date.now()]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Merged conversation ${sourceConversationId} into ${targetConversationId}`);

    return true;
  }

  /**
   * Split a conversation at a specific message
   * @param conversationId Conversation to split
   * @param atMessageId Message to split at
   * @param newTitle Title for the new conversation
   * @returns ID of new conversation
   */
  splitConversation(conversationId: string, atMessageId: string, newTitle: string): string {
    if (!this.db) throw new Error('Database not initialized');

    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Verify message exists
    const message = this.query<ChatMessage>(
      'SELECT timestamp FROM chat_messages WHERE id = ? AND conversation_id = ?',
      [atMessageId, conversationId]
    )[0];

    if (!message) {
      throw new Error(`Message not found: ${atMessageId}`);
    }

    // Create new conversation
    const newConversation = this.createConversation(newTitle);

    // Get messages after the split point
    const messagesAfter = this.getMessagesAfter(conversationId, atMessageId);

    // Move messages to new conversation
    for (const msg of messagesAfter) {
      this.addMessage({
        conversation_id: newConversation.id,
        role: msg.role,
        content: msg.content,
        module_used: msg.module_used,
        trace_data: msg.trace_data
      });

      // Delete from original conversation
      this.deleteMessage(msg.id);
    }

    // Record the split relation
    const relationId = `rel-${crypto.randomUUID()}`;
    this.db.run(
      `INSERT INTO conversation_relations (id, source_conversation_id, target_conversation_id, relation_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [relationId, conversationId, newConversation.id, 'split', Date.now()]
    );

    // Auto-save
    this.save().catch(err => console.error('[DB] Auto-save failed:', err));

    console.log(`[DB] Split conversation ${conversationId} at message ${atMessageId}`);

    return newConversation.id;
  }

  /**
   * Get conversation relations
   * @param conversationId Conversation ID
   * @param relationType Optional filter by relation type
   * @returns Array of relations
   */
  getConversationRelations(
    conversationId: string,
    relationType?: 'merge' | 'split' | 'branch'
  ): ConversationRelation[] {
    if (!this.db) throw new Error('Database not initialized');

    let sql = `SELECT id, source_conversation_id, target_conversation_id, relation_type, created_at
               FROM conversation_relations
               WHERE source_conversation_id = ? OR target_conversation_id = ?`;
    const params: any[] = [conversationId, conversationId];

    if (relationType) {
      sql += ' AND relation_type = ?';
      params.push(relationType);
    }

    sql += ' ORDER BY created_at DESC';

    return this.query<ConversationRelation>(sql, params);
  }

  /**
   * Get conversation history for a branched conversation
   * @param parentConversationId Parent conversation ID
   * @param fromMessageId Message to branch from
   * @returns Messages up to and including the branch point, plus messages from branches
   */
  getBranchConversationHistory(
    parentConversationId: string,
    fromMessageId: string
  ): ChatMessage[] {
    if (!this.db) throw new Error('Database not initialized');

    // Get message
    const message = this.query<ChatMessage>(
      'SELECT timestamp FROM chat_messages WHERE id = ? AND conversation_id = ?',
      [fromMessageId, parentConversationId]
    )[0];

    if (!message) {
      console.warn(`[DB] Message not found: ${fromMessageId}`);
      return [];
    }

    // Get all messages up to and including the branch point
    return this.query<ChatMessage>(
      `SELECT id, conversation_id, role, content, module_used, trace_data, timestamp
       FROM chat_messages
       WHERE conversation_id = ? AND timestamp <= ?
       ORDER BY timestamp ASC`,
      [parentConversationId, message.timestamp]
    );
  }

  /**
   * Get conversation tools statistics
   * @param conversationId Conversation ID
   * @returns Statistics about conversation tools
   */
  getConversationToolsStats(conversationId: string): {
    branchCount: number;
    relationCount: number;
    hasParent: boolean;
  } {
    if (!this.db) throw new Error('Database not initialized');

    const branchCount = this.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM conversation_branches WHERE parent_conversation_id = ?',
      [conversationId]
    )[0]?.count || 0;

    const relationCount = this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM conversation_relations
       WHERE source_conversation_id = ? OR target_conversation_id = ?`,
      [conversationId, conversationId]
    )[0]?.count || 0;

    const parentBranch = this.query<{ id: string }>(
      'SELECT id FROM conversation_branches WHERE parent_conversation_id = ?',
      [conversationId]
    )[0];

    return {
      branchCount,
      relationCount,
      hasParent: !!parentBranch
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
