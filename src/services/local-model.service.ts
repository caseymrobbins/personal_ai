/**
 * Local Model Service
 *
 * Manages the local Phi-3 model lifecycle including:
 * - State tracking (downloading, initializing, ready, error)
 * - Progress monitoring during initialization
 * - Performance metrics collection
 * - User preferences for model behavior
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from './db.service';
import { LocalModelState, LocalModelMetrics, LocalModelPreferences } from './db.service';

const MODEL_ID = 'phi-3-mini-4k-instruct-q4f16_1-mlc';

class LocalModelService {
  /**
   * Initialize model state tracking
   */
  async initializeModelState(): Promise<LocalModelState> {
    const existingState = this.getModelState();
    if (existingState) {
      return existingState;
    }

    const state: LocalModelState = {
      id: uuidv4(),
      model_id: MODEL_ID,
      status: 'idle',
      progress: 0,
      downloaded_bytes: 0,
      total_bytes: 0,
      last_activity: Date.now(),
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    db.run(
      `INSERT INTO local_model_state (
        id, model_id, status, progress, downloaded_bytes, total_bytes,
        last_activity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        state.id,
        state.model_id,
        state.status,
        state.progress,
        state.downloaded_bytes,
        state.total_bytes,
        state.last_activity,
        state.created_at,
        state.updated_at,
      ]
    );

    return state;
  }

  /**
   * Get current model state
   */
  getModelState(): LocalModelState | null {
    const result = db.exec(
      `SELECT * FROM local_model_state WHERE model_id = ? LIMIT 1`,
      [MODEL_ID]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    const columns = result[0].columns;

    return this.rowToModelState(row, columns);
  }

  /**
   * Update model state during initialization
   */
  updateModelState(updates: Partial<LocalModelState>): void {
    const setClauses: string[] = [];
    const values: any[] = [];

    // Build dynamic SQL based on what's being updated
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.progress !== undefined) {
      setClauses.push('progress = ?');
      values.push(Math.min(1, Math.max(0, updates.progress))); // Clamp to 0-1
    }
    if (updates.downloaded_bytes !== undefined) {
      setClauses.push('downloaded_bytes = ?');
      values.push(updates.downloaded_bytes);
    }
    if (updates.total_bytes !== undefined) {
      setClauses.push('total_bytes = ?');
      values.push(updates.total_bytes);
    }
    if (updates.error_message !== undefined) {
      setClauses.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.cache_path !== undefined) {
      setClauses.push('cache_path = ?');
      values.push(updates.cache_path);
    }
    if (updates.initialization_timestamp !== undefined) {
      setClauses.push('initialization_timestamp = ?');
      values.push(updates.initialization_timestamp);
    }

    // Always update last_activity and updated_at
    setClauses.push('last_activity = ?');
    values.push(Date.now());
    setClauses.push('updated_at = ?');
    values.push(Date.now());

    values.push(MODEL_ID);

    const sql = `UPDATE local_model_state SET ${setClauses.join(', ')} WHERE model_id = ?`;
    db.run(sql, values);
  }

  /**
   * Record initialization progress (0-1 scale)
   */
  recordDownloadProgress(progress: number, downloadedBytes: number, totalBytes: number): void {
    this.updateModelState({
      status: progress < 1 ? 'downloading' : 'initializing',
      progress,
      downloaded_bytes: downloadedBytes,
      total_bytes: totalBytes,
    });
  }

  /**
   * Mark model as ready
   */
  markModelReady(loadDurationMs: number): void {
    const now = Date.now();

    this.updateModelState({
      status: 'ready',
      progress: 1,
      initialization_timestamp: now,
      error_message: undefined,
    });

    // Record metrics
    const metricsId = uuidv4();
    db.run(
      `INSERT INTO local_model_metrics (
        id, model_id, load_duration_ms, initialization_errors,
        failed_attempts, last_successful_load, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [metricsId, MODEL_ID, loadDurationMs, 0, 0, now, now]
    );
  }

  /**
   * Mark model as errored
   */
  markModelError(errorMessage: string): void {
    this.updateModelState({
      status: 'error',
      error_message: errorMessage,
    });

    // Increment failed attempts in latest metrics
    const latestMetrics = this.getLatestMetrics();
    if (latestMetrics) {
      const failedAttempts = (latestMetrics.failed_attempts || 0) + 1;
      const errorCount = (latestMetrics.initialization_errors || 0) + 1;

      db.run(
        `UPDATE local_model_metrics SET
          failed_attempts = ?, initialization_errors = ?, created_at = ?
          WHERE id = ?`,
        [failedAttempts, errorCount, Date.now(), latestMetrics.id]
      );
    }
  }

  /**
   * Get latest performance metrics
   */
  getLatestMetrics(): LocalModelMetrics | null {
    const result = db.exec(
      `SELECT * FROM local_model_metrics
       WHERE model_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [MODEL_ID]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    const columns = result[0].columns;

    return this.rowToMetrics(row, columns);
  }

  /**
   * Get all metrics for the model
   */
  getMetricsHistory(limit: number = 10): LocalModelMetrics[] {
    const result = db.exec(
      `SELECT * FROM local_model_metrics
       WHERE model_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [MODEL_ID, limit]
    );

    if (result.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map((row) => this.rowToMetrics(row, columns));
  }

  /**
   * Initialize or get user preferences
   */
  async initializePreferences(): Promise<LocalModelPreferences> {
    const existing = this.getPreferences();
    if (existing) {
      return existing;
    }

    const prefs: LocalModelPreferences = {
      id: uuidv4(),
      auto_load_model: false,
      enable_gpu: true,
      max_memory_mb: 4096,
      download_priority: 'balanced',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    db.run(
      `INSERT INTO local_model_preferences (
        id, auto_load_model, enable_gpu, max_memory_mb,
        download_priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        prefs.id,
        prefs.auto_load_model ? 1 : 0,
        prefs.enable_gpu ? 1 : 0,
        prefs.max_memory_mb,
        prefs.download_priority,
        prefs.created_at,
        prefs.updated_at,
      ]
    );

    return prefs;
  }

  /**
   * Get user preferences
   */
  getPreferences(): LocalModelPreferences | null {
    const result = db.exec(`SELECT * FROM local_model_preferences LIMIT 1`);

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    const columns = result[0].columns;

    return this.rowToPreferences(row, columns);
  }

  /**
   * Update user preferences
   */
  updatePreferences(updates: Partial<LocalModelPreferences>): void {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.auto_load_model !== undefined) {
      setClauses.push('auto_load_model = ?');
      values.push(updates.auto_load_model ? 1 : 0);
    }
    if (updates.enable_gpu !== undefined) {
      setClauses.push('enable_gpu = ?');
      values.push(updates.enable_gpu ? 1 : 0);
    }
    if (updates.max_memory_mb !== undefined) {
      setClauses.push('max_memory_mb = ?');
      values.push(Math.max(1024, updates.max_memory_mb)); // Minimum 1GB
    }
    if (updates.download_priority !== undefined) {
      setClauses.push('download_priority = ?');
      values.push(updates.download_priority);
    }
    if (updates.cache_bust_age_days !== undefined) {
      setClauses.push('cache_bust_age_days = ?');
      values.push(updates.cache_bust_age_days);
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push('updated_at = ?');
    values.push(Date.now());

    const sql = `UPDATE local_model_preferences SET ${setClauses.join(', ')}`;
    db.run(sql, values);
  }

  /**
   * Get model status summary for UI
   */
  getModelStatus(): {
    ready: boolean;
    loading: boolean;
    progress: number;
    error?: string;
    downloadedBytes?: number;
    totalBytes?: number;
    estimatedTimeRemaining?: number;
  } {
    const state = this.getModelState();
    if (!state) {
      return { ready: false, loading: false, progress: 0 };
    }

    const isReady = state.status === 'ready';
    const isLoading = state.status === 'downloading' || state.status === 'initializing';

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (isLoading && state.downloaded_bytes > 0 && state.total_bytes > 0) {
      const bytesPerMs = state.downloaded_bytes / (Date.now() - state.created_at);
      const remainingBytes = state.total_bytes - state.downloaded_bytes;
      estimatedTimeRemaining = Math.ceil(remainingBytes / bytesPerMs);
    }

    return {
      ready: isReady,
      loading: isLoading,
      progress: state.progress,
      error: state.error_message,
      downloadedBytes: state.downloaded_bytes,
      totalBytes: state.total_bytes,
      estimatedTimeRemaining,
    };
  }

  /**
   * Clear all cached model data (for troubleshooting)
   */
  clearModelCache(): void {
    const state = this.getModelState();
    if (state) {
      this.updateModelState({
        status: 'idle',
        progress: 0,
        downloaded_bytes: 0,
        total_bytes: 0,
        error_message: undefined,
      });
    }
  }

  /**
   * Helper: Convert database row to LocalModelState
   */
  private rowToModelState(row: any[], columns: string[]): LocalModelState {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      id: obj.id,
      model_id: obj.model_id,
      status: obj.status,
      progress: obj.progress,
      downloaded_bytes: obj.downloaded_bytes,
      total_bytes: obj.total_bytes,
      initialization_timestamp: obj.initialization_timestamp,
      last_activity: obj.last_activity,
      error_message: obj.error_message,
      cache_path: obj.cache_path,
      storage_quota_bytes: obj.storage_quota_bytes,
      created_at: obj.created_at,
      updated_at: obj.updated_at,
    };
  }

  /**
   * Helper: Convert database row to LocalModelMetrics
   */
  private rowToMetrics(row: any[], columns: string[]): LocalModelMetrics {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      id: obj.id,
      model_id: obj.model_id,
      load_duration_ms: obj.load_duration_ms,
      peak_memory_mb: obj.peak_memory_mb,
      initialization_errors: obj.initialization_errors,
      failed_attempts: obj.failed_attempts,
      last_successful_load: obj.last_successful_load,
      created_at: obj.created_at,
    };
  }

  /**
   * Helper: Convert database row to LocalModelPreferences
   */
  private rowToPreferences(row: any[], columns: string[]): LocalModelPreferences {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      id: obj.id,
      auto_load_model: obj.auto_load_model === 1,
      enable_gpu: obj.enable_gpu === 1,
      max_memory_mb: obj.max_memory_mb,
      download_priority: obj.download_priority,
      cache_bust_age_days: obj.cache_bust_age_days,
      created_at: obj.created_at,
      updated_at: obj.updated_at,
    };
  }
}

// Export singleton instance
export const localModelService = new LocalModelService();
