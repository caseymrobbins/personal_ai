/**
 * Module Status Indicator Component
 *
 * Displays real-time feedback about which AI module is currently "thinking"
 * This is a core requirement of Step 5: "The system must always show which module is 'thinking'"
 *
 * Based on Section 3.1: The "Module-Aware" State
 */

import { useChatState, ModuleState } from '../store/chat.store';
import './ModuleStatusIndicator.css';

/**
 * Get display configuration for each module state
 */
function getStateDisplay(
  state: ModuleState,
  providerName: string | null
): { emoji: string; text: string; color: string } {
  switch (state) {
    case 'IDLE':
      return {
        emoji: '💤',
        text: 'Ready',
        color: '#718096',
      };
    case 'LOCAL_ROUTING':
      return {
        emoji: '🧭',
        text: 'Local AI analyzing...',
        color: '#667eea',
      };
    case 'SCRUBBING':
      return {
        emoji: '🛡️',
        text: 'Scrubbing private data...',
        color: '#f6ad55',
      };
    case 'EXTERNAL_API':
      return {
        emoji: '☁️',
        text: `Contacting ${providerName || 'external AI'}...`,
        color: '#4299e1',
      };
    case 'UNSCRUBBING':
      return {
        emoji: '🔓',
        text: 'De-anonymizing response...',
        color: '#48bb78',
      };
    case 'LOCAL_PROCESSING':
      return {
        emoji: '🧠',
        text: 'Local AI thinking...',
        color: '#9f7aea',
      };
    default:
      return {
        emoji: '❓',
        text: 'Unknown state',
        color: '#718096',
      };
  }
}

/**
 * ModuleStatusIndicator Component
 *
 * This component subscribes to the global Zustand store and
 * renders the appropriate status indicator based on the current module state
 */
export function ModuleStatusIndicator() {
  const { moduleState, externalProviderName } = useChatState();
  const display = getStateDisplay(moduleState, externalProviderName);

  // Don't show anything when idle
  if (moduleState === 'IDLE') {
    return null;
  }

  return (
    <div className="module-status-indicator" style={{ borderColor: display.color }}>
      <span className="status-emoji">{display.emoji}</span>
      <span className="status-text" style={{ color: display.color }}>
        {display.text}
      </span>
      <span className="status-pulse" style={{ backgroundColor: display.color }} />
    </div>
  );
}
