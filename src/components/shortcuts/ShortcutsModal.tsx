/**
 * Keyboard Shortcuts Reference Modal
 *
 * Displays all available keyboard shortcuts grouped by category
 * - Searchable list
 * - Categorized display
 * - Platform-specific keys
 * - Customization options
 */

import { useState } from 'react';
import { type KeyboardShortcut, shortcutsService } from '../../services/shortcuts.service';
import './ShortcutsModal.css';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [shortcuts] = useState<KeyboardShortcut[]>(shortcutsService.getShortcuts());

  const filteredShortcuts = searchQuery
    ? shortcuts.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : shortcuts;

  const categories = [
    { id: 'navigation', name: 'Navigation', icon: '🧭' },
    { id: 'conversation', name: 'Conversations', icon: '💬' },
    { id: 'editing', name: 'Editing', icon: '✏️' },
    { id: 'search', name: 'Search', icon: '🔍' },
    { id: 'system', name: 'System', icon: '⚙️' },
  ];

  const getShortcutsByCategory = (categoryId: string): KeyboardShortcut[] => {
    return filteredShortcuts.filter((s) => s.category === categoryId && s.enabled);
  };

  if (!isOpen) return null;

  return (
    <div className="shortcuts-modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="shortcuts-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-modal-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="shortcuts-search-input"
          />
        </div>

        <div className="shortcuts-modal-content">
          {categories.map((category) => {
            const categoryShortcuts = getShortcutsByCategory(category.id);
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category.id} className="shortcuts-category">
                <h3 className="shortcuts-category-title">
                  <span className="shortcuts-category-icon">{category.icon}</span>
                  {category.name}
                </h3>
                <div className="shortcuts-list">
                  {categoryShortcuts.map((shortcut) => (
                    <div key={shortcut.id} className="shortcut-item">
                      <div className="shortcut-info">
                        <div className="shortcut-name">{shortcut.name}</div>
                        <div className="shortcut-description">{shortcut.description}</div>
                      </div>
                      <div className="shortcut-keys">
                        {shortcutsService.getDisplayKey(shortcut.keys)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="shortcuts-empty">No shortcuts found matching "{searchQuery}"</div>
          )}
        </div>

        <div className="shortcuts-modal-footer">
          <p className="shortcuts-tip">
            Tip: Press <kbd>Ctrl+K</kbd> (or <kbd>⌘K</kbd> on Mac) to open the command palette
          </p>
        </div>
      </div>
    </div>
  );
}
