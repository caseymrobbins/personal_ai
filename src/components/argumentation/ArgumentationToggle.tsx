/**
 * ARGUMENTATION TOGGLE COMPONENT
 * ==============================
 * Enables/disables argumentation mode in the chat interface.
 * Shows status and quality metrics.
 */

import React, { useState } from 'react';

export interface ArgumentationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isProcessing?: boolean;
  quality?: number; // 0-1
  lastAnalyzedQuestion?: string;
}

export const ArgumentationToggle: React.FC<ArgumentationToggleProps> = ({
  enabled,
  onToggle,
  isProcessing = false,
  quality,
  lastAnalyzedQuestion,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const qualityPercentage = quality ? Math.round(quality * 100) : 0;
  const qualityColor =
    qualityPercentage >= 80
      ? '#22c55e'
      : qualityPercentage >= 60
        ? '#eab308'
        : '#ef4444';

  return (
    <div className="argumentation-toggle">
      <div className="toggle-container">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={isProcessing}
            className="toggle-input"
          />
          <span className="toggle-text">
            {enabled ? '🎯 Argumentation' : '💬 Chat'}
          </span>
        </label>

        {isProcessing && (
          <span className="processing-indicator">
            <span className="spinner" />
            Analyzing arguments...
          </span>
        )}

        {enabled && quality !== undefined && !isProcessing && (
          <div className="quality-indicator">
            <span
              className="quality-bar"
              style={{
                width: `${qualityPercentage}%`,
                backgroundColor: qualityColor,
              }}
            />
            <span className="quality-text">{qualityPercentage}% quality</span>
          </div>
        )}
      </div>

      {enabled && (
        <div className="details-section">
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            {showDetails ? '▼' : '▶'} Details
          </button>

          {showDetails && (
            <div className="details-content">
              <div className="detail-item">
                <span className="detail-label">Mode:</span>
                <span className="detail-value">Full Argumentation Analysis</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Includes:</span>
                <ul className="detail-list">
                  <li>✓ Viewpoint extraction</li>
                  <li>✓ Opposing arguments</li>
                  <li>✓ Trade-off analysis</li>
                  <li>✓ Synthesis</li>
                </ul>
              </div>

              {lastAnalyzedQuestion && (
                <div className="detail-item">
                  <span className="detail-label">Last analyzed:</span>
                  <span className="detail-value">{lastAnalyzedQuestion}</span>
                </div>
              )}

              <div className="detail-item">
                <span className="detail-label">Performance:</span>
                <span className="detail-value">
                  {quality && quality > 0.75
                    ? 'Excellent analysis'
                    : quality && quality > 0.5
                      ? 'Good analysis'
                      : 'Basic analysis'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .argumentation-toggle {
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .toggle-input {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }

        .toggle-text {
          user-select: none;
        }

        .processing-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #666;
        }

        .spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid #e0e0e0;
          border-top: 2px solid #666;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .quality-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 150px;
        }

        .quality-bar {
          flex: 1;
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .quality-text {
          font-size: 12px;
          color: #666;
          font-weight: 500;
          min-width: 50px;
          text-align: right;
        }

        .details-section {
          margin-top: 8px;
          border-top: 1px solid #e0e0e0;
          padding-top: 8px;
        }

        .details-toggle {
          background: none;
          border: none;
          color: #0066cc;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .details-toggle:hover {
          text-decoration: underline;
        }

        .details-content {
          margin-top: 8px;
          padding: 8px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e8e8e8;
        }

        .detail-item {
          margin: 6px 0;
          font-size: 13px;
        }

        .detail-label {
          font-weight: 600;
          color: #333;
          margin-right: 8px;
        }

        .detail-value {
          color: #666;
        }

        .detail-list {
          list-style: none;
          padding: 4px 0 4px 16px;
          margin: 4px 0 0 0;
        }

        .detail-list li {
          margin: 2px 0;
          color: #666;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
