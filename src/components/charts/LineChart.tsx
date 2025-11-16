/**
 * LineChart Component (Sprint 13)
 *
 * Lightweight SVG-based line chart for visualizing time series data
 * No external dependencies - pure React + SVG
 */

import { useMemo } from 'react';
import type { TimeSeriesPoint } from '../../services/analytics.service';

export interface LineChartProps {
  data: TimeSeriesPoint[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
  showPoints?: boolean;
  yAxisLabel?: string;
  formatValue?: (value: number) => string;
}

export function LineChart({
  data,
  width = 600,
  height = 200,
  color = '#667eea',
  label,
  showPoints = false,
  yAxisLabel,
  formatValue = (v) => v.toFixed(2),
}: LineChartProps) {
  const { path, points, yMin, yMax } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', points: [], yMin: 0, yMax: 1 };
    }

    // Calculate bounds
    const values = data.map(d => d.value);
    const timestamps = data.map(d => d.timestamp);
    const yMin = Math.min(...values);
    const yMax = Math.max(...values);
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);

    // Add padding to y-axis
    const yRange = yMax - yMin || 1;
    const yPadding = yRange * 0.1;
    const yMinPadded = yMin - yPadding;
    const yMaxPadded = yMax + yPadding;

    // Chart area (leaving room for axes)
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale functions
    const scaleX = (timestamp: number) => {
      const ratio = xMax === xMin ? 0 : (timestamp - xMin) / (xMax - xMin);
      return padding.left + ratio * chartWidth;
    };

    const scaleY = (value: number) => {
      const ratio = yMaxPadded === yMinPadded ? 0 : (value - yMinPadded) / (yMaxPadded - yMinPadded);
      return padding.top + chartHeight - ratio * chartHeight;
    };

    // Generate path
    const pathCommands = data.map((point, i) => {
      const x = scaleX(point.timestamp);
      const y = scaleY(point.value);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    });

    const path = pathCommands.join(' ');

    // Generate point coordinates
    const points = data.map(point => ({
      x: scaleX(point.timestamp),
      y: scaleY(point.value),
      value: point.value,
      timestamp: point.timestamp,
    }));

    return { path, points, yMin: yMinPadded, yMax: yMaxPadded };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        No data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  // Y-axis ticks
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  // X-axis ticks (5 evenly spaced timestamps)
  const xTickCount = Math.min(5, data.length);
  const xTickIndices = Array.from({ length: xTickCount }, (_, i) =>
    Math.floor((i * (data.length - 1)) / (xTickCount - 1))
  );

  return (
    <div style={{ width, position: 'relative' }}>
      {label && (
        <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
          {label}
        </div>
      )}
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * (yMax - tick)) / (yMax - yMin);
          return (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
        />

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
        />

        {/* Y-axis label */}
        {yAxisLabel && (
          <text
            x={10}
            y={height / 2}
            fill="rgba(255, 255, 255, 0.6)"
            fontSize="12"
            textAnchor="middle"
            transform={`rotate(-90, 10, ${height / 2})`}
          >
            {yAxisLabel}
          </text>
        )}

        {/* Y-axis ticks */}
        {yTicks.map((tick, i) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * (yMax - tick)) / (yMax - yMin);
          return (
            <text
              key={`ytick-${i}`}
              x={padding.left - 10}
              y={y}
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="11"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatValue(tick)}
            </text>
          );
        })}

        {/* X-axis ticks */}
        {xTickIndices.map((idx) => {
          const point = points[idx];
          const date = new Date(point.timestamp);
          const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

          return (
            <text
              key={`xtick-${idx}`}
              x={point.x}
              y={height - padding.bottom + 20}
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="11"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}

        {/* Line path */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {showPoints && points.map((point, i) => (
          <circle
            key={`point-${i}`}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={color}
          />
        ))}

        {/* Gradient fill under line */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`}
          fill={`url(#gradient-${color})`}
        />
      </svg>
    </div>
  );
}
