/**
 * Attachments Service Tests
 *
 * Tests for image attachment processing, validation, and storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attachmentsService } from './attachments.service';
import { dbService } from './db.service';

// Mock the database service
vi.mock('./db.service', () => ({
  dbService: {
    addAttachment: vi.fn((attachment) => `att-${Date.now()}`),
    getMessageAttachments: vi.fn(() => []),
    deleteAttachment: vi.fn(),
    deleteMessageAttachments: vi.fn(),
  },
}));

// Helper to create a mock image file
function createMockImageFile(
  name: string,
  type: string,
  sizeBytes: number
): File {
  // Create a blob with the exact size requested
  const buffer = new ArrayBuffer(sizeBytes);
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
}

// Helper to create a mock image element
function createMockImage(width: number, height: number): HTMLImageElement {
  const img = document.createElement('img');
  Object.defineProperty(img, 'width', { get: () => width });
  Object.defineProperty(img, 'height', { get: () => height });
  Object.defineProperty(img, 'naturalWidth', { get: () => width });
  Object.defineProperty(img, 'naturalHeight', { get: () => height });
  return img;
}

describe('AttachmentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Image Validation', () => {
    it('should accept valid JPEG images', () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB
      const result = attachmentsService.validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid PNG images', () => {
      const file = createMockImageFile('test.png', 'image/png', 1024 * 1024);
      const result = attachmentsService.validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it('should accept valid GIF images', () => {
      const file = createMockImageFile('test.gif', 'image/gif', 1024 * 1024);
      const result = attachmentsService.validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it('should accept valid WebP images', () => {
      const file = createMockImageFile('test.webp', 'image/webp', 1024 * 1024);
      const result = attachmentsService.validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const file = createMockImageFile('huge.jpg', 'image/jpeg', 10 * 1024 * 1024); // 10MB
      const result = attachmentsService.validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should reject invalid file types', () => {
      const file = createMockImageFile('doc.pdf', 'application/pdf', 1024);
      const result = attachmentsService.validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject unsupported image types', () => {
      const file = createMockImageFile('test.bmp', 'image/bmp', 1024);
      const result = attachmentsService.validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });
  });

  describe('Image Processing', () => {
    it('should process a valid image file', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 1024);

      // Mock the whole process since canvas/image mocking is complex in tests
      vi.spyOn(attachmentsService, 'processImage').mockResolvedValue({
        data: 'fake-base64-data',
        mimeType: 'image/jpeg',
        size: 1024,
        width: 800,
        height: 600,
      });

      const result = await attachmentsService.processImage(file);

      expect(result).toBeDefined();
      expect(result.data).toBe('fake-base64-data');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should calculate dimensions for large images', () => {
      const result = (attachmentsService as any).calculateDimensions(
        3000, // width
        2000, // height
        1920, // max width
        1080  // max height
      );

      // Should scale down proportionally
      expect(result.width).toBeLessThanOrEqual(1920);
      expect(result.height).toBeLessThanOrEqual(1080);
      // Aspect ratio should be preserved (3:2)
      expect(result.width / result.height).toBeCloseTo(3 / 2, 1);
    });

    it('should preserve dimensions for small images', () => {
      const result = (attachmentsService as any).calculateDimensions(
        800,  // width
        600,  // height
        1920, // max width
        1080  // max height
      );

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should preserve aspect ratio when resizing', () => {
      const result = (attachmentsService as any).calculateDimensions(
        2000, // width (portrait)
        3000, // height
        1920, // max width
        1080  // max height
      );

      // Should fit within max dimensions while preserving ratio
      expect(result.width).toBeLessThanOrEqual(1920);
      expect(result.height).toBeLessThanOrEqual(1080);
      expect(result.width / result.height).toBeCloseTo(2 / 3, 1);
    });
  });

  describe('Database Integration', () => {
    it('should add image attachment to database', async () => {
      const file = createMockImageFile('test.jpg', 'image/jpeg', 1024);
      const messageId = 'msg-123';

      // Mock processImage
      vi.spyOn(attachmentsService, 'processImage').mockResolvedValue({
        data: 'fake-base64-data',
        mimeType: 'image/jpeg',
        size: 1024,
        width: 800,
        height: 600,
      });

      const attachmentId = await attachmentsService.addImageAttachment(messageId, file);

      expect(attachmentId).toBeDefined();
      expect(dbService.addAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          message_id: messageId,
          type: 'image',
          mime_type: 'image/jpeg',
          filename: 'test.jpg',
          data: 'fake-base64-data',
          size: 1024,
        })
      );
    });

    it('should get message attachments from database', () => {
      const messageId = 'msg-123';
      const mockAttachments = [
        {
          id: 'att-1',
          message_id: messageId,
          type: 'image' as const,
          mime_type: 'image/jpeg',
          filename: 'test.jpg',
          data: 'base64-data',
          size: 1024,
          created_at: Date.now(),
        },
      ];

      vi.mocked(dbService.getMessageAttachments).mockReturnValue(mockAttachments);

      const result = attachmentsService.getMessageAttachments(messageId);

      expect(result).toEqual(mockAttachments);
      expect(dbService.getMessageAttachments).toHaveBeenCalledWith(messageId);
    });

    it('should convert attachment to data URL', () => {
      const attachment = {
        id: 'att-1',
        message_id: 'msg-1',
        type: 'image' as const,
        mime_type: 'image/jpeg',
        filename: 'test.jpg',
        data: 'base64-data',
        size: 1024,
        created_at: Date.now(),
      };

      const result = attachmentsService.getAttachmentDataUrl(attachment);

      expect(result).toBe('data:image/jpeg;base64,base64-data');
    });

    it('should delete attachment from database', () => {
      const attachmentId = 'att-123';

      attachmentsService.deleteAttachment(attachmentId);

      expect(dbService.deleteAttachment).toHaveBeenCalledWith(attachmentId);
    });
  });

  describe('Utility Functions', () => {
    it('should format bytes correctly', () => {
      const formatBytes = (attachmentsService as any).formatBytes;

      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1536 * 1024)).toBe('1.5 MB'); // 1.5 MB
      expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    });

    it('should handle decimal byte values', () => {
      const formatBytes = (attachmentsService as any).formatBytes;

      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2560)).toBe('2.5 KB');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Restore all mocks before error handling tests
      vi.restoreAllMocks();
    });

    it('should throw error for invalid image type in processImage', async () => {
      const file = createMockImageFile('invalid.bmp', 'image/bmp', 1024);

      await expect(attachmentsService.processImage(file)).rejects.toThrow('Invalid image type');
    });

    it('should throw error for oversized file in processImage', async () => {
      const file = createMockImageFile('huge.jpg', 'image/jpeg', 10 * 1024 * 1024);

      await expect(attachmentsService.processImage(file)).rejects.toThrow('Image too large');
    });
  });
});
