/**
 * API Key Management Service
 *
 * Secure storage of external API keys using WebCrypto
 * - PBKDF2 key derivation from master password
 * - AES-GCM encryption
 * - Salt stored with encrypted data
 */

import { dbService } from './db.service';

interface EncryptedData {
  encrypted: string; // Base64 encoded ciphertext
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
}

class APIKeyService {
  private sessionPassword: string | null = null;

  /**
   * Initialize session with master password
   * Derives encryption key using PBKDF2
   */
  async initializeSession(masterPassword: string): Promise<void> {
    this.sessionPassword = masterPassword;
    // Key will be derived on-demand with salt
  }

  /**
   * Clear session (logout)
   */
  clearSession(): void {
    this.sessionPassword = null;
  }

  /**
   * Check if session is active
   */
  hasSession(): boolean {
    return this.sessionPassword !== null;
  }

  /**
   * Derive encryption key from password + salt using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100000, // OWASP recommended minimum
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt API key
   */
  private async encrypt(plaintext: string, password: string): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM standard

    // Derive key from password + salt
    const key = await this.deriveKey(password, salt);

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Convert to base64 for storage
    return {
      encrypted: this.bufferToBase64(ciphertext),
      iv: this.bufferToBase64(iv.buffer),
      salt: this.bufferToBase64(salt.buffer),
    };
  }

  /**
   * Decrypt API key
   */
  private async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    // Convert from base64
    const ciphertext = this.base64ToBuffer(encryptedData.encrypted);
    const iv = this.base64ToBuffer(encryptedData.iv);
    const salt = this.base64ToBuffer(encryptedData.salt);

    // Derive key from password + salt
    const key = await this.deriveKey(password, new Uint8Array(salt));

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  }

  /**
   * Store API key (encrypted)
   */
  async storeAPIKey(provider: string, apiKey: string): Promise<void> {
    if (!this.sessionPassword) {
      throw new Error('No active session. Call initializeSession() first.');
    }

    // Encrypt key
    const encryptedData = await this.encrypt(apiKey, this.sessionPassword);

    // Store in database
    dbService.upsertAPIKey(provider, JSON.stringify(encryptedData));
  }

  /**
   * Retrieve API key (decrypted)
   */
  async getAPIKey(provider: string): Promise<string | null> {
    if (!this.sessionPassword) {
      throw new Error('No active session. Call initializeSession() first.');
    }

    // Get encrypted data from database
    const encryptedJSON = dbService.getAPIKey(provider);
    if (!encryptedJSON) {
      return null;
    }

    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedJSON);
      return await this.decrypt(encryptedData, this.sessionPassword);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      throw new Error('Failed to decrypt API key. Incorrect password?');
    }
  }

  /**
   * Check if API key exists for provider
   */
  hasAPIKey(provider: string): boolean {
    return dbService.getAPIKey(provider) !== null;
  }

  /**
   * Delete API key
   */
  deleteAPIKey(provider: string): void {
    dbService.deleteAPIKey(provider);
  }

  /**
   * List all stored providers
   */
  listProviders(): string[] {
    return dbService.listAPIKeyProviders();
  }

  // Utility functions
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Singleton instance
export const apiKeyService = new APIKeyService();
