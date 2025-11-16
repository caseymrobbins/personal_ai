/**
 * Enhanced Module Status Indicator Component (Sprint 3)
 *
 * Provides real-time transparency about AI module state with:
 * - Visual status display with animations
 * - "Inspect" button for data flow transparency
 * - "Stop" button for Humanity Override (AbortController)
 * - Detailed trace information
 *
 * Based on Section 3.1: The "Module-Aware" State
 */

import { useState } from 'react';
import { useChatState, ModuleState } from '../store/chat.store';
import { TraceInspector } from './TraceInspector';
import { ARIDashboard } from './ARIDashboard';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { SettingsModal } from './SettingsModal';
import './ModuleStatusIndicator.css';

/**
 * Get display configuration for each module state
 */
function getStateDisplay(
  state: ModuleState,
  providerName: string | null
): { emoji: string; text: string; color: string; description: string } {
  switch (state) {
    case 'IDLE':
      return {
        emoji: '💤',
        text: 'Ready',
        color: '#718096',
        description: 'System is idle, waiting for input',
      };
    case 'LOCAL_ROUTING':
      return {
        emoji: '🧭',
        text: 'Local AI analyzing...',
        color: '#667eea',
        description: 'Guardian is analyzing your request locally',
      };
    case 'SCRUBBING':
      return {
        emoji: '🛡️',
        text: 'Protecting your privacy...',
        color: '#f6ad55',
        description: 'Removing personally identifiable information before external API call',
      };
    case 'EXTERNAL_API':
      return {
        emoji: '☁️',
        text: `Contacting ${providerName || 'external AI'}...`,
        color: '#4299e1',
        description: `Sending request to ${providerName || 'external service'} (with PII removed)`,
      };
    case 'UNSCRUBBING':
      return {
        emoji: '🔓',
        text: 'Restoring your data...',
        color: '#48bb78',
        description: 'Restoring personally identifiable information in the response',
      };
    case 'LOCAL_PROCESSING':
      return {
        emoji: '🧠',
        text: 'Local AI thinking...',
        color: '#9f7aea',
        description: 'Processing your request entirely on your device',
      };
    default:
      return {
        emoji: '❓',
        text: 'Unknown state',
        color: '#718096',
        description: 'Unknown processing state',
      };
  }
}

/**
 * Enhanced ModuleStatusIndicator Component
 *
 * Provides transparency and control over AI processing
 */
export function ModuleStatusIndicator() {
  const {
    moduleState,
    externalProviderName,
    currentAbortController,
    setAbortController,
  } = useChatState();

  const [showInspector, setShowInspector] = useState(false);
  const [showARIDashboard, setShowARIDashboard] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const display = getStateDisplay(moduleState, externalProviderName);

  // Don't show anything when idle
  if (moduleState === 'IDLE') {
    return null;
  }

  const canAbort = currentAbortController !== null && moduleState === 'EXTERNAL_API';

  const handleStop = () => {
    if (currentAbortController) {
      console.log('[ModuleStatus] 🛑 User triggered Humanity Override - aborting request');
      currentAbortController.abort();
      setAbortController(null);
    }
  };

  const handleInspect = () => {
    setShowInspector(true);
  };

  return (
    <>
      <div className="module-status-indicator-enhanced" style={{ borderLeftColor: display.color }}>
        <div className="status-main">
          <div className="status-icon-wrapper">
            <span className="status-emoji">{display.emoji}</span>
            <span className="status-pulse" style={{ backgroundColor: display.color }} />
          </div>

          <div className="status-info">
            <div className="status-text" style={{ color: display.color }}>
              {display.text}
            </div>
            <div className="status-description">{display.description}</div>
          </div>
        </div>

        <div className="status-actions">
          <button
            className="status-action-btn inspect-btn"
            onClick={handleInspect}
            title="Inspect data flow"
          >
            🔍 Inspect
          </button>

          <button
            className="status-action-btn ari-btn"
            onClick={() => setShowARIDashboard(true)}
            title="View Autonomy Retention Index"
          >
            🧠 ARI
          </button>

          <button
            className="status-action-btn analytics-btn"
            onClick={() => setShowAnalytics(true)}
            title="View Analytics Dashboard"
          >
            📊 Analytics
          </button>

          <button
            className="status-action-btn settings-btn"
            onClick={() => setShowSettings(true)}
            title="Open Settings"
          >
            ⚙️ Settings
          </button>

          {canAbort && (
            <button
              className="status-action-btn stop-btn"
              onClick={handleStop}
              title="Stop current request (Humanity Override)"
            >
              🛑 Stop
            </button>
          )}
        </div>
      </div>

      {showInspector && (
        <TraceInspector
          moduleState={moduleState}
          providerName={externalProviderName}
          onClose={() => setShowInspector(false)}
        />
      )}

      {showARIDashboard && (
        <ARIDashboard onClose={() => setShowARIDashboard(false)} />
      )}

      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
