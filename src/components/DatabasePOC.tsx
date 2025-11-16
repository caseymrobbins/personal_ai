/**
 * Database POC Component
 *
 * This component demonstrates and validates all required database capabilities:
 * - WASM-SQLite initialization
 * - Table creation with the full schema from Table 1.3.1
 * - Data insertion and querying
 * - SQL analytics queries (for Step 4: ARI/RDI)
 * - Database export (for AC-AI: "Exit & Portability")
 */

import { useState } from 'react';
import { dbService } from '../services/db.service';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: Record<string, unknown> | unknown[];
}

export function DatabasePOC() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (
    test: string,
    status: TestResult['status'],
    message?: string,
    data?: Record<string, unknown> | unknown[]
  ) => {
    setResults(prev => {
      const filtered = prev.filter(r => r.test !== test);
      return [...filtered, { test, status, message, data }];
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Initialize Database
      updateResult('init', 'pending', 'Initializing WASM-SQLite...');
      await dbService.initialize();
      updateResult('init', 'success', '✅ Database initialized');

      // Test 2: Create Tables (from Table 1.3.1 schema)
      updateResult('schema', 'pending', 'Creating database schema...');
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT,
          created_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT,
          role TEXT,
          content TEXT,
          module_used TEXT,
          trace_data TEXT,
          timestamp INTEGER,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );

        CREATE TABLE IF NOT EXISTS governance_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER,
          user_prompt_hash TEXT,
          lexical_density REAL,
          syntactic_complexity REAL,
          prompt_embedding BLOB
        );

        CREATE TABLE IF NOT EXISTS api_keys (
          service_id TEXT PRIMARY KEY,
          encrypted_key BLOB,
          added_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS user_preferences (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      updateResult('schema', 'success', '✅ Schema created (5 tables)');

      // Test 3: Insert Test Data
      updateResult('insert', 'pending', 'Inserting test data...');
      const conversationId = 'test-conv-' + Date.now();
      dbService.exec(`
        INSERT INTO conversations (id, title, created_at)
        VALUES ('${conversationId}', 'Test Conversation', ${Date.now()});

        INSERT INTO chat_messages (id, conversation_id, role, content, module_used, timestamp)
        VALUES
          ('msg-1', '${conversationId}', 'user', 'Hello AI', 'local_guardian', ${Date.now()}),
          ('msg-2', '${conversationId}', 'assistant', 'Hello! How can I help?', 'local_guardian', ${Date.now()});

        INSERT INTO governance_log (timestamp, lexical_density, syntactic_complexity)
        VALUES
          (${Date.now()}, 0.75, 0.82),
          (${Date.now()}, 0.68, 0.79),
          (${Date.now()}, 0.72, 0.85);
      `);
      updateResult('insert', 'success', '✅ Test data inserted');

      // Test 4: Query Data
      updateResult('query', 'pending', 'Running SQL queries...');
      const messages = dbService.query('SELECT * FROM chat_messages');
      updateResult('query', 'success', `✅ Retrieved ${messages.length} messages`, messages);

      // Test 5: Analytics Query (Step 4: ARI calculation)
      updateResult('analytics', 'pending', 'Running analytics query (ARI)...');
      const ariResult = dbService.query<{ avg_density: number; avg_complexity: number }>(
        'SELECT AVG(lexical_density) as avg_density, AVG(syntactic_complexity) as avg_complexity FROM governance_log'
      );
      updateResult('analytics', 'success', '✅ Analytics query successful', ariResult[0]);

      // Test 6: Save to localStorage
      updateResult('save', 'pending', 'Saving database to localStorage...');
      await dbService.save();
      updateResult('save', 'success', '✅ Database persisted');

      // Test 7: Get database stats
      updateResult('stats', 'pending', 'Getting database stats...');
      const stats = dbService.getStats();
      updateResult('stats', 'success', `✅ Database size: ${(stats.size / 1024).toFixed(2)} KB`, stats);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateResult('error', 'error', `❌ Error: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = async () => {
    try {
      await dbService.exportToFile();
      alert('✅ Database exported successfully! Check your downloads folder.');
    } catch (error) {
      alert('❌ Export failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 WASM-SQLite POC (TASK-002)</h2>
      <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
        Testing all required database capabilities for the SML Guardian
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={runTests}
          disabled={isRunning}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.6 : 1,
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run POC Tests'}
        </button>

        <button
          onClick={handleExport}
          disabled={results.length === 0}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#48bb78',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: results.length === 0 ? 'not-allowed' : 'pointer',
            opacity: results.length === 0 ? 0.6 : 1,
          }}
        >
          Export Database (.db file)
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {results.map(result => (
          <div
            key={result.test}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor:
                result.status === 'success' ? '#48bb78' :
                result.status === 'error' ? '#f56565' :
                '#667eea',
              backgroundColor:
                result.status === 'success' ? 'rgba(72, 187, 120, 0.1)' :
                result.status === 'error' ? 'rgba(245, 101, 101, 0.1)' :
                'rgba(102, 126, 234, 0.1)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {result.test.toUpperCase()}
            </div>
            <div>{result.message}</div>
            {result.data && (
              <pre style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                fontSize: '0.85rem',
                overflow: 'auto',
              }}>
                {String(JSON.stringify(result.data, null, 2))}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
