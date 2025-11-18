/**
 * Export Conversation Link Service
 *
 * Enables secure encrypted sharing of conversations via shareable links
 * - Encrypts conversation data with AES-256-GCM
 * - Generates URL-safe encrypted links
 * - Manages link metadata (expiration, permissions)
 * - Verifies link integrity before decryption
 * - Supports local-first decryption
 */

import { dbService, type Conversation, type ChatMessage } from './db.service';

export type LinkPermission = 'read-only' | 'preview';

export interface ExportLink {
  id: string;
  conversationId: string;
  permission: LinkPermission;
  expiresAt: number | null; // null = never expires
  createdAt: number;
  accessCount: number;
  maxAccess: number | null; // null = unlimited
  encryptedPayload: string; // Base64 encoded encrypted data
  metadata: LinkMetadata;
}

export interface LinkMetadata {
  conversationTitle: string;
  messageCount: number;
  createdAt: string;
  algorithm: string;
  salt: string; // Base64 encoded
  iv: string; // Base64 encoded
  hmac: string; // Base64 encoded
}

export interface ShareLinkData {
  link: ExportLink;
  shareUrl: string;
  decryptionRequired: boolean;
}

export interface DecryptedConversationData {
  conversation: Conversation;
  messages: ChatMessage[];
  permission: LinkPermission;
}

class ExportLinkService {
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly SALT_LENGTH = 16; // bytes
  private readonly IV_LENGTH = 12; // bytes for GCM
  private readonly KEY_LENGTH = 256; // bits
  private exportLinks = new Map<string, ExportLink>();

  /**
   * Generate encrypted export link for a conversation
   */
  async generateExportLink(
    conversationId: string,
    permission: LinkPermission = 'read-only',
    expiryHours: number | null = 24,
    maxAccess: number | null = null
  ): Promise<ShareLinkData> {
    try {
      const conversation = dbService.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      const messages = dbService.getConversationHistory(conversationId);

      // Prepare conversation data for encryption
      const dataToEncrypt = {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          created_at: conversation.created_at,
        },
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
        permission,
        exportedAt: new Date().toISOString(),
      };

      // Generate cryptographic materials
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Derive encryption key (using a fixed passphrase for the link itself)
      const linkPassphrase = this.generateLinkPassphrase();
      const key = await this.deriveKey(linkPassphrase, salt);

      // Encrypt the data
      const encoder = new TextEncoder();
      const dataJson = JSON.stringify(dataToEncrypt);
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        encoder.encode(dataJson)
      );

      // Generate HMAC for integrity verification
      const hmacKey = await this.deriveHMACKey(linkPassphrase, salt);
      const hmac = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        new Uint8Array(encryptedData)
      );

      // Create link metadata
      const metadata: LinkMetadata = {
        conversationTitle: conversation.title,
        messageCount: messages.length,
        createdAt: new Date().toISOString(),
        algorithm: 'AES-256-GCM',
        salt: this.arrayBufferToBase64(salt),
        iv: this.arrayBufferToBase64(iv),
        hmac: this.arrayBufferToBase64(hmac),
      };

      // Create export link
      const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = expiryHours ? Date.now() + expiryHours * 60 * 60 * 1000 : null;

      const exportLink: ExportLink = {
        id: linkId,
        conversationId,
        permission,
        expiresAt,
        createdAt: Date.now(),
        accessCount: 0,
        maxAccess,
        encryptedPayload: this.arrayBufferToBase64(encryptedData),
        metadata,
      };

      // Store link and passphrase
      this.exportLinks.set(linkId, exportLink);
      localStorage.setItem(`export_link_${linkId}`, linkPassphrase);
      this.persistExportLinks();

      console.log('[ExportLink] Generated export link:', linkId);

      // Generate shareable URL with link ID
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}?export=${linkId}`;

      return {
        link: exportLink,
        shareUrl,
        decryptionRequired: true,
      };
    } catch (err) {
      console.error('[ExportLink] Failed to generate export link:', err);
      throw new Error(
        `Failed to generate export link: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get export link by ID
   */
  getExportLink(linkId: string): ExportLink | null {
    const link = this.exportLinks.get(linkId);
    if (!link) {
      return null;
    }

    // Check expiration
    if (this.isLinkExpired(link)) {
      this.revokeExportLink(linkId);
      return null;
    }

    return link;
  }

  /**
   * Decrypt and retrieve conversation data from export link
   */
  async decryptExportLink(linkId: string): Promise<DecryptedConversationData> {
    try {
      const link = this.getExportLink(linkId);
      if (!link) {
        throw new Error('Export link not found or has expired');
      }

      // Retrieve the passphrase from storage
      const linkPassphrase = localStorage.getItem(`export_link_${linkId}`);
      if (!linkPassphrase) {
        throw new Error('Link passphrase not found');
      }

      // Decode cryptographic materials
      const salt = this.base64ToArrayBuffer(link.metadata.salt);
      const iv = this.base64ToArrayBuffer(link.metadata.iv);
      const encryptedData = this.base64ToArrayBuffer(link.encryptedPayload);
      const storedHmac = this.base64ToArrayBuffer(link.metadata.hmac);

      // Verify integrity
      const hmacKey = await this.deriveHMACKey(linkPassphrase, salt);
      const computedHmac = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        encryptedData
      );

      if (!this.compareArrayBuffers(storedHmac, computedHmac)) {
        throw new Error('Link integrity check failed');
      }

      // Derive decryption key
      const key = await this.deriveKey(linkPassphrase, salt);

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
        throw new Error('Decryption failed');
      }

      // Parse decrypted data
      const decoder = new TextDecoder();
      const dataJson = decoder.decode(decryptedData);
      const data = JSON.parse(dataJson);

      // Increment access count
      link.accessCount++;
      this.exportLinks.set(linkId, link);
      this.persistExportLinks();

      return {
        conversation: data.conversation,
        messages: data.messages,
        permission: data.permission,
      };
    } catch (err) {
      console.error('[ExportLink] Failed to decrypt export link:', err);
      throw new Error(
        `Failed to decrypt export link: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Revoke export link
   */
  revokeExportLink(linkId: string): void {
    this.exportLinks.delete(linkId);
    localStorage.removeItem(`export_link_${linkId}`);
    this.persistExportLinks();
    console.log('[ExportLink] Revoked export link:', linkId);
  }

  /**
   * Get all active export links for a conversation
   */
  getConversationExportLinks(conversationId: string): ExportLink[] {
    const links = Array.from(this.exportLinks.values()).filter(
      link => link.conversationId === conversationId && !this.isLinkExpired(link)
    );
    return links;
  }

  /**
   * Check if link is expired
   */
  private isLinkExpired(link: ExportLink): boolean {
    // Check time expiration
    if (link.expiresAt && Date.now() > link.expiresAt) {
      return true;
    }

    // Check access limit
    if (link.maxAccess && link.accessCount >= link.maxAccess) {
      return true;
    }

    return false;
  }

  /**
   * Generate a random passphrase for the link
   */
  private generateLinkPassphrase(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let passphrase = '';
    for (let i = 0; i < 32; i++) {
      passphrase += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return passphrase;
  }

  /**
   * Derive encryption key from passphrase
   */
  private async deriveKey(passphrase: string, salt: Uint8Array | ArrayBuffer): Promise<CryptoKey> {
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
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
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
   * Compare two ArrayBuffers for equality
   */
  private compareArrayBuffers(a: ArrayBuffer, b: ArrayBuffer): boolean {
    const aView = new Uint8Array(a);
    const bView = new Uint8Array(b);
    if (aView.length !== bView.length) return false;
    for (let i = 0; i < aView.length; i++) {
      if (aView[i] !== bView[i]) return false;
    }
    return true;
  }

  /**
   * Persist export links to localStorage
   */
  private persistExportLinks(): void {
    const linksData = Array.from(this.exportLinks.entries());
    localStorage.setItem('export_links', JSON.stringify(linksData));
  }

  /**
   * Load export links from localStorage
   */
  private loadExportLinks(): void {
    try {
      const data = localStorage.getItem('export_links');
      if (data) {
        const linksData = JSON.parse(data);
        for (const [id, link] of linksData) {
          this.exportLinks.set(id, link as ExportLink);
        }
        console.log('[ExportLink] Loaded export links:', this.exportLinks.size);
      }
    } catch (err) {
      console.error('[ExportLink] Failed to load export links:', err);
    }
  }

  /**
   * Initialize service
   */
  initialize(): void {
    this.loadExportLinks();
    console.log('[ExportLink] Initialized');
  }
}

// Export singleton instance
export const exportLinkService = new ExportLinkService();
