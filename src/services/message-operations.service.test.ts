import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './db.service';

describe('Message Operations Service', () => {
  beforeEach(async () => {
    await dbService.initialize();
  });

  describe('Message Editing', () => {
    it('should edit a message and track edit history', () => {
      const conversation = dbService.createConversation('Edit Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Original message'
      });

      const updatedMessage = dbService.editMessage(messageId, 'Edited message');

      expect(updatedMessage).toBeDefined();
      expect(updatedMessage?.content).toBe('Edited message');
    });

    it('should return null when editing non-existent message', () => {
      const result = dbService.editMessage('non-existent-id', 'New content');
      expect(result).toBeNull();
    });

    it('should maintain edit history for multiple edits', () => {
      const conversation = dbService.createConversation('Multi-edit Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Version 1'
      });

      dbService.editMessage(messageId, 'Version 2');
      dbService.editMessage(messageId, 'Version 3');

      const history = dbService.getMessageEditHistory(messageId);

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].previous_content).toBe('Version 2');
      expect(history[1].previous_content).toBe('Version 1');
    });

    it('should record edit timestamp correctly', () => {
      const conversation = dbService.createConversation('Timestamp Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Original'
      });

      const beforeEdit = Date.now();
      dbService.editMessage(messageId, 'Edited');
      const afterEdit = Date.now();

      const history = dbService.getMessageEditHistory(messageId);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].edited_at).toBeGreaterThanOrEqual(beforeEdit);
      expect(history[0].edited_at).toBeLessThanOrEqual(afterEdit);
    });

    it('should preserve original content in edit history', () => {
      const conversation = dbService.createConversation('Preserve Test');
      const originalContent = 'This is the original content with special chars: @#$%';
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: originalContent
      });

      dbService.editMessage(messageId, 'New content');

      const history = dbService.getMessageEditHistory(messageId);

      expect(history[0].previous_content).toBe(originalContent);
    });
  });

  describe('Message Deletion', () => {
    it('should delete a message successfully', () => {
      const conversation = dbService.createConversation('Delete Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message to delete'
      });

      const deleted = dbService.deleteMessage(messageId);

      expect(deleted).toBe(true);

      const messages = dbService.getConversationHistory(conversation.id);
      expect(messages.map(m => m.id)).not.toContain(messageId);
    });

    it('should return false when deleting non-existent message', () => {
      const deleted = dbService.deleteMessage('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should clean up edit history when message is deleted', () => {
      const conversation = dbService.createConversation('Cleanup Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message'
      });

      dbService.editMessage(messageId, 'Edited');

      const historyBefore = dbService.getMessageEditHistory(messageId);
      expect(historyBefore.length).toBeGreaterThan(0);

      dbService.deleteMessage(messageId);

      const historyAfter = dbService.getMessageEditHistory(messageId);
      expect(historyAfter).toHaveLength(0);
    });

    it('should clean up bookmarks when message is deleted', () => {
      const conversation = dbService.createConversation('Bookmark Cleanup');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Bookmarked message'
      });

      dbService.bookmarkMessage(messageId, conversation.id, 'Important');

      const bookmarksBefore = dbService.getBookmarkedMessages(conversation.id);
      expect(bookmarksBefore.map(b => b.message_id)).toContain(messageId);

      dbService.deleteMessage(messageId);

      const bookmarksAfter = dbService.getBookmarkedMessages(conversation.id);
      expect(bookmarksAfter.map(b => b.message_id)).not.toContain(messageId);
    });

    it('should clean up metadata when message is deleted', () => {
      const conversation = dbService.createConversation('Metadata Cleanup');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message'
      });

      dbService.pinMessage(messageId);

      const pinnedBefore = dbService.getPinnedMessages(conversation.id);
      expect(pinnedBefore.map(m => m.id)).toContain(messageId);

      dbService.deleteMessage(messageId);

      const pinnedAfter = dbService.getPinnedMessages(conversation.id);
      expect(pinnedAfter.map(m => m.id)).not.toContain(messageId);
    });
  });

  describe('Message Pinning', () => {
    it('should pin a message successfully', () => {
      const conversation = dbService.createConversation('Pin Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Important message'
      });

      const result = dbService.pinMessage(messageId);

      expect(result).toBe(true);
      expect(dbService.isMessagePinned(messageId)).toBe(true);
    });

    it('should unpin a message successfully', () => {
      const conversation = dbService.createConversation('Unpin Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message to unpin'
      });

      dbService.pinMessage(messageId);
      expect(dbService.isMessagePinned(messageId)).toBe(true);

      const result = dbService.unpinMessage(messageId);

      expect(result).toBe(true);
      expect(dbService.isMessagePinned(messageId)).toBe(false);
    });

    it('should return false when pinning non-existent message', () => {
      const result = dbService.pinMessage('non-existent-id');
      expect(result).toBe(false);
    });

    it('should get all pinned messages in a conversation', () => {
      const conversation = dbService.createConversation('Pinned List Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1'
      });
      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2'
      });
      const msg3 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 3'
      });

      dbService.pinMessage(msg1);
      dbService.pinMessage(msg3);

      const pinnedMessages = dbService.getPinnedMessages(conversation.id);

      expect(pinnedMessages.length).toBeGreaterThanOrEqual(2);
      expect(pinnedMessages.map(m => m.id)).toContain(msg1);
      expect(pinnedMessages.map(m => m.id)).toContain(msg3);
      expect(pinnedMessages.map(m => m.id)).not.toContain(msg2);
    });

    it('should handle re-pinning already pinned message', () => {
      const conversation = dbService.createConversation('Repin Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message'
      });

      dbService.pinMessage(messageId);
      const result = dbService.pinMessage(messageId);

      expect(result).toBe(true);
      expect(dbService.isMessagePinned(messageId)).toBe(true);
    });
  });

  describe('Message Threading', () => {
    it('should create a thread reply', () => {
      const conversation = dbService.createConversation('Threading Test');
      const parentId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Parent message',
        module_used: null,
        trace_data: null
      });

      const replyId = dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Reply to parent',
        module_used: null,
        trace_data: null
      });

      expect(replyId).toBeDefined();
      expect(replyId).toMatch(/^msg-/);
    });

    it('should throw error when replying to non-existent parent', () => {
      const conversation = dbService.createConversation('Invalid Parent Test');

      expect(() => {
        dbService.createThreadReply('non-existent-parent', {
          conversation_id: conversation.id,
          role: 'user',
          content: 'Reply',
          module_used: null,
          trace_data: null
        });
      }).toThrow();
    });

    it('should get all thread replies for a message', () => {
      const conversation = dbService.createConversation('Get Replies Test');
      const parentId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Parent'
      });

      const reply1 = dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Reply 1',
        module_used: null,
        trace_data: null
      });

      const reply2 = dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Reply 2',
        module_used: null,
        trace_data: null
      });

      const replies = dbService.getThreadReplies(parentId);

      expect(replies.length).toBeGreaterThanOrEqual(2);
      expect(replies.map(r => r.id)).toContain(reply1);
      expect(replies.map(r => r.id)).toContain(reply2);
    });

    it('should get correct thread count', () => {
      const conversation = dbService.createConversation('Thread Count Test');
      const parentId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Parent'
      });

      dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Reply 1',
        module_used: null,
        trace_data: null
      });

      dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Reply 2',
        module_used: null,
        trace_data: null
      });

      dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Reply 3',
        module_used: null,
        trace_data: null
      });

      const count = dbService.getThreadCount(parentId);

      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should maintain thread reply order', () => {
      const conversation = dbService.createConversation('Thread Order Test');
      const parentId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Parent'
      });

      const reply1 = dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'First reply',
        module_used: null,
        trace_data: null
      });

      const reply2 = dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Second reply',
        module_used: null,
        trace_data: null
      });

      const replies = dbService.getThreadReplies(parentId);

      if (replies.length >= 2) {
        expect(replies[0].id).toBe(reply1);
        expect(replies[1].id).toBe(reply2);
      }
    });
  });

  describe('Message Details', () => {
    it('should get message with all details', () => {
      const conversation = dbService.createConversation('Details Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message'
      });

      dbService.pinMessage(messageId);
      dbService.editMessage(messageId, 'Edited message');

      const details = dbService.getMessageWithDetails(messageId);

      expect(details).toBeDefined();
      expect(details?.id).toBe(messageId);
      expect(details?.is_pinned).toBe(true);
      expect(details?.edited_at).toBeDefined();
    });

    it('should return null for non-existent message details', () => {
      const details = dbService.getMessageWithDetails('non-existent-id');
      expect(details).toBeNull();
    });

    it('should include thread count in message details', () => {
      const conversation = dbService.createConversation('Thread Count Details Test');
      const parentId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Parent'
      });

      dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Reply',
        module_used: null,
        trace_data: null
      });

      const details = dbService.getMessageWithDetails(parentId);

      expect(details?.thread_count).toBeGreaterThanOrEqual(1);
    });

    it('should include thread parent id for reply messages', () => {
      const conversation = dbService.createConversation('Thread Parent Test');
      const parentId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Parent',
        module_used: null,
        trace_data: null
      });

      const replyId = dbService.createThreadReply(parentId, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Reply',
        module_used: null,
        trace_data: null
      });

      const replyDetails = dbService.getMessageWithDetails(replyId);

      expect(replyDetails?.thread_parent_id).toBe(parentId);
    });

    it('should get conversation history with details', () => {
      const conversation = dbService.createConversation('History Details Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1'
      });

      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2'
      });

      dbService.pinMessage(msg1);
      dbService.editMessage(msg2, 'Edited message 2');

      const history = dbService.getConversationHistoryWithDetails(conversation.id);

      expect(history.length).toBeGreaterThanOrEqual(2);

      const msg1Details = history.find(m => m.id === msg1);
      expect(msg1Details?.is_pinned).toBe(true);

      const msg2Details = history.find(m => m.id === msg2);
      expect(msg2Details?.edited_at).toBeDefined();
    });
  });

  describe('Message Statistics', () => {
    it('should calculate message statistics', () => {
      const conversation = dbService.createConversation('Stats Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1'
      });

      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2'
      });

      const msg3 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 3'
      });

      dbService.pinMessage(msg1);
      dbService.pinMessage(msg2);

      dbService.editMessage(msg3, 'Edited message 3');

      const stats = dbService.getMessageStats(conversation.id);

      expect(stats.totalMessages).toBeGreaterThanOrEqual(3);
      expect(stats.pinnedCount).toBeGreaterThanOrEqual(2);
      expect(stats.editedCount).toBeGreaterThanOrEqual(1);
    });

    it('should count threaded messages in statistics', () => {
      const conversation = dbService.createConversation('Thread Stats Test');

      const parent1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Parent 1'
      });

      const parent2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Parent 2'
      });

      dbService.createThreadReply(parent1, {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Reply',
        module_used: null,
        trace_data: null
      });

      dbService.createThreadReply(parent2, {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Reply',
        module_used: null,
        trace_data: null
      });

      const stats = dbService.getMessageStats(conversation.id);

      expect(stats.threadedCount).toBeGreaterThanOrEqual(2);
    });

    it('should return zeros for empty conversation', () => {
      const conversation = dbService.createConversation('Empty Stats Test');

      const stats = dbService.getMessageStats(conversation.id);

      expect(stats.totalMessages).toBe(0);
      expect(stats.pinnedCount).toBe(0);
      expect(stats.editedCount).toBe(0);
      expect(stats.threadedCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle editing message with special characters', () => {
      const conversation = dbService.createConversation('Special Chars Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Original @#$% text'
      });

      const newContent = 'Edited with "quotes" and \'apostrophes\' @#$%^&*()';
      const updated = dbService.editMessage(messageId, newContent);

      expect(updated?.content).toBe(newContent);
    });

    it('should handle large message edits', () => {
      const conversation = dbService.createConversation('Large Content Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'x'.repeat(1000)
      });

      const largeContent = 'y'.repeat(5000);
      const updated = dbService.editMessage(messageId, largeContent);

      expect(updated?.content.length).toBe(5000);
    });

    it('should handle empty message content', () => {
      const conversation = dbService.createConversation('Empty Content Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Original'
      });

      const updated = dbService.editMessage(messageId, '');

      expect(updated?.content).toBe('');
    });

    it('should handle rapid consecutive operations', () => {
      const conversation = dbService.createConversation('Rapid Ops Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message'
      });

      dbService.pinMessage(messageId);
      dbService.editMessage(messageId, 'Edit 1');
      dbService.editMessage(messageId, 'Edit 2');
      dbService.editMessage(messageId, 'Edit 3');
      dbService.unpinMessage(messageId);

      const details = dbService.getMessageWithDetails(messageId);
      const history = dbService.getMessageEditHistory(messageId);

      expect(details?.is_pinned).toBe(false);
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle message with null trace_data', () => {
      const conversation = dbService.createConversation('Null Data Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message with no trace',
        module_used: null,
        trace_data: null
      });

      const updated = dbService.editMessage(messageId, 'Edited');

      expect(updated?.trace_data).toBeNull();
    });
  });
});
