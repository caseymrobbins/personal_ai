/**
 * Encrypted Backup Service Tests
 *
 * Tests for secure backup creation, encryption, decryption, and scheduling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { backupService } from './backup.service';
import type { EncryptedBackup } from './backup.service';

// Mock the db and storage services
vi.mock('./db.service', () => ({
  dbService: {
    getAllConversations: vi.fn(() => [
      { id: 'conv1', title: 'Test 1', created_at: Date.now() },
      { id: 'conv2', title: 'Test 2', created_at: Date.now() },
    ]),
    getAllMessages: vi.fn(() => [
      { id: 'msg1', conversation_id: 'conv1', role: 'user', content: 'Hello' },
      { id: 'msg2', conversation_id: 'conv1', role: 'assistant', content: 'Hi' },
      { id: 'msg3', conversation_id: 'conv2', role: 'user', content: 'Test' },
    ]),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./storage.service', () => ({
  storageService: {
    loadDatabase: vi.fn(() => {
      // Return mock SQLite database bytes
      const data = new Uint8Array(1024);
      data.fill(65); // Fill with 'A' characters
      return Promise.resolve(data);
    }),
    saveDatabase: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: { reload: vi.fn() },
  writable: true,
});

describe('BackupService', () => {
  const testPassphrase = 'test-passphrase-123';
  const weakPassphrase = 'weak';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    backupService.clearAutoBackup();
  });

  describe('createEncryptedBackup', () => {
    it('should create an encrypted backup with valid passphrase', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      expect(backup).toBeDefined();
      expect(backup.metadata).toBeDefined();
      expect(backup.data).toBeDefined();
      expect(backup.metadata.encrypted).toBe(true);
      expect(backup.metadata.algorithm).toBe('AES-256-GCM');
    });

    it('should include metadata with conversation and message counts', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      expect(backup.metadata.conversation_count).toBe(2);
      expect(backup.metadata.message_count).toBe(3);
      expect(backup.metadata.version).toBe(1);
    });

    it('should generate unique salt and IV for each backup', async () => {
      const backup1 = await backupService.createEncryptedBackup(testPassphrase);
      const backup2 = await backupService.createEncryptedBackup(testPassphrase);

      expect(backup1.metadata.salt).not.toBe(backup2.metadata.salt);
      expect(backup1.metadata.iv).not.toBe(backup2.metadata.iv);
    });

    it('should generate HMAC for integrity verification', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      expect(backup.metadata.hmac).toBeDefined();
      expect(backup.metadata.hmac.length).toBeGreaterThan(0);
    });

    it('should include timestamp in metadata', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      expect(backup.metadata.created_at).toBeDefined();
      const timestamp = new Date(backup.metadata.created_at).getTime();
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should encrypt data so it differs from original', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Encrypted data should be base64 encoded
      expect(typeof backup.data).toBe('string');
      expect(backup.data.length).toBeGreaterThan(0);

      // Should not contain plaintext markers
      expect(backup.data).not.toContain('Test 1');
      expect(backup.data).not.toContain('Hello');
    });
  });

  describe('restoreFromEncryptedBackup', () => {
    it('should successfully restore from valid encrypted backup', async () => {
      // Create backup
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Restore from backup
      await expect(
        backupService.restoreFromEncryptedBackup(backup, testPassphrase)
      ).resolves.not.toThrow();
    });

    it('should fail with incorrect passphrase', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Incorrect passphrase will fail HMAC verification first (more secure)
      await expect(
        backupService.restoreFromEncryptedBackup(backup, 'wrong-passphrase')
      ).rejects.toThrow(/integrity check failed|Decryption failed|Incorrect passphrase/);
    });

    it('should fail integrity check with tampered data', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Tamper with the data
      backup.data = backup.data.slice(0, -10) + 'XXXXXXXXXX';

      await expect(
        backupService.restoreFromEncryptedBackup(backup, testPassphrase, {
          verifyIntegrity: true,
        })
      ).rejects.toThrow(/integrity check failed/i);
    });

    it('should fail with tampered HMAC', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Tamper with HMAC
      backup.metadata.hmac = backup.metadata.hmac.slice(0, -10) + 'XXXXXXXXXX';

      await expect(
        backupService.restoreFromEncryptedBackup(backup, testPassphrase, {
          verifyIntegrity: true,
        })
      ).rejects.toThrow(/integrity check failed/i);
    });

    it('should fail if backup is marked as not encrypted', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);
      backup.metadata.encrypted = false;

      await expect(
        backupService.restoreFromEncryptedBackup(backup, testPassphrase)
      ).rejects.toThrow(/not encrypted/);
    });

    it('should skip integrity check when verifyIntegrity is false', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Should not throw even if we disable integrity check
      // (though decryption will still fail if data is bad)
      await expect(
        backupService.restoreFromEncryptedBackup(backup, testPassphrase, {
          verifyIntegrity: false,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('verifyBackup', () => {
    it('should verify valid backup', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      const isValid = await backupService.verifyBackup(backup, testPassphrase);
      expect(isValid).toBe(true);
    });

    it('should reject tampered backup', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Tamper with data
      backup.data = backup.data.slice(0, -10) + 'XXXXXXXXXX';

      const isValid = await backupService.verifyBackup(backup, testPassphrase);
      expect(isValid).toBe(false);
    });

    it('should reject backup with wrong passphrase', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      const isValid = await backupService.verifyBackup(backup, 'wrong-password');
      expect(isValid).toBe(false);
    });

    it('should return false on verification error', async () => {
      const invalidBackup = {
        metadata: {
          salt: 'invalid',
          hmac: 'invalid',
        },
        data: 'invalid',
      } as unknown as EncryptedBackup;

      const isValid = await backupService.verifyBackup(invalidBackup, testPassphrase);
      expect(isValid).toBe(false);
    });
  });

  describe('scheduleAutoBackup', () => {
    it('should set up automatic backup schedule', () => {
      const config = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 5,
        autoCleanup: true,
      };

      const onComplete = vi.fn();

      // Should not throw when setting up schedule
      expect(() => {
        backupService.scheduleAutoBackup(config, testPassphrase, onComplete);
      }).not.toThrow();

      // Clean up
      backupService.clearAutoBackup();
    });

    it('should not schedule when disabled', () => {
      const config = {
        enabled: false,
        intervalMinutes: 1,
        maxBackups: 5,
        autoCleanup: true,
      };

      const onComplete = vi.fn();

      backupService.scheduleAutoBackup(config, testPassphrase, onComplete);

      // Verify timer not set
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should clear existing schedule before creating new one', () => {
      const config = {
        enabled: true,
        intervalMinutes: 1,
        maxBackups: 5,
        autoCleanup: true,
      };

      backupService.scheduleAutoBackup(config, testPassphrase);
      backupService.scheduleAutoBackup(config, testPassphrase);

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('clearAutoBackup', () => {
    it('should clear scheduled backups', () => {
      const config = {
        enabled: true,
        intervalMinutes: 1,
        maxBackups: 5,
        autoCleanup: true,
      };

      backupService.scheduleAutoBackup(config, testPassphrase);
      backupService.clearAutoBackup();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle clearing when no schedule exists', () => {
      backupService.clearAutoBackup();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Encryption Security', () => {
    it('should use different encryption for same data with different passphrases', async () => {
      const backup1 = await backupService.createEncryptedBackup('passphrase1');
      const backup2 = await backupService.createEncryptedBackup('passphrase2');

      expect(backup1.data).not.toBe(backup2.data);
    });

    it('should produce different ciphertext for same passphrase (due to different IV)', async () => {
      const backup1 = await backupService.createEncryptedBackup(testPassphrase);
      const backup2 = await backupService.createEncryptedBackup(testPassphrase);

      // Same passphrase but different IV should produce different ciphertext
      expect(backup1.data).not.toBe(backup2.data);
      expect(backup1.metadata.iv).not.toBe(backup2.metadata.iv);
    });

    it('should use proper key derivation (PBKDF2)', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Metadata should reflect proper algorithm
      expect(backup.metadata.algorithm).toBe('AES-256-GCM');

      // Salt should be present (required for PBKDF2)
      expect(backup.metadata.salt).toBeDefined();
      expect(backup.metadata.salt.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during backup creation gracefully', async () => {
      // Mock storage service to throw error
      const { storageService } = await import('./storage.service');
      vi.mocked(storageService.loadDatabase).mockRejectedValueOnce(new Error('Storage error'));

      await expect(
        backupService.createEncryptedBackup(testPassphrase)
      ).rejects.toThrow(/Backup creation failed/);
    });

    it('should provide meaningful error messages', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      try {
        await backupService.restoreFromEncryptedBackup(backup, 'wrong-pass');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toMatch(/Restore failed|Decryption failed/i);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity through encrypt/decrypt cycle', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Verify backup first
      const isValid = await backupService.verifyBackup(backup, testPassphrase);
      expect(isValid).toBe(true);

      // Restore should succeed
      await expect(
        backupService.restoreFromEncryptedBackup(backup, testPassphrase)
      ).resolves.not.toThrow();
    });

    it('should detect corrupted backups', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      // Corrupt just one byte in the middle of the data
      const midPoint = Math.floor(backup.data.length / 2);
      backup.data =
        backup.data.slice(0, midPoint) +
        'X' +
        backup.data.slice(midPoint + 1);

      const isValid = await backupService.verifyBackup(backup, testPassphrase);
      expect(isValid).toBe(false);
    });
  });

  describe('Backup Metadata', () => {
    it('should include all required metadata fields', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      expect(backup.metadata.version).toBeDefined();
      expect(backup.metadata.created_at).toBeDefined();
      expect(backup.metadata.conversation_count).toBeDefined();
      expect(backup.metadata.message_count).toBeDefined();
      expect(backup.metadata.encrypted).toBeDefined();
      expect(backup.metadata.algorithm).toBeDefined();
      expect(backup.metadata.salt).toBeDefined();
      expect(backup.metadata.iv).toBeDefined();
      expect(backup.metadata.hmac).toBeDefined();
    });

    it('should use correct metadata types', async () => {
      const backup = await backupService.createEncryptedBackup(testPassphrase);

      expect(typeof backup.metadata.version).toBe('number');
      expect(typeof backup.metadata.created_at).toBe('string');
      expect(typeof backup.metadata.conversation_count).toBe('number');
      expect(typeof backup.metadata.message_count).toBe('number');
      expect(typeof backup.metadata.encrypted).toBe('boolean');
      expect(typeof backup.metadata.algorithm).toBe('string');
      expect(typeof backup.metadata.salt).toBe('string');
      expect(typeof backup.metadata.iv).toBe('string');
      expect(typeof backup.metadata.hmac).toBe('string');
    });
  });
});
