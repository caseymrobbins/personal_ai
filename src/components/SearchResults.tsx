/**
 * Search Results Component (Sprint 11)
 *
 * Displays semantic search results with:
 * - Ranked by similarity
 * - Conversation grouping
 * - Click to navigate to message
 * - Similarity score visualization
 */

import { type SearchResult } from '../services/search.service';
import './SearchResults.css';

export interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onResultClick: (result: SearchResult) => void;
  onClose: () => void;
}

export function SearchResults({
  results,
  query,
  onResultClick,
  onClose,
}: SearchResultsProps) {
  const formatDate = (timestamp: number) => {
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.7) return '#48bb78'; // Green (highly relevant)
    if (similarity >= 0.5) return '#ed8936'; // Orange (moderately relevant)
    return '#667eea';                        // Blue (somewhat relevant)
  };

  const getSimilarityLabel = (similarity: number): string => {
    if (similarity >= 0.7) return 'Highly relevant';
    if (similarity >= 0.5) return 'Relevant';
    return 'Somewhat relevant';
  };

  return (
    <div className="search-results">
      <div className="search-results-header">
        <div className="search-results-title">
          <span className="search-icon">🔍</span>
          <span>Search: "{query}"</span>
        </div>
        <button className="search-results-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="search-results-count">
        {results.length} {results.length === 1 ? 'result' : 'results'} found
      </div>

      {results.length === 0 ? (
        <div className="search-results-empty">
          <div className="empty-icon">🤷</div>
          <p>No results found for "{query}"</p>
          <small>Try different keywords or a more general search</small>
        </div>
      ) : (
        <div className="search-results-list">
          {results.map((result) => (
            <div
              key={result.messageId}
              className="search-result-item"
              onClick={() => onResultClick(result)}
            >
              <div className="search-result-header">
                <span className="search-result-conversation">
                  {result.conversationTitle}
                </span>
                <span className="search-result-date">
                  {formatDate(result.timestamp)}
                </span>
              </div>

              <div className="search-result-content">
                <span className="search-result-role-badge">{result.role}</span>
                <p className="search-result-snippet">{result.snippet}</p>
              </div>

              <div className="search-result-footer">
                <div
                  className="search-result-similarity"
                  style={{ color: getSimilarityColor(result.similarity) }}
                >
                  <div
                    className="similarity-bar"
                    style={{
                      width: `${result.similarity * 100}%`,
                      backgroundColor: getSimilarityColor(result.similarity),
                    }}
                  />
                  <span className="similarity-label">
                    {getSimilarityLabel(result.similarity)} ({(result.similarity * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
