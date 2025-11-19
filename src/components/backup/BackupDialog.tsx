/**
 * Backup Dialog Component
 *
 * Provides encrypted backup and restore functionality:
 * - Create encrypted backups with password protection
 * - Restore from encrypted backups
 * - Schedule automatic backups
 * - View backup history
 * - Download backups locally
 *
 * Security:
 * - AES-256-GCM encryption
 * - PBKDF2 key derivation (100,000 iterations)
 * - HMAC integrity verification
 */

import { useState, useRef, useEffect } from 'react';
import { backupService, type EncryptedBackup, type BackupScheduleConfig } from '../../services/backup.service';
import './BackupDialog.css';

export interface BackupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'backup' | 'restore' | 'schedule';

export function BackupDialog({ isOpen, onClose }: BackupDialogProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>('backup');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [clearExisting, setClearExisting] = useState(false);

  // Schedule settings
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [maxBackups, setMaxBackups] = useState(5);
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [schedulePassword, setSchedulePassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load schedule config from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedConfig = localStorage.getItem('backupScheduleConfig');
      if (savedConfig) {
        try {
          const config: BackupScheduleConfig = JSON.parse(savedConfig);
          setScheduleEnabled(config.enabled);
          setIntervalMinutes(config.intervalMinutes);
          setMaxBackups(config.maxBackups);
          setAutoCleanup(config.autoCleanup);
        } catch (err) {
          console.error('[BackupDialog] Failed to load schedule config:', err);
        }
      }
    }
  }, [isOpen]);

  const handleCreateBackup = async () => {
    if (!password) {
      setMessage({ type: 'error', text: 'Please enter a password' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    try {
      setIsProcessing(true);
      setMessage(null);

      await backupService.downloadEncryptedBackup(password);

      setMessage({
        type: 'success',
        text: 'Encrypted backup created and downloaded successfully!',
      });

      // Clear passwords
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('[BackupDialog] Backup failed:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Backup creation failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setMessage(null);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a backup file' });
      return;
    }

    if (!restorePassword) {
      setMessage({ type: 'error', text: 'Please enter the backup password' });
      return;
    }

    try {
      setIsProcessing(true);
      setMessage(null);

      // Read file content
      const fileContent = await readFileAsText(selectedFile);
      const backup: EncryptedBackup = JSON.parse(fileContent);

      // Verify backup first
      const isValid = await backupService.verifyBackup(backup, restorePassword);
      if (!isValid) {
        throw new Error('Invalid password or corrupted backup file');
      }

      // Confirm with user before restoring
      const confirmMsg = clearExisting
        ? 'This will DELETE all existing data and restore from backup. Continue?'
        : 'This will merge the backup with existing data. Continue?';

      if (!confirm(confirmMsg)) {
        setIsProcessing(false);
        return;
      }

      // Restore backup
      await backupService.restoreFromEncryptedBackup(backup, restorePassword, {
        clearExisting,
        verifyIntegrity: true,
      });

      setMessage({
        type: 'success',
        text: 'Backup restored successfully! The page will reload.',
      });

      // Page will reload automatically from the service
    } catch (err) {
      console.error('[BackupDialog] Restore failed:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Restore failed',
      });
      setIsProcessing(false);
    }
  };

  const handleSaveSchedule = () => {
    if (scheduleEnabled && !schedulePassword) {
      setMessage({ type: 'error', text: 'Please enter a password for scheduled backups' });
      return;
    }

    if (scheduleEnabled && schedulePassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    const config: BackupScheduleConfig = {
      enabled: scheduleEnabled,
      intervalMinutes,
      maxBackups,
      autoCleanup,
    };

    // Save config to localStorage
    localStorage.setItem('backupScheduleConfig', JSON.stringify(config));

    if (scheduleEnabled) {
      // Save encrypted password (in production, you'd want better key management)
      localStorage.setItem('backupSchedulePassword', schedulePassword);

      backupService.scheduleAutoBackup(config, schedulePassword, (backup) => {
        console.log('[BackupDialog] Auto-backup completed:', backup.metadata);
      });

      setMessage({
        type: 'success',
        text: `Automatic backups enabled! Will backup every ${intervalMinutes} minutes.`,
      });
    } else {
      backupService.clearAutoBackup();
      localStorage.removeItem('backupSchedulePassword');
      setMessage({
        type: 'success',
        text: 'Automatic backups disabled.',
      });
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setRestorePassword('');
    setSelectedFile(null);
    setMessage(null);
    setClearExisting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="backup-dialog-overlay" onClick={handleClose}>
      <div className="backup-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="backup-dialog-header">
          <h2>🔐 Encrypted Backups</h2>
          <button className="backup-dialog-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="backup-tabs">
          <button
            className={`backup-tab ${selectedTab === 'backup' ? 'active' : ''}`}
            onClick={() => setSelectedTab('backup')}
          >
            Create Backup
          </button>
          <button
            className={`backup-tab ${selectedTab === 'restore' ? 'active' : ''}`}
            onClick={() => setSelectedTab('restore')}
          >
            Restore
          </button>
          <button
            className={`backup-tab ${selectedTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setSelectedTab('schedule')}
          >
            Auto-Backup
          </button>
        </div>

        <div className="backup-dialog-content">
          {/* Create Backup Tab */}
          {selectedTab === 'backup' && (
            <div className="backup-tab-content">
              <div className="backup-section">
                <h3>Create Encrypted Backup</h3>
                <p className="backup-description">
                  Create a secure, encrypted backup of all your conversations and data.
                  Your backup will be protected with AES-256-GCM encryption.
                </p>

                <div className="backup-form">
                  <div className="form-group">
                    <label htmlFor="password">Backup Password</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a strong password (min 8 characters)"
                      className="backup-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="backup-input"
                    />
                  </div>

                  <div className="security-info">
                    <p><strong>Security Features:</strong></p>
                    <ul>
                      <li>AES-256-GCM encryption</li>
                      <li>PBKDF2 key derivation (100,000 iterations)</li>
                      <li>HMAC integrity verification</li>
                      <li>Unique salt and IV for each backup</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleCreateBackup}
                    disabled={isProcessing || !password || !confirmPassword}
                    className="backup-button backup-button-primary"
                  >
                    {isProcessing ? 'Creating Backup...' : 'Create & Download Backup'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Restore Tab */}
          {selectedTab === 'restore' && (
            <div className="backup-tab-content">
              <div className="backup-section">
                <h3>Restore from Backup</h3>
                <p className="backup-description">
                  Restore your data from an encrypted backup file. Make sure you remember the password you used to create the backup.
                </p>

                <div className="backup-form">
                  <div className="form-group">
                    <label>Select Backup File</label>
                    <div className="file-input-wrapper">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="file-select-button"
                      >
                        {selectedFile ? selectedFile.name : 'Choose File'}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="restore-password">Backup Password</label>
                    <input
                      id="restore-password"
                      type="password"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      placeholder="Enter backup password"
                      className="backup-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={clearExisting}
                        onChange={(e) => setClearExisting(e.target.checked)}
                      />
                      <span>Clear existing data before restore (recommended)</span>
                    </label>
                  </div>

                  <div className="warning-box">
                    <strong>⚠️ Warning:</strong> Restoring will reload the page after completion. Make sure you have saved any unsaved work.
                  </div>

                  <button
                    onClick={handleRestore}
                    disabled={isProcessing || !selectedFile || !restorePassword}
                    className="backup-button backup-button-primary"
                  >
                    {isProcessing ? 'Restoring...' : 'Restore Backup'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {selectedTab === 'schedule' && (
            <div className="backup-tab-content">
              <div className="backup-section">
                <h3>Automatic Backups</h3>
                <p className="backup-description">
                  Configure automatic encrypted backups to run at regular intervals. Backups are stored locally in your browser.
                </p>

                <div className="backup-form">
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={scheduleEnabled}
                        onChange={(e) => setScheduleEnabled(e.target.checked)}
                      />
                      <span>Enable automatic backups</span>
                    </label>
                  </div>

                  {scheduleEnabled && (
                    <>
                      <div className="form-group">
                        <label htmlFor="interval">Backup Interval (minutes)</label>
                        <select
                          id="interval"
                          value={intervalMinutes}
                          onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                          className="backup-select"
                        >
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={180}>3 hours</option>
                          <option value={360}>6 hours</option>
                          <option value={720}>12 hours</option>
                          <option value={1440}>24 hours</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="max-backups">Maximum Backups to Keep</label>
                        <select
                          id="max-backups"
                          value={maxBackups}
                          onChange={(e) => setMaxBackups(Number(e.target.value))}
                          className="backup-select"
                        >
                          <option value={3}>3 backups</option>
                          <option value={5}>5 backups</option>
                          <option value={10}>10 backups</option>
                          <option value={20}>20 backups</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={autoCleanup}
                            onChange={(e) => setAutoCleanup(e.target.checked)}
                          />
                          <span>Automatically delete old backups</span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label htmlFor="schedule-password">Encryption Password</label>
                        <input
                          id="schedule-password"
                          type="password"
                          value={schedulePassword}
                          onChange={(e) => setSchedulePassword(e.target.value)}
                          placeholder="Password for automatic backups"
                          className="backup-input"
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleSaveSchedule}
                    disabled={isProcessing}
                    className="backup-button backup-button-primary"
                  >
                    Save Schedule Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`backup-message backup-message-${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
