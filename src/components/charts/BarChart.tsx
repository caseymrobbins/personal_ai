/**
 * BarChart Component (Sprint 13)
 *
 * Lightweight SVG-based bar chart for visualizing distributions
 * No external dependencies - pure React + SVG
 */

import { useMemo } from 'react';

export interface BarChartProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  title?: string;
  formatValue?: (value: number) => string;
}

export function BarChart({
  data,
  width = 400,
  height = 200,
  color = '#667eea',
  title,
  formatValue = (v) => v.toString(),
}: BarChartProps) {
  const { bars, maxValue } = useMemo(() => {
    if (data.length === 0) {
      return { bars: [], maxValue: 1 };
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);

    // Chart area
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const barWidth = chartWidth / data.length;
    const barSpacing = barWidth * 0.2;
    const actualBarWidth = barWidth - barSpacing;

    const bars = data.map((item, i) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = padding.left + i * barWidth + barSpacing / 2;
      const y = padding.top + chartHeight - barHeight;

      return {
        x,
        y,
        width: actualBarWidth,
        height: barHeight,
        label: item.label,
        value: item.value,
      };
    });

    return { bars, maxValue };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        No data available
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 60, left: 60 };

  // Y-axis ticks
  const yTicks = [0, maxValue / 2, maxValue];

  return (
    <div style={{ width, position: 'relative' }}>
      {title && (
        <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
          {title}
        </div>
      )}
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * (maxValue - tick)) / maxValue;
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

        {/* Y-axis ticks */}
        {yTicks.map((tick, i) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * (maxValue - tick)) / maxValue;
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

        {/* Bars */}
        {bars.map((bar, i) => (
          <g key={`bar-${i}`}>
            {/* Bar */}
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={color}
              opacity={0.8}
              rx={2}
            />

            {/* Value label on top of bar */}
            {bar.height > 20 && (
              <text
                x={bar.x + bar.width / 2}
                y={bar.y - 5}
                fill="rgba(255, 255, 255, 0.8)"
                fontSize="11"
                textAnchor="middle"
                fontWeight="600"
              >
                {formatValue(bar.value)}
              </text>
            )}

            {/* X-axis label */}
            <text
              x={bar.x + bar.width / 2}
              y={height - padding.bottom + 20}
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="11"
              textAnchor="middle"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
