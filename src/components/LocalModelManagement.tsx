/**
 * Local Model Management Component
 *
 * Displays local model settings and management options:
 * - Current model status
 * - Performance metrics
 * - User preferences
 * - Cache management
 */

import React, { useEffect, useState } from 'react';
import { localModelService } from '../services/local-model.service';
import { LocalModelPreferences, LocalModelMetrics } from '../services/db.service';
import './LocalModelManagement.css';

export const LocalModelManagement: React.FC = () => {
  const [preferences, setPreferences] = useState<LocalModelPreferences | null>(null);
  const [metrics, setMetrics] = useState<LocalModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const prefs = await localModelService.initializePreferences();
      const latestMetrics = localModelService.getLatestMetrics();
      setPreferences(prefs);
      setMetrics(latestMetrics);
      setLoading(false);
    };

    loadData();
  }, []);

  const handleAutoLoadChange = (checked: boolean) => {
    if (preferences) {
      localModelService.updatePreferences({
        ...preferences,
        auto_load_model: checked,
      });
      setPreferences({
        ...preferences,
        auto_load_model: checked,
      });
    }
  };

  const handleGPUChange = (checked: boolean) => {
    if (preferences) {
      localModelService.updatePreferences({
        ...preferences,
        enable_gpu: checked,
      });
      setPreferences({
        ...preferences,
        enable_gpu: checked,
      });
    }
  };

  const handleMemoryChange = (value: string) => {
    const mb = parseInt(value, 10);
    if (!isNaN(mb) && preferences) {
      localModelService.updatePreferences({
        ...preferences,
        max_memory_mb: mb,
      });
      setPreferences({
        ...preferences,
        max_memory_mb: mb,
      });
    }
  };

  const handleDownloadPriorityChange = (priority: 'fast' | 'balanced' | 'conservative') => {
    if (preferences) {
      localModelService.updatePreferences({
        ...preferences,
        download_priority: priority,
      });
      setPreferences({
        ...preferences,
        download_priority: priority,
      });
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear local model cache? The model will need to be re-downloaded on next use.')) {
      localModelService.clearModelCache();
      alert('Model cache cleared');
    }
  };

  const formatTime = (ms?: number): string => {
    if (!ms) return 'N/A';
    return (ms / 1000).toFixed(2) + 's';
  };

  const formatMemory = (mb?: number): string => {
    if (!mb) return 'N/A';
    return (mb / 1024).toFixed(2) + ' GB';
  };

  if (loading) {
    return <div className="local-model-management">Loading preferences...</div>;
  }

  return (
    <div className="local-model-management">
      <h2 className="section-title">Local Model Settings</h2>

      {/* Preferences Section */}
      <div className="preferences-section">
        <h3>Initialization Preferences</h3>

        <div className="preference-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences?.auto_load_model || false}
              onChange={(e) => handleAutoLoadChange(e.target.checked)}
            />
            <span className="checkbox-text">Auto-load model on app startup</span>
          </label>
          <p className="preference-note">
            The Phi-3 model will automatically load when you open this app
          </p>
        </div>

        <div className="preference-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences?.enable_gpu || false}
              onChange={(e) => handleGPUChange(e.target.checked)}
            />
            <span className="checkbox-text">Enable GPU acceleration (WebGPU)</span>
          </label>
          <p className="preference-note">
            Use your GPU for faster inference if available (requires WebGPU support)
          </p>
        </div>

        <div className="preference-item">
          <label htmlFor="max-memory">Maximum Memory Usage</label>
          <div className="input-group">
            <input
              id="max-memory"
              type="number"
              min="1024"
              step="512"
              value={preferences?.max_memory_mb || 4096}
              onChange={(e) => handleMemoryChange(e.target.value)}
              className="memory-input"
            />
            <span className="input-unit">MB</span>
          </div>
          <p className="preference-note">Minimum: 1024 MB. Recommended: 4096 MB or more</p>
        </div>

        <div className="preference-item">
          <label>Download Priority</label>
          <div className="radio-group">
            {(['fast', 'balanced', 'conservative'] as const).map((priority) => (
              <label key={priority} className="radio-label">
                <input
                  type="radio"
                  name="download-priority"
                  value={priority}
                  checked={preferences?.download_priority === priority}
                  onChange={(e) =>
                    handleDownloadPriorityChange(e.target.value as 'fast' | 'balanced' | 'conservative')
                  }
                />
                <span>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
              </label>
            ))}
          </div>
          <p className="preference-note">
            Fast: Download aggressively | Balanced: Standard | Conservative: Network-friendly
          </p>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="metrics-section">
        <h3>Performance Metrics</h3>

        {metrics ? (
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Load Duration</span>
              <span className="metric-value">{formatTime(metrics.load_duration_ms)}</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Peak Memory</span>
              <span className="metric-value">{formatMemory(metrics.peak_memory_mb)}</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Failed Attempts</span>
              <span className="metric-value">{metrics.failed_attempts}</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Init Errors</span>
              <span className="metric-value">{metrics.initialization_errors}</span>
            </div>

            {metrics.last_successful_load && (
              <div className="metric-card full-width">
                <span className="metric-label">Last Successful Load</span>
                <span className="metric-value">
                  {new Date(metrics.last_successful_load).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="no-metrics">No performance metrics available yet</p>
        )}
      </div>

      {/* Cache Management Section */}
      <div className="cache-section">
        <h3>Cache Management</h3>

        <div className="cache-info">
          <p>
            The Phi-3 model is cached in your browser's local storage. Clearing the cache will
            remove the downloaded model and free up disk space.
          </p>
          <p className="model-size">
            <strong>Model Size:</strong> 2-4 GB (downloaded on first use)
          </p>
        </div>

        <button className="clear-cache-button" onClick={handleClearCache}>
          Clear Local Cache
        </button>
      </div>

      {/* Model Information */}
      <div className="info-section">
        <h3>Model Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Model:</span>
            <span className="info-value">Phi-3-mini-4k-instruct</span>
          </div>
          <div className="info-item">
            <span className="info-label">Quantization:</span>
            <span className="info-value">Q4F16 (4-bit)</span>
          </div>
          <div className="info-item">
            <span className="info-label">Context Window:</span>
            <span className="info-value">128K tokens</span>
          </div>
          <div className="info-item">
            <span className="info-label">Runtime:</span>
            <span className="info-value">WebLLM (On-device)</span>
          </div>
        </div>
        <p className="model-description">
          The Phi-3 model runs entirely on your device using WebGPU and WebAssembly. No data is
          sent to external servers. Perfect for private, offline AI conversations.
        </p>
      </div>
    </div>
  );
};
