/**
 * Goal Tree Visualization Component
 *
 * Displays hierarchical goals in a tree/forest structure with:
 * - Visual progress indicators
 * - Status colors
 * - Interactive expansion/collapse
 * - Drag-and-drop goal organization
 * - Context menu for goal actions
 */

import React, { useMemo, useState } from 'react';
import { Goal, GoalStatus, GoalPriority } from '../services/goal-management.service';

interface GoalNodeProps {
  goal: Goal;
  allGoals: Map<string, Goal>;
  onGoalClick?: (goalId: string) => void;
  onGoalContextMenu?: (goalId: string, event: React.MouseEvent) => void;
  level?: number;
}

interface GoalTreeProps {
  goals: Goal[];
  onGoalSelect?: (goalId: string) => void;
  onGoalUpdate?: (goalId: string, updates: Partial<Goal>) => void;
  expandedGoals?: Set<string>;
  onExpandToggle?: (goalId: string) => void;
}

/**
 * Get color for goal status
 */
const getStatusColor = (status: GoalStatus): string => {
  switch (status) {
    case 'active':
      return '#3b82f6'; // blue
    case 'completed':
      return '#10b981'; // green
    case 'paused':
      return '#f59e0b'; // amber
    case 'abandoned':
      return '#ef4444'; // red
    case 'stalled':
      return '#8b5cf6'; // purple
    case 'blocked':
      return '#6366f1'; // indigo
    default:
      return '#6b7280'; // gray
  }
};

/**
 * Get icon for goal status
 */
const getStatusIcon = (status: GoalStatus): string => {
  switch (status) {
    case 'active':
      return '▶️';
    case 'completed':
      return '✅';
    case 'paused':
      return '⏸️';
    case 'abandoned':
      return '❌';
    case 'stalled':
      return '⚠️';
    case 'blocked':
      return '🚫';
    default:
      return '❓';
  }
};

/**
 * Get priority indicator
 */
const getPriorityIndicator = (priority: GoalPriority): string => {
  switch (priority) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
};

/**
 * Goal Tree Node Component
 */
const GoalNode: React.FC<GoalNodeProps> = ({
  goal,
  allGoals,
  onGoalClick,
  onGoalContextMenu,
  level = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const subGoals = goal.subGoals
    .map((id) => allGoals.get(id))
    .filter((g) => g !== undefined) as Goal[];

  const progressPercentage = Math.round(goal.progress * 100);
  const isDeadlineApproaching = goal.targetCompletion
    ? goal.targetCompletion - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div
      style={{
        marginLeft: level > 0 ? '24px' : '0',
        paddingTop: '8px',
      }}
    >
      {/* Goal Node */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${getStatusColor(goal.status)}`,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          opacity: goal.status === 'abandoned' ? 0.6 : 1,
        }}
        onClick={() => onGoalClick?.(goal.id)}
        onContextMenu={(e) => onGoalContextMenu?.(goal.id, e)}
        title={goal.description}
      >
        {/* Expand/Collapse Toggle */}
        {subGoals.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              marginRight: '8px',
              fontSize: '14px',
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}

        {/* Status Icon */}
        <span style={{ marginRight: '8px', fontSize: '16px' }}>
          {getStatusIcon(goal.status)}
        </span>

        {/* Priority Indicator */}
        <span
          style={{
            marginRight: '8px',
            fontSize: '14px',
          }}
        >
          {getPriorityIndicator(goal.priority)}
        </span>

        {/* Goal Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 500,
              fontSize: '14px',
              color: '#1f2937',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {goal.title}
          </div>

          {/* Source Badge */}
          <div
            style={{
              fontSize: '11px',
              color: '#6b7280',
              marginTop: '2px',
            }}
          >
            {goal.source === 'user'
              ? '👤 User'
              : goal.source === 'agent'
                ? '🤖 Agent'
                : goal.source === 'derived'
                  ? '🔍 Derived'
                  : '🧠 Inferred'}
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            marginRight: '12px',
            minWidth: '80px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '6px',
                backgroundColor: '#e5e7eb',
                borderRadius: '3px',
                overflow: 'hidden',
                minWidth: '40px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercentage}%`,
                  backgroundColor: getStatusColor(goal.status),
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: '#6b7280',
                minWidth: '28px',
                textAlign: 'right',
              }}
            >
              {progressPercentage}%
            </span>
          </div>
        </div>

        {/* Deadline Warning */}
        {isDeadlineApproaching && goal.status !== 'completed' && (
          <span
            style={{
              marginRight: '8px',
              fontSize: '14px',
              title: 'Deadline approaching',
            }}
          >
            ⏰
          </span>
        )}

        {/* Autonomy Level Indicator */}
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            marginRight: '8px',
            minWidth: '40px',
          }}
          title={`Autonomy: ${Math.round(goal.autonomyLevel * 100)}%`}
        >
          🤖 {Math.round(goal.autonomyLevel * 100)}%
        </div>
      </div>

      {/* Sub-goals */}
      {isExpanded && subGoals.length > 0 && (
        <div
          style={{
            borderLeft: `2px solid ${getStatusColor(goal.status)}`,
            marginLeft: `${level === 0 ? 12 : 12 + level * 24}px`,
            paddingLeft: '0',
            opacity: 0.8,
          }}
        >
          {subGoals.map((subGoal) => (
            <GoalNode
              key={subGoal.id}
              goal={subGoal}
              allGoals={allGoals}
              onGoalClick={onGoalClick}
              onGoalContextMenu={onGoalContextMenu}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Goal Tree Component
 */
export const GoalTree: React.FC<GoalTreeProps> = ({
  goals,
  onGoalSelect,
  onGoalUpdate,
  expandedGoals,
  onExpandToggle,
}) => {
  // Build map for quick lookup
  const goalMap = useMemo(() => {
    const map = new Map<string, Goal>();
    goals.forEach((goal) => map.set(goal.id, goal));
    return map;
  }, [goals]);

  // Get root goals (no parent)
  const rootGoals = useMemo(
    () => goals.filter((g) => !g.parentGoalId),
    [goals]
  );

  // Group by status for alternative view
  const goalsByStatus = useMemo(() => {
    const grouped: Record<GoalStatus, Goal[]> = {
      active: [],
      paused: [],
      completed: [],
      abandoned: [],
      stalled: [],
      blocked: [],
    };

    goals.forEach((goal) => {
      grouped[goal.status].push(goal);
    });

    return grouped;
  }, [goals]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalGoals = goals.length;
    const activeGoals = goalsByStatus.active.length;
    const completedGoals = goalsByStatus.completed.length;
    const totalProgress =
      totalGoals > 0
        ? (goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals) * 100
        : 0;

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      totalProgress,
    };
  }, [goals, goalsByStatus]);

  if (goals.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
        <div>No goals yet. Create one to get started!</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Statistics Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Goals</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {stats.totalGoals}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Active</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.activeGoals}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Completed</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {stats.completedGoals}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Overall Progress</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {stats.totalProgress.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {rootGoals.length > 0 ? (
          rootGoals.map((goal) => (
            <GoalNode
              key={goal.id}
              goal={goal}
              allGoals={goalMap}
              onGoalClick={onGoalSelect}
              onGoalContextMenu={(goalId, event) => {
                event.preventDefault();
                // Context menu would be handled by parent
              }}
              level={0}
            />
          ))
        ) : (
          <div style={{ color: '#6b7280', fontSize: '14px' }}>
            No root-level goals. All goals have parents.
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#6b7280',
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '8px' }}>Legend:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <span style={{ marginRight: '8px' }}>▶️</span>
            <span>Active</span>
          </div>
          <div>
            <span style={{ marginRight: '8px' }}>✅</span>
            <span>Completed</span>
          </div>
          <div>
            <span style={{ marginRight: '8px' }}>⏸️</span>
            <span>Paused</span>
          </div>
          <div>
            <span style={{ marginRight: '8px' }}>⚠️</span>
            <span>Stalled</span>
          </div>
          <div>
            <span style={{ marginRight: '8px' }}>❌</span>
            <span>Abandoned</span>
          </div>
          <div>
            <span style={{ marginRight: '8px' }}>🚫</span>
            <span>Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalTree;
