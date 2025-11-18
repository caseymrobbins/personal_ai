/**
 * Model Loading Progress Component
 *
 * Displays the progress of local Phi-3 model initialization
 * Shows download progress, phase information, and estimated time
 */

import React, { useEffect, useState } from 'react';
import './ModelLoadingProgress.css';

interface ModelLoadingProgressProps {
  progress: number; // 0-1
  status: 'idle' | 'downloading' | 'initializing' | 'ready' | 'error';
  downloadedBytes?: number;
  totalBytes?: number;
  estimatedTimeRemaining?: number;
  error?: string;
  onCancel?: () => void;
}

export const ModelLoadingProgress: React.FC<ModelLoadingProgressProps> = ({
  progress,
  status,
  downloadedBytes = 0,
  totalBytes = 0,
  estimatedTimeRemaining,
  error,
  onCancel,
}) => {
  const [displayPhase, setDisplayPhase] = useState<string>('');

  useEffect(() => {
    // Determine which phase to display
    if (status === 'downloading') {
      setDisplayPhase('Downloading model...');
    } else if (status === 'initializing') {
      setDisplayPhase('Initializing inference engine...');
    } else if (status === 'ready') {
      setDisplayPhase('Ready to chat');
    } else if (status === 'error') {
      setDisplayPhase('Error loading model');
    } else {
      setDisplayPhase('');
    }
  }, [status]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms?: number): string => {
    if (!ms) return '';
    if (ms < 1000) return '< 1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const downloadSpeed = downloadedBytes > 0 && totalBytes > 0
    ? ((downloadedBytes / 1024 / 1024) / ((Date.now() - (Date.now() - downloadedBytes)) / 1000)).toFixed(2)
    : '0';

  if (status === 'idle' || status === 'ready') {
    if (status === 'ready') {
      return (
        <div className="model-loading-progress model-ready">
          <div className="progress-content">
            <span className="status-emoji">✓</span>
            <span className="status-text">Local model ready</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`model-loading-progress ${status === 'error' ? 'error' : ''}`}>
      <div className="progress-header">
        <h3 className="progress-title">
          {status === 'error' ? '⚠️' : '⬇️'} {displayPhase}
        </h3>
        {onCancel && status !== 'error' && (
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            >
              <span className="progress-percentage">{Math.round(progress * 100)}%</span>
            </div>
          </div>

          {status === 'downloading' && totalBytes > 0 && (
            <div className="progress-details">
              <div className="detail-row">
                <span>Downloaded:</span>
                <span>
                  {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                </span>
              </div>
              <div className="detail-row">
                <span>Speed:</span>
                <span>{downloadSpeed} MB/s</span>
              </div>
              {estimatedTimeRemaining && (
                <div className="detail-row">
                  <span>Time remaining:</span>
                  <span>{formatTime(estimatedTimeRemaining)}</span>
                </div>
              )}
            </div>
          )}

          {status === 'initializing' && (
            <div className="progress-details">
              <div className="detail-row">
                <span className="initializing-spinner">⚙️</span>
                <span>Setting up inference engine...</span>
              </div>
            </div>
          )}
        </>
      )}

      <p className="progress-note">
        {status === 'downloading'
          ? 'Please keep this tab open. Download may take several minutes.'
          : status === 'initializing'
          ? 'This is a one-time initialization. Subsequent loads will be faster.'
          : null}
      </p>
    </div>
  );
};
