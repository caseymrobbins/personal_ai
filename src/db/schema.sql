/**
 * SML Guardian Database Schema (Table 1.3.1)
 *
 * This schema implements the privacy-by-design principles:
 * - Segregated chat data from governance data
 * - Encrypted API keys (BYOK with WebCrypto)
 * - Analytics-ready structure for Step 4 (ARI/RDI)
 * - Full portability via .db export (AC-AI: Exit & Portability)
 */

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Stores conversation metadata
-- Each conversation is a thread of related messages
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,                -- UUID (e.g., 'conv-123e4567-e89b-12d3')
  title TEXT NOT NULL,                -- User-editable or AI-generated title
  created_at INTEGER NOT NULL         -- UNIX timestamp (milliseconds)
);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at
  ON conversations(created_at DESC);

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- ============================================================================
-- Stores the actual chat messages and their trace data
-- Links to conversations via conversation_id foreign key
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,                -- UUID (e.g., 'msg-123e4567-e89b-12d3')
  conversation_id TEXT NOT NULL,      -- Foreign key to conversations
  role TEXT NOT NULL,                 -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,              -- The final, human-readable message
  module_used TEXT,                   -- e.g., 'local_guardian', 'openai_gpt-4o'
  trace_data TEXT,                    -- JSON: Step 5 "Inspect" data (routing, scrubbing, etc.)
  timestamp INTEGER NOT NULL,         -- UNIX timestamp (milliseconds)

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON chat_messages(conversation_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp
  ON chat_messages(timestamp DESC);

-- ============================================================================
-- API_KEYS TABLE
-- ============================================================================
-- Secure storage for user's API keys (Step 3: BYOK)
-- Keys are encrypted using WebCrypto with user's Master Password
CREATE TABLE IF NOT EXISTS api_keys (
  service_id TEXT PRIMARY KEY,        -- e.g., 'openai', 'anthropic', 'claude'
  encrypted_key BLOB NOT NULL,        -- AES-256-GCM encrypted key blob
  added_at INTEGER NOT NULL           -- UNIX timestamp (milliseconds)
);

-- ============================================================================
-- GOVERNANCE_LOG TABLE
-- ============================================================================
-- Privacy-preserving analytics for Step 4 (Conscience Module)
-- Stores ONLY metrics, NOT raw user text (privacy-by-design)
-- This enables ARI/RDI calculation without violating user privacy
CREATE TABLE IF NOT EXISTS governance_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,         -- UNIX timestamp (milliseconds)
  user_prompt_hash TEXT,              -- SHA-256 hash for de-duplication (NOT for reverse lookup)

  -- ARI (Autonomy Retention Index) Metrics
  lexical_density REAL,               -- Measure of lexical richness (0.0-1.0)
  syntactic_complexity REAL,          -- Measure of sentence structure complexity (0.0-1.0)

  -- RDI (Reality Drift Index) Metrics
  prompt_embedding BLOB               -- 384-dim vector embedding for concept drift analysis
);

CREATE INDEX IF NOT EXISTS idx_governance_timestamp
  ON governance_log(timestamp DESC);

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================
-- Stores user preferences and configuration
-- Key-value store for flexible settings
CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,               -- e.g., 'sensitive_keywords', 'enable_socratic_mode'
  value TEXT NOT NULL                 -- JSON-encoded value
);

-- ============================================================================
-- INITIAL PREFERENCES
-- ============================================================================
-- Set default user preferences
INSERT OR IGNORE INTO user_preferences (key, value) VALUES
  ('sensitive_keywords', '[]'),                       -- Step 2: User-defined PII terms
  ('enable_socratic_mode', 'false'),                  -- Step 4: Socratic co-pilot toggle
  ('ari_threshold', '0.65'),                          -- Step 4: ARI threshold for Socratic trigger
  ('theme', 'dark');                                  -- UI preference

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================
-- Track schema version for future migrations
INSERT OR IGNORE INTO user_preferences (key, value) VALUES
  ('schema_version', '1.0.0');
