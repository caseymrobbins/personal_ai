/**
 * Cognitive Status Dashboard Component
 *
 * Visualizes the autonomous agent's cognitive processes in real-time:
 * - Goal progress and status
 * - Memory consolidation statistics
 * - Cognitive cycle history
 * - Extracted entities and learning
 * - Autonomous task queue
 * - Generated insights and recommendations
 * - User profile evolution
 */

import React, { useState, useEffect } from 'react';
import { cognitiveLoopService } from '../services/cognitive-loop.service';
import { workingMemoryService } from '../services/working-memory.service';
import { longTermMemoryService } from '../services/long-term-memory.service';
import { declarativeKBService } from '../services/declarative-kb.service';
import { cognitiveSchedulerService } from '../services/cognitive-scheduler.service';
import { goalManagementService } from '../services/goal-management.service';
import { userModelService } from '../services/user-model.service';
import { entityExtractorService } from '../services/entity-extractor.service';
import { goalEvaluationTriggerService } from '../services/goal-evaluation-trigger.service';

interface CognitiveMetrics {
  cognitiveLoopState: string;
  lastCycleTime: number | null;
  cyclesExecuted: number;
  workingMemoryItems: number;
  activeTasks: number;
  longTermMemories: number;
  kbEntities: number;
  extractedEntities: number;
  activeGoals: number;
  completedGoals: number;
  stalledGoals: number;
  queuedTasks: number;
  insightsGenerated: number;
}

interface TabType {
  id: 'overview' | 'goals' | 'memory' | 'entities' | 'tasks' | 'insights';
  label: string;
  icon: string;
}

const TABS: TabType[] = [
  { id: 'overview', label: 'Overview', icon: '🧠' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'memory', label: 'Memory', icon: '💾' },
  { id: 'entities', label: 'Entities', icon: '🔍' },
  { id: 'tasks', label: 'Tasks', icon: '📋' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];

const CognitiveStatusDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType['id']>('overview');
  const [metrics, setMetrics] = useState<CognitiveMetrics>({
    cognitiveLoopState: 'idle',
    lastCycleTime: null,
    cyclesExecuted: 0,
    workingMemoryItems: 0,
    activeTasks: 0,
    longTermMemories: 0,
    kbEntities: 0,
    extractedEntities: 0,
    activeGoals: 0,
    completedGoals: 0,
    stalledGoals: 0,
    queuedTasks: 0,
    insightsGenerated: 0,
  });
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Fetch metrics
  const fetchMetrics = () => {
    try {
      const loopStatus = cognitiveLoopService.getStatus();
      const wmStats = workingMemoryService.getStats();
      const ltmStats = longTermMemoryService.getStats();
      const kbStats = declarativeKBService.getStats();
      const schedulerStats = cognitiveSchedulerService.getStats();
      const goalStats = goalManagementService.getStats();
      const extractorStats = entityExtractorService.getStats();
      const evalStats = goalEvaluationTriggerService.getStats();

      setMetrics({
        cognitiveLoopState: loopStatus.state,
        lastCycleTime: loopStatus.lastCycleTime,
        cyclesExecuted: loopStatus.cycleCount,
        workingMemoryItems: wmStats.totalItems,
        activeTasks: wmStats.activeTasks,
        longTermMemories: ltmStats.totalMemories,
        kbEntities: kbStats.totalEntities,
        extractedEntities: extractorStats.totalEntitiesExtracted,
        activeGoals: goalStats.activeGoals,
        completedGoals: goalStats.completedGoals,
        stalledGoals: goalStats.stalledGoals,
        queuedTasks: schedulerStats.queuedTasks,
        insightsGenerated: evalStats.totalEvaluations,
      });
    } catch (error) {
      console.warn('[Dashboard] Error fetching metrics:', error);
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchMetrics(); // Initial fetch

    if (!isAutoRefresh) return;

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval]);

  const timeSinceLastCycle = metrics.lastCycleTime
    ? Math.round((Date.now() - metrics.lastCycleTime) / 1000)
    : null;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 'bold' }}>
              🧠 Cognitive Status Dashboard
            </h1>
            <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
              Real-time monitoring of autonomous agent cognitive processes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={fetchMetrics}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              🔄 Refresh
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={isAutoRefresh}
                onChange={(e) => setIsAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
          </div>
        </div>
      </div>

      {/* Cognitive Loop Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatusCard
          icon="🔄"
          title="Cognitive State"
          value={metrics.cognitiveLoopState}
          subtitle={`${metrics.cyclesExecuted} cycles executed`}
          color={
            metrics.cognitiveLoopState === 'idle'
              ? '#6b7280'
              : metrics.cognitiveLoopState === 'thinking'
                ? '#3b82f6'
                : '#10b981'
          }
        />
        <StatusCard
          icon="⏱️"
          title="Last Cycle"
          value={timeSinceLastCycle ? `${timeSinceLastCycle}s ago` : 'Never'}
          subtitle="Time since last wake"
          color="#f59e0b"
        />
        <StatusCard
          icon="💭"
          title="Working Memory"
          value={metrics.workingMemoryItems}
          subtitle="active items"
          color="#8b5cf6"
        />
        <StatusCard
          icon="💾"
          title="Long-Term Memory"
          value={metrics.longTermMemories}
          subtitle="memories consolidated"
          color="#10b981"
        />
        <StatusCard
          icon="📚"
          title="Knowledge Base"
          value={metrics.kbEntities}
          subtitle="entities learned"
          color="#06b6d4"
        />
        <StatusCard
          icon="🎯"
          title="Active Goals"
          value={metrics.activeGoals}
          subtitle={`${metrics.completedGoals} completed`}
          color="#ec4899"
        />
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? '#1f2937' : '#6b7280',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
        {activeTab === 'overview' && <OverviewTab metrics={metrics} />}
        {activeTab === 'goals' && <GoalsTab />}
        {activeTab === 'memory' && <MemoryTab metrics={metrics} />}
        {activeTab === 'entities' && <EntitiesTab metrics={metrics} />}
        {activeTab === 'tasks' && <TasksTab metrics={metrics} />}
        {activeTab === 'insights' && <InsightsTab />}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6b7280',
        }}
      >
        🧠 Cognitive Dashboard | Last updated: {new Date().toLocaleTimeString()} | Refresh every{' '}
        {refreshInterval / 1000}s
      </div>
    </div>
  );
};

// Status Card Component
const StatusCard: React.FC<{
  icon: string;
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
}> = ({ icon, title, value, subtitle, color }) => (
  <div
    style={{
      padding: '16px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: `1px solid ${color}33`,
      backgroundColor: `${color}08`,
    }}
  >
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color, marginBottom: '4px' }}>
      {value}
    </div>
    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{subtitle}</div>
  </div>
);

// Overview Tab
const OverviewTab: React.FC<{ metrics: CognitiveMetrics }> = ({ metrics }) => (
  <div>
    <h3 style={{ marginTop: '0', marginBottom: '16px' }}>Cognitive System Status</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          Memory Systems
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <MetricRow label="Working Memory Items" value={metrics.workingMemoryItems} color="#8b5cf6" />
          <MetricRow label="Active Working Tasks" value={metrics.activeTasks} color="#8b5cf6" />
          <MetricRow label="Long-Term Memories" value={metrics.longTermMemories} color="#10b981" />
          <MetricRow label="Knowledge Base Entities" value={metrics.kbEntities} color="#06b6d4" />
        </div>
      </div>
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          Goal & Task Status
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <MetricRow label="Active Goals" value={metrics.activeGoals} color="#ec4899" />
          <MetricRow label="Completed Goals" value={metrics.completedGoals} color="#10b981" />
          <MetricRow label="Stalled Goals" value={metrics.stalledGoals} color="#ef4444" />
          <MetricRow label="Queued Tasks" value={metrics.queuedTasks} color="#f59e0b" />
        </div>
      </div>
    </div>
    <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
      <p style={{ margin: '0', fontSize: '13px', color: '#0369a1' }}>
        ℹ️ The cognitive system runs periodic cycles every 5 minutes to consolidate memories, evaluate
        goals, and generate insights. Enable auto-refresh to monitor in real-time.
      </p>
    </div>
  </div>
);

// Goals Tab
const GoalsTab: React.FC = () => {
  const goals = goalManagementService.getGoals('active');
  const stats = goalManagementService.getStats();

  return (
    <div>
      <h3 style={{ marginTop: '0', marginBottom: '16px' }}>Active Goals</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>By Priority</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
            {stats.totalGoals}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            🔴 {stats.goalsByPriority.critical} Critical
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            🟠 {stats.goalsByPriority.high} High
          </div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#fdf2f8', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>By Source</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#be185d' }}>
            {stats.totalGoals}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            👤 {stats.goalsBySource.user} User
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            🤖 {stats.goalsBySource.agent} Agent
          </div>
        </div>
      </div>
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
          Top 5 Goals by Progress
        </h4>
        {goals.slice(0, 5).map((goal) => (
          <div
            key={goal.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{goal.title}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {Math.round(goal.progress * 100)}%
              </div>
            </div>
            <div
              style={{
                height: '6px',
                backgroundColor: '#e5e7eb',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${goal.progress * 100}%`,
                  backgroundColor: '#3b82f6',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
              {goal.source} • {goal.status} • 🤖 {Math.round(goal.autonomyLevel * 100)}% autonomy
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Memory Tab
const MemoryTab: React.FC<{ metrics: CognitiveMetrics }> = ({ metrics }) => {
  const wmStats = workingMemoryService.getStats();
  const ltmStats = longTermMemoryService.getStats();

  return (
    <div>
      <h3 style={{ marginTop: '0', marginBottom: '16px' }}>Memory System Statistics</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ padding: '16px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Working Memory (Scratchpad)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Total Tasks</span>
              <strong>{wmStats.totalTasks}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Active Tasks</span>
              <strong>{wmStats.activeTasks}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Total Items</span>
              <strong>{wmStats.totalItems}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Avg Items/Task</span>
              <strong>{wmStats.avgItemsPerTask.toFixed(1)}</strong>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Long-Term Memory (Episodic)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Total Memories</span>
              <strong>{ltmStats.totalMemories}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Avg Confidence</span>
              <strong>{(ltmStats.avgConfidence * 100).toFixed(0)}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Oldest</span>
              <strong>
                {ltmStats.oldestMemory
                  ? `${Math.round((Date.now() - ltmStats.oldestMemory) / (1000 * 60 * 60))}h ago`
                  : 'N/A'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Cache Size</span>
              <strong>{ltmStats.cacheSize}</strong>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fcd34d' }}>
        <p style={{ margin: '0', fontSize: '13px', color: '#78350f' }}>
          💡 Working memory items decay after 15 minutes of inactivity. Important items are
          consolidated to long-term memory during cognitive cycles.
        </p>
      </div>
    </div>
  );
};

// Entities Tab
const EntitiesTab: React.FC<{ metrics: CognitiveMetrics }> = ({ metrics }) => {
  const topEntities = entityExtractorService.getTopEntities(5);
  const stats = entityExtractorService.getStats();

  return (
    <div>
      <h3 style={{ marginTop: '0', marginBottom: '16px' }}>Extracted Entities & Learning</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {Object.entries(stats.entitiesByType).map(([type, count]) => (
          <div
            key={type}
            style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>
              {type}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {count}
            </div>
          </div>
        ))}
      </div>
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
          Top Extracted Entities
        </h4>
        {topEntities.map((entity, index) => (
          <div
            key={entity.name}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {index + 1}. {entity.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>
                {entity.type}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
              <span>Frequency: {entity.frequency}x</span>
              <span>Confidence: {(entity.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tasks Tab
const TasksTab: React.FC<{ metrics: CognitiveMetrics }> = ({ metrics }) => {
  const queuedTasks = cognitiveSchedulerService.getTasks('queued');
  const runningTasks = cognitiveSchedulerService.getTasks('running');
  const stats = cognitiveSchedulerService.getStats();

  return (
    <div>
      <h3 style={{ marginTop: '0', marginBottom: '16px' }}>Autonomous Task Queue</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <StatBox
          label="Queued Tasks"
          value={stats.queuedTasks}
          color="#f59e0b"
        />
        <StatBox
          label="Running Tasks"
          value={stats.runningTasks}
          color="#3b82f6"
        />
        <StatBox
          label="Completed"
          value={stats.completedTasks}
          color="#10b981"
        />
        <StatBox
          label="Failed"
          value={stats.failedTasks}
          color="#ef4444"
        />
        <StatBox
          label="Success Rate"
          value={`${stats.successRate.toFixed(0)}%`}
          color="#8b5cf6"
        />
        <StatBox
          label="Avg Duration"
          value={`${stats.averageTaskDuration.toFixed(0)}ms`}
          color="#06b6d4"
        />
      </div>
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
          Active & Queued Tasks ({queuedTasks.length + runningTasks.length})
        </h4>
        {[...runningTasks, ...queuedTasks].slice(0, 5).map((task) => (
          <div
            key={task.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500' }}>{task.description}</div>
              <div
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  backgroundColor:
                    task.status === 'running'
                      ? '#dbeafe'
                      : task.status === 'queued'
                        ? '#fef08a'
                        : '#d1fae5',
                  color:
                    task.status === 'running'
                      ? '#0369a1'
                      : task.status === 'queued'
                        ? '#92400e'
                        : '#065f46',
                  borderRadius: '3px',
                }}
              >
                {task.status}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {task.type} • Priority: {task.priority}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Insights Tab
const InsightsTab: React.FC = () => {
  const evalStats = goalEvaluationTriggerService.getStats();
  const lastEval = goalEvaluationTriggerService.getLastEvaluation();

  return (
    <div>
      <h3 style={{ marginTop: '0', marginBottom: '16px' }}>Generated Insights & Recommendations</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <StatBox
          label="Total Evaluations"
          value={evalStats.totalEvaluations}
          color="#8b5cf6"
        />
        <StatBox
          label="Goals Completed"
          value={evalStats.totalGoalsCompleted}
          color="#10b981"
        />
        <StatBox
          label="Goals Stalled"
          value={evalStats.totalGoalsStalled}
          color="#ef4444"
        />
        <StatBox
          label="Tasks Created"
          value={evalStats.totalTasksCreated}
          color="#f59e0b"
        />
        <StatBox
          label="Avg Updates/Cycle"
          value={evalStats.averageProgressUpdatesPerCycle.toFixed(1)}
          color="#06b6d4"
        />
      </div>
      {lastEval && (
        <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
            Latest Evaluation Results
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div>
              <div style={{ color: '#6b7280' }}>Goals Evaluated</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0369a1' }}>
                {lastEval.goalsEvaluated}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>Progress Updates</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                {lastEval.progressUpdates}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>Tasks Created</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                {lastEval.newTasksCreated}
              </div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>Goals Stalled</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                {lastEval.goalsStalled}
              </div>
            </div>
          </div>
          {lastEval.recommendations.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
                Recommendations:
              </div>
              {lastEval.recommendations.slice(0, 3).map((rec, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#0c4a6e', marginBottom: '4px' }}>
                  • {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Metric Row Component
const MetricRow: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
    <span style={{ color: '#6b7280' }}>{label}</span>
    <strong style={{ color }}>{value}</strong>
  </div>
);

// Stat Box Component
const StatBox: React.FC<{ label: string; value: string | number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>
      {value}
    </div>
  </div>
);

export default CognitiveStatusDashboard;
