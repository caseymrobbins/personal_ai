/**
 * Socratic Interceptor Component (Sprint 7)
 *
 * Intercepts low-ARI queries to encourage critical thinking before
 * providing AI answers. Implements the Socratic method to build autonomy.
 */

import { useState } from 'react';
import { socraticService, type SocraticPrompt } from '../services/socratic.service';
import './SocraticInterceptor.css';

export interface SocraticInterceptorProps {
  prompt: SocraticPrompt;
  ariScore: number;
  onContinue: () => void;
  onRevise: () => void;
}

export function SocraticInterceptor({
  prompt,
  ariScore,
  onContinue,
  onRevise,
}: SocraticInterceptorProps) {
  const [userReflection, setUserReflection] = useState('');

  const getIcon = () => {
    switch (prompt.type) {
      case 'question':
        return '❓';
      case 'reflection':
        return '💭';
      case 'clarification':
        return '🔍';
    }
  };

  const getTypeLabel = () => {
    switch (prompt.type) {
      case 'question':
        return 'Critical Thinking';
      case 'reflection':
        return 'Self-Reflection';
      case 'clarification':
        return 'Clarification Needed';
    }
  };

  return (
    <div className="socratic-interceptor">
      <div className="socratic-header">
        <div className="socratic-icon">{getIcon()}</div>
        <div className="socratic-title">
          <h3>Socratic Co-pilot Mode</h3>
          <span className="socratic-badge">{getTypeLabel()}</span>
        </div>
      </div>

      <div className="socratic-content">
        <div className="socratic-message">
          {prompt.message.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>

        <div className="socratic-guidance">
          <strong>Why this matters:</strong> {prompt.guidance}
        </div>

        <div className="socratic-ari-info">
          <div className="ari-bar-container">
            <div className="ari-label">Your current autonomy level:</div>
            <div className="ari-bar-track">
              <div
                className="ari-bar-fill"
                style={{
                  width: `${ariScore * 100}%`,
                  backgroundColor: ariScore >= 0.65 ? '#48bb78' : ariScore >= 0.4 ? '#ed8936' : '#f56565',
                }}
              />
            </div>
            <div className="ari-value">
              ARI: {ariScore.toFixed(2)} {ariScore < socraticService.getThreshold() && '(Below threshold)'}
            </div>
          </div>
        </div>

        {/* Optional: User reflection textarea */}
        <div className="socratic-reflection-area">
          <label htmlFor="reflection">Take a moment to reflect (optional):</label>
          <textarea
            id="reflection"
            className="socratic-textarea"
            placeholder="Write your thoughts here... What do you already know? What are you trying to understand?"
            value={userReflection}
            onChange={(e) => setUserReflection(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <div className="socratic-actions">
        <button
          className="socratic-btn socratic-btn-revise"
          onClick={onRevise}
          title="Go back and revise your question with more detail"
        >
          📝 Revise My Question
        </button>
        <button
          className="socratic-btn socratic-btn-continue"
          onClick={onContinue}
          title="Continue and get AI response"
        >
          ➡️ Continue Anyway
        </button>
      </div>

      <div className="socratic-footer">
        <small>
          Socratic mode helps you maintain cognitive independence. You can disable this in settings.
        </small>
      </div>
    </div>
  );
}
