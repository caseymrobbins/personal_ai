/**
 * Database Initialization Module
 *
 * Handles database schema creation and migration management
 */

import { dbService } from '../services/db.service';

// Import the schema as a string (Vite handles this)
import schemaSQL from './schema.sql?raw';

/**
 * Initialize the database with the full schema from Table 1.3.1
 *
 * This function:
 * 1. Creates all tables if they don't exist
 * 2. Sets up indexes for performance
 * 3. Initializes default user preferences
 *
 * Safe to call multiple times (idempotent via IF NOT EXISTS)
 */
export async function initializeDatabase(): Promise<void> {
  console.log('[DB Init] Initializing database schema...');

  try {
    // Ensure the database service is initialized
    await dbService.initialize();

    // Execute the schema SQL
    // Split by semicolon to handle multiple statements
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      dbService.exec(statement + ';');
    }

    console.log('[DB Init] ✅ Database schema initialized successfully');

    // Verify schema
    const stats = dbService.getStats();
    console.log('[DB Init] Tables created:', stats.tables);

    return Promise.resolve();
  } catch (error) {
    console.error('[DB Init] ❌ Failed to initialize schema:', error);
    throw error;
  }
}

/**
 * Get the current schema version
 */
export function getSchemaVersion(): string {
  const result = dbService.query<{ value: string }>(
    "SELECT value FROM user_preferences WHERE key = 'schema_version'"
  );

  return result.length > 0 ? result[0].value : 'unknown';
}

/**
 * Validate that all required tables exist
 */
export function validateSchema(): { valid: boolean; missing: string[] } {
  const requiredTables = [
    'conversations',
    'chat_messages',
    'api_keys',
    'governance_log',
    'user_preferences'
  ];

  const stats = dbService.getStats();
  const existingTables = stats.tables;

  const missing = requiredTables.filter(table => !existingTables.includes(table));

  return {
    valid: missing.length === 0,
    missing
  };
}
