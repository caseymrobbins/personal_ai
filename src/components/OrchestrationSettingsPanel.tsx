/**
 * Orchestration Settings Panel
 *
 * UI component for configuring hybrid-first orchestrator preferences.
 * Allows users to control routing behavior, privacy settings, and view metrics.
 */

import { useState, useEffect } from 'react';
import { LocalSLMOrchestratorService } from '../services/local-slm-orchestrator.service';
import type { OrchestrationPreferences, OrchestrationMetrics } from '../services/local-slm-orchestrator.service';
import { OrchestrationMetricsHistoryService } from '../services/orchestration-metrics-history.service';
import { Sparkline, TrendIndicator } from './Sparkline';
import './OrchestrationSettingsPanel.css';

interface OrchestrationSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrchestrationSettingsPanel({ isOpen, onClose }: OrchestrationSettingsPanelProps) {
  // Orchestration preferences
  const [priority, setPriority] = useState<'cost' | 'quality' | 'latency' | 'balanced'>('balanced');
  const [privacyLevel, setPrivacyLevel] = useState<'strict' | 'moderate' | 'relaxed'>('moderate');
  const [maxCostPerQuery, setMaxCostPerQuery] = useState<number>(0.01); // $0.01
  const [maxLatency, setMaxLatency] = useState<number>(3000); // 3 seconds
  const [minConfidence, setMinConfidence] = useState<number>(0.6); // 60%

  // Metrics
  const [metrics, setMetrics] = useState<OrchestrationMetrics | null>(null);
  const [metricsRefreshInterval, setMetricsRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [historicalData, setHistoricalData] = useState<any>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('orchestrationPreferences');
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        setPriority(prefs.priority || 'balanced');
        setPrivacyLevel(prefs.privacyLevel || 'moderate');
        setMaxCostPerQuery(prefs.maxCostPerQuery || 0.01);
        setMaxLatency(prefs.maxLatency || 3000);
        setMinConfidence(prefs.minConfidence || 0.6);
      } catch (error) {
        console.error('Failed to load orchestration preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    const preferences = {
      priority,
      privacyLevel,
      maxCostPerQuery,
      maxLatency,
      minConfidence,
    };
    localStorage.setItem('orchestrationPreferences', JSON.stringify(preferences));
  }, [priority, privacyLevel, maxCostPerQuery, maxLatency, minConfidence]);

  // Load and refresh metrics when panel is open
  useEffect(() => {
    if (isOpen) {
      // Load metrics immediately
      loadMetrics();

      // Refresh every 2 seconds
      const interval = setInterval(loadMetrics, 2000);
      setMetricsRefreshInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (metricsRefreshInterval) {
        clearInterval(metricsRefreshInterval);
        setMetricsRefreshInterval(null);
      }
    }
  }, [isOpen]);

  const loadMetrics = () => {
    try {
      const orchestrator = LocalSLMOrchestratorService.getInstance();
      const currentMetrics = orchestrator.getMetrics();
      setMetrics(currentMetrics);

      // Record snapshot to history
      const historyService = OrchestrationMetricsHistoryService.getInstance();
      historyService.recordSnapshot(currentMetrics);

      // Load historical data for sparklines
      const summary = historyService.getSummary();
      setHistoricalData(summary);
    } catch (error) {
      console.error('Failed to load orchestration metrics:', error);
    }
  };

  const exportMetricsJSON = () => {
    try {
      const historyService = OrchestrationMetricsHistoryService.getInstance();
      const json = historyService.exportJSON();

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orchestration-metrics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  };

  const exportMetricsCSV = () => {
    try {
      const historyService = OrchestrationMetricsHistoryService.getInstance();
      const csv = historyService.exportCSV();

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orchestration-metrics-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  };

  const resetMetrics = () => {
    try {
      const orchestrator = LocalSLMOrchestratorService.getInstance();
      orchestrator.resetMetrics();
      loadMetrics();
    } catch (error) {
      console.error('Failed to reset metrics:', error);
    }
  };

  const getPreferences = (): OrchestrationPreferences => {
    return {
      priority,
      privacyLevel,
      maxCostPerQuery,
      maxLatency,
      minConfidence,
    };
  };

  // Make preferences available globally for ChatContainer
  useEffect(() => {
    (window as any).orchestrationPreferences = getPreferences();
  }, [priority, privacyLevel, maxCostPerQuery, maxLatency, minConfidence]);

  if (!isOpen) {
    return null;
  }

  const localHandlingPercentage = metrics && metrics.totalQueries > 0
    ? (metrics.localHandled / metrics.totalQueries * 100).toFixed(1)
    : '0.0';

  const avgCostPerQuery = metrics && metrics.totalQueries > 0
    ? (metrics.totalCost / metrics.totalQueries)
    : 0;

  return (
    <div className="orchestration-settings-overlay" onClick={onClose}>
      <div className="orchestration-settings-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2>🤖 Orchestration Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings-content">
          {/* Priority Settings */}
          <section className="settings-section">
            <h3>⚖️ Routing Priority</h3>
            <p className="section-description">
              Choose what matters most for your queries
            </p>

            <div className="radio-group">
              <label className={`radio-option ${priority === 'cost' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="cost"
                  checked={priority === 'cost'}
                  onChange={(e) => setPriority(e.target.value as any)}
                />
                <div className="option-content">
                  <span className="option-icon">💰</span>
                  <div>
                    <div className="option-title">Cost Optimized</div>
                    <div className="option-desc">Maximize local execution, minimize cloud costs</div>
                  </div>
                </div>
              </label>

              <label className={`radio-option ${priority === 'quality' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="quality"
                  checked={priority === 'quality'}
                  onChange={(e) => setPriority(e.target.value as any)}
                />
                <div className="option-content">
                  <span className="option-icon">✨</span>
                  <div>
                    <div className="option-title">Quality Focused</div>
                    <div className="option-desc">Prefer cloud models for better responses</div>
                  </div>
                </div>
              </label>

              <label className={`radio-option ${priority === 'latency' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="latency"
                  checked={priority === 'latency'}
                  onChange={(e) => setPriority(e.target.value as any)}
                />
                <div className="option-content">
                  <span className="option-icon">⚡</span>
                  <div>
                    <div className="option-title">Speed Focused</div>
                    <div className="option-desc">Prioritize fast local responses</div>
                  </div>
                </div>
              </label>

              <label className={`radio-option ${priority === 'balanced' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priority"
                  value="balanced"
                  checked={priority === 'balanced'}
                  onChange={(e) => setPriority(e.target.value as any)}
                />
                <div className="option-content">
                  <span className="option-icon">⚖️</span>
                  <div>
                    <div className="option-title">Balanced</div>
                    <div className="option-desc">Smart balance of cost, quality, and speed</div>
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* Privacy Settings */}
          <section className="settings-section">
            <h3>🔒 Privacy Level</h3>
            <p className="section-description">
              Control how strictly PII is kept local
            </p>

            <div className="radio-group">
              <label className={`radio-option ${privacyLevel === 'strict' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="privacyLevel"
                  value="strict"
                  checked={privacyLevel === 'strict'}
                  onChange={(e) => setPrivacyLevel(e.target.value as any)}
                />
                <div className="option-content">
                  <span className="option-icon">🔐</span>
                  <div>
                    <div className="option-title">Strict</div>
                    <div className="option-desc">All queries stay local, zero cloud exposure</div>
                  </div>
                </div>
              </label>

              <label className={`radio-option ${privacyLevel === 'moderate' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="privacyLevel"
                  value="moderate"
                  checked={privacyLevel === 'moderate'}
                  onChange={(e) => setPrivacyLevel(e.target.value as any)}
                />
                <div className="option-content">
                  <span className="option-icon">🔒</span>
                  <div>
                    <div className="option-title">Moderate (Recommended)</div>
                    <div className="option-desc">PII stays local, others can use cloud</div>
                  </div>
                </div>
              </label>

              <label className={`radio-option ${privacyLevel === 'relaxed' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="privacyLevel"
                  value="relaxed"
                  checked={privacyLevel === 'relaxed'}
                  onChange={(e) => setPrivacyLevel(e.target.value as any)}
                />
                <div className="option-content">
                  <span className="option-icon">🔓</span>
                  <div>
                    <div className="option-title">Relaxed</div>
                    <div className="option-desc">Cloud with anonymization when needed</div>
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* Advanced Settings */}
          <section className="settings-section">
            <h3>🔧 Advanced Settings</h3>

            <div className="slider-group">
              <div className="slider-item">
                <label htmlFor="maxCost">
                  <span>Max Cost per Query</span>
                  <span className="slider-value">${maxCostPerQuery.toFixed(3)}</span>
                </label>
                <input
                  id="maxCost"
                  type="range"
                  min="0.001"
                  max="0.050"
                  step="0.001"
                  value={maxCostPerQuery}
                  onChange={(e) => setMaxCostPerQuery(parseFloat(e.target.value))}
                />
                <div className="slider-labels">
                  <span>$0.001</span>
                  <span>$0.050</span>
                </div>
              </div>

              <div className="slider-item">
                <label htmlFor="maxLatency">
                  <span>Max Latency</span>
                  <span className="slider-value">{(maxLatency / 1000).toFixed(1)}s</span>
                </label>
                <input
                  id="maxLatency"
                  type="range"
                  min="500"
                  max="10000"
                  step="500"
                  value={maxLatency}
                  onChange={(e) => setMaxLatency(parseInt(e.target.value))}
                />
                <div className="slider-labels">
                  <span>0.5s</span>
                  <span>10s</span>
                </div>
              </div>

              <div className="slider-item">
                <label htmlFor="minConfidence">
                  <span>Min Confidence for Local</span>
                  <span className="slider-value">{(minConfidence * 100).toFixed(0)}%</span>
                </label>
                <input
                  id="minConfidence"
                  type="range"
                  min="0.3"
                  max="0.9"
                  step="0.05"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                />
                <div className="slider-labels">
                  <span>30%</span>
                  <span>90%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Metrics Display */}
          <section className="settings-section metrics-section">
            <div className="section-header">
              <h3>📊 Performance Metrics</h3>
              <div className="header-buttons">
                <button className="export-button" onClick={exportMetricsJSON} title="Export as JSON">
                  📥 JSON
                </button>
                <button className="export-button" onClick={exportMetricsCSV} title="Export as CSV">
                  📥 CSV
                </button>
                <button className="reset-button" onClick={resetMetrics}>
                  Reset
                </button>
              </div>
            </div>

            {metrics ? (
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">🎯</div>
                  <div className="metric-content">
                    <div className="metric-value">{localHandlingPercentage}%</div>
                    <div className="metric-label">Local Handling</div>
                    {historicalData?.hourly?.localHandlingTrend && historicalData.hourly.localHandlingTrend.length > 1 && (
                      <div className="metric-sparkline">
                        <Sparkline
                          data={historicalData.hourly.localHandlingTrend}
                          width={100}
                          height={20}
                          strokeWidth={2}
                          color="#4caf50"
                          fillColor="rgba(76, 175, 80, 0.1)"
                        />
                        <TrendIndicator
                          value={historicalData.hourly.localHandlingGrowth || 0}
                          className="metric-trend"
                        />
                      </div>
                    )}
                    <div className="metric-target">Target: 80%+</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">⚡</div>
                  <div className="metric-content">
                    <div className="metric-value">{metrics.averageLatency.toFixed(0)}ms</div>
                    <div className="metric-label">Avg Latency</div>
                    {historicalData?.hourly?.avgLatencyTrend && historicalData.hourly.avgLatencyTrend.length > 1 && (
                      <div className="metric-sparkline">
                        <Sparkline
                          data={historicalData.hourly.avgLatencyTrend}
                          width={100}
                          height={20}
                          strokeWidth={2}
                          color="#2196f3"
                          fillColor="rgba(33, 150, 243, 0.1)"
                        />
                        <TrendIndicator
                          value={-(historicalData.hourly.avgLatencyGrowth || 0)}
                          className="metric-trend"
                        />
                      </div>
                    )}
                    <div className="metric-target">Target: &lt;800ms</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">💰</div>
                  <div className="metric-content">
                    <div className="metric-value">${avgCostPerQuery.toFixed(4)}</div>
                    <div className="metric-label">Avg Cost</div>
                    {historicalData?.hourly?.avgCostTrend && historicalData.hourly.avgCostTrend.length > 1 && (
                      <div className="metric-sparkline">
                        <Sparkline
                          data={historicalData.hourly.avgCostTrend}
                          width={100}
                          height={20}
                          strokeWidth={2}
                          color="#ff9800"
                          fillColor="rgba(255, 152, 0, 0.1)"
                        />
                        <TrendIndicator
                          value={-(historicalData.hourly.avgCostGrowth || 0)}
                          className="metric-trend"
                        />
                      </div>
                    )}
                    <div className="metric-target">Target: &lt;$0.001</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">📈</div>
                  <div className="metric-content">
                    <div className="metric-value">{metrics.totalQueries}</div>
                    <div className="metric-label">Total Queries</div>
                    {historicalData?.hourly?.totalQueriesTrend && historicalData.hourly.totalQueriesTrend.length > 1 && (
                      <div className="metric-sparkline">
                        <Sparkline
                          data={historicalData.hourly.totalQueriesTrend}
                          width={100}
                          height={20}
                          strokeWidth={2}
                          color="#9c27b0"
                          fillColor="rgba(156, 39, 176, 0.1)"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">🔄</div>
                  <div className="metric-content">
                    <div className="metric-value">{metrics.escalations}</div>
                    <div className="metric-label">Escalations</div>
                    <div className="metric-sublabel">
                      {metrics.totalQueries > 0
                        ? `${(metrics.escalations / metrics.totalQueries * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">✅</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {(metrics.qualityGatePassRate * 100).toFixed(0)}%
                    </div>
                    <div className="metric-label">Quality Pass Rate</div>
                    {historicalData?.hourly?.qualityPassRateTrend && historicalData.hourly.qualityPassRateTrend.length > 1 && (
                      <div className="metric-sparkline">
                        <Sparkline
                          data={historicalData.hourly.qualityPassRateTrend}
                          width={100}
                          height={20}
                          strokeWidth={2}
                          color="#4caf50"
                          fillColor="rgba(76, 175, 80, 0.1)"
                        />
                        <TrendIndicator
                          value={historicalData.hourly.qualityPassRateGrowth || 0}
                          className="metric-trend"
                        />
                      </div>
                    )}
                    <div className="metric-target">Target: ≥70%</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">💾</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {(metrics.cacheHitRate * 100).toFixed(0)}%
                    </div>
                    <div className="metric-label">Cache Hit Rate</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">🎲</div>
                  <div className="metric-content">
                    <div className="metric-value">
                      {(metrics.averageConfidence * 100).toFixed(0)}%
                    </div>
                    <div className="metric-label">Avg Confidence</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="metrics-loading">
                <p>No metrics available yet. Start chatting to see orchestration statistics!</p>
              </div>
            )}

            {metrics && metrics.totalQueries > 0 && (
              <div className="metrics-breakdown">
                <h4>Strategy Breakdown</h4>
                <div className="breakdown-bars">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Local</span>
                    <div className="breakdown-bar">
                      <div
                        className="breakdown-fill local"
                        style={{ width: `${(metrics.localHandled / metrics.totalQueries * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                    <span className="breakdown-value">{metrics.localHandled}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Delegate</span>
                    <div className="breakdown-bar">
                      <div
                        className="breakdown-fill delegate"
                        style={{ width: `${(metrics.delegated / metrics.totalQueries * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                    <span className="breakdown-value">{metrics.delegated}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Hybrid</span>
                    <div className="breakdown-bar">
                      <div
                        className="breakdown-fill hybrid"
                        style={{ width: `${(metrics.hybrid / metrics.totalQueries * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                    <span className="breakdown-value">{metrics.hybrid}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Iterative</span>
                    <div className="breakdown-bar">
                      <div
                        className="breakdown-fill iterative"
                        style={{ width: `${(metrics.iterative / metrics.totalQueries * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                    <span className="breakdown-value">{metrics.iterative}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Info Section */}
          <section className="settings-section info-section">
            <h3>ℹ️ About Hybrid-First Orchestration</h3>
            <p>
              The local SLM (Phi-3) intelligently decides whether to handle queries locally
              or delegate to cloud models. This optimizes for privacy, cost, and speed while
              maintaining quality through automatic validation and escalation.
            </p>
            <ul className="info-list">
              <li>🔒 <strong>Privacy-First:</strong> PII stays on your device</li>
              <li>💰 <strong>Cost-Optimized:</strong> 80%+ queries handled locally (free)</li>
              <li>⚡ <strong>Fast:</strong> Local responses in &lt;300ms</li>
              <li>✅ <strong>Quality Gates:</strong> Automatic cloud escalation when needed</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
