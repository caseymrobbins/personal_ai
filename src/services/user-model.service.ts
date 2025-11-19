/**
 * User Model Service (Phase 1 - Task 6)
 *
 * Maintains a dynamic profile of the user learned from interactions.
 * Stores user preferences, interests, capabilities, communication style, and goals.
 *
 * This service feeds into:
 * - Goal Management (GOCA) - understands user's context
 * - Entity Extractor - learns about user-related entities
 * - Long-Term Memory - contextualizes memories with user info
 */

import { dbService } from './db.service';

export type PreferenceCategory =
  | 'technical'
  | 'communication'
  | 'work_style'
  | 'learning'
  | 'interaction'
  | 'other';

export interface UserPreference {
  key: string;
  value: string | number | boolean;
  category: PreferenceCategory;
  confidence: number; // 0.0-1.0 how sure we are
  learnedFrom?: string[]; // Sources/observations
  updatedAt: number;
}

export interface UserInterest {
  topic: string;
  confidence: number; // 0.0-1.0
  mentions: number; // How many times mentioned
  lastMentionedAt: number;
  context?: string; // Where we learned this
}

export interface UserCapability {
  skill: string;
  proficiency: number; // 0.0-1.0 (novice to expert)
  evidence: string[]; // Examples of this skill
  updatedAt: number;
}

export interface UserProfile {
  userId: string; // System-generated user ID
  displayName?: string;
  createdAt: number;
  lastUpdatedAt: number;
  preferences: Map<string, UserPreference>;
  interests: Map<string, UserInterest>;
  capabilities: Map<string, UserCapability>;
  communicationStyle?: string; // Tone, verbosity, directness
  metadata?: Record<string, unknown>;
}

export interface UserStats {
  totalPreferences: number;
  totalInterests: number;
  totalCapabilities: number;
  averagePreferenceConfidence: number;
  averageInterestConfidence: number;
  topInterests: string[];
  topCapabilities: string[];
}

/**
 * UserModelService
 *
 * Tracks user profile and learning over time
 */
class UserModelService {
  private userProfile: UserProfile | null = null;
  private userId = 'user-default'; // Default user ID

  /**
   * Initialize user model database
   */
  async initialize(): Promise<void> {
    try {
      // Create user profiles table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id TEXT PRIMARY KEY,
          display_name TEXT,
          communication_style TEXT,
          metadata TEXT,
          created_at INTEGER NOT NULL,
          last_updated_at INTEGER NOT NULL
        )
      `);

      // Create preferences table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          category TEXT NOT NULL,
          confidence REAL NOT NULL,
          learned_from TEXT,
          updated_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
        )
      `);

      // Create interests table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS user_interests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          confidence REAL NOT NULL,
          mentions INTEGER DEFAULT 1,
          context TEXT,
          last_mentioned_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
        )
      `);

      // Create capabilities table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS user_capabilities (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          skill TEXT NOT NULL,
          proficiency REAL NOT NULL,
          evidence TEXT,
          updated_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
        )
      `);

      // Create indexes
      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_preferences_user
        ON user_preferences(user_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_interests_user
        ON user_interests(user_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_interests_confidence
        ON user_interests(confidence DESC)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_capabilities_user
        ON user_capabilities(user_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_capabilities_proficiency
        ON user_capabilities(proficiency DESC)
      `);

      await dbService.save();

      // Load or create default user profile
      await this.loadOrCreateProfile(this.userId);

      console.log('[UserModel] ✅ Service initialized');
    } catch (error) {
      console.error('[UserModel] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load or create user profile
   */
  private async loadOrCreateProfile(userId: string): Promise<void> {
    // Check if profile exists
    const existing = dbService.query<{
      user_id: string;
      display_name: string | null;
      communication_style: string | null;
      created_at: number;
      last_updated_at: number;
    }>(
      `SELECT user_id, display_name, communication_style, created_at, last_updated_at
       FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (existing.length > 0) {
      const profile = existing[0];
      this.userProfile = {
        userId: profile.user_id,
        displayName: profile.display_name || undefined,
        createdAt: profile.created_at,
        lastUpdatedAt: profile.last_updated_at,
        communicationStyle: profile.communication_style || undefined,
        preferences: new Map(),
        interests: new Map(),
        capabilities: new Map(),
      };

      // Load preferences
      this.loadPreferences(userId);
      this.loadInterests(userId);
      this.loadCapabilities(userId);
    } else {
      // Create new profile
      this.userProfile = {
        userId,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        preferences: new Map(),
        interests: new Map(),
        capabilities: new Map(),
      };

      dbService.exec(
        `INSERT INTO user_profiles (user_id, created_at, last_updated_at)
         VALUES (?, ?, ?)`,
        [userId, this.userProfile.createdAt, this.userProfile.lastUpdatedAt]
      );

      console.log('[UserModel] 👤 New user profile created:', userId);
    }
  }

  /**
   * Load preferences from database
   */
  private loadPreferences(userId: string): void {
    if (!this.userProfile) return;

    const rows = dbService.query<{
      key: string;
      value: string;
      category: string;
      confidence: number;
      learned_from: string | null;
      updated_at: number;
    }>(
      `SELECT key, value, category, confidence, learned_from, updated_at
       FROM user_preferences WHERE user_id = ?`,
      [userId]
    );

    rows.forEach((row) => {
      this.userProfile!.preferences.set(row.key, {
        key: row.key,
        value: this.parseValue(row.value),
        category: row.category as PreferenceCategory,
        confidence: row.confidence,
        learnedFrom: row.learned_from ? JSON.parse(row.learned_from) : undefined,
        updatedAt: row.updated_at,
      });
    });
  }

  /**
   * Load interests from database
   */
  private loadInterests(userId: string): void {
    if (!this.userProfile) return;

    const rows = dbService.query<{
      topic: string;
      confidence: number;
      mentions: number;
      context: string | null;
      last_mentioned_at: number;
    }>(
      `SELECT topic, confidence, mentions, context, last_mentioned_at
       FROM user_interests WHERE user_id = ?`,
      [userId]
    );

    rows.forEach((row) => {
      this.userProfile!.interests.set(row.topic, {
        topic: row.topic,
        confidence: row.confidence,
        mentions: row.mentions,
        lastMentionedAt: row.last_mentioned_at,
        context: row.context || undefined,
      });
    });
  }

  /**
   * Load capabilities from database
   */
  private loadCapabilities(userId: string): void {
    if (!this.userProfile) return;

    const rows = dbService.query<{
      skill: string;
      proficiency: number;
      evidence: string | null;
      updated_at: number;
    }>(
      `SELECT skill, proficiency, evidence, updated_at
       FROM user_capabilities WHERE user_id = ?`,
      [userId]
    );

    rows.forEach((row) => {
      this.userProfile!.capabilities.set(row.skill, {
        skill: row.skill,
        proficiency: row.proficiency,
        evidence: row.evidence ? JSON.parse(row.evidence) : [],
        updatedAt: row.updated_at,
      });
    });
  }

  /**
   * Add or update user preference
   */
  addPreference(
    key: string,
    value: string | number | boolean,
    category: PreferenceCategory,
    confidence: number = 0.7,
    learnedFrom?: string[]
  ): UserPreference {
    if (!this.userProfile) throw new Error('User profile not initialized');

    const preference: UserPreference = {
      key,
      value,
      category,
      confidence: Math.min(1, Math.max(0, confidence)),
      learnedFrom,
      updatedAt: Date.now(),
    };

    this.userProfile.preferences.set(key, preference);

    const id = `pref-${this.userId}-${key}-${Date.now()}`;
    dbService.exec(
      `INSERT OR REPLACE INTO user_preferences
       (id, user_id, key, value, category, confidence, learned_from, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        this.userId,
        key,
        String(value),
        category,
        preference.confidence,
        learnedFrom ? JSON.stringify(learnedFrom) : null,
        preference.updatedAt,
      ]
    );

    console.log(
      `[UserModel] 🎯 Preference added: ${key} = ${value} (confidence: ${confidence})`
    );
    return preference;
  }

  /**
   * Get preference by key
   */
  getPreference(key: string): UserPreference | undefined {
    return this.userProfile?.preferences.get(key);
  }

  /**
   * Add or update user interest
   */
  addInterest(
    topic: string,
    confidence: number = 0.7,
    context?: string
  ): UserInterest {
    if (!this.userProfile) throw new Error('User profile not initialized');

    const existing = this.userProfile.interests.get(topic);
    const interest: UserInterest = {
      topic,
      confidence: Math.min(1, Math.max(0, confidence)),
      mentions: (existing?.mentions || 0) + 1,
      lastMentionedAt: Date.now(),
      context: context || existing?.context,
    };

    this.userProfile.interests.set(topic, interest);

    const id = `interest-${this.userId}-${topic}-${Date.now()}`;
    dbService.exec(
      `INSERT OR REPLACE INTO user_interests
       (id, user_id, topic, confidence, mentions, context, last_mentioned_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        this.userId,
        topic,
        interest.confidence,
        interest.mentions,
        context || null,
        interest.lastMentionedAt,
      ]
    );

    console.log(
      `[UserModel] 🎓 Interest added: ${topic} (mentions: ${interest.mentions})`
    );
    return interest;
  }

  /**
   * Get interest by topic
   */
  getInterest(topic: string): UserInterest | undefined {
    return this.userProfile?.interests.get(topic);
  }

  /**
   * Add or update user capability
   */
  addCapability(
    skill: string,
    proficiency: number = 0.5,
    evidence?: string[]
  ): UserCapability {
    if (!this.userProfile) throw new Error('User profile not initialized');

    const existing = this.userProfile.capabilities.get(skill);
    const capability: UserCapability = {
      skill,
      proficiency: Math.min(1, Math.max(0, proficiency)),
      evidence: [...(existing?.evidence || []), ...(evidence || [])],
      updatedAt: Date.now(),
    };

    this.userProfile.capabilities.set(skill, capability);

    const id = `cap-${this.userId}-${skill}-${Date.now()}`;
    dbService.exec(
      `INSERT OR REPLACE INTO user_capabilities
       (id, user_id, skill, proficiency, evidence, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        this.userId,
        skill,
        capability.proficiency,
        JSON.stringify(capability.evidence),
        capability.updatedAt,
      ]
    );

    console.log(
      `[UserModel] 💪 Capability added: ${skill} (proficiency: ${proficiency})`
    );
    return capability;
  }

  /**
   * Get capability by skill
   */
  getCapability(skill: string): UserCapability | undefined {
    return this.userProfile?.capabilities.get(skill);
  }

  /**
   * Get user profile
   */
  getProfile(): UserProfile | null {
    if (!this.userProfile) return null;

    return {
      ...this.userProfile,
      preferences: new Map(this.userProfile.preferences),
      interests: new Map(this.userProfile.interests),
      capabilities: new Map(this.userProfile.capabilities),
    };
  }

  /**
   * Update user display name
   */
  setDisplayName(displayName: string): void {
    if (!this.userProfile) throw new Error('User profile not initialized');

    this.userProfile.displayName = displayName;
    this.userProfile.lastUpdatedAt = Date.now();

    dbService.exec(
      `UPDATE user_profiles SET display_name = ?, last_updated_at = ? WHERE user_id = ?`,
      [displayName, this.userProfile.lastUpdatedAt, this.userId]
    );

    console.log(`[UserModel] 👤 Display name updated: ${displayName}`);
  }

  /**
   * Update communication style
   */
  setCommunicationStyle(style: string): void {
    if (!this.userProfile) throw new Error('User profile not initialized');

    this.userProfile.communicationStyle = style;
    this.userProfile.lastUpdatedAt = Date.now();

    dbService.exec(
      `UPDATE user_profiles SET communication_style = ?, last_updated_at = ? WHERE user_id = ?`,
      [style, this.userProfile.lastUpdatedAt, this.userId]
    );

    console.log(`[UserModel] 💬 Communication style updated: ${style}`);
  }

  /**
   * Get user statistics
   */
  getStats(): UserStats {
    if (!this.userProfile) {
      return {
        totalPreferences: 0,
        totalInterests: 0,
        totalCapabilities: 0,
        averagePreferenceConfidence: 0,
        averageInterestConfidence: 0,
        topInterests: [],
        topCapabilities: [],
      };
    }

    const interests = Array.from(this.userProfile.interests.values());
    const capabilities = Array.from(this.userProfile.capabilities.values());
    const preferences = Array.from(this.userProfile.preferences.values());

    const avgPrefConfidence =
      preferences.length > 0
        ? preferences.reduce((sum, p) => sum + p.confidence, 0) /
          preferences.length
        : 0;

    const avgInterestConfidence =
      interests.length > 0
        ? interests.reduce((sum, i) => sum + i.confidence, 0) / interests.length
        : 0;

    const topInterests = interests
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map((i) => i.topic);

    const topCapabilities = capabilities
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 5)
      .map((c) => c.skill);

    return {
      totalPreferences: preferences.length,
      totalInterests: interests.length,
      totalCapabilities: capabilities.length,
      averagePreferenceConfidence: avgPrefConfidence,
      averageInterestConfidence: avgInterestConfidence,
      topInterests,
      topCapabilities,
    };
  }

  /**
   * Merge user interest with stronger one (de-duplication)
   */
  mergeInterests(source: string, target: string): void {
    const sourceInterest = this.userProfile?.interests.get(source);
    const targetInterest = this.userProfile?.interests.get(target);

    if (!sourceInterest || !targetInterest) return;

    // Merge into target
    targetInterest.confidence = Math.max(
      sourceInterest.confidence,
      targetInterest.confidence
    );
    targetInterest.mentions += sourceInterest.mentions;
    targetInterest.lastMentionedAt = Math.max(
      sourceInterest.lastMentionedAt,
      targetInterest.lastMentionedAt
    );

    // Remove source
    this.userProfile!.interests.delete(source);

    dbService.exec(`DELETE FROM user_interests WHERE topic = ? AND user_id = ?`, [
      source,
      this.userId,
    ]);

    console.log(`[UserModel] 🔀 Merged interests: ${source} → ${target}`);
  }

  /**
   * Clear all user data (dangerous)
   */
  clear(): void {
    this.userProfile = null;
    dbService.exec(`DELETE FROM user_preferences WHERE user_id = ?`, [
      this.userId,
    ]);
    dbService.exec(`DELETE FROM user_interests WHERE user_id = ?`, [this.userId]);
    dbService.exec(`DELETE FROM user_capabilities WHERE user_id = ?`, [
      this.userId,
    ]);
    console.log('[UserModel] ⚠️ User data cleared');
  }

  /**
   * Helper: parse stored value back to original type
   */
  private parseValue(str: string): string | number | boolean {
    if (str === 'true') return true;
    if (str === 'false') return false;
    const num = parseFloat(str);
    if (!isNaN(num) && str === String(num)) return num;
    return str;
  }
}

// Export singleton instance
export const userModelService = new UserModelService();
