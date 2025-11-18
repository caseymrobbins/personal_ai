/**
 * Keyboard Shortcuts Provider
 *
 * Provides global keyboard shortcuts integration:
 * - Initializes shortcuts service
 * - Registers all shortcuts
 * - Manages command palette
 * - Manages shortcuts modal
 */

import { useEffect, useState, ReactNode } from 'react';
import { shortcutsService, type CommandPaletteItem } from '../../services/shortcuts.service';
import { CommandPalette } from './CommandPalette';
import { ShortcutsModal } from './ShortcutsModal';

export interface KeyboardShortcutsProviderProps {
  children: ReactNode;
  onNewConversation?: () => void;
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
  onOpenAnalytics?: () => void;
  onOpenImport?: () => void;
  onOpenBackup?: () => void;
  onFocusInput?: () => void;
}

export function KeyboardShortcutsProvider({
  children,
  onNewConversation,
  onToggleSidebar,
  onOpenSearch,
  onOpenAnalytics,
  onOpenImport,
  onOpenBackup,
  onFocusInput,
}: KeyboardShortcutsProviderProps) {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    // Initialize shortcuts service
    shortcutsService.initialize();

    // Register navigation shortcuts
    if (onNewConversation) {
      shortcutsService.registerShortcut({
        id: 'new-conversation',
        name: 'New Conversation',
        description: 'Create a new conversation',
        keys: ['ctrl+n', 'cmd+n'],
        category: 'conversation',
        action: onNewConversation,
        enabled: true,
        customizable: true,
      });
    }

    if (onToggleSidebar) {
      shortcutsService.registerShortcut({
        id: 'toggle-sidebar',
        name: 'Toggle Sidebar',
        description: 'Show/hide conversations sidebar',
        keys: ['ctrl+b', 'cmd+b'],
        category: 'navigation',
        action: onToggleSidebar,
        enabled: true,
        customizable: true,
      });
    }

    if (onOpenSearch) {
      shortcutsService.registerShortcut({
        id: 'open-search',
        name: 'Search Conversations',
        description: 'Open search to find messages',
        keys: ['ctrl+f', 'cmd+f'],
        category: 'search',
        action: onOpenSearch,
        enabled: true,
        customizable: true,
      });
    }

    if (onOpenAnalytics) {
      shortcutsService.registerShortcut({
        id: 'open-analytics',
        name: 'Analytics Dashboard',
        description: 'Open analytics and insights',
        keys: ['ctrl+shift+a', 'cmd+shift+a'],
        category: 'navigation',
        action: onOpenAnalytics,
        enabled: true,
        customizable: true,
      });
    }

    if (onOpenImport) {
      shortcutsService.registerShortcut({
        id: 'open-import',
        name: 'Import Conversations',
        description: 'Import from ChatGPT or Claude',
        keys: ['ctrl+shift+i', 'cmd+shift+i'],
        category: 'system',
        action: onOpenImport,
        enabled: true,
        customizable: true,
      });
    }

    if (onOpenBackup) {
      shortcutsService.registerShortcut({
        id: 'open-backup',
        name: 'Encrypted Backups',
        description: 'Create or restore encrypted backups',
        keys: ['ctrl+shift+b', 'cmd+shift+b'],
        category: 'system',
        action: onOpenBackup,
        enabled: true,
        customizable: true,
      });
    }

    if (onFocusInput) {
      shortcutsService.registerShortcut({
        id: 'focus-input',
        name: 'Focus Message Input',
        description: 'Jump to message input field',
        keys: ['ctrl+l', 'cmd+l'],
        category: 'editing',
        action: onFocusInput,
        enabled: true,
        customizable: true,
      });
    }

    // Command Palette shortcut
    shortcutsService.registerShortcut({
      id: 'command-palette',
      name: 'Command Palette',
      description: 'Open command palette',
      keys: ['ctrl+k', 'cmd+k'],
      category: 'system',
      action: () => setShowCommandPalette(true),
      enabled: true,
      customizable: false,
    });

    // Shortcuts modal shortcut
    shortcutsService.registerShortcut({
      id: 'show-shortcuts',
      name: 'Keyboard Shortcuts',
      description: 'Show all keyboard shortcuts',
      keys: ['ctrl+/', 'cmd+/', '?'],
      category: 'system',
      action: () => setShowShortcutsModal(true),
      enabled: true,
      customizable: false,
    });

    // Cleanup on unmount
    return () => {
      shortcutsService.destroy();
    };
  }, [
    onNewConversation,
    onToggleSidebar,
    onOpenSearch,
    onOpenAnalytics,
    onOpenImport,
    onOpenBackup,
    onFocusInput,
  ]);

  // Build command palette items
  const commands: CommandPaletteItem[] = [
    onNewConversation && {
      id: 'new-conversation',
      label: 'New Conversation',
      description: 'Create a new conversation',
      category: 'conversation',
      keywords: ['create', 'start', 'begin'],
      action: onNewConversation,
      shortcut: shortcutsService.formatKeyString('ctrl+n'),
    },
    onToggleSidebar && {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the conversations sidebar',
      category: 'navigation',
      keywords: ['show', 'hide', 'panel'],
      action: onToggleSidebar,
      shortcut: shortcutsService.formatKeyString('ctrl+b'),
    },
    onOpenSearch && {
      id: 'search',
      label: 'Search Conversations',
      description: 'Search through all your messages',
      category: 'search',
      keywords: ['find', 'lookup', 'query'],
      action: onOpenSearch,
      shortcut: shortcutsService.formatKeyString('ctrl+f'),
    },
    onOpenAnalytics && {
      id: 'analytics',
      label: 'Analytics Dashboard',
      description: 'View insights and statistics',
      category: 'navigation',
      keywords: ['stats', 'metrics', 'insights', 'data'],
      action: onOpenAnalytics,
      shortcut: shortcutsService.formatKeyString('ctrl+shift+a'),
    },
    onOpenImport && {
      id: 'import',
      label: 'Import Conversations',
      description: 'Import from ChatGPT or Claude',
      category: 'import',
      keywords: ['chatgpt', 'claude', 'data', 'transfer'],
      action: onOpenImport,
      shortcut: shortcutsService.formatKeyString('ctrl+shift+i'),
    },
    onOpenBackup && {
      id: 'backup',
      label: 'Encrypted Backups',
      description: 'Create or restore encrypted backups',
      category: 'backup',
      keywords: ['export', 'save', 'restore', 'security'],
      action: onOpenBackup,
      shortcut: shortcutsService.formatKeyString('ctrl+shift+b'),
    },
    onFocusInput && {
      id: 'focus-input',
      label: 'Focus Message Input',
      description: 'Jump to the message input field',
      category: 'navigation',
      keywords: ['type', 'chat', 'message'],
      action: onFocusInput,
      shortcut: shortcutsService.formatKeyString('ctrl+l'),
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all available shortcuts',
      category: 'system',
      keywords: ['help', 'keys', 'commands'],
      action: () => setShowShortcutsModal(true),
      shortcut: shortcutsService.formatKeyString('ctrl+/'),
    },
  ].filter(Boolean) as CommandPaletteItem[];

  return (
    <>
      {children}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </>
  );
}
