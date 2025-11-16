/**
 * Trace Inspector Component (Sprint 3)
 *
 * Provides detailed visualization of data flow through the system:
 * - Shows current processing pipeline
 * - Displays PII scrubbing/unscrubbing steps
 * - Reveals module transitions for transparency
 *
 * This component implements the "Inspect" feature from the Active Director UI
 */

import { useEffect, useState } from 'react';
import { ModuleState } from '../store/chat.store';
import './TraceInspector.css';

export interface TraceInspectorProps {
  moduleState: ModuleState;
  providerName: string | null;
  onClose: () => void;
}

interface TraceStep {
  id: string;
  name: string;
  status: 'completed' | 'active' | 'pending';
  description: string;
  icon: string;
  timestamp?: number;
}

export function TraceInspector({ moduleState, providerName, onClose }: TraceInspectorProps) {
  const [traces, setTraces] = useState<TraceStep[]>([]);

  useEffect(() => {
    // Build trace steps based on current module state
    const steps: TraceStep[] = [];

    // Step 1: User Input
    steps.push({
      id: 'user_input',
      name: 'User Input Received',
      status: 'completed',
      description: 'Your message has been received',
      icon: '✅',
      timestamp: Date.now() - 5000,
    });

    // Step 2: Local Routing (if applicable)
    if (moduleState !== 'LOCAL_PROCESSING') {
      steps.push({
        id: 'routing',
        name: 'Routing Decision',
        status: moduleState === 'LOCAL_ROUTING' ? 'active' : 'completed',
        description: 'Determining which AI module to use',
        icon: moduleState === 'LOCAL_ROUTING' ? '🧭' : '✅',
        timestamp: Date.now() - 4000,
      });
    }

    // Step 3: PII Scrubbing (for external APIs)
    if (moduleState === 'SCRUBBING' || moduleState === 'EXTERNAL_API' || moduleState === 'UNSCRUBBING') {
      steps.push({
        id: 'scrubbing',
        name: 'Privacy Protection (Scrubbing)',
        status: moduleState === 'SCRUBBING' ? 'active' : 'completed',
        description: 'Removing personally identifiable information (PII) before sending to external API',
        icon: moduleState === 'SCRUBBING' ? '🛡️' : '✅',
        timestamp: Date.now() - 3000,
      });
    }

    // Step 4: External API Call or Local Processing
    if (moduleState === 'EXTERNAL_API' || moduleState === 'UNSCRUBBING') {
      steps.push({
        id: 'external_api',
        name: `External API Call (${providerName || 'Provider'})`,
        status: moduleState === 'EXTERNAL_API' ? 'active' : 'completed',
        description: 'Sending scrubbed request to external AI service',
        icon: moduleState === 'EXTERNAL_API' ? '☁️' : '✅',
        timestamp: Date.now() - 2000,
      });
    } else if (moduleState === 'LOCAL_PROCESSING') {
      steps.push({
        id: 'local_processing',
        name: 'Local AI Processing',
        status: 'active',
        description: 'Processing your request entirely on your device (100% private)',
        icon: '🧠',
        timestamp: Date.now() - 2000,
      });
    }

    // Step 5: Unscrubbing (for external APIs)
    if (moduleState === 'UNSCRUBBING') {
      steps.push({
        id: 'unscrubbing',
        name: 'Data Restoration (Unscrubbing)',
        status: 'active',
        description: 'Restoring your original data in the response',
        icon: '🔓',
        timestamp: Date.now() - 1000,
      });
    }

    // Step 6: Response Delivery (pending)
    if (moduleState !== 'IDLE') {
      steps.push({
        id: 'response',
        name: 'Response Delivery',
        status: 'pending',
        description: 'Delivering the final response to you',
        icon: '📨',
      });
    }

    setTraces(steps);
  }, [moduleState, providerName]);

  const getStepStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'trace-step-completed';
      case 'active':
        return 'trace-step-active';
      case 'pending':
        return 'trace-step-pending';
      default:
        return '';
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    return `${seconds}s ago`;
  };

  return (
    <div className="trace-inspector-overlay" onClick={onClose}>
      <div className="trace-inspector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="trace-inspector-header">
          <h2>🔍 Data Flow Inspector</h2>
          <p className="trace-inspector-subtitle">
            See exactly how your data flows through the system
          </p>
          <button className="trace-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="trace-inspector-content">
          <div className="trace-timeline">
            {traces.map((step, index) => (
              <div key={step.id} className={`trace-step ${getStepStatusClass(step.status)}`}>
                <div className="trace-step-connector">
                  {index < traces.length - 1 && <div className="trace-line" />}
                </div>

                <div className="trace-step-content">
                  <div className="trace-step-header">
                    <span className="trace-step-icon">{step.icon}</span>
                    <div className="trace-step-info">
                      <div className="trace-step-name">{step.name}</div>
                      {step.timestamp && (
                        <div className="trace-step-time">{formatTimestamp(step.timestamp)}</div>
                      )}
                    </div>
                    <span className="trace-step-badge">{step.status}</span>
                  </div>
                  <div className="trace-step-description">{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="trace-info-panel">
            <div className="trace-info-section">
              <h3>🛡️ Privacy Guarantee</h3>
              <p>
                When using external APIs, all personally identifiable information (PII) is
                automatically removed before sending. This includes:
              </p>
              <ul>
                <li>Email addresses</li>
                <li>Phone numbers</li>
                <li>Social Security Numbers</li>
                <li>Credit card numbers</li>
                <li>IP addresses</li>
              </ul>
              <p className="trace-highlight">
                Your original data is restored in the response, ensuring complete privacy.
              </p>
            </div>

            <div className="trace-info-section">
              <h3>🔒 Local Processing</h3>
              <p>
                When using Local AI, your data <strong>never leaves your device</strong>. Everything
                happens in your browser using WebAssembly and WebGPU.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
