/**
 * Encrypted Backup Service for SML Guardian
 *
 * Provides secure, encrypted database backups with:
 * - AES-256-GCM encryption using user passphrase
 * - PBKDF2 key derivation with high iteration count
 * - Backup verification and integrity checks
 * - Scheduled automatic backups
 * - Optional cloud storage integration
 *
 * Security Features:
 * - Strong encryption (AES-256-GCM)
 * - Unique salt and IV for each backup
 * - PBKDF2 with 100,000 iterations
 * - HMAC for integrity verification
 */

import { dbService } from './db.service';
import { storageService } from './storage.service';

/**
 * Encrypted backup metadata
 */
export interface BackupMetadata {
  version: number;
  created_at: string;
  conversation_count: number;
  message_count: number;
  encrypted: boolean;
  algorithm: string;
  salt: string; // Base64 encoded
  iv: string; // Base64 encoded
  hmac: string; // Base64 encoded - for integrity verification
}

/**
 * Encrypted backup structure
 */
export interface EncryptedBackup {
  metadata: BackupMetadata;
  data: string; // Base64 encoded encrypted data
}

/**
 * Backup options
 */
export interface BackupOptions {
  includeMetadata?: boolean;
  compress?: boolean;
  verifyIntegrity?: boolean;
}

/**
 * Restore options
 */
export interface RestoreOptions {
  verifyIntegrity?: boolean;
  clearExisting?: boolean;
}

/**
 * Scheduled backup configuration
 */
export interface BackupScheduleConfig {
  enabled: boolean;
  intervalMinutes: number; // How often to backup
  maxBackups: number; // Maximum number of backups to keep
  autoCleanup: boolean; // Auto-delete old backups
}

class BackupService {
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly SALT_LENGTH = 16; // bytes
  private readonly IV_LENGTH = 12; // bytes for GCM
  private readonly KEY_LENGTH = 256; // bits
  private scheduledBackupTimer: number | null = null;

  /**
   * Create an encrypted backup of the entire database
   */
  async createEncryptedBackup(
    passphrase: string,
    options: BackupOptions = {}
  ): Promise<EncryptedBackup> {
    const { includeMetadata = true, verifyIntegrity = true } = options;

    try {
      console.log('[Backup] Creating encrypted backup...');

      // Get raw database export
      const dbData = await this.exportDatabaseRaw();

      // Get statistics for metadata
      const conversations = dbService.getAllConversations();
      const messages = dbService.getAllMessages();

      // Generate cryptographic materials
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Derive encryption key from passphrase
      const key = await this.deriveKey(passphrase, salt);

      // Encrypt the database
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        dbData
      );

      // Generate HMAC for integrity verification
      const hmacKey = await this.deriveHMACKey(passphrase, salt);
      const hmac = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        new Uint8Array(encryptedData)
      );

      // Create metadata
      const metadata: BackupMetadata = {
        version: 1,
        created_at: new Date().toISOString(),
        conversation_count: conversations.length,
        message_count: messages.length,
        encrypted: true,
        algorithm: 'AES-256-GCM',
        salt: this.arrayBufferToBase64(salt),
        iv: this.arrayBufferToBase64(iv),
        hmac: this.arrayBufferToBase64(hmac),
      };

      const backup: EncryptedBackup = {
        metadata,
        data: this.arrayBufferToBase64(encryptedData),
      };

      console.log('[Backup] ✅ Encrypted backup created successfully');
      console.log(`[Backup] Size: ${encryptedData.byteLength} bytes`);
      console.log(`[Backup] Conversations: ${conversations.length}, Messages: ${messages.length}`);

      return backup;
    } catch (err) {
      console.error('[Backup] ❌ Failed to create encrypted backup:', err);
      throw new Error(`Backup creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore database from encrypted backup
   */
  async restoreFromEncryptedBackup(
    backup: EncryptedBackup,
    passphrase: string,
    options: RestoreOptions = {}
  ): Promise<void> {
    const { verifyIntegrity = true, clearExisting = false } = options;

    try {
      console.log('[Backup] Restoring from encrypted backup...');

      if (!backup.metadata.encrypted) {
        throw new Error('Backup is not encrypted');
      }

      // Decode cryptographic materials
      const salt = this.base64ToArrayBuffer(backup.metadata.salt);
      const iv = this.base64ToArrayBuffer(backup.metadata.iv);
      const encryptedData = this.base64ToArrayBuffer(backup.data);
      const storedHmac = this.base64ToArrayBuffer(backup.metadata.hmac);

      // Verify integrity first
      if (verifyIntegrity) {
        const hmacKey = await this.deriveHMACKey(passphrase, salt);
        const computedHmac = await crypto.subtle.sign(
          'HMAC',
          hmacKey,
          encryptedData
        );

        if (!this.compareArrayBuffers(storedHmac, computedHmac)) {
          throw new Error('Backup integrity check failed! File may be corrupted or tampered with.');
        }
        console.log('[Backup] ✅ Integrity verification passed');
      }

      // Derive decryption key
      const key = await this.deriveKey(passphrase, salt);

      // Decrypt the data
      let decryptedData: ArrayBuffer;
      try {
        decryptedData = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: new Uint8Array(iv),
          },
          key,
          encryptedData
        );
      } catch (err) {
        throw new Error('Decryption failed. Incorrect passphrase or corrupted backup.');
      }

      // Clear existing database if requested
      if (clearExisting) {
        console.log('[Backup] Clearing existing database...');
        await dbService.clearAllData();
      }

      // Restore the database
      await this.importDatabaseRaw(new Uint8Array(decryptedData));

      console.log('[Backup] ✅ Database restored successfully');
      console.log(`[Backup] Restored ${backup.metadata.conversation_count} conversations, ${backup.metadata.message_count} messages`);
    } catch (err) {
      console.error('[Backup] ❌ Restore failed:', err);
      throw new Error(`Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Download encrypted backup as file
   */
  async downloadEncryptedBackup(passphrase: string): Promise<void> {
    try {
      const backup = await this.createEncryptedBackup(passphrase);

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sml-guardian-backup-${Date.now()}.encrypted.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('[Backup] ✅ Encrypted backup downloaded');
    } catch (err) {
      console.error('[Backup] ❌ Download failed:', err);
      throw err;
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleAutoBackup(
    config: BackupScheduleConfig,
    passphrase: string,
    onBackupComplete?: (backup: EncryptedBackup) => void
  ): void {
    // Clear existing schedule
    this.clearAutoBackup();

    if (!config.enabled) {
      console.log('[Backup] Auto-backup disabled');
      return;
    }

    const intervalMs = config.intervalMinutes * 60 * 1000;

    this.scheduledBackupTimer = window.setInterval(async () => {
      try {
        console.log('[Backup] Running scheduled backup...');
        const backup = await this.createEncryptedBackup(passphrase);

        // Store in IndexedDB for local backups
        await this.storeLocalBackup(backup);

        // Cleanup old backups if needed
        if (config.autoCleanup) {
          await this.cleanupOldBackups(config.maxBackups);
        }

        if (onBackupComplete) {
          onBackupComplete(backup);
        }

        console.log('[Backup] ✅ Scheduled backup completed');
      } catch (err) {
        console.error('[Backup] ❌ Scheduled backup failed:', err);
      }
    }, intervalMs);

    console.log(`[Backup] Auto-backup scheduled every ${config.intervalMinutes} minutes`);
  }

  /**
   * Clear scheduled backups
   */
  clearAutoBackup(): void {
    if (this.scheduledBackupTimer !== null) {
      clearInterval(this.scheduledBackupTimer);
      this.scheduledBackupTimer = null;
      console.log('[Backup] Auto-backup cleared');
    }
  }

  /**
   * Verify backup integrity without restoring
   */
  async verifyBackup(backup: EncryptedBackup, passphrase: string): Promise<boolean> {
    try {
      const salt = this.base64ToArrayBuffer(backup.metadata.salt);
      const encryptedData = this.base64ToArrayBuffer(backup.data);
      const storedHmac = this.base64ToArrayBuffer(backup.metadata.hmac);

      const hmacKey = await this.deriveHMACKey(passphrase, salt);
      const computedHmac = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        encryptedData
      );

      return this.compareArrayBuffers(storedHmac, computedHmac);
    } catch (err) {
      console.error('[Backup] Verification failed:', err);
      return false;
    }
  }

  // ===== Private Helper Methods =====

  /**
   * Derive encryption key from passphrase using PBKDF2
   */
  private async deriveKey(
    passphrase: string,
    salt: Uint8Array | ArrayBuffer
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passphraseKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive HMAC key for integrity verification
   */
  private async deriveHMACKey(
    passphrase: string,
    salt: Uint8Array | ArrayBuffer
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passphraseKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  /**
   * Export raw database as Uint8Array
   */
  private async exportDatabaseRaw(): Promise<Uint8Array> {
    // Get the SQLite database export from dbService
    const dbData = await storageService.loadDatabase();

    if (!dbData) {
      // If no data exists, create a minimal database export
      await dbService.save();
      const newData = await storageService.loadDatabase();
      if (!newData) {
        throw new Error('Failed to export database');
      }
      return newData;
    }

    return dbData;
  }

  /**
   * Import raw database from Uint8Array
   */
  private async importDatabaseRaw(data: Uint8Array): Promise<void> {
    await storageService.saveDatabase(data);
    // Force reload of database service to pick up new data
    window.location.reload();
  }

  /**
   * Store backup locally in IndexedDB
   */
  private async storeLocalBackup(backup: EncryptedBackup): Promise<void> {
    const dbName = 'sml_guardian_backups';
    const storeName = 'backups';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        const backupRecord = {
          timestamp: Date.now(),
          backup,
        };

        const addRequest = store.add(backupRecord);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'timestamp' });
        }
      };
    });
  }

  /**
   * Cleanup old backups, keeping only the most recent N
   */
  private async cleanupOldBackups(maxBackups: number): Promise<void> {
    const dbName = 'sml_guardian_backups';
    const storeName = 'backups';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const backups = getAllRequest.result;

          // Sort by timestamp descending
          backups.sort((a, b) => b.timestamp - a.timestamp);

          // Delete old backups beyond max
          const toDelete = backups.slice(maxBackups);
          toDelete.forEach((backup) => {
            store.delete(backup.timestamp);
          });

          console.log(`[Backup] Cleaned up ${toDelete.length} old backups`);
          resolve();
        };

        getAllRequest.onerror = () => reject(getAllRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Compare two ArrayBuffers for equality (constant-time)
   */
  private compareArrayBuffers(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) return false;

    const aView = new Uint8Array(a);
    const bView = new Uint8Array(b);

    let result = 0;
    for (let i = 0; i < aView.length; i++) {
      result |= aView[i] ^ bView[i];
    }

    return result === 0;
  }
}

export const backupService = new BackupService();
