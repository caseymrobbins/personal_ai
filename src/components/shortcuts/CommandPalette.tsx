/**
 * Command Palette Component
 *
 * Quick access to all commands via keyboard (Ctrl+K / Cmd+K)
 * - Fuzzy search
 * - Keyboard navigation
 * - Categorized commands
 * - Recently used commands
 */

import { useState, useEffect, useRef } from 'react';
import { type CommandPaletteItem } from '../../services/shortcuts.service';
import './CommandPalette.css';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandPaletteItem[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<CommandPaletteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter commands based on query
  useEffect(() => {
    if (!query) {
      setFilteredCommands(commands);
      setSelectedIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(lowerQuery);
      const descMatch = cmd.description?.toLowerCase().includes(lowerQuery);
      const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(lowerQuery));

      return labelMatch || descMatch || keywordMatch;
    });

    // Sort by relevance (label match first)
    filtered.sort((a, b) => {
      const aLabelMatch = a.label.toLowerCase().startsWith(lowerQuery);
      const bLabelMatch = b.label.toLowerCase().startsWith(lowerQuery);
      if (aLabelMatch && !bLabelMatch) return -1;
      if (!aLabelMatch && bLabelMatch) return 1;
      return 0;
    });

    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query, commands]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const executeCommand = (command: CommandPaletteItem) => {
    // Save to recent commands
    saveRecentCommand(command.id);

    // Execute the command
    command.action();

    // Close palette
    onClose();
  };

  const saveRecentCommand = (commandId: string) => {
    const recent = getRecentCommands();
    const updated = [commandId, ...recent.filter((id) => id !== commandId)].slice(0, 10);
    localStorage.setItem('recentCommands', JSON.stringify(updated));
  };

  const getRecentCommands = (): string[] => {
    const saved = localStorage.getItem('recentCommands');
    return saved ? JSON.parse(saved) : [];
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      navigation: '🧭',
      conversation: '💬',
      editing: '✏️',
      search: '🔍',
      system: '⚙️',
      export: '📦',
      import: '📥',
      backup: '🔐',
    };
    return icons[category] || '📌';
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <span className="command-palette-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="command-palette-input"
          />
          <span className="command-palette-hint">Esc to close</span>
        </div>

        <div ref={listRef} className="command-palette-results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">No commands found</div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => executeCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-item-icon">
                  {getCategoryIcon(command.category)}
                </div>
                <div className="command-item-content">
                  <div className="command-item-label">{command.label}</div>
                  {command.description && (
                    <div className="command-item-description">{command.description}</div>
                  )}
                </div>
                {command.shortcut && (
                  <div className="command-item-shortcut">{command.shortcut}</div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-tips">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
