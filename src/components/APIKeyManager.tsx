/**
 * API Key Manager Component
 *
 * Secure dialog for managing external API keys
 * - Prompts for master password on first use
 * - Allows adding/removing API keys for OpenAI, Anthropic, etc.
 * - Keys are encrypted with WebCrypto before storage
 */

import { useState, useEffect, FormEvent } from 'react';
import { useChatState } from '../store/chat.store';
import { apiKeyService } from '../services/apikey.service';
import './APIKeyManager.css';

export interface APIKeyManagerProps {
  onClose: (success: boolean) => void;
}

interface ProviderConfig {
  id: string;
  name: string;
  keyPlaceholder: string;
  keyPattern?: RegExp;
  helpText: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyPattern: /^sk-/,
    helpText: 'Get your API key from platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    keyPlaceholder: 'sk-ant-...',
    keyPattern: /^sk-ant-/,
    helpText: 'Get your API key from console.anthropic.com',
  },
];

export function APIKeyManager({ onClose }: APIKeyManagerProps) {
  const { sessionMasterPassword, setSessionPassword, setSelectedAdapter } = useChatState();
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingKeys, setExistingKeys] = useState<string[]>([]);

  useEffect(() => {
    // Check if we need to set up master password
    if (!sessionMasterPassword) {
      setNeedsPassword(true);
    } else {
      // Initialize session with existing password
      apiKeyService.initializeSession(sessionMasterPassword).catch((err) => {
        setError(err.message);
      });
    }

    // Load existing keys
    loadExistingKeys();
  }, [sessionMasterPassword]);

  const loadExistingKeys = () => {
    try {
      const providers = apiKeyService.listProviders();
      setExistingKeys(providers);
    } catch (err) {
      console.error('Failed to load existing keys:', err);
    }
  };

  const handleSetupPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (masterPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (masterPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await apiKeyService.initializeSession(masterPassword);
      setSessionPassword(masterPassword);
      setNeedsPassword(false);
      setSuccess('Master password set. Your API keys will be encrypted with this password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize session');
    }
  };

  const handleSaveAPIKey = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const provider = PROVIDERS.find((p) => p.id === selectedProvider);
    if (!provider) return;

    // Validate key format
    if (provider.keyPattern && !provider.keyPattern.test(apiKey)) {
      setError(`Invalid ${provider.name} API key format`);
      return;
    }

    if (apiKey.trim().length === 0) {
      setError('API key cannot be empty');
      return;
    }

    try {
      await apiKeyService.storeAPIKey(selectedProvider, apiKey);
      setSuccess(`${provider.name} API key saved successfully!`);
      setApiKey('');
      loadExistingKeys();

      // Switch to this adapter
      setSelectedAdapter(selectedProvider);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose(true);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    }
  };

  const handleDeleteKey = async (providerId: string) => {
    if (!confirm(`Delete API key for ${providerId}?`)) return;

    try {
      apiKeyService.deleteAPIKey(providerId);
      setSuccess(`Deleted API key for ${providerId}`);
      loadExistingKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  return (
    <div className="api-key-manager-overlay">
      <div className="api-key-manager-modal">
        <div className="api-key-manager-header">
          <h2>🔑 API Key Manager</h2>
          <button className="close-button" onClick={() => onClose(false)}>
            ✕
          </button>
        </div>

        <div className="api-key-manager-content">
          {needsPassword ? (
            <form onSubmit={handleSetupPassword} className="password-form">
              <div className="form-section">
                <h3>Set Master Password</h3>
                <p className="form-help">
                  Your API keys will be encrypted with this password. This password is
                  <strong> never stored</strong> - only kept in memory for this session.
                </p>

                <label>
                  <span>Master Password:</span>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    minLength={8}
                    required
                  />
                </label>

                <label>
                  <span>Confirm Password:</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    minLength={8}
                    required
                  />
                </label>

                <button type="submit" className="primary-button">
                  Set Password
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveAPIKey} className="api-key-form">
              <div className="form-section">
                <h3>Add API Key</h3>

                <label>
                  <span>Provider:</span>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  >
                    {PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </label>

                {PROVIDERS.find((p) => p.id === selectedProvider) && (
                  <>
                    <label>
                      <span>API Key:</span>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          PROVIDERS.find((p) => p.id === selectedProvider)?.keyPlaceholder
                        }
                        required
                      />
                    </label>

                    <p className="form-help">
                      {PROVIDERS.find((p) => p.id === selectedProvider)?.helpText}
                    </p>
                  </>
                )}

                <button type="submit" className="primary-button">
                  Save API Key
                </button>
              </div>

              {existingKeys.length > 0 && (
                <div className="form-section existing-keys">
                  <h3>Existing API Keys</h3>
                  <ul>
                    {existingKeys.map((provider) => (
                      <li key={provider}>
                        <span>
                          {PROVIDERS.find((p) => p.id === provider)?.name || provider}
                        </span>
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => handleDeleteKey(provider)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          )}

          {error && <div className="message error-message">{error}</div>}
          {success && <div className="message success-message">{success}</div>}
        </div>
      </div>
    </div>
  );
}
