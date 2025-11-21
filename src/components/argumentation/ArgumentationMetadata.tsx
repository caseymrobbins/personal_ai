/**
 * ARGUMENTATION METADATA COMPONENT
 * ================================
 * Displays quality metrics, timing information, and analysis statistics.
 */

import React, { useState } from 'react';
import { PipelineResult } from '../../services/argumentation-pipeline.service';

export interface ArgumentationMetadataProps {
  result: PipelineResult;
  compact?: boolean;
}

export const ArgumentationMetadata: React.FC<ArgumentationMetadataProps> = ({
  result,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);

  const getQualityColor = (quality: number): string => {
    if (quality >= 0.8) return '#22c55e';
    if (quality >= 0.6) return '#eab308';
    if (quality >= 0.4) return '#f97316';
    return '#ef4444';
  };

  const getQualityLabel = (quality: number): string => {
    if (quality >= 0.85) return 'Excellent';
    if (quality >= 0.7) return 'Good';
    if (quality >= 0.5) return 'Fair';
    return 'Basic';
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const overallQuality = result.quality.overallQuality;
  const qualityColor = getQualityColor(overallQuality);
  const qualityLabel = getQualityLabel(overallQuality);

  return (
    <div className="argumentation-metadata">
      <button
        className="metadata-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span className="header-icon">
          {expanded ? '▼' : '▶'}
        </span>
        <span className="header-title">Analysis Metadata</span>

        {/* Quality Summary */}
        <div className="quality-summary">
          <div className="quality-meter">
            <div
              className="quality-fill"
              style={{
                width: `${overallQuality * 100}%`,
                backgroundColor: qualityColor,
              }}
            />
          </div>
          <span className="quality-label">{qualityLabel}</span>
          <span className="quality-percent">
            {(overallQuality * 100).toFixed(0)}%
          </span>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <span className="stat-item">
            <span className="stat-label">Viewpoints:</span>
            <span className="stat-value">
              {1 + result.viewpointAnalysis.opposingViewpoints.length}
            </span>
          </span>
          <span className="stat-item">
            <span className="stat-label">Time:</span>
            <span className="stat-value">
              {formatTime(result.timing.totalMs)}
            </span>
          </span>
        </div>
      </button>

      {expanded && (
        <div className="metadata-content">
          {/* Quality Metrics */}
          <div className="metadata-section">
            <h3 className="section-title">Quality Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">Overall Quality</span>
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{
                      width: `${overallQuality * 100}%`,
                      backgroundColor: getQualityColor(overallQuality),
                    }}
                  />
                </div>
                <span className="metric-value">
                  {(overallQuality * 100).toFixed(1)}%
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Analysis Confidence</span>
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{
                      width: `${result.quality.analysisConfidence * 100}%`,
                      backgroundColor: getQualityColor(
                        result.quality.analysisConfidence
                      ),
                    }}
                  />
                </div>
                <span className="metric-value">
                  {(result.quality.analysisConfidence * 100).toFixed(1)}%
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Synthesis Quality</span>
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{
                      width: `${result.quality.synthesisQuality * 100}%`,
                      backgroundColor: getQualityColor(
                        result.quality.synthesisQuality
                      ),
                    }}
                  />
                </div>
                <span className="metric-value">
                  {(result.quality.synthesisQuality * 100).toFixed(1)}%
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-label">Routing Confidence</span>
                <div className="metric-bar">
                  <div
                    className="metric-fill"
                    style={{
                      width: `${result.quality.routingConfidence * 100}%`,
                      backgroundColor: getQualityColor(
                        result.quality.routingConfidence
                      ),
                    }}
                  />
                </div>
                <span className="metric-value">
                  {(result.quality.routingConfidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Timing Breakdown */}
          <div className="metadata-section">
            <h3 className="section-title">Timing Breakdown</h3>
            <div className="timing-breakdown">
              <div className="timing-item">
                <span className="timing-label">Total Time</span>
                <span className="timing-value">
                  {formatTime(result.timing.totalMs)}
                </span>
              </div>

              <div className="timing-item">
                <span className="timing-label">Routing</span>
                <span className="timing-value">
                  {formatTime(result.timing.routingMs)}
                </span>
                <span className="timing-percent">
                  {(
                    (result.timing.routingMs /
                      result.timing.totalMs) *
                    100
                  ).toFixed(0)}%
                </span>
              </div>

              <div className="timing-item">
                <span className="timing-label">Viewpoint Analysis</span>
                <span className="timing-value">
                  {formatTime(result.timing.analysisMs)}
                </span>
                <span className="timing-percent">
                  {(
                    (result.timing.analysisMs /
                      result.timing.totalMs) *
                    100
                  ).toFixed(0)}%
                </span>
              </div>

              <div className="timing-item">
                <span className="timing-label">Strong-Manning</span>
                <span className="timing-value">
                  {formatTime(result.timing.strongManningMs)}
                </span>
                <span className="timing-percent">
                  {(
                    (result.timing.strongManningMs /
                      result.timing.totalMs) *
                    100
                  ).toFixed(0)}%
                </span>
              </div>

              <div className="timing-item">
                <span className="timing-label">Synthesis</span>
                <span className="timing-value">
                  {formatTime(result.timing.synthesisMs)}
                </span>
                <span className="timing-percent">
                  {(
                    (result.timing.synthesisMs /
                      result.timing.totalMs) *
                    100
                  ).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Analysis Statistics */}
          <div className="metadata-section">
            <h3 className="section-title">Analysis Statistics</h3>
            <div className="statistics">
              <div className="stat-row">
                <span className="stat-key">User Viewpoint Confidence</span>
                <span className="stat-value">
                  {(
                    result.viewpointAnalysis.userPosition.confidence *
                    100
                  ).toFixed(0)}%
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-key">Opposing Viewpoints</span>
                <span className="stat-value">
                  {result.viewpointAnalysis.opposingViewpoints.length}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-key">Key Tensions Identified</span>
                <span className="stat-value">
                  {result.viewpointAnalysis.keyTensions.length}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-key">Common Ground Points</span>
                <span className="stat-value">
                  {result.viewpointAnalysis.commonGround.length}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-key">Perspectives Generated</span>
                <span className="stat-value">
                  {result.synthesizedAnswer.perspectives.length}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-key">Trade-offs Identified</span>
                <span className="stat-value">
                  {result.synthesizedAnswer.tradeOffs.length}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-key">Contextual Recommendations</span>
                <span className="stat-value">
                  {result.synthesizedAnswer.contextualRecommendations.length}
                </span>
              </div>
            </div>
          </div>

          {/* Routing Information */}
          <div className="metadata-section">
            <h3 className="section-title">LLM Routing</h3>
            <div className="routing-info">
              <div className="routing-row">
                <span className="routing-key">Selected Adapter</span>
                <span className="routing-value">
                  {result.routingDecision.adapterId}
                </span>
              </div>

              <div className="routing-row">
                <span className="routing-key">Query Complexity</span>
                <span className="routing-value">
                  {(
                    result.routingDecision.complexity.score *
                    100
                  ).toFixed(1)}%
                </span>
              </div>

              <div className="routing-row">
                <span className="routing-key">Recommended Routing</span>
                <span className="routing-value">
                  {result.routingDecision.complexity.recommendation}
                </span>
              </div>

              <div className="routing-row">
                <span className="routing-key">Estimated Latency</span>
                <span className="routing-value">
                  {result.routingDecision.estimatedLatency}ms
                </span>
              </div>

              <div className="routing-row">
                <span className="routing-key">Estimated Cost</span>
                <span className="routing-value">
                  ${result.routingDecision.estimatedCost.toFixed(3)}
                </span>
              </div>

              {result.routingDecision.userPreference && (
                <div className="routing-row">
                  <span className="routing-key">User Preference</span>
                  <span className="routing-value">
                    {result.routingDecision.userPreference}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Explanation */}
          <div className="metadata-section">
            <h3 className="section-title">Routing Reasoning</h3>
            <p className="reasoning-text">
              {result.routingDecision.routingReason}
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .argumentation-metadata {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }

        .metadata-header {
          width: 100%;
          padding: 12px 16px;
          background: #f8f9fa;
          border: none;
          border-bottom: ${expanded ? '1px solid #e0e0e0' : 'none'};
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
        }

        .metadata-header:hover {
          background: #f0f1f3;
        }

        .header-icon {
          flex-shrink: 0;
          user-select: none;
        }

        .header-title {
          flex-shrink: 0;
        }

        .quality-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .quality-meter {
          width: 100px;
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
        }

        .quality-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .quality-label {
          font-size: 12px;
          font-weight: 500;
          color: #666;
          min-width: 60px;
        }

        .quality-percent {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          min-width: 40px;
          text-align: right;
        }

        .quick-stats {
          display: flex;
          gap: 16px;
          flex-shrink: 0;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .stat-label {
          color: #666;
        }

        .stat-value {
          font-weight: 600;
          color: #333;
        }

        .metadata-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .metadata-section {
          border-top: 1px solid #e0e0e0;
          padding-top: 12px;
        }

        .metadata-section:first-child {
          border-top: none;
          padding-top: 0;
        }

        .section-title {
          font-weight: 600;
          font-size: 13px;
          color: #333;
          margin: 0 0 12px 0;
        }

        /* Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .metric-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .metric-label {
          font-size: 12px;
          font-weight: 500;
          color: #666;
        }

        .metric-bar {
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .metric-value {
          font-size: 13px;
          font-weight: 600;
          color: #333;
        }

        /* Timing Breakdown */
        .timing-breakdown {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .timing-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
        }

        .timing-label {
          flex: 1;
          color: #666;
        }

        .timing-value {
          font-weight: 600;
          color: #333;
          min-width: 50px;
          text-align: right;
        }

        .timing-percent {
          color: #999;
          font-size: 11px;
          min-width: 35px;
          text-align: right;
        }

        /* Statistics */
        .statistics {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
        }

        .stat-key {
          color: #666;
        }

        .stat-value {
          font-weight: 600;
          color: #333;
        }

        /* Routing Info */
        .routing-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .routing-row {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
        }

        .routing-key {
          color: #666;
        }

        .routing-value {
          font-weight: 600;
          color: #333;
        }

        /* Reasoning */
        .reasoning-text {
          font-size: 12px;
          color: #666;
          line-height: 1.5;
          margin: 0;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
