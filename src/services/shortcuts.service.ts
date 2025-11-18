/**
 * Keyboard Shortcuts Service for SML Guardian
 *
 * Provides:
 * - Global keyboard shortcut management
 * - Command palette integration
 * - Customizable key bindings
 * - Context-aware shortcuts
 * - Accessibility support
 */

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[]; // e.g., ['ctrl+k', 'cmd+k'] for cross-platform
  category: 'navigation' | 'conversation' | 'editing' | 'search' | 'system';
  action: () => void;
  enabled: boolean;
  customizable: boolean;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  keywords?: string[];
  action: () => void;
  shortcut?: string;
}

type ShortcutCallback = () => void;

class ShortcutsService {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: Map<string, ShortcutCallback> = new Map();
  private isEnabled: boolean = true;
  private activeModals: Set<string> = new Set();

  /**
   * Initialize the shortcuts service
   */
  initialize(): void {
    if (typeof window === 'undefined') return;

    // Listen for keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Load custom shortcuts from localStorage
    this.loadCustomShortcuts();

    console.log('[Shortcuts] Service initialized');
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
    console.log(`[Shortcuts] Registered: ${shortcut.name} (${shortcut.keys.join(', ')})`);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
    this.listeners.delete(id);
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Don't trigger shortcuts when typing in inputs (unless explicitly allowed)
    const target = event.target as HTMLElement;
    const isInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true';

    // Build the key combination string
    const key = this.getKeyString(event);

    // Find matching shortcut
    for (const [id, shortcut] of this.shortcuts) {
      if (!shortcut.enabled) continue;

      const matches = shortcut.keys.some((k) => this.matchesKey(k, key));

      if (matches) {
        // Allow some shortcuts even in inputs (like Ctrl+K for command palette)
        const allowInInput = ['ctrl+k', 'cmd+k', 'ctrl+/', 'cmd+/'];
        const shouldAllow = !isInput || allowInInput.some((k) => this.matchesKey(k, key));

        if (shouldAllow) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          console.log(`[Shortcuts] Triggered: ${shortcut.name}`);
          return;
        }
      }
    }
  }

  /**
   * Get key string from event
   */
  private getKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) {
      // Use cmd on Mac, ctrl elsewhere
      parts.push(this.isMac() ? 'cmd' : 'ctrl');
    }
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // Get the key
    let key = event.key.toLowerCase();

    // Normalize some keys
    if (key === ' ') key = 'space';
    if (key === 'escape') key = 'esc';
    if (key === 'arrowup') key = 'up';
    if (key === 'arrowdown') key = 'down';
    if (key === 'arrowleft') key = 'left';
    if (key === 'arrowright') key = 'right';

    parts.push(key);

    return parts.join('+');
  }

  /**
   * Check if key string matches
   */
  private matchesKey(pattern: string, actual: string): boolean {
    // Normalize patterns
    const normalizedPattern = pattern.toLowerCase().replace(/\s/g, '');
    const normalizedActual = actual.toLowerCase().replace(/\s/g, '');

    return normalizedPattern === normalizedActual;
  }

  /**
   * Check if running on Mac
   */
  private isMac(): boolean {
    return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter((s) => s.category === category);
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Update shortcut keys
   */
  updateShortcut(id: string, keys: string[]): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut && shortcut.customizable) {
      shortcut.keys = keys;
      this.saveCustomShortcuts();
    }
  }

  /**
   * Save custom shortcuts to localStorage
   */
  private saveCustomShortcuts(): void {
    const customShortcuts: Record<string, string[]> = {};

    for (const [id, shortcut] of this.shortcuts) {
      if (shortcut.customizable) {
        customShortcuts[id] = shortcut.keys;
      }
    }

    localStorage.setItem('customKeyboardShortcuts', JSON.stringify(customShortcuts));
  }

  /**
   * Load custom shortcuts from localStorage
   */
  private loadCustomShortcuts(): void {
    const saved = localStorage.getItem('customKeyboardShortcuts');
    if (!saved) return;

    try {
      const customShortcuts: Record<string, string[]> = JSON.parse(saved);

      for (const [id, keys] of Object.entries(customShortcuts)) {
        const shortcut = this.shortcuts.get(id);
        if (shortcut && shortcut.customizable) {
          shortcut.keys = keys;
        }
      }
    } catch (err) {
      console.error('[Shortcuts] Failed to load custom shortcuts:', err);
    }
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetToDefaults(): void {
    localStorage.removeItem('customKeyboardShortcuts');
    // Reload page to reset shortcuts
    window.location.reload();
  }

  /**
   * Format key string for display
   */
  formatKeyString(key: string): string {
    const parts = key.split('+');
    const formatted = parts.map((part) => {
      if (part === 'ctrl') return this.isMac() ? '⌃' : 'Ctrl';
      if (part === 'cmd') return '⌘';
      if (part === 'alt') return this.isMac() ? '⌥' : 'Alt';
      if (part === 'shift') return this.isMac() ? '⇧' : 'Shift';
      if (part === 'esc') return 'Esc';
      if (part === 'space') return 'Space';
      return part.charAt(0).toUpperCase() + part.slice(1);
    });

    return formatted.join(this.isMac() ? '' : '+');
  }

  /**
   * Get display key (platform-specific)
   */
  getDisplayKey(keys: string[]): string {
    const platformKey = this.isMac()
      ? keys.find((k) => k.includes('cmd'))
      : keys.find((k) => k.includes('ctrl'));

    return this.formatKeyString(platformKey || keys[0]);
  }

  /**
   * Notify that a modal is active (disable shortcuts)
   */
  setModalActive(modalId: string, active: boolean): void {
    if (active) {
      this.activeModals.add(modalId);
    } else {
      this.activeModals.delete(modalId);
    }

    // Disable shortcuts when any modal is active
    this.isEnabled = this.activeModals.size === 0;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
    this.shortcuts.clear();
    this.listeners.clear();
  }
}

export const shortcutsService = new ShortcutsService();
