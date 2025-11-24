/**
 * SettingsModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
import type { UserPreferences } from '../services/preferences.service';

// Mock services
vi.mock('../services/preferences.service', () => {
  const mockPreferences: UserPreferences = {
    theme: 'dark',
    showModuleStatus: true,
    enableSocraticMode: true,
    ariThreshold: 0.3,
    sensitiveKeywords: ['test', 'example'],
    rdiThreshold: 0.6,
  };

  return {
    preferencesService: {
      getPreferences: vi.fn(() => mockPreferences),
      updatePreferences: vi.fn(),
      resetToDefaults: vi.fn(),
      exportPreferences: vi.fn(() => JSON.stringify(mockPreferences)),
      importPreferences: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    },
  };
});

vi.mock('./ConversationImporter', () => ({
  ConversationImporter: () => <div>ConversationImporter Component</div>,
}));

// Mock window functions
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to get mock service
  const getMockService = () => {
    const { preferencesService } = require('../services/preferences.service');
    return preferencesService;
  };

  describe('Rendering', () => {
    it('should render modal with header', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      expect(screen.getByText(/⚙️ Settings/)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      const closeButton = screen.getByText('✕');
      expect(closeButton).toBeInTheDocument();
    });

    it('should render all tabs', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('should render save and cancel buttons', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should render general tab by default', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      expect(screen.getByText('User Interface')).toBeInTheDocument();
    });

    it('should have active class on general tab by default', () => {
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const generalTab = screen.getByText('General').closest('.settings-tab');
      expect(generalTab).toHaveClass('active');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const closeButton = screen.getByText('✕');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const overlay = container.querySelector('.settings-modal-overlay');
      await user.click(overlay!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking modal content', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const modal = container.querySelector('.settings-modal');
      await user.click(modal!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when clicking cancel button', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to privacy tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const privacyTab = screen.getByText('Privacy');
      await user.click(privacyTab);

      expect(screen.getByText('Privacy Protection')).toBeInTheDocument();
    });

    it('should switch to data tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const dataTab = screen.getByText('Data');
      await user.click(dataTab);

      expect(screen.getByText('ConversationImporter Component')).toBeInTheDocument();
    });

    it('should switch to advanced tab when clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const advancedTab = screen.getByText('Advanced');
      await user.click(advancedTab);

      expect(screen.getByText('Reality Drift Detection')).toBeInTheDocument();
    });

    it('should apply active class to clicked tab', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const privacyTab = screen.getByText('Privacy').closest('.settings-tab');
      await user.click(privacyTab!);

      expect(privacyTab).toHaveClass('active');
    });
  });

  describe('General Tab Settings', () => {
    it('should render theme selector with current value', () => {
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const themeSelect = container.querySelector('select');
      expect(themeSelect).toHaveValue('dark');
    });

    it('should update theme when changed', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const themeSelect = container.querySelector('select')!;
      await user.selectOptions(themeSelect, 'light');

      // Should show unsaved changes
      expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();
    });

    it('should render module status toggle', () => {
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes[0]).toBeChecked(); // First checkbox is module status
    });

    it('should toggle module status', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const moduleStatusCheckbox = checkboxes[0];
      await user.click(moduleStatusCheckbox);

      expect(moduleStatusCheckbox).not.toBeChecked();
      expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();
    });

    it('should render socratic mode toggle', () => {
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes[1]).toBeChecked(); // Second checkbox is socratic mode
    });

    it('should render ARI threshold slider', () => {
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const sliders = container.querySelectorAll('input[type="range"]');
      expect(sliders[0]).toHaveValue('0.3');
    });

    it('should display ARI threshold value', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      expect(screen.getByText('0.30')).toBeInTheDocument();
    });
  });

  describe('Privacy Tab Settings', () => {
    it('should render sensitive keywords textarea', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Privacy'));

      const textarea = screen.getByPlaceholderText(/e.g., MyCompany/);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('test, example');
    });

    it('should update sensitive keywords', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Privacy'));

      const textarea = screen.getByPlaceholderText(/e.g., MyCompany/);
      await user.clear(textarea);
      await user.type(textarea, 'foo, bar, baz');

      expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();
    });

    it('should render privacy information', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Privacy'));

      expect(screen.getByText('📌 How Privacy Works:')).toBeInTheDocument();
      expect(screen.getByText(/All data stored locally in your browser/)).toBeInTheDocument();
    });
  });

  describe('Data Tab', () => {
    it('should render ConversationImporter component', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Data'));

      expect(screen.getByText('ConversationImporter Component')).toBeInTheDocument();
    });
  });

  describe('Advanced Tab Settings', () => {
    it('should render RDI threshold slider', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      const sliders = container.querySelectorAll('input[type="range"]');
      expect(sliders[0]).toHaveValue('0.6'); // RDI threshold slider
    });

    it('should display RDI threshold value', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      const values = screen.getAllByText('0.60');
      expect(values.length).toBeGreaterThan(0);
    });

    it('should render export button', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      expect(screen.getByText('📤 Export Settings')).toBeInTheDocument();
    });

    it('should render import button', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      expect(screen.getByText('📥 Import Settings')).toBeInTheDocument();
    });

    it('should render reset button', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      expect(screen.getByText('🔄 Reset to Defaults')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should disable save button when no changes', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
    });

    it.skip('should enable save button when changes made', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const checkbox = screen.getByRole('checkbox', { name: /Display real-time AI processing state indicators/i });
      await user.click(checkbox);

      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).not.toBeDisabled();
    });

    it.skip('should show unsaved changes indicator', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const checkbox = screen.getByRole('checkbox', { name: /Display real-time AI processing state indicators/i });
      await user.click(checkbox);

      expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();
    });

    it('should not show unsaved changes initially', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument();
    });

    it.skip('should call updatePreferences when save clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      await user.click(checkboxes[0]);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      const mockService = getMockService();
      expect(mockService.updatePreferences).toHaveBeenCalled();
    });

    it.skip('should hide unsaved changes after save', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      const checkbox = screen.getByRole('checkbox', { name: /Display real-time AI processing state indicators/i });
      await user.click(checkbox);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(screen.queryByText('● Unsaved changes')).not.toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it.skip('should trigger download when export clicked', async () => {
      const user = userEvent.setup();
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      const exportButton = screen.getByText('📤 Export Settings');
      await user.click(exportButton);

      const mockService = getMockService();
      expect(mockService.exportPreferences).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Reset Functionality', () => {
    it.skip('should show confirmation dialog when reset clicked', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      const resetButton = screen.getByText('🔄 Reset to Defaults');
      await user.click(resetButton);

      expect(confirmSpy).toHaveBeenCalledWith('Reset all settings to defaults? This cannot be undone.');
    });

    it.skip('should call resetToDefaults when confirmed', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      const resetButton = screen.getByText('🔄 Reset to Defaults');
      await user.click(resetButton);

      const mockService = getMockService();
      expect(mockService.resetToDefaults).toHaveBeenCalled();
    });

    it.skip('should not reset when canceled', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<SettingsModal onClose={mockOnClose} />);

      await user.click(screen.getByText('Advanced'));

      const resetButton = screen.getByText('🔄 Reset to Defaults');
      await user.click(resetButton);

      const mockService = getMockService();
      expect(mockService.resetToDefaults).not.toHaveBeenCalled();
    });
  });

  describe('Subscription', () => {
    it.skip('should subscribe to preference changes on mount', () => {
      render(<SettingsModal onClose={mockOnClose} />);

      const mockService = getMockService();
      expect(mockService.subscribe).toHaveBeenCalled();
    });

    it.skip('should unsubscribe on unmount', () => {
      const mockUnsubscribe = vi.fn();
      const mockService = getMockService();
      mockService.subscribe.mockReturnValue(mockUnsubscribe);

      const { unmount } = render(<SettingsModal onClose={mockOnClose} />);
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Structure', () => {
    it('should have correct modal structure', () => {
      const { container } = render(<SettingsModal onClose={mockOnClose} />);

      expect(container.querySelector('.settings-modal-overlay')).toBeInTheDocument();
      expect(container.querySelector('.settings-modal')).toBeInTheDocument();
      expect(container.querySelector('.settings-header')).toBeInTheDocument();
      expect(container.querySelector('.settings-tabs')).toBeInTheDocument();
      expect(container.querySelector('.settings-content')).toBeInTheDocument();
      expect(container.querySelector('.settings-footer')).toBeInTheDocument();
    });
  });
});
