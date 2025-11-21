/**
 * ARGUMENTATION VISUALIZER COMPONENT
 * ==================================
 * Displays viewpoints, tensions, trade-offs, and common ground visually.
 */

import React, { useState } from 'react';
import { ViewpointAnalysis, Viewpoint, KeyTension } from '../../services/viewpoint-analyzer.service';
import { TradeOff } from '../../services/argument-synthesizer.service';

export interface ArgumentationVisualizerProps {
  analysis: ViewpointAnalysis;
  tradeOffs: TradeOff[];
  selectedViewpoint?: string; // ID of selected viewpoint
  onSelectViewpoint?: (viewpointId: string) => void;
}

export const ArgumentationVisualizer: React.FC<ArgumentationVisualizerProps> = ({
  analysis,
  tradeOffs,
  selectedViewpoint,
  onSelectViewpoint,
}) => {
  const [expandedSection, setExpandedSection] = useState<string>('viewpoints');

  const allViewpoints = [analysis.userPosition, ...analysis.opposingViewpoints];

  const getViewpointColor = (viewpoint: Viewpoint): string => {
    if (viewpoint.stance === 'user') return '#0066cc';
    if (viewpoint.domain === 'ethical/philosophical') return '#9333ea';
    if (viewpoint.domain === 'technical/practical') return '#0891b2';
    if (viewpoint.domain === 'economic/efficiency') return '#16a34a';
    return '#6b7280';
  };

  const getTensionColor = (tension: KeyTension): string => {
    if (tension.nature === 'contradictory') return '#dc2626';
    if (tension.nature === 'factual') return '#f59e0b';
    if (tension.nature === 'value') return '#9333ea';
    return '#6b7280';
  };

  return (
    <div className="argumentation-visualizer">
      {/* Viewpoints Section */}
      <div className="viz-section">
        <button
          className="section-header"
          onClick={() => setExpandedSection(expandedSection === 'viewpoints' ? '' : 'viewpoints')}
          type="button"
        >
          <span className="section-title">
            {expandedSection === 'viewpoints' ? '▼' : '▶'} Viewpoints ({allViewpoints.length})
          </span>
        </button>

        {expandedSection === 'viewpoints' && (
          <div className="section-content">
            <div className="viewpoints-grid">
              {allViewpoints.map((viewpoint) => (
                <div
                  key={viewpoint.id}
                  className={`viewpoint-card ${selectedViewpoint === viewpoint.id ? 'selected' : ''}`}
                  style={{ borderLeftColor: getViewpointColor(viewpoint) }}
                  onClick={() => onSelectViewpoint?.(viewpoint.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="viewpoint-header">
                    <span className="viewpoint-stance">{viewpoint.stance}</span>
                    {viewpoint.domain && (
                      <span className="viewpoint-domain">{viewpoint.domain}</span>
                    )}
                  </div>
                  <p className="viewpoint-position">{viewpoint.position}</p>
                  <div className="viewpoint-stats">
                    <span className="stat">
                      {viewpoint.arguments.length} arguments
                    </span>
                    <span className="stat">
                      {(viewpoint.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Common Ground Section */}
      {analysis.commonGround.length > 0 && (
        <div className="viz-section">
          <button
            className="section-header"
            onClick={() =>
              setExpandedSection(expandedSection === 'common' ? '' : 'common')
            }
            type="button"
          >
            <span className="section-title">
              {expandedSection === 'common' ? '▼' : '▶'} Common Ground (
              {analysis.commonGround.length})
            </span>
          </button>

          {expandedSection === 'common' && (
            <div className="section-content">
              <div className="common-ground-list">
                {analysis.commonGround.map((cg, idx) => (
                  <div key={idx} className="common-item">
                    <span className="common-icon">✓</span>
                    <span className="common-statement">{cg.statement}</span>
                    <span className="common-strength">
                      {(cg.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Tensions Section */}
      {analysis.keyTensions.length > 0 && (
        <div className="viz-section">
          <button
            className="section-header"
            onClick={() =>
              setExpandedSection(expandedSection === 'tensions' ? '' : 'tensions')
            }
            type="button"
          >
            <span className="section-title">
              {expandedSection === 'tensions' ? '▼' : '▶'} Key Tensions (
              {analysis.keyTensions.length})
            </span>
          </button>

          {expandedSection === 'tensions' && (
            <div className="section-content">
              <div className="tensions-list">
                {analysis.keyTensions.map((tension) => (
                  <div
                    key={tension.id}
                    className="tension-item"
                    style={{ borderLeftColor: getTensionColor(tension) }}
                  >
                    <div className="tension-header">
                      <span className="tension-topic">{tension.topic}</span>
                      <span className="tension-nature">{tension.nature}</span>
                    </div>
                    <p className="tension-explanation">{tension.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trade-offs Section */}
      {tradeOffs.length > 0 && (
        <div className="viz-section">
          <button
            className="section-header"
            onClick={() =>
              setExpandedSection(expandedSection === 'tradeoffs' ? '' : 'tradeoffs')
            }
            type="button"
          >
            <span className="section-title">
              {expandedSection === 'tradeoffs' ? '▼' : '▶'} Trade-offs (
              {tradeOffs.length})
            </span>
          </button>

          {expandedSection === 'tradeoffs' && (
            <div className="section-content">
              <div className="tradeoffs-list">
                {tradeOffs.map((tradeoff) => (
                  <div key={tradeoff.id} className="tradeoff-item">
                    <div className="tradeoff-dimensions">
                      <div className="dimension">
                        <span className="dimension-name">
                          {tradeoff.dimension1.name}
                        </span>
                        <span className="dimension-priority">
                          {(tradeoff.dimension1.priority * 100).toFixed(0)}%
                        </span>
                      </div>
                      <span className="vs">VS</span>
                      <div className="dimension">
                        <span className="dimension-name">
                          {tradeoff.dimension2.name}
                        </span>
                        <span className="dimension-priority">
                          {(tradeoff.dimension2.priority * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <p className="tradeoff-context">
                      <strong>Context:</strong> {tradeoff.contextThatMatters}
                    </p>
                    <p className="tradeoff-recommendation">
                      <strong>Approach:</strong> {tradeoff.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .argumentation-visualizer {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .viz-section {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }

        .section-header {
          width: 100%;
          padding: 12px 16px;
          background: #f8f9fa;
          border: none;
          border-bottom: 1px solid #e0e0e0;
          cursor: pointer;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          transition: background 0.2s;
        }

        .section-header:hover {
          background: #f0f1f3;
        }

        .section-title {
          user-select: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-content {
          padding: 16px;
        }

        /* Viewpoints */
        .viewpoints-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .viewpoint-card {
          padding: 12px;
          border-left: 4px solid;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .viewpoint-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .viewpoint-card.selected {
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
        }

        .viewpoint-header {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .viewpoint-stance {
          background: #e8e8e8;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .viewpoint-domain {
          background: #f0f0f0;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 11px;
          color: #666;
        }

        .viewpoint-position {
          font-size: 13px;
          margin: 8px 0;
          line-height: 1.4;
          color: #333;
        }

        .viewpoint-stats {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #666;
        }

        .stat {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 2px;
        }

        /* Common Ground */
        .common-ground-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .common-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #f0fdf4;
          border-radius: 4px;
          border-left: 3px solid #22c55e;
        }

        .common-icon {
          color: #22c55e;
          font-weight: bold;
          flex-shrink: 0;
        }

        .common-statement {
          flex: 1;
          font-size: 13px;
          color: #333;
        }

        .common-strength {
          font-size: 12px;
          color: #666;
          font-weight: 500;
          min-width: 35px;
          text-align: right;
        }

        /* Key Tensions */
        .tensions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tension-item {
          padding: 12px;
          border-left: 4px solid;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }

        .tension-header {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .tension-topic {
          font-weight: 600;
          font-size: 13px;
          color: #333;
        }

        .tension-nature {
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
        }

        .tension-explanation {
          font-size: 12px;
          color: #666;
          margin: 0;
          line-height: 1.4;
        }

        /* Trade-offs */
        .tradeoffs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tradeoff-item {
          padding: 12px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
        }

        .tradeoff-dimensions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .dimension {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .dimension-name {
          font-weight: 600;
          font-size: 12px;
          color: #333;
          text-align: center;
        }

        .dimension-priority {
          font-size: 11px;
          color: #666;
        }

        .vs {
          font-weight: bold;
          color: #999;
          font-size: 12px;
        }

        .tradeoff-context,
        .tradeoff-recommendation {
          font-size: 12px;
          margin: 6px 0;
          color: #666;
          line-height: 1.4;
        }

        strong {
          color: #333;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
