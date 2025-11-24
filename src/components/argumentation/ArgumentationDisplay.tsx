/**
 * ARGUMENTATION DISPLAY COMPONENT
 * ===============================
 * Displays the synthesized answer with direct answer, nuanced explanation,
 * perspectives, contextual recommendations, and caveats.
 */

import React, { useState } from 'react';
import { SynthesizedAnswer, SynthesizedPerspective } from '../../services/argument-synthesizer.service';

export interface ArgumentationDisplayProps {
  answer: SynthesizedAnswer;
  onSelectPerspective?: (perspective: SynthesizedPerspective) => void;
}

export const ArgumentationDisplay: React.FC<ArgumentationDisplayProps> = ({
  answer,
  onSelectPerspective,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['direct-answer'])
  );

  const toggleSection = (sectionId: string): void => {
    const newSections = new Set(expandedSections);
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId);
    } else {
      newSections.add(sectionId);
    }
    setExpandedSections(newSections);
  };

  const isExpanded = (sectionId: string): boolean => expandedSections.has(sectionId);

  return (
    <div className="argumentation-display">
      {/* Direct Answer */}
      <div className="answer-section">
        <button
          className="section-header"
          onClick={() => toggleSection('direct-answer')}
          type="button"
        >
          <span className="section-icon">
            {isExpanded('direct-answer') ? '▼' : '▶'}
          </span>
          <span className="section-title">Direct Answer</span>
        </button>

        {isExpanded('direct-answer') && (
          <div className="section-content direct-answer-content">
            <p className="direct-answer-text">{answer.directAnswer}</p>
          </div>
        )}
      </div>

      {/* Nuanced Explanation */}
      <div className="answer-section">
        <button
          className="section-header"
          onClick={() => toggleSection('nuanced')}
          type="button"
        >
          <span className="section-icon">
            {isExpanded('nuanced') ? '▼' : '▶'}
          </span>
          <span className="section-title">Full Explanation</span>
        </button>

        {isExpanded('nuanced') && (
          <div className="section-content nuanced-content">
            <p>{answer.nuancedExplanation}</p>
          </div>
        )}
      </div>

      {/* Perspectives */}
      {answer.perspectives.length > 0 && (
        <div className="answer-section">
          <button
            className="section-header"
            onClick={() => toggleSection('perspectives')}
            type="button"
          >
            <span className="section-icon">
              {isExpanded('perspectives') ? '▼' : '▶'}
            </span>
            <span className="section-title">
              Perspectives ({answer.perspectives.length})
            </span>
          </button>

          {isExpanded('perspectives') && (
            <div className="section-content perspectives-content">
              <div className="perspectives-grid">
                {answer.perspectives.map((perspective) => (
                  <div
                    key={perspective.title}
                    className="perspective-card"
                    onClick={() => onSelectPerspective?.(perspective)}
                    role="button"
                    tabIndex={0}
                  >
                    <h4 className="perspective-title">{perspective.title}</h4>
                    <p className="perspective-description">
                      {perspective.description}
                    </p>

                    {perspective.strengths.length > 0 && (
                      <div className="perspective-section">
                        <span className="subsection-title">Strengths:</span>
                        <ul className="perspective-list">
                          {perspective.strengths.map((strength, idx) => (
                            <li key={idx}>✓ {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {perspective.weaknesses.length > 0 && (
                      <div className="perspective-section">
                        <span className="subsection-title">Weaknesses:</span>
                        <ul className="perspective-list">
                          {perspective.weaknesses.map((weakness, idx) => (
                            <li key={idx}>⚠ {weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="perspective-applicable">
                      <strong>Applicable when:</strong> {perspective.applicableWhen}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Approach */}
      <div className="answer-section">
        <button
          className="section-header"
          onClick={() => toggleSection('recommendation')}
          type="button"
        >
          <span className="section-icon">
            {isExpanded('recommendation') ? '▼' : '▶'}
          </span>
          <span className="section-title">Recommended Approach</span>
        </button>

        {isExpanded('recommendation') && (
          <div className="section-content recommendation-content">
            <div className="recommendation-item">
              <h4 className="recommendation-label">Primary Approach:</h4>
              <p>{answer.recommendedApproach.primary}</p>
            </div>

            {answer.recommendedApproach.alternatives.length > 0 && (
              <div className="recommendation-item">
                <h4 className="recommendation-label">Alternatives:</h4>
                <ul className="recommendation-list">
                  {answer.recommendedApproach.alternatives.map((alt, idx) => (
                    <li key={idx}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}

            {answer.recommendedApproach.caveats.length > 0 && (
              <div className="recommendation-item caveats">
                <h4 className="recommendation-label">Important Caveats:</h4>
                <ul className="recommendation-list">
                  {answer.recommendedApproach.caveats.map((caveat, idx) => (
                    <li key={idx}>⚠ {caveat}</li>
                  ))}
                </ul>
              </div>
            )}

            {answer.recommendedApproach.assumptions.length > 0 && (
              <div className="recommendation-item">
                <h4 className="recommendation-label">Underlying Assumptions:</h4>
                <ul className="recommendation-list">
                  {answer.recommendedApproach.assumptions.map((assumption, idx) => (
                    <li key={idx}>{assumption}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contextual Recommendations */}
      {answer.contextualRecommendations.length > 0 && (
        <div className="answer-section">
          <button
            className="section-header"
            onClick={() => toggleSection('contextual')}
            type="button"
          >
            <span className="section-icon">
              {isExpanded('contextual') ? '▼' : '▶'}
            </span>
            <span className="section-title">Context-Specific Guidance</span>
          </button>

          {isExpanded('contextual') && (
            <div className="section-content contextual-content">
              <div className="contextual-recommendations">
                {answer.contextualRecommendations.map((rec, idx) => (
                  <div key={idx} className="contextual-item">
                    <h4 className="contextual-context">{rec.context}</h4>
                    <p className="contextual-recommendation">
                      <strong>Recommendation:</strong> {rec.recommendation}
                    </p>
                    <p className="contextual-reasoning">
                      <strong>Why:</strong> {rec.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unresolvable Disagreements */}
      {answer.unresolvableDisagreements.length > 0 && (
        <div className="answer-section warning">
          <button
            className="section-header"
            onClick={() => toggleSection('disagreements')}
            type="button"
          >
            <span className="section-icon">
              {isExpanded('disagreements') ? '▼' : '▶'}
            </span>
            <span className="section-title">
              Unresolvable Disagreements
            </span>
          </button>

          {isExpanded('disagreements') && (
            <div className="section-content">
              <ul className="disagreement-list">
                {answer.unresolvableDisagreements.map((disagreement, idx) => (
                  <li key={idx}>{disagreement}</li>
                ))}
              </ul>
              <p className="disagreement-note">
                These disagreements reflect fundamental value or factual
                differences that cannot be resolved through additional
                analysis or evidence.
              </p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .argumentation-display {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .answer-section {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }

        .answer-section.warning {
          border-color: #f59e0b;
          background: #fffbf0;
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
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .answer-section.warning .section-header {
          background: #fffbf0;
          border-bottom-color: #f59e0b;
        }

        .section-header:hover {
          background: #f0f1f3;
        }

        .answer-section.warning .section-header:hover {
          background: #fff7e6;
        }

        .section-icon {
          flex-shrink: 0;
          user-select: none;
        }

        .section-title {
          flex: 1;
        }

        .section-content {
          padding: 16px;
        }

        /* Direct Answer */
        .direct-answer-content {
          background: #f0f9ff;
          border-top: 3px solid #0284c7;
        }

        .direct-answer-text {
          font-size: 15px;
          line-height: 1.6;
          color: #1e40af;
          font-weight: 500;
          margin: 0;
        }

        /* Nuanced Content */
        .nuanced-content {
          background: #f8f9fa;
        }

        .nuanced-content p {
          font-size: 13px;
          line-height: 1.6;
          color: #333;
          margin: 0;
        }

        /* Perspectives */
        .perspectives-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }

        .perspective-card {
          padding: 12px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .perspective-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .perspective-title {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          margin: 0 0 6px 0;
        }

        .perspective-description {
          font-size: 12px;
          color: #666;
          margin: 6px 0;
          line-height: 1.4;
        }

        .perspective-section {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
        }

        .subsection-title {
          font-weight: 600;
          font-size: 11px;
          color: #333;
          text-transform: uppercase;
        }

        .perspective-list {
          list-style: none;
          padding: 4px 0 4px 12px;
          margin: 4px 0 0 0;
        }

        .perspective-list li {
          font-size: 12px;
          color: #666;
          margin: 2px 0;
          line-height: 1.3;
        }

        .perspective-applicable {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
          margin-bottom: 0;
        }

        /* Recommendation */
        .recommendation-item {
          margin-bottom: 16px;
        }

        .recommendation-item.caveats {
          background: #fef2f2;
          padding: 12px;
          border-radius: 4px;
          border-left: 3px solid #dc2626;
        }

        .recommendation-label {
          font-weight: 600;
          font-size: 13px;
          color: #333;
          margin: 0 0 8px 0;
        }

        .recommendation-item > p {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin: 0;
        }

        .recommendation-list {
          list-style: none;
          padding: 0 0 0 12px;
          margin: 0;
        }

        .recommendation-list li {
          font-size: 12px;
          color: #666;
          margin: 4px 0;
          line-height: 1.4;
        }

        /* Contextual */
        .contextual-recommendations {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contextual-item {
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 3px solid #0284c7;
        }

        .contextual-context {
          font-weight: 600;
          font-size: 13px;
          color: #333;
          margin: 0 0 8px 0;
        }

        .contextual-recommendation,
        .contextual-reasoning {
          font-size: 12px;
          color: #666;
          margin: 4px 0;
          line-height: 1.4;
        }

        strong {
          color: #333;
        }

        /* Disagreements */
        .disagreement-list {
          list-style: none;
          padding: 0 0 0 12px;
          margin: 0 0 12px 0;
        }

        .disagreement-list li {
          font-size: 12px;
          color: #666;
          margin: 4px 0;
          line-height: 1.4;
        }

        .disagreement-note {
          font-size: 12px;
          color: #f59e0b;
          font-style: italic;
          margin: 0;
        }
      `}</style>
    </div>
  );
};
