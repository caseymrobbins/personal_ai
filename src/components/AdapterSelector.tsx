/**
 * Adapter Selector Component
 *
 * Allows user to select which AI adapter to use:
 * - Local Guardian (Phi-3) - free, private
 * - OpenAI (GPT-4) - requires API key
 * - Anthropic (Claude) - requires API key
 */

import { useState } from 'react';
import { useChatState } from '../store/chat.store';
import { APIKeyManager } from './APIKeyManager';
import './AdapterSelector.css';

export interface AdapterOption {
  id: string;
  name: string;
  description: string;
  requiresAPIKey: boolean;
  icon: string;
}

const ADAPTERS: AdapterOption[] = [
  {
    id: 'local_guardian',
    name: 'Local AI (Phi-3)',
    description: '100% private, runs in your browser',
    requiresAPIKey: false,
    icon: '🔒',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4)',
    description: 'Powerful external AI, requires API key',
    requiresAPIKey: true,
    icon: '🤖',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Advanced reasoning, requires API key',
    requiresAPIKey: true,
    icon: '🧠',
  },
];

export function AdapterSelector() {
  const { selectedAdapterId, setSelectedAdapter } = useChatState();
  const [showAPIKeyManager, setShowAPIKeyManager] = useState(false);

  const selectedAdapter = ADAPTERS.find((a) => a.id === selectedAdapterId);

  const handleAdapterChange = (adapterId: string) => {
    const adapter = ADAPTERS.find((a) => a.id === adapterId);

    if (adapter?.requiresAPIKey) {
      // Show API key manager before switching
      setShowAPIKeyManager(true);
    } else {
      setSelectedAdapter(adapterId);
    }
  };

  const handleAPIKeyManagerClose = () => {
    setShowAPIKeyManager(false);
  };

  return (
    <>
      <div className="adapter-selector">
        <label className="adapter-label">
          <span className="adapter-label-text">AI Model:</span>
          <select
            className="adapter-select"
            value={selectedAdapterId}
            onChange={(e) => handleAdapterChange(e.target.value)}
          >
            {ADAPTERS.map((adapter) => (
              <option key={adapter.id} value={adapter.id}>
                {adapter.icon} {adapter.name}
              </option>
            ))}
          </select>
        </label>

        {selectedAdapter && (
          <div className="adapter-info">
            <span className="adapter-description">{selectedAdapter.description}</span>
            {selectedAdapter.requiresAPIKey && (
              <button
                className="api-key-button"
                onClick={() => setShowAPIKeyManager(true)}
              >
                🔑 Manage API Key
              </button>
            )}
          </div>
        )}
      </div>

      {showAPIKeyManager && (
        <APIKeyManager onClose={handleAPIKeyManagerClose} />
      )}
    </>
  );
}
