/**
 * Preferences Service (Sprint 9)
 *
 * Manages user preferences and settings.
 * Stores preferences in the database (user_preferences table).
 */

import { dbService } from './db.service';

export interface UserPreferences {
  // Socratic Mode Settings
  enableSocraticMode: boolean;
  ariThreshold: number;

  // Privacy Settings
  sensitiveKeywords: string[];

  // UI Settings
  theme: 'dark' | 'light' | 'auto';

  // Advanced Settings
  rdiThreshold: number;
  showModuleStatus: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  enableSocraticMode: true,
  ariThreshold: 0.4,
  sensitiveKeywords: [],
  theme: 'dark',
  rdiThreshold: 0.6,
  showModuleStatus: true,
};

class PreferencesService {
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES };
  private listeners: Set<(prefs: UserPreferences) => void> = new Set();

  /**
   * Initialize preferences from database
   */
  async initialize(): Promise<void> {
    try {
      // Load from database
      const dbPrefs = this.loadFromDatabase();
      this.preferences = { ...DEFAULT_PREFERENCES, ...dbPrefs };
      console.log('[Preferences] Loaded:', this.preferences);
    } catch (error) {
      console.error('[Preferences] Failed to load, using defaults:', error);
      this.preferences = { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Load preferences from database
   */
  private loadFromDatabase(): Partial<UserPreferences> {
    const prefs: Partial<UserPreferences> = {};

    // Load each preference from database
    try {
      const socraticMode = dbService.query<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        ['enable_socratic_mode']
      );
      if (socraticMode.length > 0) {
        prefs.enableSocraticMode = JSON.parse(socraticMode[0].value);
      }

      const ariThreshold = dbService.query<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        ['ari_threshold']
      );
      if (ariThreshold.length > 0) {
        prefs.ariThreshold = parseFloat(JSON.parse(ariThreshold[0].value));
      }

      const keywords = dbService.query<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        ['sensitive_keywords']
      );
      if (keywords.length > 0) {
        prefs.sensitiveKeywords = JSON.parse(keywords[0].value);
      }

      const theme = dbService.query<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        ['theme']
      );
      if (theme.length > 0) {
        prefs.theme = JSON.parse(theme[0].value);
      }

      const rdiThreshold = dbService.query<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        ['rdi_threshold']
      );
      if (rdiThreshold.length > 0) {
        prefs.rdiThreshold = parseFloat(JSON.parse(rdiThreshold[0].value));
      }

      const showModuleStatus = dbService.query<{ value: string }>(
        'SELECT value FROM user_preferences WHERE key = ?',
        ['show_module_status']
      );
      if (showModuleStatus.length > 0) {
        prefs.showModuleStatus = JSON.parse(showModuleStatus[0].value);
      }
    } catch (error) {
      console.error('[Preferences] Error loading from database:', error);
    }

    return prefs;
  }

  /**
   * Save preferences to database
   */
  private saveToDatabase(preferences: UserPreferences): void {
    try {
      // Save each preference
      dbService.exec(
        `INSERT OR REPLACE INTO user_preferences (key, value) VALUES
         ('enable_socratic_mode', '${JSON.stringify(preferences.enableSocraticMode)}'),
         ('ari_threshold', '${JSON.stringify(preferences.ariThreshold.toString())}'),
         ('sensitive_keywords', '${JSON.stringify(preferences.sensitiveKeywords)}'),
         ('theme', '${JSON.stringify(preferences.theme)}'),
         ('rdi_threshold', '${JSON.stringify(preferences.rdiThreshold.toString())}'),
         ('show_module_status', '${JSON.stringify(preferences.showModuleStatus)}')`
      );

      // Save database to localStorage
      dbService.save().catch(err => console.error('[Preferences] Failed to save database:', err));

      console.log('[Preferences] Saved to database');
    } catch (error) {
      console.error('[Preferences] Failed to save to database:', error);
    }
  }

  /**
   * Get all preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.saveToDatabase(this.preferences);
    this.notifyListeners();
    console.log('[Preferences] Updated:', updates);
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.saveToDatabase(this.preferences);
    this.notifyListeners();
    console.log('[Preferences] Reset to defaults');
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(listener: (prefs: UserPreferences) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of preference changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.preferences));
  }

  /**
   * Get specific preference
   */
  get<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.preferences[key];
  }

  /**
   * Set specific preference
   */
  set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    this.updatePreferences({ [key]: value } as Partial<UserPreferences>);
  }

  /**
   * Export preferences as JSON
   */
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  importPreferences(json: string): void {
    try {
      const imported = JSON.parse(json);
      this.updatePreferences(imported);
      console.log('[Preferences] Imported successfully');
    } catch (error) {
      console.error('[Preferences] Failed to import:', error);
      throw new Error('Invalid preferences JSON');
    }
  }
}

// Export singleton instance
export const preferencesService = new PreferencesService();
