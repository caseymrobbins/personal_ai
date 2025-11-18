/**
 * Encrypted Backup Manager Component
 *
 * Provides UI for:
 * - Creating encrypted backups with passphrase
 * - Restoring from encrypted backups
 * - Scheduling automatic backups
 * - Managing backup history
 * - Verifying backup integrity
 */

import { useState, useRef } from 'react';
import { backupService, type EncryptedBackup, type BackupScheduleConfig } from '../services/backup.service';
import './EncryptedBackupManager.css';

type BackupState = 'idle' | 'creating' | 'restoring' | 'verifying' | 'success' | 'error';

export function EncryptedBackupManager() {
  const [state, setState] = useState<BackupState>('idle');
  const [message, setMessage] = useState<string>('');
  const [createPassphrase, setCreatePassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig>({
    enabled: false,
    intervalMinutes: 60,
    maxBackups: 5,
    autoCleanup: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Create and download encrypted backup
   */
  const handleCreateBackup = async () => {
    if (!createPassphrase || createPassphrase.length < 8) {
      setMessage('❌ Passphrase must be at least 8 characters');
      setState('error');
      return;
    }

    setState('creating');
    setMessage('Creating encrypted backup...');

    try {
      await backupService.downloadEncryptedBackup(createPassphrase);

      setState('success');
      setMessage('✅ Encrypted backup downloaded successfully!');
      setCreatePassphrase('');

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        if (state === 'success') {
          setState('idle');
          setMessage('');
        }
      }, 5000);
    } catch (err) {
      setState('error');
      setMessage(`❌ Backup failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /**
   * Restore from encrypted backup file
   */
  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!restorePassphrase) {
      setMessage('❌ Please enter the backup passphrase');
      setState('error');
      return;
    }

    setState('restoring');
    setMessage('Restoring from encrypted backup...');

    try {
      const content = await file.text();
      const backup: EncryptedBackup = JSON.parse(content);

      // Verify integrity first
      setState('verifying');
      setMessage('Verifying backup integrity...');

      const isValid = await backupService.verifyBackup(backup, restorePassphrase);
      if (!isValid) {
        throw new Error('Backup integrity check failed or incorrect passphrase');
      }

      // Confirm restore
      const confirmed = confirm(
        `Restore backup from ${new Date(backup.metadata.created_at).toLocaleString()}?\n\n` +
        `Conversations: ${backup.metadata.conversation_count}\n` +
        `Messages: ${backup.metadata.message_count}\n\n` +
        `⚠️ This will replace your current database!`
      );

      if (!confirmed) {
        setState('idle');
        setMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Restore
      setState('restoring');
      setMessage('Restoring database...');

      await backupService.restoreFromEncryptedBackup(backup, restorePassphrase, {
        verifyIntegrity: true,
        clearExisting: true,
      });

      setState('success');
      setMessage('✅ Database restored successfully! Page will reload...');

      // Page will reload automatically via backup service

    } catch (err) {
      setState('error');
      setMessage(`❌ Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}`);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Toggle scheduled backups
   */
  const handleToggleSchedule = () => {
    const newEnabled = !scheduleConfig.enabled;

    setScheduleConfig({ ...scheduleConfig, enabled: newEnabled });

    if (newEnabled) {
      if (!createPassphrase || createPassphrase.length < 8) {
        setMessage('❌ Please set a passphrase first');
        setState('error');
        setScheduleConfig({ ...scheduleConfig, enabled: false });
        return;
      }

      backupService.scheduleAutoBackup(
        { ...scheduleConfig, enabled: true },
        createPassphrase,
        (backup) => {
          console.log('[Backup UI] Auto-backup completed', backup);
          setMessage(`✅ Auto-backup created at ${new Date().toLocaleTimeString()}`);
        }
      );

      setMessage(`✅ Scheduled backups enabled (every ${scheduleConfig.intervalMinutes} minutes)`);
      setState('success');
    } else {
      backupService.clearAutoBackup();
      setMessage('Scheduled backups disabled');
      setState('idle');
    }
  };

  return (
    <div className="encrypted-backup-manager">
      <div className="backup-header">
        <h3>🔐 Encrypted Backups</h3>
        <p className="backup-description">
          Create secure, encrypted backups of your entire database using a passphrase.
          Backups use AES-256-GCM encryption with PBKDF2 key derivation.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`backup-message ${state}`}>
          {message}
        </div>
      )}

      {/* Create Backup Section */}
      <div className="backup-section">
        <h4>📦 Create Encrypted Backup</h4>

        <div className="form-group">
          <label htmlFor="create-passphrase">Backup Passphrase</label>
          <div className="passphrase-input-group">
            <input
              id="create-passphrase"
              type={showPassphrase ? 'text' : 'password'}
              value={createPassphrase}
              onChange={(e) => setCreatePassphrase(e.target.value)}
              placeholder="Enter a strong passphrase (min 8 characters)"
              minLength={8}
              disabled={state === 'creating'}
              className="passphrase-input"
            />
            <button
              type="button"
              onClick={() => setShowPassphrase(!showPassphrase)}
              className="toggle-passphrase-btn"
              title={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
            >
              {showPassphrase ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <small className="input-hint">
            Use a strong, unique passphrase. You'll need it to restore the backup.
          </small>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={state === 'creating' || !createPassphrase || createPassphrase.length < 8}
          className="backup-button primary"
        >
          {state === 'creating' ? '⏳ Creating Backup...' : '📥 Create & Download Backup'}
        </button>
      </div>

      {/* Restore Backup Section */}
      <div className="backup-section">
        <h4>📤 Restore from Encrypted Backup</h4>

        <div className="form-group">
          <label htmlFor="restore-passphrase">Backup Passphrase</label>
          <input
            id="restore-passphrase"
            type={showPassphrase ? 'text' : 'password'}
            value={restorePassphrase}
            onChange={(e) => setRestorePassphrase(e.target.value)}
            placeholder="Enter the passphrase used to create the backup"
            disabled={state === 'restoring' || state === 'verifying'}
            className="passphrase-input"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleRestoreBackup}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={state === 'restoring' || state === 'verifying' || !restorePassphrase}
          className="backup-button secondary"
        >
          {state === 'restoring' ? '⏳ Restoring...' : state === 'verifying' ? '🔍 Verifying...' : '📁 Select Backup File'}
        </button>
      </div>

      {/* Scheduled Backups Section */}
      <div className="backup-section">
        <h4>⏰ Scheduled Automatic Backups</h4>

        <div className="schedule-controls">
          <label className="schedule-toggle">
            <input
              type="checkbox"
              checked={scheduleConfig.enabled}
              onChange={handleToggleSchedule}
              disabled={state === 'creating' || state === 'restoring'}
            />
            <span>Enable automatic backups</span>
          </label>

          {scheduleConfig.enabled && (
            <>
              <div className="form-group">
                <label htmlFor="backup-interval">Backup Interval (minutes)</label>
                <input
                  id="backup-interval"
                  type="number"
                  min="5"
                  max="1440"
                  value={scheduleConfig.intervalMinutes}
                  onChange={(e) =>
                    setScheduleConfig({ ...scheduleConfig, intervalMinutes: parseInt(e.target.value) })
                  }
                  className="interval-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="max-backups">Maximum Backups to Keep</label>
                <input
                  id="max-backups"
                  type="number"
                  min="1"
                  max="50"
                  value={scheduleConfig.maxBackups}
                  onChange={(e) =>
                    setScheduleConfig({ ...scheduleConfig, maxBackups: parseInt(e.target.value) })
                  }
                  className="interval-input"
                />
              </div>

              <label className="schedule-toggle">
                <input
                  type="checkbox"
                  checked={scheduleConfig.autoCleanup}
                  onChange={(e) =>
                    setScheduleConfig({ ...scheduleConfig, autoCleanup: e.target.checked })
                  }
                />
                <span>Automatically delete old backups</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Security Information */}
      <div className="backup-info">
        <h5>🛡️ Security Features</h5>
        <ul>
          <li><strong>AES-256-GCM:</strong> Industry-standard encryption algorithm</li>
          <li><strong>PBKDF2:</strong> 100,000 iterations for key derivation</li>
          <li><strong>Unique Salt & IV:</strong> Each backup has unique cryptographic materials</li>
          <li><strong>HMAC Verification:</strong> Detects file tampering or corruption</li>
          <li><strong>Local Storage:</strong> Backups never leave your device</li>
        </ul>
      </div>

      {/* Best Practices */}
      <div className="backup-info warning">
        <h5>⚠️ Important Notes</h5>
        <ul>
          <li>Store your passphrase in a secure password manager</li>
          <li>Without the passphrase, backups cannot be decrypted</li>
          <li>Regular backups protect against data loss</li>
          <li>Test restore functionality periodically</li>
          <li>Keep backups in multiple secure locations</li>
        </ul>
      </div>
    </div>
  );
}
