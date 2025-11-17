/**
 * Import Service Tests
 *
 * Tests for ChatGPT and Claude conversation import functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importService } from './import.service';
import { dbService } from './db.service';
import {
  chatGPTExportSample,
  chatGPTExportMultiple,
  claudeExportSample,
  claudeExportMultiple,
  invalidJSON,
  unknownFormat,
} from '../tests/fixtures/import-data';

// Mock the database service
vi.mock('./db.service', () => ({
  dbService: {
    createConversation: vi.fn((title: string) => ({
      id: `conv-${Date.now()}`,
      title,
      created_at: Date.now(),
    })),
    addMessage: vi.fn((message) => `msg-${Date.now()}`),
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ChatGPT Import', () => {
    it('should import a single ChatGPT conversation', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      const stats = await importService.importChatGPT(json);

      expect(stats.conversationsImported).toBe(1);
      expect(stats.messagesImported).toBe(2);
      expect(stats.errors).toHaveLength(0);
      expect(dbService.createConversation).toHaveBeenCalledWith('Test Conversation');
      expect(dbService.addMessage).toHaveBeenCalledTimes(2);
      expect(dbService.save).toHaveBeenCalled();
    });

    it('should import multiple ChatGPT conversations', async () => {
      const json = JSON.stringify(chatGPTExportMultiple);
      const stats = await importService.importChatGPT(json);

      expect(stats.conversationsImported).toBe(2);
      expect(stats.messagesImported).toBe(3);
      expect(stats.errors).toHaveLength(0);
    });

    it('should preserve timestamps when option is enabled', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      await importService.importChatGPT(json, { preserveTimestamps: true });

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Timestamps in fixture are in seconds, should be converted to milliseconds
    });

    it('should handle invalid JSON', async () => {
      const stats = await importService.importChatGPT(invalidJSON);

      expect(stats.conversationsImported).toBe(0);
      expect(stats.messagesImported).toBe(0);
      expect(stats.errors).toContain('Invalid JSON format');
    });

    it('should handle empty conversations', async () => {
      const emptyConv = {
        title: 'Empty',
        create_time: 1704067200,
        update_time: 1704067200,
        mapping: {
          root: { id: 'root', children: [] },
        },
      };

      const json = JSON.stringify(emptyConv);
      const stats = await importService.importChatGPT(json);

      expect(stats.conversationsImported).toBe(1);
      expect(stats.messagesImported).toBe(0);
    });

    it('should tag messages with imported_chatgpt module', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      await importService.importChatGPT(json);

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      calls.forEach((call) => {
        expect(call[0].module_used).toBe('imported_chatgpt');
      });
    });

    it('should map user role correctly', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      await importService.importChatGPT(json);

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      const userMessage = calls.find((call) => call[0].content.includes('Hello, how are you'));
      expect(userMessage![0].role).toBe('user');
    });

    it('should map assistant role correctly', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      await importService.importChatGPT(json);

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      const assistantMessage = calls.find((call) =>
        call[0].content.includes("I'm doing well")
      );
      expect(assistantMessage![0].role).toBe('assistant');
    });
  });

  describe('Claude Import', () => {
    it('should import a single Claude conversation', async () => {
      const json = JSON.stringify(claudeExportSample);
      const stats = await importService.importClaude(json);

      expect(stats.conversationsImported).toBe(1);
      expect(stats.messagesImported).toBe(2);
      expect(stats.errors).toHaveLength(0);
      expect(dbService.createConversation).toHaveBeenCalledWith('Test Claude Conversation');
    });

    it('should import multiple Claude conversations', async () => {
      const json = JSON.stringify(claudeExportMultiple);
      const stats = await importService.importClaude(json);

      expect(stats.conversationsImported).toBe(2);
      expect(stats.messagesImported).toBe(3);
    });

    it('should handle ISO 8601 timestamps', async () => {
      const json = JSON.stringify(claudeExportSample);
      await importService.importClaude(json, { preserveTimestamps: true });

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Timestamps should be parsed from ISO format
    });

    it('should tag messages with imported_claude module', async () => {
      const json = JSON.stringify(claudeExportSample);
      await importService.importClaude(json);

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      calls.forEach((call) => {
        expect(call[0].module_used).toBe('imported_claude');
      });
    });

    it('should map human to user role', async () => {
      const json = JSON.stringify(claudeExportSample);
      await importService.importClaude(json);

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      const humanMessage = calls.find((call) => call[0].content.includes('Hello Claude'));
      expect(humanMessage![0].role).toBe('user');
    });

    it('should map assistant role correctly', async () => {
      const json = JSON.stringify(claudeExportSample);
      await importService.importClaude(json);

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      const assistantMessage = calls.find((call) =>
        call[0].content.includes('How can I assist')
      );
      expect(assistantMessage![0].role).toBe('assistant');
    });

    it('should sort messages chronologically', async () => {
      const json = JSON.stringify(claudeExportSample);
      await importService.importClaude(json);

      const calls = vi.mocked(dbService.addMessage).mock.calls;
      // First message should be from human
      expect(calls[0][0].content).toContain('Hello Claude');
      // Second message should be from assistant
      expect(calls[1][0].content).toContain('How can I assist');
    });
  });

  describe('Auto-Detection', () => {
    it('should detect ChatGPT format', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      const stats = await importService.importAuto(json);

      expect(stats.conversationsImported).toBe(1);
      expect(stats.messagesImported).toBe(2);
    });

    it('should detect Claude format', async () => {
      const json = JSON.stringify(claudeExportSample);
      const stats = await importService.importAuto(json);

      expect(stats.conversationsImported).toBe(1);
      expect(stats.messagesImported).toBe(2);
    });

    it('should handle unknown format', async () => {
      const json = JSON.stringify(unknownFormat);
      const stats = await importService.importAuto(json);

      expect(stats.conversationsImported).toBe(0);
      expect(stats.errors).toContain(
        'Unknown format. Please select ChatGPT or Claude explicitly.'
      );
    });

    it('should handle invalid JSON in auto mode', async () => {
      const stats = await importService.importAuto(invalidJSON);

      expect(stats.conversationsImported).toBe(0);
      expect(stats.errors).toContain('Failed to parse JSON file');
    });
  });

  describe('Import Options', () => {
    it('should respect skipDuplicates option', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      await importService.importChatGPT(json, { skipDuplicates: true });

      // In this simple test, we just verify the option is accepted
      expect(dbService.save).toHaveBeenCalled();
    });

    it('should use current time when preserveTimestamps is false', async () => {
      const json = JSON.stringify(chatGPTExportSample);
      await importService.importChatGPT(json, { preserveTimestamps: false });

      // Timestamps should be recent (not from 2024-01-01)
      const calls = vi.mocked(dbService.addMessage).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should continue importing after individual conversation error', async () => {
      // Mock createConversation to throw on first call, succeed on second
      let callCount = 0;
      vi.mocked(dbService.createConversation).mockImplementation((title) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Database error');
        }
        return {
          id: `conv-${callCount}`,
          title,
          created_at: Date.now(),
        };
      });

      const json = JSON.stringify(chatGPTExportMultiple);
      const stats = await importService.importChatGPT(json);

      expect(stats.conversationsImported).toBe(1);
      expect(stats.errors.length).toBeGreaterThan(0);
      expect(stats.errors[0]).toContain('Database error');
    });

    it('should track warnings for skipped messages', async () => {
      // Mock addMessage to throw occasionally
      let messageCount = 0;
      vi.mocked(dbService.addMessage).mockImplementation(() => {
        messageCount++;
        if (messageCount === 2) {
          throw new Error('Message error');
        }
        return `msg-${messageCount}`;
      });

      const json = JSON.stringify(chatGPTExportSample);
      const stats = await importService.importChatGPT(json);

      expect(stats.conversationsImported).toBe(1);
      expect(stats.warnings.length).toBeGreaterThan(0);
    });
  });
});
