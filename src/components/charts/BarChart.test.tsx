/**
 * BarChart Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChart } from './BarChart';

describe('BarChart', () => {
  const mockData = [
    { label: 'Jan', value: 100 },
    { label: 'Feb', value: 150 },
    { label: 'Mar', value: 200 },
    { label: 'Apr', value: 120 },
  ];

  describe('Rendering', () => {
    it('should render chart with data', () => {
      const { container } = render(<BarChart data={mockData} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<BarChart data={mockData} title="Monthly Statistics" />);

      expect(screen.getByText('Monthly Statistics')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      const { container } = render(<BarChart data={mockData} />);

      const titleElement = container.querySelector('[style*="textAlign"]');
      expect(titleElement).not.toBeInTheDocument();
    });

    it('should render SVG with correct default dimensions', () => {
      const { container } = render(<BarChart data={mockData} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '400');
      expect(svg).toHaveAttribute('height', '200');
    });

    it('should render SVG with custom dimensions', () => {
      const { container } = render(<BarChart data={mockData} width={600} height={300} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '600');
      expect(svg).toHaveAttribute('height', '300');
    });
  });

  describe('Empty State', () => {
    it('should render empty state when data is empty', () => {
      render(<BarChart data={[]} />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should not render SVG when data is empty', () => {
      const { container } = render(<BarChart data={[]} />);

      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('should render empty state with correct default dimensions', () => {
      const { container } = render(<BarChart data={[]} />);

      const emptyState = screen.getByText('No data available');
      const parent = emptyState.parentElement;
      expect(parent).toHaveStyle({ width: '400px', height: '200px' });
    });

    it('should render empty state with custom dimensions', () => {
      const { container } = render(<BarChart data={[]} width={600} height={300} />);

      const emptyState = screen.getByText('No data available');
      const parent = emptyState.parentElement;
      expect(parent).toHaveStyle({ width: '600px', height: '300px' });
    });
  });

  describe('Bars', () => {
    it('should render correct number of bars', () => {
      const { container } = render(<BarChart data={mockData} />);

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(mockData.length);
    });

    it('should apply custom color to bars', () => {
      const { container } = render(<BarChart data={mockData} color="#ff0000" />);

      const rects = container.querySelectorAll('rect');
      rects.forEach(rect => {
        expect(rect).toHaveAttribute('fill', '#ff0000');
      });
    });

    it('should apply default color when not specified', () => {
      const { container } = render(<BarChart data={mockData} />);

      const rects = container.querySelectorAll('rect');
      rects.forEach(rect => {
        expect(rect).toHaveAttribute('fill', '#667eea');
      });
    });

    it('should apply opacity to bars', () => {
      const { container } = render(<BarChart data={mockData} />);

      const rects = container.querySelectorAll('rect');
      rects.forEach(rect => {
        expect(rect).toHaveAttribute('opacity', '0.8');
      });
    });

    it('should apply rounded corners to bars', () => {
      const { container } = render(<BarChart data={mockData} />);

      const rects = container.querySelectorAll('rect');
      rects.forEach(rect => {
        expect(rect).toHaveAttribute('rx', '2');
      });
    });
  });

  describe('Axes and Grid', () => {
    it('should render X-axis', () => {
      const { container } = render(<BarChart data={mockData} />);

      const lines = container.querySelectorAll('line');
      // Should have X-axis, Y-axis, and grid lines
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should render Y-axis', () => {
      const { container } = render(<BarChart data={mockData} />);

      const lines = container.querySelectorAll('line');
      // Should have both axes
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('should render grid lines', () => {
      const { container } = render(<BarChart data={mockData} />);

      const gridLines = container.querySelectorAll('line[stroke-dasharray="2,2"]');
      // Should have 3 grid lines (0, max/2, max)
      expect(gridLines.length).toBe(3);
    });

    it('should render Y-axis ticks', () => {
      const { container } = render(<BarChart data={mockData} />);

      const ticks = container.querySelectorAll('text[text-anchor="end"]');
      // Should have 3 Y-axis ticks (0, max/2, max)
      expect(ticks.length).toBe(3);
    });
  });

  describe('Labels', () => {
    it('should render X-axis labels for all data points', () => {
      const { container } = render(<BarChart data={mockData} />);

      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Feb')).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
      expect(screen.getByText('Apr')).toBeInTheDocument();
    });

    it('should render Y-axis tick labels', () => {
      const { container } = render(<BarChart data={mockData} />);

      // Max value is 200, so ticks should be 0, 100, 200
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    it('should render value labels on tall bars', () => {
      const tallData = [
        { label: 'A', value: 100 },
        { label: 'B', value: 200 },
      ];

      const { container } = render(<BarChart data={tallData} height={200} />);

      // Value labels should appear on bars with height > 20
      const valueLabels = container.querySelectorAll('text[text-anchor="middle"][font-weight="600"]');
      expect(valueLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Formatters', () => {
    it('should use custom formatValue for Y-axis ticks', () => {
      const formatValue = (v: number) => `$${v}`;
      render(<BarChart data={mockData} formatValue={formatValue} />);

      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('$100')).toBeInTheDocument();
      expect(screen.getByText('$200')).toBeInTheDocument();
    });

    it('should use custom formatValue for value labels', () => {
      const tallData = [
        { label: 'A', value: 100 },
        { label: 'B', value: 200 },
      ];
      const formatValue = (v: number) => `${v}k`;

      render(<BarChart data={tallData} formatValue={formatValue} height={200} />);

      // Should format tick labels
      expect(screen.getByText('0k')).toBeInTheDocument();
      expect(screen.getByText('100k')).toBeInTheDocument();
      expect(screen.getByText('200k')).toBeInTheDocument();
    });

    it('should use default formatter when not provided', () => {
      render(<BarChart data={mockData} />);

      // Default formatter uses toString()
      expect(screen.getByText('200')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const singleData = [{ label: 'Only', value: 100 }];
      const { container } = render(<BarChart data={singleData} />);

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(1);
      expect(screen.getByText('Only')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      const zeroData = [
        { label: 'A', value: 0 },
        { label: 'B', value: 100 },
      ];
      const { container } = render(<BarChart data={zeroData} />);

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(2);
    });

    it('should handle all zero values', () => {
      const allZero = [
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
      ];
      const { container } = render(<BarChart data={allZero} />);

      // Should still render with max value of 1 (minimum)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle large values', () => {
      const largeData = [
        { label: 'A', value: 1000000 },
        { label: 'B', value: 2000000 },
      ];
      const { container } = render(<BarChart data={largeData} />);

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(2);
    });

    it('should handle decimal values', () => {
      const decimalData = [
        { label: 'A', value: 10.5 },
        { label: 'B', value: 20.7 },
      ];
      const { container } = render(<BarChart data={decimalData} />);

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(2);
    });

    it('should handle many data points', () => {
      const manyData = Array.from({ length: 20 }, (_, i) => ({
        label: `Item ${i}`,
        value: Math.random() * 100,
      }));

      const { container } = render(<BarChart data={manyData} />);

      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(20);
    });

    it('should handle long labels', () => {
      const longLabels = [
        { label: 'Very Long Label Name', value: 100 },
        { label: 'Another Long Label', value: 150 },
      ];

      render(<BarChart data={longLabels} />);

      expect(screen.getByText('Very Long Label Name')).toBeInTheDocument();
      expect(screen.getByText('Another Long Label')).toBeInTheDocument();
    });
  });

  describe('Bar Calculations', () => {
    it('should scale bars relative to max value', () => {
      const scaledData = [
        { label: 'A', value: 50 },
        { label: 'B', value: 100 },
      ];
      const { container } = render(<BarChart data={scaledData} />);

      const rects = container.querySelectorAll('rect');
      // Second bar should be twice as tall as first
      const firstHeight = parseFloat(rects[0].getAttribute('height') || '0');
      const secondHeight = parseFloat(rects[1].getAttribute('height') || '0');
      expect(secondHeight).toBeCloseTo(firstHeight * 2, 0);
    });

    it('should position bars correctly', () => {
      const { container } = render(<BarChart data={mockData} />);

      const rects = container.querySelectorAll('rect');
      const firstX = parseFloat(rects[0].getAttribute('x') || '0');
      const secondX = parseFloat(rects[1].getAttribute('x') || '0');

      // Second bar should be positioned to the right of first
      expect(secondX).toBeGreaterThan(firstX);
    });
  });

  describe('Structure', () => {
    it('should have correct SVG structure', () => {
      const { container } = render(<BarChart data={mockData} title="Test Chart" />);

      const svg = container.querySelector('svg');
      const rects = svg?.querySelectorAll('rect');
      const lines = svg?.querySelectorAll('line');
      const texts = svg?.querySelectorAll('text');

      expect(svg).toBeInTheDocument();
      expect(rects?.length).toBeGreaterThan(0);
      expect(lines?.length).toBeGreaterThan(0);
      expect(texts?.length).toBeGreaterThan(0);
    });

    it('should wrap SVG in container div', () => {
      const { container } = render(<BarChart data={mockData} />);

      const wrapper = container.querySelector('div');
      const svg = wrapper?.querySelector('svg');

      expect(wrapper).toBeInTheDocument();
      expect(svg).toBeInTheDocument();
    });

    it('should render title above SVG when provided', () => {
      const { container } = render(<BarChart data={mockData} title="Chart Title" />);

      const wrapper = container.querySelector('div');
      const titleDiv = wrapper?.querySelector('div');
      const svg = wrapper?.querySelector('svg');

      expect(titleDiv).toBeInTheDocument();
      expect(titleDiv?.textContent).toBe('Chart Title');
      expect(svg).toBeInTheDocument();
    });
  });
});
