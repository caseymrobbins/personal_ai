/**
 * BALANCER MODE DASHBOARD
 * =======================
 * Real-time monitoring and visualization of Agent 2 (Balancer) operations
 * Displays emotion detection, mode switching, response generation, and effectiveness metrics
 * Component: React Dashboard with interactive charts and detailed analytics
 */

import React, { useState, useEffect } from 'react';

interface EmotionalState {
  primaryEmotion: string;
  secondaryEmotions: { emotion: string; intensity: number }[];
  intensityScore: number;
  valence: number;
  arousal: number;
  dominance: number;
  emotionalTrajectory: 'escalating' | 'de-escalating' | 'stable';
  emotionalCoherence: 'aligned' | 'conflicted' | 'fragmented';
  riskFactors: string[];
}

interface MoodState {
  currentMode: 'mirror' | 'balancer' | 'hybrid';
  previousMode: 'mirror' | 'balancer' | 'hybrid' | null;
  emotionalState: EmotionalState;
  stabilityScore: number;
  switchTriggered: boolean;
  switchConfidence: number;
}

interface ResponseMetrics {
  strategySelected: string;
  effectivenessScore: number;
  userReceptivity: number;
  emotionalShiftDetected: number;
  timeToResponse: number;
  engagementLevel: number;
}

interface GroundingTechnique {
  name: string;
  effectiveness: number;
  estimatedDuration: number;
  contraindications: string[];
}

interface BalancerModeDashboardProps {
  userId?: string;
  realTimeMode?: boolean;
  compactView?: boolean;
}

/**
 * Main Balancer Mode Dashboard Component
 */
export const BalancerModeDashboard: React.FC<BalancerModeDashboardProps> = ({
  userId = 'current-user',
  realTimeMode = true,
  compactView = false,
}) => {
  // Mock data for demonstration
  const [emotionalState, setEmotionalState] = useState<EmotionalState>({
    primaryEmotion: 'sadness',
    secondaryEmotions: [
      { emotion: 'hopelessness', intensity: 0.65 },
      { emotion: 'fatigue', intensity: 0.55 },
    ],
    intensityScore: 0.72,
    valence: -0.68,
    arousal: 0.35,
    dominance: 0.28,
    emotionalTrajectory: 'stable',
    emotionalCoherence: 'aligned',
    riskFactors: ['negative self-talk', 'isolation', 'sleep disruption'],
  });

  const [moodState, setMoodState] = useState<MoodState>({
    currentMode: 'balancer',
    previousMode: 'mirror',
    emotionalState: emotionalState,
    stabilityScore: 0.42,
    switchTriggered: true,
    switchConfidence: 0.87,
  });

  const [responseMetrics, setResponseMetrics] = useState<ResponseMetrics>({
    strategySelected: 'grounding-support',
    effectivenessScore: 0.81,
    userReceptivity: 0.78,
    emotionalShiftDetected: 0.15,
    timeToResponse: 245,
    engagementLevel: 0.73,
  });

  const [selectedTechnique, setSelectedTechnique] = useState<GroundingTechnique>(
    {
      name: '5-4-3-2-1 Sensory Grounding',
      effectiveness: 0.85,
      estimatedDuration: 5,
      contraindications: ['dissociation', 'sensory sensitivities'],
    }
  );

  const [responseStyles, setResponseStyles] = useState({
    grounding: { active: true, confidence: 0.85 },
    encouraging: { active: true, confidence: 0.78 },
    stoic: { active: false, confidence: 0.0 },
    directive: { active: false, confidence: 0.0 },
  });

  const [sessionHistory, setSessionHistory] = useState([
    {
      timestamp: new Date(Date.now() - 600000),
      emotion: 'anxiety',
      mode: 'balancer',
      response: 'Grounding technique',
      effectiveness: 0.82,
    },
    {
      timestamp: new Date(Date.now() - 300000),
      emotion: 'sadness',
      mode: 'balancer',
      response: 'Encouraging support',
      effectiveness: 0.75,
    },
    {
      timestamp: new Date(Date.now()),
      emotion: 'sadness',
      mode: 'balancer',
      response: 'Grounding + Encouragement',
      effectiveness: 0.81,
    },
  ]);

  const [stabilityTrend, setStabilityTrend] = useState([
    0.35, 0.38, 0.4, 0.42, 0.41, 0.43, 0.42,
  ]);

  const getEmotionColor = (emotion: string): string => {
    const emotionColors: { [key: string]: string } = {
      sadness: '#4169E1',
      fear: '#8B0000',
      anger: '#FF4500',
      anxiety: '#FFD700',
      joy: '#32CD32',
      disgust: '#9932CC',
      surprise: '#FF69B4',
      hopelessness: '#4169E1',
      fatigue: '#808080',
    };
    return emotionColors[emotion] || '#999999';
  };

  const getModeColor = (mode: string): string => {
    const modeColors: { [key: string]: string } = {
      mirror: '#4CAF50',
      balancer: '#FF9800',
      hybrid: '#2196F3',
    };
    return modeColors[mode] || '#999999';
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div style={styles.container}>
      {!compactView && (
        <header style={styles.header}>
          <h1>🎯 Balancer Mode Dashboard</h1>
          <p style={styles.subtitle}>
            Agent 2 - Emotional Support & Regulation System
          </p>
        </header>
      )}

      {/* CURRENT STATUS SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📊 Current Status</h2>

        <div style={styles.statusGrid}>
          {/* Emotional State Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Emotional State</h3>

            <div style={styles.primaryEmotion}>
              <div
                style={{
                  ...styles.emotionBadge,
                  backgroundColor: getEmotionColor(emotionalState.primaryEmotion),
                }}
              >
                {emotionalState.primaryEmotion}
              </div>
              <span style={styles.intensityLabel}>
                Intensity: {(emotionalState.intensityScore * 100).toFixed(0)}%
              </span>
            </div>

            <div style={styles.emotionMetrics}>
              <div style={styles.metricBar}>
                <label>Valence (negative → positive)</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${((emotionalState.valence + 1) / 2) * 100}%`,
                      backgroundColor: '#FF6B6B',
                    }}
                  />
                </div>
                <span>{(emotionalState.valence * 100).toFixed(0)}%</span>
              </div>

              <div style={styles.metricBar}>
                <label>Arousal (calm → activated)</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${emotionalState.arousal * 100}%`,
                      backgroundColor: '#FFC107',
                    }}
                  />
                </div>
                <span>{(emotionalState.arousal * 100).toFixed(0)}%</span>
              </div>

              <div style={styles.metricBar}>
                <label>Dominance (passive → assertive)</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${emotionalState.dominance * 100}%`,
                      backgroundColor: '#9C27B0',
                    }}
                  />
                </div>
                <span>{(emotionalState.dominance * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div style={styles.secondaryEmotions}>
              <label style={styles.label}>Secondary Emotions</label>
              {emotionalState.secondaryEmotions.map((emotion, idx) => (
                <div key={idx} style={styles.secondaryEmotionItem}>
                  <span>{emotion.emotion}</span>
                  <div style={styles.miniBar}>
                    <div
                      style={{
                        width: `${emotion.intensity * 100}%`,
                        height: '100%',
                        backgroundColor: getEmotionColor(emotion.emotion),
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <span style={styles.percentage}>
                    {(emotion.intensity * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>

            {emotionalState.riskFactors.length > 0 && (
              <div style={styles.riskFactors}>
                <label style={{ ...styles.label, color: '#D32F2F' }}>
                  ⚠️ Risk Factors
                </label>
                {emotionalState.riskFactors.map((factor, idx) => (
                  <span key={idx} style={styles.riskBadge}>
                    {factor}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Mode State Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Mode & Stability</h3>

            <div style={styles.modeInfo}>
              <div style={styles.modeDisplay}>
                <div
                  style={{
                    ...styles.modeBadge,
                    backgroundColor: getModeColor(moodState.currentMode),
                  }}
                >
                  {moodState.currentMode.toUpperCase()}
                </div>
                {moodState.switchTriggered && (
                  <div style={styles.switchIndicator}>
                    Switched from {moodState.previousMode}
                  </div>
                )}
              </div>

              <div style={styles.metricBar}>
                <label>Stability Score</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${moodState.stabilityScore * 100}%`,
                      backgroundColor:
                        moodState.stabilityScore > 0.7
                          ? '#4CAF50'
                          : moodState.stabilityScore > 0.4
                            ? '#FF9800'
                            : '#F44336',
                    }}
                  />
                </div>
                <span>{(moodState.stabilityScore * 100).toFixed(0)}%</span>
              </div>

              {moodState.switchTriggered && (
                <div style={styles.confidenceMetric}>
                  <label>Switch Confidence</label>
                  <div
                    style={{
                      fontSize: '1.4em',
                      fontWeight: 'bold',
                      color: getModeColor(moodState.currentMode),
                    }}
                  >
                    {(moodState.switchConfidence * 100).toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Response Metrics Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Response Effectiveness</h3>

            <div style={styles.metricsList}>
              <div style={styles.metricItem}>
                <label>Strategy</label>
                <span style={styles.strategeBadge}>
                  {responseMetrics.strategySelected}
                </span>
              </div>

              <div style={styles.metricBar}>
                <label>Overall Effectiveness</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${responseMetrics.effectivenessScore * 100}%`,
                      backgroundColor: '#4CAF50',
                    }}
                  />
                </div>
                <span>
                  {(responseMetrics.effectivenessScore * 100).toFixed(0)}%
                </span>
              </div>

              <div style={styles.metricBar}>
                <label>User Receptivity</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${responseMetrics.userReceptivity * 100}%`,
                      backgroundColor: '#2196F3',
                    }}
                  />
                </div>
                <span>{(responseMetrics.userReceptivity * 100).toFixed(0)}%</span>
              </div>

              <div style={styles.metricBar}>
                <label>Engagement Level</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${responseMetrics.engagementLevel * 100}%`,
                      backgroundColor: '#FF9800',
                    }}
                  />
                </div>
                <span>{(responseMetrics.engagementLevel * 100).toFixed(0)}%</span>
              </div>

              <div style={styles.metricItem}>
                <label>Response Time</label>
                <span style={styles.responseTime}>
                  {responseMetrics.timeToResponse}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GROUNDING & RESPONSE STYLES SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>🛠️ Active Response Strategies</h2>

        <div style={styles.strategiesGrid}>
          {/* Grounding Technique */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              🌱 {selectedTechnique.name}
            </h3>

            <div style={styles.techniqueDetails}>
              <div style={styles.metricBar}>
                <label>Effectiveness Rating</label>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${selectedTechnique.effectiveness * 100}%`,
                      backgroundColor: '#4CAF50',
                    }}
                  />
                </div>
                <span>
                  {(selectedTechnique.effectiveness * 100).toFixed(0)}%
                </span>
              </div>

              <div style={styles.metricItem}>
                <label>Estimated Duration</label>
                <span>{selectedTechnique.estimatedDuration} minutes</span>
              </div>

              {selectedTechnique.contraindications.length > 0 && (
                <div style={styles.contraindications}>
                  <label style={styles.label}>⚠️ Contraindications</label>
                  {selectedTechnique.contraindications.map((contra, idx) => (
                    <span key={idx} style={styles.warningBadge}>
                      {contra}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Response Styles */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>💬 Response Styles Active</h3>

            <div style={styles.stylesList}>
              {Object.entries(responseStyles).map(([style, data]) => (
                <div
                  key={style}
                  style={{
                    ...styles.styleItem,
                    backgroundColor: data.active ? '#E8F5E9' : '#F5F5F5',
                    borderLeft: data.active ? '4px solid #4CAF50' : '4px solid #CCC',
                  }}
                >
                  <span style={styles.styleName}>{style}</span>
                  {data.active ? (
                    <div style={styles.styleActive}>
                      <span style={{ color: '#4CAF50' }}>✓ Active</span>
                      <span style={styles.confidence}>
                        {(data.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>Inactive</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emotional Trajectory */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📈 Emotional Trajectory</h3>

            <div style={styles.trajectoryInfo}>
              <div
                style={{
                  ...styles.trajectorBadge,
                  backgroundColor:
                    emotionalState.emotionalTrajectory === 'escalating'
                      ? '#F44336'
                      : emotionalState.emotionalTrajectory === 'de-escalating'
                        ? '#4CAF50'
                        : '#FF9800',
                }}
              >
                {emotionalState.emotionalTrajectory}
              </div>

              <div style={styles.coherenceInfo}>
                <label>Emotional Coherence</label>
                <span
                  style={{
                    ...styles.coherenceBadge,
                    borderColor: getEmotionColor(emotionalState.primaryEmotion),
                    color: getEmotionColor(emotionalState.primaryEmotion),
                  }}
                >
                  {emotionalState.emotionalCoherence}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SESSION HISTORY SECTION */}
      {!compactView && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📜 Session History</h2>

          <div style={styles.historyTable}>
            <div style={styles.historyHeader}>
              <div style={styles.historyCol}>Time</div>
              <div style={styles.historyCol}>Emotion</div>
              <div style={styles.historyCol}>Mode</div>
              <div style={styles.historyCol}>Response</div>
              <div style={styles.historyCol}>Effectiveness</div>
            </div>

            {sessionHistory.map((entry, idx) => (
              <div key={idx} style={styles.historyRow}>
                <div style={styles.historyCol}>
                  {formatTime(entry.timestamp)}
                </div>
                <div style={styles.historyCol}>
                  <span
                    style={{
                      ...styles.emotionBadge,
                      backgroundColor: getEmotionColor(entry.emotion),
                      padding: '2px 8px',
                      fontSize: '0.9em',
                    }}
                  >
                    {entry.emotion}
                  </span>
                </div>
                <div style={styles.historyCol}>
                  <span
                    style={{
                      ...styles.modeBadge,
                      backgroundColor: getModeColor(entry.mode),
                      padding: '2px 8px',
                      fontSize: '0.9em',
                    }}
                  >
                    {entry.mode}
                  </span>
                </div>
                <div style={styles.historyCol}>{entry.response}</div>
                <div style={styles.historyCol}>
                  <span style={styles.effectivenessScore}>
                    {(entry.effectiveness * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STABILITY TREND SECTION */}
      {!compactView && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📊 Stability Trend</h2>

          <div style={styles.trendChart}>
            <div style={styles.trendHeader}>
              <label>Stability over time (last 7 interactions)</label>
              <span style={styles.trendValue}>
                Current: {(moodState.stabilityScore * 100).toFixed(0)}%
              </span>
            </div>

            <div style={styles.miniChart}>
              {stabilityTrend.map((score, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.trendBar,
                    height: `${score * 100}%`,
                    backgroundColor:
                      score > 0.7 ? '#4CAF50' : score > 0.4 ? '#FF9800' : '#F44336',
                  }}
                  title={`${(score * 100).toFixed(0)}%`}
                />
              ))}
            </div>

            <div style={styles.trendScale}>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </section>
      )}

      {/* INSIGHTS SECTION */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>💡 Key Insights</h2>

        <div style={styles.insightsList}>
          <div style={styles.insight}>
            <span style={styles.insightIcon}>📌</span>
            <p>
              User is in Balancer mode due to elevated sadness intensity
              ({(emotionalState.intensityScore * 100).toFixed(0)}%)
            </p>
          </div>

          {emotionalState.riskFactors.length > 0 && (
            <div style={styles.insight}>
              <span style={styles.insightIcon}>⚠️</span>
              <p>
                Identified risk factors: {emotionalState.riskFactors.join(', ')}
              </p>
            </div>
          )}

          <div style={styles.insight}>
            <span style={styles.insightIcon}>✓</span>
            <p>
              Current response strategy showing high effectiveness
              ({(responseMetrics.effectivenessScore * 100).toFixed(0)}%)
            </p>
          </div>

          {emotionalState.emotionalTrajectory === 'de-escalating' && (
            <div style={styles.insight}>
              <span style={styles.insightIcon}>📈</span>
              <p>Positive trend: Emotional state is de-escalating</p>
            </div>
          )}

          <div style={styles.insight}>
            <span style={styles.insightIcon}>🎯</span>
            <p>
              User receptivity to current approach is
              {responseMetrics.userReceptivity > 0.7
                ? ' strong'
                : responseMetrics.userReceptivity > 0.4
                  ? ' moderate'
                  : ' low'}
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p>
          🤖 Balancer Mode Dashboard | Real-time emotional support monitoring
        </p>
        <p style={{ fontSize: '0.85em', marginTop: '8px', color: '#999' }}>
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </footer>
    </div>
  );
};

/**
 * STYLES
 */
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#FAFAFA',
    color: '#333',
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    borderBottom: '2px solid #E0E0E0',
    paddingBottom: '20px',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '1.1em',
    color: '#666',
    marginTop: '8px',
  } as React.CSSProperties,

  section: {
    marginBottom: '40px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '1.5em',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#222',
  } as React.CSSProperties,

  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,

  card: {
    backgroundColor: 'white',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,

  cardTitle: {
    fontSize: '1.2em',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#222',
  } as React.CSSProperties,

  primaryEmotion: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px',
  } as React.CSSProperties,

  emotionBadge: {
    display: 'inline-block',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.95em',
    fontWeight: '600',
    textTransform: 'capitalize',
  } as React.CSSProperties,

  intensityLabel: {
    fontSize: '0.95em',
    color: '#666',
  } as React.CSSProperties,

  emotionMetrics: {
    marginBottom: '15px',
  } as React.CSSProperties,

  metricBar: {
    marginBottom: '15px',
  } as React.CSSProperties,

  barContainer: {
    width: '100%',
    height: '24px',
    backgroundColor: '#EEE',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '4px',
    marginBottom: '4px',
  } as React.CSSProperties,

  barFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,

  label: {
    fontSize: '0.85em',
    fontWeight: '600',
    color: '#555',
  } as React.CSSProperties,

  secondaryEmotions: {
    borderTop: '1px solid #EEE',
    paddingTop: '15px',
    marginTop: '15px',
  } as React.CSSProperties,

  secondaryEmotionItem: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 60px',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    fontSize: '0.9em',
  } as React.CSSProperties,

  miniBar: {
    height: '16px',
    backgroundColor: '#EEE',
    borderRadius: '3px',
    overflow: 'hidden',
  } as React.CSSProperties,

  percentage: {
    fontSize: '0.85em',
    color: '#999',
    textAlign: 'right' as const,
  } as React.CSSProperties,

  riskFactors: {
    borderTop: '1px solid #EEE',
    paddingTop: '15px',
    marginTop: '15px',
  } as React.CSSProperties,

  riskBadge: {
    display: 'inline-block',
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.85em',
    marginRight: '8px',
    marginTop: '6px',
  } as React.CSSProperties,

  modeInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  } as React.CSSProperties,

  modeDisplay: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  } as React.CSSProperties,

  modeBadge: {
    display: 'inline-block',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '1.1em',
    fontWeight: '700',
    textAlign: 'center' as const,
    width: '100%',
  } as React.CSSProperties,

  switchIndicator: {
    fontSize: '0.9em',
    color: '#FF9800',
    fontWeight: '600',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  confidenceMetric: {
    textAlign: 'center' as const,
  } as React.CSSProperties,

  metricsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  metricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.95em',
  } as React.CSSProperties,

  strategeBadge: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '0.9em',
    fontWeight: '600',
  } as React.CSSProperties,

  responseTime: {
    backgroundColor: '#F3E5F5',
    color: '#7B1FA2',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '0.9em',
    fontWeight: '600',
  } as React.CSSProperties,

  strategiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,

  techniqueDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  contraindications: {
    borderTop: '1px solid #EEE',
    paddingTop: '12px',
    marginTop: '12px',
  } as React.CSSProperties,

  warningBadge: {
    display: 'inline-block',
    backgroundColor: '#FFF3E0',
    color: '#E65100',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.85em',
    marginRight: '8px',
    marginTop: '6px',
  } as React.CSSProperties,

  stylesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  } as React.CSSProperties,

  styleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,

  styleName: {
    fontWeight: '600',
    textTransform: 'capitalize' as const,
    fontSize: '0.95em',
  } as React.CSSProperties,

  styleActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9em',
  } as React.CSSProperties,

  confidence: {
    color: '#666',
    fontSize: '0.85em',
  } as React.CSSProperties,

  trajectoryInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  } as React.CSSProperties,

  trajectorBadge: {
    padding: '12px',
    borderRadius: '6px',
    color: 'white',
    fontWeight: '600',
    textAlign: 'center' as const,
    textTransform: 'capitalize' as const,
    fontSize: '1.05em',
  } as React.CSSProperties,

  coherenceInfo: {
    textAlign: 'center' as const,
  } as React.CSSProperties,

  coherenceBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '4px',
    border: '2px solid',
    textTransform: 'capitalize' as const,
    fontWeight: '600',
    fontSize: '0.95em',
    marginTop: '6px',
  } as React.CSSProperties,

  historyTable: {
    backgroundColor: 'white',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    overflow: 'hidden',
  } as React.CSSProperties,

  historyHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 100px 100px 150px 120px',
    gap: '15px',
    backgroundColor: '#F5F5F5',
    padding: '15px',
    fontWeight: '600',
    fontSize: '0.95em',
    borderBottom: '2px solid #E0E0E0',
  } as React.CSSProperties,

  historyRow: {
    display: 'grid',
    gridTemplateColumns: '100px 100px 100px 150px 120px',
    gap: '15px',
    padding: '15px',
    borderBottom: '1px solid #EEE',
    alignItems: 'center',
    fontSize: '0.9em',
  } as React.CSSProperties,

  historyCol: {
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  effectivenessScore: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '600',
  } as React.CSSProperties,

  trendChart: {
    backgroundColor: 'white',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '20px',
  } as React.CSSProperties,

  trendHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  } as React.CSSProperties,

  trendValue: {
    fontWeight: '600',
    color: '#FF9800',
    fontSize: '1.1em',
  } as React.CSSProperties,

  miniChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    height: '60px',
    justifyContent: 'space-around',
    marginBottom: '10px',
  } as React.CSSProperties,

  trendBar: {
    flex: 1,
    minHeight: '8px',
    borderRadius: '2px',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,

  trendScale: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8em',
    color: '#999',
    paddingTop: '8px',
    borderTop: '1px solid #EEE',
  } as React.CSSProperties,

  insightsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  insight: {
    display: 'flex',
    gap: '12px',
    padding: '12px 15px',
    backgroundColor: 'white',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    alignItems: 'flex-start',
    fontSize: '0.95em',
  } as React.CSSProperties,

  insightIcon: {
    fontSize: '1.2em',
    minWidth: '24px',
  } as React.CSSProperties,

  footer: {
    textAlign: 'center' as const,
    paddingTop: '30px',
    borderTop: '2px solid #E0E0E0',
    color: '#666',
    fontSize: '0.9em',
  } as React.CSSProperties,
};

export default BalancerModeDashboard;
