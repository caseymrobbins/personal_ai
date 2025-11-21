/**
 * Settings Modal Component (Sprint 9)
 *
 * Provides user interface for managing all preferences and settings.
 */

import { useState, useEffect } from 'react';
import { preferencesService, type UserPreferences } from '../services/preferences.service';
import { apiKeyService } from '../services/apikey.service';
import { ConversationImporter } from './ConversationImporter';
import { EncryptedBackupManager } from './EncryptedBackupManager';
import './SettingsModal.css';

export interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    preferencesService.getPreferences()
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'apikeys' | 'data' | 'advanced'>('general');

  // API Key management state
  const [masterPassword, setMasterPassword] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    gemini: '',
    cohere: ''
  });
  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false,
    gemini: false,
    cohere: false
  });
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to preference changes
    const unsubscribe = preferencesService.subscribe(setPreferences);
    return unsubscribe;
  }, []);

  // Load API key status on mount
  useEffect(() => {
    const status: Record<string, boolean> = {};
    ['openai', 'anthropic', 'gemini', 'cohere'].forEach(provider => {
      status[provider] = apiKeyService.hasAPIKey(provider);
    });
    setApiKeyStatus(status);
    setSessionActive(apiKeyService.hasSession());
  }, []);

  // Initialize session with master password
  const handleInitializeSession = async () => {
    if (!masterPassword) {
      alert('Please enter a master password');
      return;
    }
    try {
      await apiKeyService.initializeSession(masterPassword);
      setSessionActive(true);
      setSaveMessage('Session initialized! You can now manage API keys.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      alert('Failed to initialize session');
    }
  };

  // Save API key
  const handleSaveApiKey = async (provider: string, key: string) => {
    if (!sessionActive) {
      alert('Please initialize a session first');
      return;
    }
    if (!key.trim()) {
      // Delete if empty
      apiKeyService.deleteAPIKey(provider);
      setApiKeyStatus(prev => ({ ...prev, [provider]: false }));
      setSaveMessage(`${provider} API key removed`);
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    try {
      await apiKeyService.storeAPIKey(provider, key);
      setApiKeyStatus(prev => ({ ...prev, [provider]: true }));
      setSaveMessage(`${provider} API key saved securely!`);
      setTimeout(() => setSaveMessage(null), 3000);
      // Clear the input
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
    } catch (error) {
      alert(`Failed to save ${provider} API key: ${error}`);
    }
  };

  // Load API key for editing
  const handleLoadApiKey = async (provider: string) => {
    if (!sessionActive) {
      alert('Please initialize a session first');
      return;
    }
    try {
      const key = await apiKeyService.getAPIKey(provider);
      if (key) {
        setApiKeys(prev => ({ ...prev, [provider]: key }));
      }
    } catch (error) {
      alert(`Failed to load ${provider} API key: ${error}`);
    }
  };

  // Delete API key
  const handleDeleteApiKey = (provider: string) => {
    if (confirm(`Delete ${provider} API key?`)) {
      apiKeyService.deleteAPIKey(provider);
      setApiKeyStatus(prev => ({ ...prev, [provider]: false }));
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
      setSaveMessage(`${provider} API key deleted`);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

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
            className={`settings-tab ${activeTab === 'apikeys' ? 'active' : ''}`}
            onClick={() => setActiveTab('apikeys')}
          >
            🔑 API Keys
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

          {/* API Keys Tab */}
          {activeTab === 'apikeys' && (
            <div className="settings-section">
              <h3>🔑 API Key Management</h3>

              {saveMessage && (
                <div className="setting-info" style={{ background: 'rgba(40, 167, 69, 0.1)', borderLeft: '3px solid #28a745' }}>
                  {saveMessage}
                </div>
              )}

              {!sessionActive ? (
                <div className="api-key-session">
                  <div className="setting-info">
                    <strong>🔐 Security First</strong>
                    <p>Your API keys are encrypted using AES-256-GCM with PBKDF2 key derivation.</p>
                    <p>Enter a master password to unlock API key management:</p>
                  </div>

                  <div className="setting-item">
                    <input
                      type="password"
                      placeholder="Master password"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInitializeSession()}
                      className="setting-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={handleInitializeSession}
                      className="setting-action-btn"
                      style={{ marginLeft: '1rem' }}
                    >
                      🔓 Unlock
                    </button>
                  </div>

                  <div className="setting-info" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
                    <strong>💡 Tip:</strong> Use a strong, memorable password. This password encrypts all your API keys locally.
                  </div>
                </div>
              ) : (
                <div className="api-keys-management">
                  <div className="setting-info" style={{ background: 'rgba(40, 167, 69, 0.1)', borderLeft: '3px solid #28a745', marginBottom: '1.5rem' }}>
                    ✅ Session active. Your API keys are encrypted and stored securely in your browser.
                  </div>

                  {/* OpenAI */}
                  <div className="api-key-item">
                    <div className="api-key-header">
                      <h4>🤖 OpenAI</h4>
                      {apiKeyStatus.openai && <span className="api-key-status saved">✓ Saved</span>}
                    </div>
                    <p className="api-key-desc">GPT-4, GPT-4o, and other OpenAI models</p>
                    <div className="api-key-input-group">
                      <input
                        type={showApiKeys.openai ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={apiKeys.openai}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                        className="setting-input"
                      />
                      <button
                        onClick={() => setShowApiKeys(prev => ({ ...prev, openai: !prev.openai }))}
                        className="api-key-toggle-btn"
                        title={showApiKeys.openai ? 'Hide' : 'Show'}
                      >
                        {showApiKeys.openai ? '👁️' : '👁️‍🗨️'}
                      </button>
                      {apiKeyStatus.openai && (
                        <button
                          onClick={() => handleLoadApiKey('openai')}
                          className="api-key-action-btn"
                          title="Load saved key"
                        >
                          📥
                        </button>
                      )}
                      <button
                        onClick={() => handleSaveApiKey('openai', apiKeys.openai)}
                        className="api-key-action-btn primary"
                        title="Save key"
                      >
                        💾
                      </button>
                      {apiKeyStatus.openai && (
                        <button
                          onClick={() => handleDeleteApiKey('openai')}
                          className="api-key-action-btn danger"
                          title="Delete key"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="api-key-link">
                      Get your OpenAI API key →
                    </a>
                  </div>

                  {/* Anthropic */}
                  <div className="api-key-item">
                    <div className="api-key-header">
                      <h4>🧠 Anthropic (Claude)</h4>
                      {apiKeyStatus.anthropic && <span className="api-key-status saved">✓ Saved</span>}
                    </div>
                    <p className="api-key-desc">Claude 3.5 Sonnet, Claude 3 Opus, and other Claude models</p>
                    <div className="api-key-input-group">
                      <input
                        type={showApiKeys.anthropic ? 'text' : 'password'}
                        placeholder="sk-ant-..."
                        value={apiKeys.anthropic}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                        className="setting-input"
                      />
                      <button
                        onClick={() => setShowApiKeys(prev => ({ ...prev, anthropic: !prev.anthropic }))}
                        className="api-key-toggle-btn"
                        title={showApiKeys.anthropic ? 'Hide' : 'Show'}
                      >
                        {showApiKeys.anthropic ? '👁️' : '👁️‍🗨️'}
                      </button>
                      {apiKeyStatus.anthropic && (
                        <button
                          onClick={() => handleLoadApiKey('anthropic')}
                          className="api-key-action-btn"
                          title="Load saved key"
                        >
                          📥
                        </button>
                      )}
                      <button
                        onClick={() => handleSaveApiKey('anthropic', apiKeys.anthropic)}
                        className="api-key-action-btn primary"
                        title="Save key"
                      >
                        💾
                      </button>
                      {apiKeyStatus.anthropic && (
                        <button
                          onClick={() => handleDeleteApiKey('anthropic')}
                          className="api-key-action-btn danger"
                          title="Delete key"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="api-key-link">
                      Get your Anthropic API key →
                    </a>
                  </div>

                  {/* Google Gemini */}
                  <div className="api-key-item">
                    <div className="api-key-header">
                      <h4>✨ Google Gemini</h4>
                      {apiKeyStatus.gemini && <span className="api-key-status saved">✓ Saved</span>}
                    </div>
                    <p className="api-key-desc">Gemini Pro, Gemini Ultra, and other Google models</p>
                    <div className="api-key-input-group">
                      <input
                        type={showApiKeys.gemini ? 'text' : 'password'}
                        placeholder="AIza..."
                        value={apiKeys.gemini}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                        className="setting-input"
                      />
                      <button
                        onClick={() => setShowApiKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                        className="api-key-toggle-btn"
                        title={showApiKeys.gemini ? 'Hide' : 'Show'}
                      >
                        {showApiKeys.gemini ? '👁️' : '👁️‍🗨️'}
                      </button>
                      {apiKeyStatus.gemini && (
                        <button
                          onClick={() => handleLoadApiKey('gemini')}
                          className="api-key-action-btn"
                          title="Load saved key"
                        >
                          📥
                        </button>
                      )}
                      <button
                        onClick={() => handleSaveApiKey('gemini', apiKeys.gemini)}
                        className="api-key-action-btn primary"
                        title="Save key"
                      >
                        💾
                      </button>
                      {apiKeyStatus.gemini && (
                        <button
                          onClick={() => handleDeleteApiKey('gemini')}
                          className="api-key-action-btn danger"
                          title="Delete key"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="api-key-link">
                      Get your Gemini API key →
                    </a>
                  </div>

                  {/* Cohere */}
                  <div className="api-key-item">
                    <div className="api-key-header">
                      <h4>🌐 Cohere</h4>
                      {apiKeyStatus.cohere && <span className="api-key-status saved">✓ Saved</span>}
                    </div>
                    <p className="api-key-desc">Command, Embed, and other Cohere models</p>
                    <div className="api-key-input-group">
                      <input
                        type={showApiKeys.cohere ? 'text' : 'password'}
                        placeholder="..."
                        value={apiKeys.cohere}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, cohere: e.target.value }))}
                        className="setting-input"
                      />
                      <button
                        onClick={() => setShowApiKeys(prev => ({ ...prev, cohere: !prev.cohere }))}
                        className="api-key-toggle-btn"
                        title={showApiKeys.cohere ? 'Hide' : 'Show'}
                      >
                        {showApiKeys.cohere ? '👁️' : '👁️‍🗨️'}
                      </button>
                      {apiKeyStatus.cohere && (
                        <button
                          onClick={() => handleLoadApiKey('cohere')}
                          className="api-key-action-btn"
                          title="Load saved key"
                        >
                          📥
                        </button>
                      )}
                      <button
                        onClick={() => handleSaveApiKey('cohere', apiKeys.cohere)}
                        className="api-key-action-btn primary"
                        title="Save key"
                      >
                        💾
                      </button>
                      {apiKeyStatus.cohere && (
                        <button
                          onClick={() => handleDeleteApiKey('cohere')}
                          className="api-key-action-btn danger"
                          title="Delete key"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <a href="https://dashboard.cohere.com/api-keys" target="_blank" rel="noopener noreferrer" className="api-key-link">
                      Get your Cohere API key →
                    </a>
                  </div>

                  <div className="setting-info" style={{ marginTop: '2rem' }}>
                    <strong>🔒 Security Notes:</strong>
                    <ul>
                      <li>API keys are encrypted with AES-256-GCM encryption</li>
                      <li>Keys are stored locally in your browser's database</li>
                      <li>Never shared with anyone except the respective AI provider</li>
                      <li>Clear your browser data to remove all stored keys</li>
                    </ul>
                  </div>
                </div>
              )}
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

              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <EncryptedBackupManager />
              </div>
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
