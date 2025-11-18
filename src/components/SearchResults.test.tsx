/**
 * SearchResults Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResults } from './SearchResults';
import type { SearchResult } from '../services/search.service';

describe('SearchResults', () => {
  const mockResults: SearchResult[] = [
    {
      messageId: 'msg-1',
      conversationId: 'conv-1',
      conversationTitle: 'Test Conversation 1',
      role: 'user',
      snippet: 'This is a test message about React',
      similarity: 0.85,
      timestamp: Date.now() - 60000, // 1 minute ago
    },
    {
      messageId: 'msg-2',
      conversationId: 'conv-2',
      conversationTitle: 'Test Conversation 2',
      role: 'assistant',
      snippet: 'This is a relevant response about testing',
      similarity: 0.65,
      timestamp: Date.now() - 3600000, // 1 hour ago
    },
    {
      messageId: 'msg-3',
      conversationId: 'conv-3',
      conversationTitle: 'Test Conversation 3',
      role: 'user',
      snippet: 'Somewhat related to the search query',
      similarity: 0.45,
      timestamp: Date.now() - 86400000, // 1 day ago
    },
  ];

  const defaultProps = {
    results: mockResults,
    query: 'test query',
    onResultClick: vi.fn(),
    onClose: vi.fn(),
  };

  describe('Rendering', () => {
    it('should render search results with query', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText(/"test query"/)).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('should render result count', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText('3 results found')).toBeInTheDocument();
    });

    it('should render singular result count', () => {
      render(<SearchResults {...defaultProps} results={[mockResults[0]]} />);

      expect(screen.getByText('1 result found')).toBeInTheDocument();
    });

    it('should render all result items', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();
      expect(screen.getByText('Test Conversation 3')).toBeInTheDocument();
    });

    it('should render result snippets', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText(/This is a test message about React/)).toBeInTheDocument();
      expect(screen.getByText(/This is a relevant response about testing/)).toBeInTheDocument();
      expect(screen.getByText(/Somewhat related to the search query/)).toBeInTheDocument();
    });

    it('should render role badges', () => {
      render(<SearchResults {...defaultProps} />);

      const roleBadges = screen.getAllByText(/user|assistant/);
      expect(roleBadges.length).toBeGreaterThan(0);
    });

    it('should render close button', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no results', () => {
      render(<SearchResults {...defaultProps} results={[]} />);

      expect(screen.getByText(/No results found for "test query"/)).toBeInTheDocument();
      expect(screen.getByText(/Try different keywords/)).toBeInTheDocument();
      expect(screen.getByText('🤷')).toBeInTheDocument();
    });

    it('should show 0 results in count', () => {
      render(<SearchResults {...defaultProps} results={[]} />);

      expect(screen.getByText('0 results found')).toBeInTheDocument();
    });

    it('should not render result list when empty', () => {
      const { container } = render(<SearchResults {...defaultProps} results={[]} />);

      const resultList = container.querySelector('.search-results-list');
      expect(resultList).not.toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should call onResultClick when clicking a result', async () => {
      const user = userEvent.setup();
      const onResultClick = vi.fn();

      render(<SearchResults {...defaultProps} onResultClick={onResultClick} />);

      const firstResult = screen.getByText('Test Conversation 1').closest('.search-result-item');
      await user.click(firstResult!);

      expect(onResultClick).toHaveBeenCalledWith(mockResults[0]);
    });

    it('should call onResultClick for each result independently', async () => {
      const user = userEvent.setup();
      const onResultClick = vi.fn();

      render(<SearchResults {...defaultProps} onResultClick={onResultClick} />);

      const results = screen.getAllByText(/Test Conversation/);
      await user.click(results[1]);

      expect(onResultClick).toHaveBeenCalledWith(mockResults[1]);
    });

    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<SearchResults {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByText('✕');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Similarity Display', () => {
    it('should display similarity percentages', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText(/85%/)).toBeInTheDocument();
      expect(screen.getByText(/65%/)).toBeInTheDocument();
      expect(screen.getByText(/45%/)).toBeInTheDocument();
    });

    it('should display "Highly relevant" for high similarity', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText(/Highly relevant/)).toBeInTheDocument();
    });

    it('should display "Relevant" for medium similarity', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText(/Relevant \(65%\)/)).toBeInTheDocument();
    });

    it('should display "Somewhat relevant" for low similarity', () => {
      render(<SearchResults {...defaultProps} />);

      expect(screen.getByText(/Somewhat relevant/)).toBeInTheDocument();
    });

    it('should render similarity bars with correct width', () => {
      const { container } = render(<SearchResults {...defaultProps} />);

      const similarityBars = container.querySelectorAll('.similarity-bar');
      expect(similarityBars.length).toBe(3);
      expect(similarityBars[0]).toHaveStyle({ width: '85%' });
    });
  });

  describe('Date Formatting', () => {
    it('should format recent times correctly', () => {
      const recentResults: SearchResult[] = [
        {
          ...mockResults[0],
          timestamp: Date.now() - 30000, // 30 seconds ago
        },
      ];

      render(<SearchResults {...defaultProps} results={recentResults} />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should format minutes ago correctly', () => {
      const results: SearchResult[] = [
        {
          ...mockResults[0],
          timestamp: Date.now() - 300000, // 5 minutes ago
        },
      ];

      render(<SearchResults {...defaultProps} results={results} />);

      expect(screen.getByText(/5m ago/)).toBeInTheDocument();
    });

    it('should format hours ago correctly', () => {
      const results: SearchResult[] = [
        {
          ...mockResults[0],
          timestamp: Date.now() - 7200000, // 2 hours ago
        },
      ];

      render(<SearchResults {...defaultProps} results={results} />);

      expect(screen.getByText(/2h ago/)).toBeInTheDocument();
    });

    it('should format days ago correctly', () => {
      const results: SearchResult[] = [
        {
          ...mockResults[0],
          timestamp: Date.now() - 172800000, // 2 days ago
        },
      ];

      render(<SearchResults {...defaultProps} results={results} />);

      expect(screen.getByText(/2d ago/)).toBeInTheDocument();
    });

    it('should format old dates as locale date string', () => {
      const results: SearchResult[] = [
        {
          ...mockResults[0],
          timestamp: Date.now() - 864000000, // 10 days ago
        },
      ];

      const { container } = render(<SearchResults {...defaultProps} results={results} />);

      const dateElement = container.querySelector('.search-result-date');
      expect(dateElement).toBeInTheDocument();
      expect(dateElement?.textContent).toMatch(/\d+\/\d+\/\d+/);
    });
  });

  describe('Accessibility', () => {
    it('should render result items as clickable elements', () => {
      const { container } = render(<SearchResults {...defaultProps} />);

      const resultItems = container.querySelectorAll('.search-result-item');
      expect(resultItems.length).toBe(3);
    });

    it('should have semantic structure', () => {
      const { container } = render(<SearchResults {...defaultProps} />);

      expect(container.querySelector('.search-results-header')).toBeInTheDocument();
      expect(container.querySelector('.search-results-list')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long snippets', () => {
      const longSnippet = 'A'.repeat(500);
      const results: SearchResult[] = [
        {
          ...mockResults[0],
          snippet: longSnippet,
        },
      ];

      render(<SearchResults {...defaultProps} results={results} />);

      expect(screen.getByText(longSnippet)).toBeInTheDocument();
    });

    it('should handle special characters in query', () => {
      render(<SearchResults {...defaultProps} query="<script>alert('xss')</script>" />);

      expect(screen.getByText(/"<script>alert('xss')<\/script>"/)).toBeInTheDocument();
    });

    it('should handle similarity of 0', () => {
      const results: SearchResult[] = [
        {
          ...mockResults[0],
          similarity: 0,
        },
      ];

      render(<SearchResults {...defaultProps} results={results} />);

      expect(screen.getByText(/Somewhat relevant/)).toBeInTheDocument();
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should handle similarity of 1', () => {
      const results: SearchResult[] = [
        {
          ...mockResults[0],
          similarity: 1.0,
        },
      ];

      render(<SearchResults {...defaultProps} results={results} />);

      expect(screen.getByText(/Highly relevant/)).toBeInTheDocument();
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });
});
