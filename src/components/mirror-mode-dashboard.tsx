/**
 * Mirror Mode Dashboard Component
 *
 * Comprehensive UI dashboard for visualizing and monitoring Mirror Mode
 * system status, user profiles, stability metrics, and transformation results.
 *
 * Features:
 * - Real-time mode status and active user tracking
 * - User linguistic profile visualization
 * - Stability assessment and trend analysis
 * - Transformation metrics and confidence scoring
 * - Service health monitoring
 */

import React, { useState, useEffect } from 'react';
import { mirrorModeOrchestratorService } from '../services/mirror-mode-orchestrator.service';

interface UserDashboardData {
  userId: string;
  currentMode: 'mirror' | 'balancer' | 'unknown';
  readiness: {
    totalMessages: number;
    minRequired: number;
    ready: boolean;
    readinessPercentage: number;
  };
  stability: {
    overallScore: number;
    emotionalStability: number;
    cognitiveStability: number;
    conversationalStability: number;
    stressLevel: number;
    groundingLevel: number;
    trend: 'improving' | 'declining' | 'stable';
    trendStrength: number;
  };
  transformations: {
    lexicon: number;
    syntax: number;
    tone: number;
    averageLatency: string;
    successRate: string;
  };
  metrics: {
    averageSentenceLength: number;
    formalityScore: number;
    energyLevel: number;
    sentimentScore: number;
    vocabularySize: number;
    slangCount: number;
    acronymsCount: number;
  };
}

interface DashboardState {
  systemEnabled: boolean;
  activeSessions: number;
  totalUsers: number;
  selectedUserId: string | null;
  userData: Map<string, UserDashboardData>;
  lastUpdated: number;
}

/**
 * Mirror Mode Dashboard Component
 */
export const MirrorModeDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    systemEnabled: true,
    activeSessions: 0,
    totalUsers: 0,
    selectedUserId: null,
    userData: new Map(),
    lastUpdated: Date.now(),
  });

  // Refresh dashboard data
  const refreshDashboard = () => {
    const status = mirrorModeOrchestratorService.getStatus();
    setState(prev => ({
      ...prev,
      systemEnabled: status.enabled,
      activeSessions: status.activeSessions,
      lastUpdated: Date.now(),
    }));
  };

  // Load user profile
  const loadUserProfile = (userId: string) => {
    const profile = mirrorModeOrchestratorService.getUserMirrorProfile(userId);
    if (!profile) {
      console.warn(`No profile found for user ${userId}`);
      return;
    }

    const currentMode = mirrorModeOrchestratorService.getCurrentMode(userId);
    const stability = profile.stability;
    const trend = { trend: 'stable' as const, trendStrength: 0 };
    const perfMetrics = profile.performanceMetrics;

    const userData: UserDashboardData = {
      userId,
      currentMode,
      readiness: {
        totalMessages: profile.readiness.totalMessagesAnalyzed,
        minRequired: profile.readiness.minRequired,
        ready: profile.readiness.ready,
        readinessPercentage: (profile.readiness.totalMessagesAnalyzed / profile.readiness.minRequired) * 100,
      },
      stability: {
        overallScore: stability.overallStabilityScore,
        emotionalStability: stability.emotionalStability,
        cognitiveStability: stability.cognitiveStability,
        conversationalStability: stability.conversationalStability,
        stressLevel: stability.stressLevel,
        groundingLevel: stability.groundingLevel,
        trend: trend.trend,
        trendStrength: trend.trendStrength,
      },
      transformations: {
        lexicon: profile.lexicon?.topSlang?.length || 0,
        syntax: profile.syntax?.averageSentenceLength || 0,
        tone: profile.tone?.energyLevel || 0,
        averageLatency: perfMetrics?.avgLatency.toFixed(0) + 'ms' || 'N/A',
        successRate: perfMetrics?.successRate ? (perfMetrics.successRate * 100).toFixed(0) + '%' : 'N/A',
      },
      metrics: {
        averageSentenceLength: profile.syntax?.averageSentenceLength || 0,
        formalityScore: profile.tone?.formalityScore || 0,
        energyLevel: profile.tone?.energyLevel || 0,
        sentimentScore: profile.tone?.sentimentScore || 0,
        vocabularySize: profile.lexicon?.vocabularySize || 0,
        slangCount: profile.lexicon?.commonSlangsCount || 0,
        acronymsCount: profile.lexicon?.acronymsCount || 0,
      },
    };

    setState(prev => ({
      ...prev,
      selectedUserId: userId,
      userData: new Map(prev.userData).set(userId, userData),
    }));
  };

  useEffect(() => {
    // Refresh dashboard every 5 seconds
    const interval = setInterval(refreshDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedUser = state.selectedUserId ? state.userData.get(state.selectedUserId) : null;

  return (
    <div className="mirror-mode-dashboard">
      <header className="dashboard-header">
        <h1>🪞 Mirror Mode Dashboard</h1>
        <div className="header-status">
          <span className={`system-status ${state.systemEnabled ? 'enabled' : 'disabled'}`}>
            {state.systemEnabled ? '✅ System Active' : '❌ System Inactive'}
          </span>
          <span className="active-sessions">
            👥 Active Sessions: {state.activeSessions}
          </span>
          <span className="last-updated">
            🕐 Last Updated: {new Date(state.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* System Overview Panel */}
        <section className="system-overview">
          <h2>System Overview</h2>
          <div className="overview-metrics">
            <div className="metric-card">
              <h3>System Status</h3>
              <div className={`status-indicator ${state.systemEnabled ? 'active' : 'inactive'}`}>
                {state.systemEnabled ? 'ACTIVE' : 'INACTIVE'}
              </div>
              <p>{state.systemEnabled ? 'Mirror Mode is enabled' : 'Mirror Mode is disabled'}</p>
            </div>

            <div className="metric-card">
              <h3>Active Sessions</h3>
              <div className="metric-value">{state.activeSessions}</div>
              <p>Users in active Mirror Mode sessions</p>
            </div>

            <div className="metric-card">
              <h3>Monitored Users</h3>
              <div className="metric-value">{state.userData.size}</div>
              <p>Users with linguistic profiles</p>
            </div>
          </div>
        </section>

        {/* User Selection Panel */}
        <section className="user-selection">
          <h2>Select User Profile</h2>
          <div className="user-list">
            {Array.from(state.userData.entries()).map(([userId, data]) => (
              <button
                key={userId}
                className={`user-button ${state.selectedUserId === userId ? 'active' : ''}`}
                onClick={() => loadUserProfile(userId)}
              >
                <span className={`mode-indicator ${data.currentMode}`}>{data.currentMode.toUpperCase()}</span>
                {userId}
              </button>
            ))}
          </div>
        </section>

        {/* User Profile Panel */}
        {selectedUser && (
          <section className="user-profile">
            <h2>User Profile: {selectedUser.userId}</h2>

            {/* Current Mode */}
            <div className="profile-section">
              <h3>Current Mode</h3>
              <div className={`mode-display ${selectedUser.currentMode}`}>
                <span className="mode-name">{selectedUser.currentMode.toUpperCase()}</span>
                <span className="mode-description">
                  {selectedUser.currentMode === 'mirror'
                    ? 'Resonance Mode - Mirroring user patterns'
                    : 'Balancer Mode - Providing complementary support'}
                </span>
              </div>
            </div>

            {/* Readiness */}
            <div className="profile-section">
              <h3>Profile Readiness</h3>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, selectedUser.readiness.readinessPercentage)}%` }}
                />
              </div>
              <p>
                {selectedUser.readiness.totalMessages}/{selectedUser.readiness.minRequired} messages analyzed
                {selectedUser.readiness.ready && ' ✅ Ready for Mirror Mode'}
              </p>
            </div>

            {/* Stability Assessment */}
            <div className="profile-section">
              <h3>Stability Assessment</h3>
              <div className="stability-metrics">
                <div className="metric">
                  <label>Overall Stability</label>
                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${selectedUser.stability.overallScore * 100}%`,
                        backgroundColor: getScoreColor(selectedUser.stability.overallScore),
                      }}
                    />
                  </div>
                  <span>{(selectedUser.stability.overallScore * 100).toFixed(0)}%</span>
                </div>

                <div className="metric">
                  <label>Emotional Stability</label>
                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${selectedUser.stability.emotionalStability * 100}%`,
                        backgroundColor: getScoreColor(selectedUser.stability.emotionalStability),
                      }}
                    />
                  </div>
                  <span>{(selectedUser.stability.emotionalStability * 100).toFixed(0)}%</span>
                </div>

                <div className="metric">
                  <label>Cognitive Clarity</label>
                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${selectedUser.stability.cognitiveStability * 100}%`,
                        backgroundColor: getScoreColor(selectedUser.stability.cognitiveStability),
                      }}
                    />
                  </div>
                  <span>{(selectedUser.stability.cognitiveStability * 100).toFixed(0)}%</span>
                </div>

                <div className="metric">
                  <label>Stress Level</label>
                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${selectedUser.stability.stressLevel * 100}%`,
                        backgroundColor: getScoreColor(1 - selectedUser.stability.stressLevel),
                      }}
                    />
                  </div>
                  <span>{(selectedUser.stability.stressLevel * 100).toFixed(0)}%</span>
                </div>

                <div className="metric">
                  <label>Grounding Level</label>
                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${selectedUser.stability.groundingLevel * 100}%`,
                        backgroundColor: getScoreColor(selectedUser.stability.groundingLevel),
                      }}
                    />
                  </div>
                  <span>{(selectedUser.stability.groundingLevel * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="trend-info">
                <span className={`trend ${selectedUser.stability.trend}`}>
                  {selectedUser.stability.trend.toUpperCase()}
                  {' - '}
                  Strength: {(selectedUser.stability.trendStrength * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Linguistic Metrics */}
            <div className="profile-section">
              <h3>Linguistic Profile</h3>
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="label">Avg Sentence Length</span>
                  <span className="value">{selectedUser.metrics.averageSentenceLength.toFixed(1)} words</span>
                </div>
                <div className="metric-item">
                  <span className="label">Formality Score</span>
                  <span className="value">{(selectedUser.metrics.formalityScore * 100).toFixed(0)}%</span>
                </div>
                <div className="metric-item">
                  <span className="label">Energy Level</span>
                  <span className="value">{(selectedUser.metrics.energyLevel * 100).toFixed(0)}%</span>
                </div>
                <div className="metric-item">
                  <span className="label">Sentiment Score</span>
                  <span className="value">{selectedUser.metrics.sentimentScore.toFixed(2)}</span>
                </div>
                <div className="metric-item">
                  <span className="label">Vocabulary Size</span>
                  <span className="value">{selectedUser.metrics.vocabularySize} words</span>
                </div>
                <div className="metric-item">
                  <span className="label">Slang Terms</span>
                  <span className="value">{selectedUser.metrics.slangCount}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="profile-section">
              <h3>Performance Metrics</h3>
              <div className="performance-metrics">
                <div className="perf-card">
                  <span className="label">Avg Latency</span>
                  <span className="value">{selectedUser.transformations.averageLatency}</span>
                </div>
                <div className="perf-card">
                  <span className="label">Success Rate</span>
                  <span className="value">{selectedUser.transformations.successRate}</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <style>{`
        .mirror-mode-dashboard {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #333;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .dashboard-header {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .dashboard-header h1 {
          margin: 0 0 15px 0;
          color: #667eea;
        }

        .header-status {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 14px;
        }

        .system-status {
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 600;
        }

        .system-status.enabled {
          background: #d4edda;
          color: #155724;
        }

        .system-status.disabled {
          background: #f8d7da;
          color: #721c24;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        section h2 {
          color: #667eea;
          margin-top: 0;
          border-bottom: 2px solid #667eea;
          padding-bottom: 10px;
        }

        section h3 {
          color: #764ba2;
          margin-top: 15px;
          margin-bottom: 10px;
        }

        .overview-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .metric-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          border-left: 4px solid #667eea;
        }

        .metric-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
        }

        .status-indicator {
          font-size: 24px;
          font-weight: 700;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
        }

        .status-indicator.active {
          background: #d4edda;
          color: #155724;
        }

        .status-indicator.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #667eea;
          margin: 10px 0;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .user-button:hover {
          border-color: #667eea;
          background: #f8f9fa;
        }

        .user-button.active {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }

        .mode-indicator {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          min-width: 60px;
          text-align: center;
        }

        .mode-indicator.mirror {
          background: #d4edda;
          color: #155724;
        }

        .mode-indicator.balancer {
          background: #fff3cd;
          color: #856404;
        }

        .user-button.active .mode-indicator.mirror,
        .user-button.active .mode-indicator.balancer {
          background: white;
          color: #667eea;
        }

        .profile-section {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .mode-display {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .mode-display.mirror {
          border-left-color: #28a745;
        }

        .mode-display.balancer {
          border-left-color: #ffc107;
        }

        .mode-name {
          font-size: 18px;
          font-weight: 700;
        }

        .mode-description {
          font-size: 13px;
          color: #666;
        }

        .progress-bar {
          background: #e9ecef;
          border-radius: 8px;
          height: 24px;
          overflow: hidden;
          margin: 10px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .stability-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .metric {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .metric label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }

        .meter {
          background: #e9ecef;
          border-radius: 6px;
          height: 20px;
          overflow: hidden;
        }

        .meter-fill {
          height: 100%;
          transition: width 0.3s, background-color 0.3s;
        }

        .metric span {
          font-size: 13px;
          font-weight: 600;
        }

        .trend-info {
          margin-top: 15px;
          padding: 10px;
          background: white;
          border-radius: 6px;
          text-align: center;
        }

        .trend {
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          display: inline-block;
        }

        .trend.improving {
          background: #d4edda;
          color: #155724;
        }

        .trend.declining {
          background: #f8d7da;
          color: #721c24;
        }

        .trend.stable {
          background: #d1ecf1;
          color: #0c5460;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          background: white;
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid #667eea;
        }

        .metric-item .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }

        .metric-item .value {
          font-size: 16px;
          font-weight: 700;
          color: #667eea;
        }

        .performance-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .perf-card {
          display: flex;
          flex-direction: column;
          background: white;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }

        .perf-card .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }

        .perf-card .value {
          font-size: 18px;
          font-weight: 700;
          color: #667eea;
        }

        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .header-status {
            flex-direction: column;
          }

          .stability-metrics,
          .metrics-grid,
          .performance-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Utility: Get color based on score
 */
function getScoreColor(score: number): string {
  if (score > 0.7) return '#28a745'; // green
  if (score > 0.4) return '#ffc107'; // orange
  return '#dc3545'; // red
}

export default MirrorModeDashboard;
