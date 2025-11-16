/**
 * ARI Dashboard Component (Sprint 5: Conscience Engine)
 *
 * Displays Autonomy Retention Index (ARI) metrics and trends to help users
 * maintain agency and avoid over-dependence on AI.
 *
 * Shows:
 * - Current ARI score (7-day average)
 * - Trend analysis (increasing/stable/decreasing)
 * - Alert if below threshold
 * - Metric breakdown (lexical density, syntactic complexity)
 * - Actionable recommendations
 */

import { useEffect, useState } from 'react';
import { dbService } from '../services/db.service';
import { governanceService } from '../services/governance.service';
import type { ARITrend } from '../services/governance.service';
import './ARIDashboard.css';

export interface ARIDashboardProps {
  onClose: () => void;
}

export function ARIDashboard({ onClose }: ARIDashboardProps) {
  const [stats, setStats] = useState<{
    totalEntries: number;
    avgLexicalDensity: number;
    avgSyntacticComplexity: number;
    avgARI: number;
  } | null>(null);

  const [trend, setTrend] = useState<ARITrend | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<Array<{
    timestamp: number;
    ariScore: number;
  }>>([]);

  useEffect(() => {
    // Load governance statistics
    const overallStats = dbService.getGovernanceStats();
    setStats(overallStats);

    // Load recent metrics for trend analysis
    const recent = dbService.getRecentGovernanceMetrics(100);
    setRecentMetrics(recent.map(m => ({
      timestamp: m.timestamp,
      ariScore: m.ariScore,
    })));

    // Calculate trend
    const trendAnalysis = governanceService.calculateTrend(
      recent.map(m => ({ timestamp: m.timestamp, ariScore: m.ariScore }))
    );
    setTrend(trendAnalysis);
  }, []);

  const getARIColor = (ari: number): string => {
    if (ari >= 0.65) return '#48bb78'; // Green (good autonomy)
    if (ari >= 0.4) return '#ed8936';  // Orange (medium autonomy)
    return '#f56565';                   // Red (low autonomy - alert!)
  };

  const getARILabel = (ari: number): string => {
    if (ari >= 0.65) return 'Excellent';
    if (ari >= 0.4) return 'Good';
    return 'Needs Attention';
  };

  const getTrendIcon = (trendType: 'increasing' | 'stable' | 'decreasing'): string => {
    switch (trendType) {
      case 'increasing':
        return '📈';
      case 'stable':
        return '➡️';
      case 'decreasing':
        return '📉';
    }
  };

  const getRecommendations = (ari: number): string[] => {
    if (ari >= 0.65) {
      return [
        'Your autonomy is strong! Keep composing detailed, thoughtful prompts.',
        'Consider sharing your prompt-writing techniques with others.',
      ];
    } else if (ari >= 0.4) {
      return [
        'Try to be more specific in your prompts - add context and details.',
        'Use longer, more complex sentences to articulate your needs.',
        'Ask follow-up questions to deepen your understanding.',
      ];
    } else {
      return [
        '⚠️ Your ARI is below the recommended threshold (0.65).',
        'Avoid one-word or very short prompts - they indicate over-reliance.',
        'Take time to compose thoughtful, detailed requests.',
        'Try to formulate your own thoughts before consulting the AI.',
        'Consider enabling Socratic Mode for guided critical thinking (Sprint 7).',
      ];
    }
  };

  if (!stats || !trend) {
    return (
      <div className="ari-dashboard-overlay" onClick={onClose}>
        <div className="ari-dashboard-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ari-loading">Loading ARI data...</div>
        </div>
      </div>
    );
  }

  const currentARI = trend.currentARI;
  const ariColor = getARIColor(currentARI);
  const ariLabel = getARILabel(currentARI);
  const threshold = governanceService.getThreshold();
  const recommendations = getRecommendations(currentARI);

  return (
    <div className="ari-dashboard-overlay" onClick={onClose}>
      <div className="ari-dashboard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ari-dashboard-header">
          <h2>🧠 Autonomy Retention Index (ARI)</h2>
          <p className="ari-dashboard-subtitle">
            Track your cognitive independence while using AI
          </p>
          <button className="ari-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Alert Banner (if below threshold) */}
        {trend.alert && (
          <div className="ari-alert-banner">
            <span className="ari-alert-icon">⚠️</span>
            <div>
              <strong>Autonomy Alert</strong>
              <p>Your ARI is below the recommended threshold ({threshold.toFixed(2)}). Consider being more specific in your prompts.</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="ari-dashboard-content">
          {/* Current ARI Score */}
          <div className="ari-score-card">
            <div className="ari-score-header">
              <h3>Current ARI Score</h3>
              <span className="ari-score-period">(7-day average)</span>
            </div>
            <div
              className="ari-score-value"
              style={{ color: ariColor }}
            >
              {currentARI.toFixed(2)}
            </div>
            <div className="ari-score-label" style={{ color: ariColor }}>
              {ariLabel}
            </div>
            <div className="ari-threshold-indicator">
              Threshold: {threshold.toFixed(2)}
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="ari-trend-card">
            <h3>Trend Analysis</h3>
            <div className="ari-trend-content">
              <div className="ari-trend-icon">
                {getTrendIcon(trend.trend)}
              </div>
              <div className="ari-trend-info">
                <div className="ari-trend-type">
                  {trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
                </div>
                <div className="ari-trend-change">
                  {trend.percentChange > 0 ? '+' : ''}
                  {trend.percentChange.toFixed(1)}% vs. previous week
                </div>
              </div>
            </div>
          </div>

          {/* Metric Breakdown */}
          <div className="ari-breakdown-card">
            <h3>Metric Breakdown</h3>
            <div className="ari-breakdown-content">
              <div className="ari-metric">
                <div className="ari-metric-label">Lexical Density</div>
                <div className="ari-metric-bar-container">
                  <div
                    className="ari-metric-bar"
                    style={{
                      width: `${stats.avgLexicalDensity * 100}%`,
                      background: '#667eea',
                    }}
                  />
                </div>
                <div className="ari-metric-value">
                  {stats.avgLexicalDensity.toFixed(2)}
                </div>
              </div>

              <div className="ari-metric">
                <div className="ari-metric-label">Syntactic Complexity</div>
                <div className="ari-metric-bar-container">
                  <div
                    className="ari-metric-bar"
                    style={{
                      width: `${stats.avgSyntacticComplexity * 100}%`,
                      background: '#764ba2',
                    }}
                  />
                </div>
                <div className="ari-metric-value">
                  {stats.avgSyntacticComplexity.toFixed(2)}
                </div>
              </div>

              <div className="ari-metric ari-metric-overall">
                <div className="ari-metric-label">Overall ARI</div>
                <div className="ari-metric-bar-container">
                  <div
                    className="ari-metric-bar"
                    style={{
                      width: `${stats.avgARI * 100}%`,
                      background: ariColor,
                    }}
                  />
                </div>
                <div className="ari-metric-value">
                  {stats.avgARI.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="ari-recommendations-card">
            <h3>Recommendations</h3>
            <ul className="ari-recommendations-list">
              {recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Statistics */}
          <div className="ari-stats-card">
            <h3>Statistics</h3>
            <div className="ari-stats-grid">
              <div className="ari-stat">
                <div className="ari-stat-value">{stats.totalEntries}</div>
                <div className="ari-stat-label">Total Interactions</div>
              </div>
              <div className="ari-stat">
                <div className="ari-stat-value">{recentMetrics.length}</div>
                <div className="ari-stat-label">Recent (Last 100)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="ari-info-panel">
          <h4>What is ARI?</h4>
          <p>
            The Autonomy Retention Index measures your cognitive independence while using AI.
            It combines <strong>Lexical Density</strong> (how substantive your words are) and{' '}
            <strong>Syntactic Complexity</strong> (how carefully you compose sentences).
          </p>
          <p>
            <strong>High ARI</strong> (&gt;= 0.65): You're maintaining strong autonomy with thoughtful, specific prompts.
          </p>
          <p>
            <strong>Low ARI</strong> (&lt; 0.4): You may be over-relying on AI with simplistic prompts.
          </p>
        </div>
      </div>
    </div>
  );
}
