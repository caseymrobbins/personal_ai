/**
 * Settings Modal Component (Sprint 9)
 *
 * Provides user interface for managing all preferences and settings.
 */

import { useState, useEffect } from 'react';
import { preferencesService, type UserPreferences } from '../services/preferences.service';
import { ConversationImporter } from './ConversationImporter';
import './SettingsModal.css';

export interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    preferencesService.getPreferences()
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'data' | 'advanced'>('general');

  useEffect(() => {
    // Subscribe to preference changes
    const unsubscribe = preferencesService.subscribe(setPreferences);
    return unsubscribe;
  }, []);

  const handleChange = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    preferencesService.updatePreferences(preferences);
    setHasChanges(false);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      preferencesService.resetToDefaults();
      setPreferences(preferencesService.getPreferences());
      setHasChanges(false);
    }
  };

  const handleExport = () => {
    const json = preferencesService.exportPreferences();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sml-guardian-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            preferencesService.importPreferences(json);
            setPreferences(preferencesService.getPreferences());
            setHasChanges(false);
            alert('Settings imported successfully!');
          } catch (error) {
            alert('Failed to import settings. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="settings-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy
          </button>
          <button
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Data
          </button>
          <button
            className={`settings-tab ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>User Interface</h3>

              <div className="setting-item">
                <div className="setting-label">
                  <strong>Theme</strong>
                  <p>Choose your preferred color scheme</p>
                </div>
                <select
                  value={preferences.theme}
                  onChange={(e) => handleChange('theme', e.target.value as 'dark' | 'light' | 'auto')}
                  className="setting-select"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <strong>Show Module Status</strong>
                  <p>Display real-time AI processing state indicators</p>
                </div>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={preferences.showModuleStatus}
                    onChange={(e) => handleChange('showModuleStatus', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <h3>Socratic Co-pilot</h3>

              <div className="setting-item">
                <div className="setting-label">
                  <strong>Enable Socratic Mode</strong>
                  <p>Get critical thinking guidance when autonomy is low</p>
                </div>
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={preferences.enableSocraticMode}
                    onChange={(e) => handleChange('enableSocraticMode', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <strong>ARI Intervention Threshold</strong>
                  <p>Trigger Socratic mode when ARI falls below this value (0.0 - 1.0)</p>
                </div>
                <div className="setting-slider-container">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={preferences.ariThreshold}
                    onChange={(e) => handleChange('ariThreshold', parseFloat(e.target.value))}
                    className="setting-slider"
                  />
                  <span className="slider-value">{preferences.ariThreshold.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h3>Privacy Protection</h3>

              <div className="setting-item">
                <div className="setting-label">
                  <strong>Sensitive Keywords</strong>
                  <p>Custom words to anonymize before sending to external APIs (comma-separated)</p>
                </div>
                <textarea
                  value={preferences.sensitiveKeywords.join(', ')}
                  onChange={(e) => handleChange(
                    'sensitiveKeywords',
                    e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0)
                  )}
                  placeholder="e.g., MyCompany, ProjectCodename, SecretFeature"
                  className="setting-textarea"
                  rows={3}
                />
              </div>

              <div className="setting-info">
                <strong>📌 How Privacy Works:</strong>
                <ul>
                  <li>All data stored locally in your browser (WASM-SQLite)</li>
                  <li>Sensitive info anonymized before external API calls</li>
                  <li>Original text restored in responses</li>
                  <li>ARI/RDI metrics stored (not raw text)</li>
                  <li>Export your data anytime (.db file)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="settings-section">
              <ConversationImporter />
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="settings-section">
              <h3>Reality Drift Detection</h3>

              <div className="setting-item">
                <div className="setting-label">
                  <strong>RDI Alert Threshold</strong>
                  <p>Alert when topic drift exceeds this value (0.0 - 1.0)</p>
                </div>
                <div className="setting-slider-container">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={preferences.rdiThreshold}
                    onChange={(e) => handleChange('rdiThreshold', parseFloat(e.target.value))}
                    className="setting-slider"
                  />
                  <span className="slider-value">{preferences.rdiThreshold.toFixed(2)}</span>
                </div>
              </div>

              <h3>Data Management</h3>

              <div className="setting-actions">
                <button className="setting-action-btn" onClick={handleExport}>
                  📤 Export Settings
                </button>
                <button className="setting-action-btn" onClick={handleImport}>
                  📥 Import Settings
                </button>
                <button className="setting-action-btn danger" onClick={handleReset}>
                  🔄 Reset to Defaults
                </button>
              </div>

              <div className="setting-info">
                <strong>⚠️ Advanced Features:</strong>
                <ul>
                  <li><strong>RDI Threshold:</strong> Lower = more sensitive to topic changes</li>
                  <li><strong>Export Settings:</strong> Save your preferences as JSON</li>
                  <li><strong>Import Settings:</strong> Restore from backup</li>
                  <li><strong>Reset:</strong> Return all settings to defaults</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <div className="settings-footer-left">
            {hasChanges && (
              <span className="unsaved-changes">● Unsaved changes</span>
            )}
          </div>
          <div className="settings-footer-right">
            <button className="settings-btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="settings-btn primary"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
