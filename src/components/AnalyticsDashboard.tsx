/**
 * Analytics Dashboard Component (Sprint 13)
 *
 * Comprehensive analytics visualization for SML Guardian:
 * - ARI/RDI trends over time
 * - Conversation statistics
 * - Usage metrics and patterns
 * - Privacy score
 * - Export capabilities
 */

import { useState, useEffect } from 'react';
import { analyticsService, type AnalyticsReport } from '../services/analytics.service';
import { LineChart } from './charts/LineChart';
import { BarChart } from './charts/BarChart';
import './AnalyticsDashboard.css';

export interface AnalyticsDashboardProps {
  onClose: () => void;
}

export function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends' | 'usage' | 'privacy'>('overview');

  useEffect(() => {
    // Generate analytics report
    setLoading(true);
    try {
      const analytics = analyticsService.generateReport(30); // Last 30 days
      setReport(analytics);
    } catch (error) {
      console.error('[Analytics] Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExportJSON = () => {
    if (report) {
      analyticsService.exportReportJSON(report);
    }
  };

  const handleExportCSV = () => {
    if (report) {
      analyticsService.exportReportCSV(report);
    }
  };

  if (loading || !report) {
    return (
      <div className="analytics-modal">
        <div className="analytics-container">
          <div className="analytics-loading">
            <div className="loading-spinner"></div>
            <p>Generating analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const { trends, conversations, usage, privacy } = report;

  return (
    <div className="analytics-modal">
      <div className="analytics-container">
        {/* Header */}
        <div className="analytics-header">
          <h2>📊 Analytics Dashboard</h2>
          <div className="analytics-actions">
            <button onClick={handleExportJSON} className="export-btn" title="Export as JSON">
              📄 JSON
            </button>
            <button onClick={handleExportCSV} className="export-btn" title="Export as CSV">
              📊 CSV
            </button>
            <button onClick={onClose} className="close-btn">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="analytics-tabs">
          <button
            className={`tab-btn ${selectedTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${selectedTab === 'trends' ? 'active' : ''}`}
            onClick={() => setSelectedTab('trends')}
          >
            Trends
          </button>
          <button
            className={`tab-btn ${selectedTab === 'usage' ? 'active' : ''}`}
            onClick={() => setSelectedTab('usage')}
          >
            Usage
          </button>
          <button
            className={`tab-btn ${selectedTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setSelectedTab('privacy')}
          >
            Privacy
          </button>
        </div>

        {/* Content */}
        <div className="analytics-content">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="tab-content">
              <h3>Summary</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{conversations.totalConversations}</div>
                  <div className="stat-label">Conversations</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{conversations.totalMessages}</div>
                  <div className="stat-label">Messages</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{usage.totalPrompts}</div>
                  <div className="stat-label">Prompts Tracked</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{usage.averageARI.toFixed(2)}</div>
                  <div className="stat-label">Avg ARI Score</div>
                </div>
              </div>

              <h3 style={{ marginTop: '2rem' }}>Conversation Activity</h3>
              {conversations.conversationsByDay.length > 0 ? (
                <BarChart
                  data={conversations.conversationsByDay.map(d => ({
                    label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    value: d.count,
                  }))}
                  title="Conversations Created Per Day"
                  color="#48bb78"
                  width={700}
                  height={250}
                />
              ) : (
                <p className="no-data">No conversation activity data yet</p>
              )}

              <h3 style={{ marginTop: '2rem' }}>Quick Stats</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Avg Messages/Conversation:</span>
                  <span className="info-value">{conversations.avgMessagesPerConversation.toFixed(1)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Average RDI:</span>
                  <span className="info-value">
                    {usage.averageRDI ? usage.averageRDI.toFixed(3) : 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Privacy Score:</span>
                  <span className="info-value" style={{ color: '#48bb78' }}>
                    {privacy.score}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Trends Tab */}
          {selectedTab === 'trends' && (
            <div className="tab-content">
              <h3>ARI (Autonomy Retention Index) Over Time</h3>
              {trends.ari.length > 0 ? (
                <LineChart
                  data={trends.ari}
                  label="ARI measures how much control you retain in conversations"
                  yAxisLabel="ARI Score"
                  color="#667eea"
                  width={700}
                  height={250}
                  formatValue={(v) => v.toFixed(2)}
                />
              ) : (
                <p className="no-data">Not enough data to show ARI trends</p>
              )}

              <h3 style={{ marginTop: '2rem' }}>RDI (Reality Drift Index) Over Time</h3>
              {trends.rdi.length > 0 ? (
                <LineChart
                  data={trends.rdi}
                  label="RDI detects conceptual drift in conversations"
                  yAxisLabel="Drift Score"
                  color="#f6ad55"
                  width={700}
                  height={250}
                  formatValue={(v) => v.toFixed(3)}
                />
              ) : (
                <p className="no-data">Not enough data to show RDI trends (requires 5+ prompts)</p>
              )}

              <h3 style={{ marginTop: '2rem' }}>Component Metrics</h3>
              <div className="dual-chart-row">
                {trends.lexicalDensity.length > 0 && (
                  <div className="chart-half">
                    <LineChart
                      data={trends.lexicalDensity}
                      label="Lexical Density (Content Word Ratio)"
                      color="#48bb78"
                      width={340}
                      height={200}
                      formatValue={(v) => v.toFixed(2)}
                    />
                  </div>
                )}
                {trends.syntacticComplexity.length > 0 && (
                  <div className="chart-half">
                    <LineChart
                      data={trends.syntacticComplexity}
                      label="Syntactic Complexity (Query Structure)"
                      color="#ed8936"
                      width={340}
                      height={200}
                      formatValue={(v) => v.toFixed(2)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usage Tab */}
          {selectedTab === 'usage' && (
            <div className="tab-content">
              <h3>ARI Distribution</h3>
              {usage.ariDistribution.length > 0 ? (
                <BarChart
                  data={usage.ariDistribution.map(d => ({
                    label: d.range,
                    value: d.count,
                  }))}
                  title="How your autonomy scores are distributed"
                  color="#667eea"
                  width={700}
                  height={250}
                />
              ) : (
                <p className="no-data">No ARI distribution data yet</p>
              )}

              <h3 style={{ marginTop: '2rem' }}>Activity by Hour</h3>
              {usage.activeHours.length > 0 ? (
                <BarChart
                  data={usage.activeHours.map(h => ({
                    label: `${h.hour}:00`,
                    value: h.count,
                  }))}
                  title="When you're most active (24-hour format)"
                  color="#48bb78"
                  width={700}
                  height={250}
                />
              ) : (
                <p className="no-data">No activity pattern data yet</p>
              )}

              <h3 style={{ marginTop: '2rem' }}>Prompts Per Day</h3>
              {usage.promptsPerDay.length > 0 ? (
                <BarChart
                  data={usage.promptsPerDay.map(d => ({
                    label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    value: d.count,
                  }))}
                  title="Daily prompt activity"
                  color="#f6ad55"
                  width={700}
                  height={250}
                />
              ) : (
                <p className="no-data">No daily prompt data yet</p>
              )}
            </div>
          )}

          {/* Privacy Tab */}
          {selectedTab === 'privacy' && (
            <div className="tab-content">
              <h3>Privacy Score</h3>
              <div className="privacy-score-display">
                <div className="privacy-score-circle">
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="20"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#48bb78"
                      strokeWidth="20"
                      strokeDasharray={`${(privacy.score / 100) * 502.4} 502.4`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                    <text
                      x="100"
                      y="100"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="48"
                      fontWeight="bold"
                      fill="#48bb78"
                    >
                      {privacy.score}
                    </text>
                    <text
                      x="100"
                      y="130"
                      textAnchor="middle"
                      fontSize="16"
                      fill="rgba(255, 255, 255, 0.6)"
                    >
                      Privacy Score
                    </text>
                  </svg>
                </div>
              </div>

              <h3 style={{ marginTop: '2rem' }}>Privacy Factors</h3>
              <div className="privacy-factors">
                {Object.entries(privacy.factors).map(([key, value]) => (
                  <div key={key} className="privacy-factor">
                    <span className={`factor-icon ${value ? 'active' : ''}`}>
                      {value ? '✓' : '✗'}
                    </span>
                    <span className="factor-label">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>

              <h3 style={{ marginTop: '2rem' }}>Recommendations</h3>
              <div className="privacy-recommendations">
                {privacy.recommendations.map((rec, i) => (
                  <div key={i} className="recommendation-item">
                    <span className="rec-bullet">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
