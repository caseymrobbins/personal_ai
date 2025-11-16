/**
 * Database Service - WASM-SQLite POC
 *
 * This service demonstrates the core capabilities required for the SML Guardian:
 * 1. Full SQL query support (for Step 4 ARI/RDI analytics)
 * 2. High-performance local persistence
 * 3. Database export for "Exit & Portability" (Step 3)
 *
 * Using sql.js for the initial POC (can be upgraded to @sqlite.org/sqlite-wasm later)
 */

import initSqlJs, { Database } from 'sql.js';

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
