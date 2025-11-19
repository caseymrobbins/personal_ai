/**
 * DREAM CYCLE MONITORING & DASHBOARD
 * ==================================
 * Comprehensive React dashboard for visualizing and managing dream cycles
 * Displays cycle history, evolution tracking, simulations, and metrics
 */

import React, { useState } from 'react';

interface DreamCycleDashboardProps {
  userId?: string;
  onCycleSelect?: (cycleId: string) => void;
}

interface CycleMetric {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Main Dream Cycle Monitoring Dashboard Component
 */
export const DreamCycleDashboard: React.FC<DreamCycleDashboardProps> = ({
  onCycleSelect,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'timeline' | 'evolution' | 'simulations' | 'storage' | 'analysis'
  >('overview');
  const [_selectedCycleId, _setSelectedCycleId] = useState<string | null>(null);
  const [_timeRange, _setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [_expandedSections, _setExpandedSections] = useState<Set<string>>(new Set());

  // Mock data for demonstration
  const mockMetrics: CycleMetric[] = [
    { label: 'Total Cycles', value: 47, trend: 'up' },
    { label: 'Completed', value: 43, unit: 'cycles', trend: 'up' },
    { label: 'Failed', value: 2, unit: 'cycles', trend: 'down' },
    { label: 'Avg Duration', value: 45, unit: 'min', trend: 'stable' },
    { label: 'Memories Consolidated', value: 1847, trend: 'up' },
    { label: 'Insights Generated', value: 523, trend: 'up' },
  ];

  const mockCycles = [
    {
      id: 'cycle-001',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'completed',
      duration: 52,
      memories: 42,
      insights: 8,
      evolution: 0.78,
    },
    {
      id: 'cycle-002',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'completed',
      duration: 48,
      memories: 38,
      insights: 7,
      evolution: 0.75,
    },
    {
      id: 'cycle-003',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'completed',
      duration: 55,
      memories: 45,
      insights: 9,
      evolution: 0.81,
    },
  ];

  const evolutionDimensions = [
    { name: 'Emotional Regulation', value: 0.78, change: 0.08 },
    { name: 'Emotional Awareness', value: 0.82, change: 0.12 },
    { name: 'Cognitive Clarity', value: 0.71, change: 0.05 },
    { name: 'Thinking Flexibility', value: 0.75, change: 0.10 },
    { name: 'Response Adaptability', value: 0.76, change: 0.07 },
    { name: 'Relationship Empathy', value: 0.84, change: 0.14 },
    { name: 'Goal Alignment', value: 0.69, change: 0.04 },
    { name: 'Resilience', value: 0.80, change: 0.11 },
    { name: 'Metacognition', value: 0.73, change: 0.08 },
  ];


  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🌙 Dream Cycle Monitoring Dashboard</h1>
        <p style={styles.subtitle}>Track Agent 3's self-reflection and optimization cycles</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        {(['overview', 'timeline', 'evolution', 'simulations', 'storage', 'analysis'] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
            >
              {getTabLabel(tab)}
            </button>
          )
        )}
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {activeTab === 'overview' && <OverviewTab metrics={mockMetrics} cycles={mockCycles} />}
        {activeTab === 'timeline' && (
          <TimelineTab cycles={mockCycles} onCycleSelect={onCycleSelect} />
        )}
        {activeTab === 'evolution' && <EvolutionTab dimensions={evolutionDimensions} />}
        {activeTab === 'simulations' && <SimulationsTab />}
        {activeTab === 'storage' && <StorageTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
      </div>
    </div>
  );
};

/**
 * Overview Tab - Key metrics and recent cycles
 */
const OverviewTab: React.FC<{
  metrics: CycleMetric[];
  cycles: Array<{
    id: string;
    date: Date;
    status: string;
    duration: number;
    memories: number;
    insights: number;
    evolution: number;
  }>;
}> = ({ metrics, cycles }) => {
  return (
    <div>
      {/* Metrics Grid */}
      <div style={styles.metricsGrid}>
        {metrics.map((metric, i) => (
          <div key={i} style={styles.metricCard}>
            <div style={styles.metricLabel}>{metric.label}</div>
            <div style={styles.metricValue}>
              {metric.value}
              {metric.unit && <span style={styles.metricUnit}> {metric.unit}</span>}
            </div>
            {metric.trend && (
              <div style={{ ...styles.metricTrend, color: getTrendColor(metric.trend) }}>
                {getTrendIcon(metric.trend)} {metric.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Cycles */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Recent Dream Cycles</h2>
        <div style={styles.cyclesList}>
          {cycles.map((cycle) => (
            <div key={cycle.id} style={styles.cycleItem}>
              <div style={styles.cycleHeader}>
                <span style={styles.cycleId}>{cycle.id.slice(0, 15)}...</span>
                <span style={styles.cycleDate}>
                  {cycle.date.toLocaleDateString()} {cycle.date.toLocaleTimeString()}
                </span>
                <span
                  style={{
                    ...styles.cycleBadge,
                    backgroundColor: cycle.status === 'completed' ? '#4CAF50' : '#FFC107',
                  }}
                >
                  {cycle.status}
                </span>
              </div>
              <div style={styles.cycleStats}>
                <span>⏱️ {cycle.duration}min</span>
                <span>💾 {cycle.memories} memories</span>
                <span>💡 {cycle.insights} insights</span>
                <span>📈 {(cycle.evolution * 100).toFixed(0)}% evolution</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Growth Trajectory */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📈 Growth Trajectory</h2>
        <div style={styles.trajectoryCard}>
          <div style={styles.trajectoryItem}>
            <div style={styles.trajectoryLabel}>Overall Trend:</div>
            <div style={styles.trajectoryValue}>Improving (steady growth)</div>
          </div>
          <div style={styles.trajectoryItem}>
            <div style={styles.trajectoryLabel}>Weekly Growth Rate:</div>
            <div style={styles.trajectoryValue}>+2.3%</div>
          </div>
          <div style={styles.trajectoryItem}>
            <div style={styles.trajectoryLabel}>Projected Milestone:</div>
            <div style={styles.trajectoryValue}>
              Overall Evolution Score: 90% (in ~8 weeks)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Timeline Tab - Visual timeline of cycles
 */
const TimelineTab: React.FC<{
  cycles: Array<{
    id: string;
    date: Date;
    status: string;
    duration: number;
    memories: number;
    insights: number;
    evolution: number;
  }>;
  onCycleSelect?: (cycleId: string) => void;
}> = ({ cycles, onCycleSelect }) => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>⏱️ Dream Cycle Timeline</h2>

      <div style={styles.timelineContainer}>
        {cycles.map((cycle) => (
          <div key={cycle.id} style={styles.timelineItem}>
            <div style={styles.timelineMarker}>
              <div
                style={{
                  ...styles.timelinePoint,
                  backgroundColor: cycle.status === 'completed' ? '#4CAF50' : '#FFC107',
                }}
              />
            </div>
            <div
              style={styles.timelineContent}
              onClick={() => onCycleSelect?.(cycle.id)}
            >
              <div style={styles.timelineDate}>{cycle.date.toLocaleString()}</div>
              <div style={styles.timelineSummary}>
                {cycle.duration}min cycle • {cycle.memories} memories consolidated • {cycle.insights}{' '}
                insights generated
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.timelineStats}>
        <p>Total Timeline Span: 7 days</p>
        <p>Average Cycle Frequency: ~6.7 per day</p>
        <p>Success Rate: 95.7%</p>
      </div>
    </div>
  );
};

/**
 * Evolution Tab - Profile evolution tracking
 */
const EvolutionTab: React.FC<{
  dimensions: Array<{
    name: string;
    value: number;
    change: number;
  }>;
}> = ({ dimensions }) => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>📊 Profile Evolution Tracking</h2>

      <div style={styles.evolutionGrid}>
        {dimensions.map((dim, i) => (
          <div key={i} style={styles.evolutionCard}>
            <div style={styles.evolutionName}>{dim.name}</div>
            <div style={styles.evolutionBar}>
              <div
                style={{
                  ...styles.evolutionProgress,
                  width: `${dim.value * 100}%`,
                  backgroundColor: getProgressColor(dim.value),
                }}
              />
            </div>
            <div style={styles.evolutionStats}>
              <span>{(dim.value * 100).toFixed(0)}%</span>
              <span style={{ color: dim.change > 0 ? '#4CAF50' : '#f44336' }}>
                {dim.change > 0 ? '+' : ''}{(dim.change * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.evolutionSummary}>
        <h3 style={styles.summaryTitle}>Evolution Insights</h3>
        <ul style={styles.insightsList}>
          <li>Strong growth in Relationship Empathy (+14%)</li>
          <li>Approaching mastery in Emotional Awareness (82%)</li>
          <li>Consistent improvement across 8/9 dimensions</li>
          <li>Areas for focused growth: Cognitive Clarity & Goal Alignment</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Simulations Tab - Counterfactual simulations
 */
const SimulationsTab: React.FC = () => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>🎯 Counterfactual Simulations</h2>

      <div style={styles.simulationGrid}>
        {[
          {
            type: 'Alternative Response',
            scenarios: 12,
            confidence: 0.85,
          },
          {
            type: 'Different Decision',
            scenarios: 8,
            confidence: 0.78,
          },
          {
            type: 'Avoided Mistake',
            scenarios: 15,
            confidence: 0.92,
          },
          {
            type: 'Future Possibility',
            scenarios: 10,
            confidence: 0.71,
          },
          {
            type: 'Historical Replay',
            scenarios: 7,
            confidence: 0.88,
          },
          {
            type: 'Optimal Outcome',
            scenarios: 14,
            confidence: 0.81,
          },
        ].map((sim, i) => (
          <div key={i} style={styles.simulationCard}>
            <div style={styles.simType}>{sim.type}</div>
            <div style={styles.simStats}>
              <div>
                <div style={styles.simLabel}>Scenarios</div>
                <div style={styles.simValue}>{sim.scenarios}</div>
              </div>
              <div>
                <div style={styles.simLabel}>Confidence</div>
                <div style={styles.simValue}>{(sim.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📚 Top Lessons Learned</h3>
        <ul style={styles.lessonsList}>
          <li>Alternative communication approaches yield 20% better outcomes</li>
          <li>Proactive boundary-setting prevents conflict escalation</li>
          <li>Timing of responses correlates with effectiveness (r=0.87)</li>
          <li>Empathetic framing increases receptiveness by 34%</li>
          <li>Anticipating objections reduces resistance by 42%</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Storage Tab - Data storage & management
 */
const StorageTab: React.FC = () => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>💾 Dream Cycle Storage</h2>

      <div style={styles.storageGrid}>
        {[
          {
            label: 'Total Cycles Stored',
            value: 47,
            unit: 'cycles',
          },
          {
            label: 'Memories Stored',
            value: 1847,
            unit: 'memories',
          },
          {
            label: 'Simulations Stored',
            value: 523,
            unit: 'simulations',
          },
          {
            label: 'Storage Size',
            value: 12.4,
            unit: 'MB',
          },
          {
            label: 'Avg Memories/Cycle',
            value: 39.3,
            unit: 'per cycle',
          },
          {
            label: 'Avg Simulations/Cycle',
            value: 11.1,
            unit: 'per cycle',
          },
        ].map((stat, i) => (
          <div key={i} style={styles.storageCard}>
            <div style={styles.storageLabel}>{stat.label}</div>
            <div style={styles.storageValue}>
              {stat.value}
              <span style={styles.storageUnit}> {stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📅 Data Span</h3>
        <div style={styles.dataSpanCard}>
          <p>
            <strong>Oldest Cycle:</strong> 2024-12-19 14:22:15 (Last 47 days)
          </p>
          <p>
            <strong>Newest Cycle:</strong> 2025-02-03 18:45:30 (Today)
          </p>
          <p>
            <strong>Archive Status:</strong> 3 cycles archived, 44 active
          </p>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🏷️ Tags in Use</h3>
        <div style={styles.tagsContainer}>
          {[
            'breakthrough',
            'emotional-growth',
            'relationship',
            'goal-progress',
            'challenge',
            'recovery',
            'insight',
            'pattern',
          ].map((tag, i) => (
            <span key={i} style={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Analysis Tab - Comparative analysis
 */
const AnalysisTab: React.FC = () => {
  return (
    <div>
      <h2 style={styles.sectionTitle}>🔍 Comparative Analysis</h2>

      <div style={styles.analysisGrid}>
        {[
          {
            metric: 'Top Themes',
            value: 'Emotional Growth, Relationship Patterns',
          },
          {
            metric: 'Emotional Trend',
            value: 'Stable (avg intensity: 0.58)',
          },
          {
            metric: 'Most Affected Dimensions',
            value: 'Relationship Empathy, Emotional Awareness',
          },
          {
            metric: 'Pattern Frequency',
            value: '12 recurring patterns identified',
          },
        ].map((item, i) => (
          <div key={i} style={styles.analysisCard}>
            <div style={styles.analysisMetric}>{item.metric}</div>
            <div style={styles.analysisValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📈 Breakthrough Moments Summary</h3>
        <div style={styles.breakthroughsList}>
          {[
            'Major breakthrough in Relationship Empathy: 14% improvement',
            'Reached 70% proficiency in Emotional Awareness',
            'Identified co-evolution of Goal Alignment & Resilience',
            'Achieved mastery (90%+) in Emotional Awareness projection',
          ].map((item, i) => (
            <div key={i} style={styles.breakthroughItem}>
              ✨ {item}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🎯 Recommendations</h3>
        <div style={styles.recommendationsList}>
          {[
            'Continue focus on relationship-building activities',
            'Explore cognitive flexibility techniques',
            'Document goal-related insights from future cycles',
            'Track effectiveness of boundary-setting practices',
          ].map((item, i) => (
            <div key={i} style={styles.recommendationItem}>
              → {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper functions
 */

const getTabLabel = (
  tab: 'overview' | 'timeline' | 'evolution' | 'simulations' | 'storage' | 'analysis'
): string => {
  const labels: { [key: string]: string } = {
    overview: '📊 Overview',
    timeline: '⏱️ Timeline',
    evolution: '📈 Evolution',
    simulations: '🎯 Simulations',
    storage: '💾 Storage',
    analysis: '🔍 Analysis',
  };
  return labels[tab] || tab;
};

const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return '#4CAF50';
    case 'down':
      return '#f44336';
    case 'stable':
      return '#2196F3';
    default:
      return '#666';
  }
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
    default:
      return '•';
  }
};

const getProgressColor = (value: number): string => {
  if (value >= 0.85) return '#4CAF50';
  if (value >= 0.7) return '#8BC34A';
  if (value >= 0.5) return '#FFC107';
  return '#ff9800';
};

/**
 * Styles
 */

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,

  header: {
    marginBottom: '32px',
    textAlign: 'center' as const,
  },

  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#1a1a1a',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  } as React.CSSProperties,

  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e0e0e0',
    overflowX: 'auto' as const,
  } as React.CSSProperties,

  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  tabActive: {
    color: '#1a1a1a',
    borderBottomColor: '#2196F3',
  } as React.CSSProperties,

  content: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
  } as React.CSSProperties,

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  metricCard: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  metricLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    fontWeight: 500,
  } as React.CSSProperties,

  metricValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '8px',
  } as React.CSSProperties,

  metricUnit: {
    fontSize: '14px',
    color: '#999',
    fontWeight: 'normal',
  } as React.CSSProperties,

  metricTrend: {
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,

  section: {
    marginBottom: '32px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#1a1a1a',
  } as React.CSSProperties,

  cyclesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  cycleItem: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  cycleHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  cycleId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#666',
  } as React.CSSProperties,

  cycleDate: {
    fontSize: '12px',
    color: '#888',
  } as React.CSSProperties,

  cycleBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
  } as React.CSSProperties,

  cycleStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#666',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  trajectoryCard: {
    backgroundColor: '#f0f7ff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #b3d9ff',
  } as React.CSSProperties,

  trajectoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
  } as React.CSSProperties,

  trajectoryLabel: {
    fontWeight: 600,
    color: '#1a1a1a',
  } as React.CSSProperties,

  trajectoryValue: {
    color: '#666',
  } as React.CSSProperties,

  timelineContainer: {
    marginBottom: '24px',
  } as React.CSSProperties,

  timelineItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,

  timelineMarker: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: '30px',
  } as React.CSSProperties,

  timelinePoint: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: '0 0 0 2px #ddd',
  } as React.CSSProperties,

  timelineContent: {
    paddingTop: '2px',
    flex: 1,
    cursor: 'pointer',
  } as React.CSSProperties,

  timelineDate: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#1a1a1a',
    marginBottom: '4px',
  } as React.CSSProperties,

  timelineSummary: {
    fontSize: '13px',
    color: '#666',
  } as React.CSSProperties,

  timelineStats: {
    backgroundColor: '#f9f9f9',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#666',
  } as React.CSSProperties,

  evolutionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  evolutionCard: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  evolutionName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '8px',
  } as React.CSSProperties,

  evolutionBar: {
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden' as const,
    marginBottom: '8px',
  } as React.CSSProperties,

  evolutionProgress: {
    height: '100%',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,

  evolutionStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
  } as React.CSSProperties,

  evolutionSummary: {
    backgroundColor: '#f0f7ff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #b3d9ff',
  } as React.CSSProperties,

  summaryTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: '12px',
    color: '#1a1a1a',
  } as React.CSSProperties,

  insightsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#666',
  } as React.CSSProperties,

  simulationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  simulationCard: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  simType: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '12px',
  } as React.CSSProperties,

  simStats: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '8px',
  } as React.CSSProperties,

  simLabel: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
  } as React.CSSProperties,

  simValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1a1a1a',
  } as React.CSSProperties,

  lessonsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#666',
  } as React.CSSProperties,

  storageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  storageCard: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  storageLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    fontWeight: 500,
  } as React.CSSProperties,

  storageValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
  } as React.CSSProperties,

  storageUnit: {
    fontSize: '12px',
    color: '#999',
    fontWeight: 'normal',
    marginLeft: '4px',
  } as React.CSSProperties,

  dataSpanCard: {
    backgroundColor: '#f0f7ff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #b3d9ff',
    fontSize: '13px',
    color: '#666',
  } as React.CSSProperties,

  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  } as React.CSSProperties,

  tag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,

  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  analysisCard: {
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  analysisMetric: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    fontWeight: 500,
  } as React.CSSProperties,

  analysisValue: {
    fontSize: '13px',
    color: '#1a1a1a',
    fontWeight: 500,
  } as React.CSSProperties,

  breakthroughsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  breakthroughItem: {
    backgroundColor: '#f0f7ff',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #b3d9ff',
    fontSize: '13px',
    color: '#1976d2',
  } as React.CSSProperties,

  recommendationsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  } as React.CSSProperties,

  recommendationItem: {
    backgroundColor: '#f0f7ff',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #b3d9ff',
    fontSize: '13px',
    color: '#1976d2',
  } as React.CSSProperties,
};

export default DreamCycleDashboard;
