/**
 * Theme Customization Dialog
 *
 * Allows users to customize:
 * - Color scheme (dark, light, nord, solarized, monokai)
 * - Font family and size
 * - UI density
 * - Live preview
 */

import { useState, useEffect } from 'react';
import {
  themeService,
  type ThemeConfig,
  type ColorScheme,
  type FontFamily,
  type FontSize,
  type UIDensity,
} from '../../services/theme.service';
import './ThemeDialog.css';

export interface ThemeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeDialog({ isOpen, onClose }: ThemeDialogProps) {
  const [config, setConfig] = useState<ThemeConfig>(themeService.getTheme());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(themeService.getTheme());
      setHasChanges(false);
    }
  }, [isOpen]);

  const handleChange = (updates: Partial<ThemeConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleApply = () => {
    themeService.setTheme(config);
    setHasChanges(false);
  };

  const handleReset = () => {
    if (confirm('Reset all theme settings to defaults?')) {
      themeService.resetTheme();
      setConfig(themeService.getTheme());
      setHasChanges(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Discard them?')) {
        setConfig(themeService.getTheme());
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const colorSchemes: Array<{ value: ColorScheme; label: string; description: string }> = [
    { value: 'dark', label: 'Dark', description: 'Default dark theme' },
    { value: 'light', label: 'Light', description: 'Clean light theme' },
    { value: 'nord', label: 'Nord', description: 'Arctic, north-bluish theme' },
    { value: 'solarized', label: 'Solarized', description: 'Precision colors for readability' },
    { value: 'monokai', label: 'Monokai', description: 'Vibrant syntax highlighting' },
  ];

  const fontFamilies: Array<{ value: FontFamily; label: string }> = [
    { value: 'system', label: 'System Default' },
    { value: 'inter', label: 'Inter' },
    { value: 'roboto', label: 'Roboto' },
    { value: 'jetbrains-mono', label: 'JetBrains Mono' },
  ];

  const fontSizes: Array<{ value: FontSize; label: string }> = [
    { value: 'small', label: 'Small (14px)' },
    { value: 'medium', label: 'Medium (16px)' },
    { value: 'large', label: 'Large (18px)' },
    { value: 'x-large', label: 'Extra Large (20px)' },
  ];

  const densities: Array<{ value: UIDensity; label: string; description: string }> = [
    { value: 'compact', label: 'Compact', description: 'More content, less spacing' },
    { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing' },
    { value: 'spacious', label: 'Spacious', description: 'More breathing room' },
  ];

  return (
    <div className="theme-dialog-overlay" onClick={handleClose}>
      <div className="theme-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="theme-dialog-header">
          <h2>🎨 Theme & Appearance</h2>
          <button className="theme-dialog-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="theme-dialog-content">
          {/* Color Scheme Section */}
          <div className="theme-section">
            <h3 className="theme-section-title">Color Scheme</h3>
            <div className="theme-grid">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.value}
                  className={`theme-option ${config.colorScheme === scheme.value ? 'selected' : ''}`}
                  onClick={() => handleChange({ colorScheme: scheme.value })}
                >
                  <div className="theme-option-preview" data-scheme={scheme.value}>
                    <div className="preview-dot" />
                    <div className="preview-dot" />
                    <div className="preview-dot" />
                  </div>
                  <div className="theme-option-label">{scheme.label}</div>
                  <div className="theme-option-description">{scheme.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Settings Section */}
          <div className="theme-section">
            <h3 className="theme-section-title">Font</h3>

            <div className="theme-subsection">
              <label className="theme-label">Font Family</label>
              <select
                className="theme-select"
                value={config.fontFamily}
                onChange={(e) => handleChange({ fontFamily: e.target.value as FontFamily })}
              >
                {fontFamilies.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="theme-subsection">
              <label className="theme-label">Font Size</label>
              <select
                className="theme-select"
                value={config.fontSize}
                onChange={(e) => handleChange({ fontSize: e.target.value as FontSize })}
              >
                {fontSizes.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Density Section */}
          <div className="theme-section">
            <h3 className="theme-section-title">UI Density</h3>
            <div className="theme-density-options">
              {densities.map((density) => (
                <button
                  key={density.value}
                  className={`density-option ${config.density === density.value ? 'selected' : ''}`}
                  onClick={() => handleChange({ density: density.value })}
                >
                  <div className="density-icon" data-density={density.value}>
                    <div className="density-bar" />
                    <div className="density-bar" />
                    <div className="density-bar" />
                  </div>
                  <div className="density-label">{density.label}</div>
                  <div className="density-description">{density.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div className="theme-section">
            <h3 className="theme-section-title">Preview</h3>
            <div className="theme-preview">
              <div className="preview-message preview-user">
                <div className="preview-avatar">U</div>
                <div className="preview-content">
                  This is how user messages will appear with your theme settings.
                </div>
              </div>
              <div className="preview-message preview-assistant">
                <div className="preview-avatar">AI</div>
                <div className="preview-content">
                  And this is how assistant responses will look. Notice the colors, spacing, and font.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="theme-dialog-footer">
          <button
            className="theme-button theme-button-secondary"
            onClick={handleReset}
          >
            Reset to Default
          </button>
          <div className="theme-footer-actions">
            <button
              className="theme-button theme-button-tertiary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className="theme-button theme-button-primary"
              onClick={handleApply}
              disabled={!hasChanges}
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
