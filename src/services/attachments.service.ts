/**
 * Attachments Service for SML Guardian
 *
 * Handles image and file attachments:
 * - Image validation and compression
 * - File size limits
 * - Base64 encoding/decoding
 * - Image resizing
 * - Format conversion
 */

import { dbService, type MessageAttachment } from './db.service';

/**
 * Attachment configuration
 */
export interface AttachmentConfig {
  maxSizeBytes: number;
  maxImageWidth: number;
  maxImageHeight: number;
  allowedImageTypes: string[];
  compressionQuality: number;
}

/**
 * Image processing result
 */
export interface ProcessedImage {
  data: string; // base64
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

class AttachmentsService {
  private readonly config: AttachmentConfig = {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    maxImageWidth: 1920,
    maxImageHeight: 1080,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    compressionQuality: 0.85,
  };

  /**
   * Process and compress an image file
   */
  async processImage(file: File): Promise<ProcessedImage> {
    try {
      console.log(`[Attachments] Processing image: ${file.name} (${file.size} bytes)`);

      // Validate file type
      if (!this.config.allowedImageTypes.includes(file.type)) {
        throw new Error(`Invalid image type: ${file.type}. Allowed types: ${this.config.allowedImageTypes.join(', ')}`);
      }

      // Validate file size
      if (file.size > this.config.maxSizeBytes) {
        throw new Error(`Image too large: ${this.formatBytes(file.size)}. Maximum: ${this.formatBytes(this.config.maxSizeBytes)}`);
      }

      // Load image
      const img = await this.loadImage(file);

      // Resize if needed
      const { width, height } = this.calculateDimensions(
        img.width,
        img.height,
        this.config.maxImageWidth,
        this.config.maxImageHeight
      );

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 with compression
      const mimeType = file.type;
      const data = canvas.toDataURL(mimeType, this.config.compressionQuality);

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = data.split(',')[1];

      // Calculate final size
      const size = Math.ceil((base64Data.length * 3) / 4); // Approximate size of base64 data

      console.log(`[Attachments] ✅ Image processed: ${width}x${height}, ${this.formatBytes(size)}`);

      return {
        data: base64Data,
        mimeType,
        size,
        width,
        height,
      };
    } catch (err) {
      console.error('[Attachments] ❌ Image processing failed:', err);
      throw err;
    }
  }

  /**
   * Add image attachment to a message
   */
  async addImageAttachment(messageId: string, file: File): Promise<string> {
    try {
      const processed = await this.processImage(file);

      const attachmentId = dbService.addAttachment({
        message_id: messageId,
        type: 'image',
        mime_type: processed.mimeType,
        filename: file.name,
        data: processed.data,
        size: processed.size,
      });

      console.log(`[Attachments] ✅ Image attached: ${file.name} → ${attachmentId}`);

      return attachmentId;
    } catch (err) {
      console.error('[Attachments] ❌ Failed to add image:', err);
      throw err;
    }
  }

  /**
   * Get all attachments for a message
   */
  getMessageAttachments(messageId: string): MessageAttachment[] {
    return dbService.getMessageAttachments(messageId);
  }

  /**
   * Get data URL from attachment (for displaying in img tag)
   */
  getAttachmentDataUrl(attachment: MessageAttachment): string {
    return `data:${attachment.mime_type};base64,${attachment.data}`;
  }

  /**
   * Delete an attachment
   */
  deleteAttachment(attachmentId: string): void {
    dbService.deleteAttachment(attachmentId);
  }

  /**
   * Delete all attachments for a message
   */
  deleteMessageAttachments(messageId: string): void {
    dbService.deleteMessageAttachments(messageId);
  }

  /**
   * Validate image file before processing
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    if (!this.config.allowedImageTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Supported types: JPG, PNG, GIF, WebP`,
      };
    }

    if (file.size > this.config.maxSizeBytes) {
      return {
        valid: false,
        error: `File too large: ${this.formatBytes(file.size)}. Maximum: ${this.formatBytes(this.config.maxSizeBytes)}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get total size of all attachments for a message
   */
  getMessageAttachmentsSize(messageId: string): number {
    const attachments = this.getMessageAttachments(messageId);
    return attachments.reduce((total, att) => total + att.size, 0);
  }

  // ===== Private Helper Methods =====

  /**
   * Load image from file
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));

        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calculate dimensions to fit within max bounds while preserving aspect ratio
   */
  private calculateDimensions(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height };
    }

    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio),
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export const attachmentsService = new AttachmentsService();
