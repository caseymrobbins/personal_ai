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

    // Verify if schema already exists
    const existingTables = dbService.getStats().tables;
    console.log('[DB Init] Existing tables:', existingTables);

    // Clean SQL: remove comments and split by semicolons
    const cleanSQL = schemaSQL
      // Remove single-line comments
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolon to get individual statements
    const statements = cleanSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`[DB Init] Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        dbService.exec(statement + ';');
        console.log(`[DB Init] ✓ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        console.error(`[DB Init] ❌ Failed to execute statement ${i + 1}:`, statement);
        console.error('[DB Init] Error:', error);
        // Continue with other statements even if one fails
      }
    }

    console.log('[DB Init] ✅ Database schema initialized successfully');

    // Verify schema
    const stats = dbService.getStats();
    console.log('[DB Init] Tables created:', stats.tables);

    // Validate that all required tables exist
    const validation = validateSchema();
    if (!validation.valid) {
      console.error('[DB Init] ⚠️ Missing tables:', validation.missing);
      throw new Error(`Missing required tables: ${validation.missing.join(', ')}`);
    }

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
    'thought_streams',
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

/**
 * Reset the database completely (DESTRUCTIVE!)
 * This will delete all data and reinitialize with a fresh schema.
 * Use this if the database is corrupted or has schema issues.
 */
export async function resetDatabase(): Promise<void> {
  console.log('[DB Reset] ⚠️ Resetting database...');

  try {
    // Close the current database
    dbService.close();

    // Clear all storage
    const { storageService } = await import('../services/storage.service');
    await storageService.clearDatabase();

    console.log('[DB Reset] Cleared existing database');

    // Reinitialize
    await initializeDatabase();

    console.log('[DB Reset] ✅ Database reset complete');
    console.log('[DB Reset] Please reload the page to continue');
  } catch (error) {
    console.error('[DB Reset] ❌ Failed to reset database:', error);
    throw error;
  }
}

// Export reset function to window for emergency use
if (typeof window !== 'undefined') {
  (window as any).resetDatabase = resetDatabase;
  console.log('[DB Init] Emergency reset function available: window.resetDatabase()');
}
