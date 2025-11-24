/**
 * Sparkline Component
 *
 * Lightweight line chart for showing metric trends in compact spaces.
 */

import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: string;
  fillColor?: string;
  showDots?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  strokeWidth = 2,
  color = '#4a90e2',
  fillColor = 'rgba(74, 144, 226, 0.1)',
  showDots = false,
  className = '',
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="10" fill="#666">
          No data
        </text>
      </svg>
    );
  }

  if (data.length === 1) {
    // Single data point - show as horizontal line
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero

  // Calculate points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  // Create SVG path
  const pathData = points.map((p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`;
  }).join(' ');

  // Create filled area path
  const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className={className}>
      {/* Filled area */}
      <path d={areaData} fill={fillColor} />

      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Optional dots at data points */}
      {showDots && points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={strokeWidth}
          fill={color}
        />
      ))}
    </svg>
  );
}

interface TrendIndicatorProps {
  value: number;
  className?: string;
}

export function TrendIndicator({ value, className = '' }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 1;

  const color = isNeutral ? '#888' : isPositive ? '#4caf50' : '#f44336';
  const arrow = isNeutral ? '→' : isPositive ? '↑' : '↓';

  return (
    <span className={className} style={{ color, fontWeight: 600, fontSize: '0.875rem' }}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
