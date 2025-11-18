import { describe, it, expect, beforeEach } from 'vitest';
import { dbService, Bookmark } from './db.service';

describe('Bookmark Service', () => {
  beforeEach(async () => {
    await dbService.initialize();
  });

  describe('Conversation Bookmarks', () => {
    it('should bookmark a conversation', () => {
      const conversation = dbService.createConversation('Important Chat');
      const bookmark = dbService.bookmarkConversation(conversation.id);

      expect(bookmark).toBeDefined();
      expect(bookmark.conversation_id).toBe(conversation.id);
      expect(bookmark.bookmark_type).toBe('conversation');
      expect(bookmark.message_id).toBeNull();
      expect(bookmark.id).toMatch(/^bm-/);
    });

    it('should bookmark a conversation with a label', () => {
      const conversation = dbService.createConversation('Labeled Chat');
      const bookmark = dbService.bookmarkConversation(conversation.id, 'Review Later');

      expect(bookmark.label).toBe('Review Later');
    });

    it('should check if a conversation is bookmarked', () => {
      const conversation = dbService.createConversation('Check Bookmark');

      let isBookmarked = dbService.isConversationBookmarked(conversation.id);
      expect(isBookmarked).toBeNull();

      dbService.bookmarkConversation(conversation.id);

      isBookmarked = dbService.isConversationBookmarked(conversation.id);
      expect(isBookmarked).toBeDefined();
      expect(isBookmarked?.conversation_id).toBe(conversation.id);
    });

    it('should remove a conversation bookmark', () => {
      const conversation = dbService.createConversation('Remove Bookmark');
      const bookmark = dbService.bookmarkConversation(conversation.id);

      dbService.removeConversationBookmark(conversation.id);

      const isBookmarked = dbService.isConversationBookmarked(conversation.id);
      expect(isBookmarked).toBeNull();
    });

    it('should get all bookmarked conversations', () => {
      const conv1 = dbService.createConversation('Chat 1');
      const conv2 = dbService.createConversation('Chat 2');
      const conv3 = dbService.createConversation('Chat 3');

      dbService.bookmarkConversation(conv1.id);
      dbService.bookmarkConversation(conv2.id);

      const bookmarked = dbService.getBookmarkedConversations();

      expect(bookmarked.length).toBeGreaterThanOrEqual(2);
      expect(bookmarked.map(b => b.conversation_id)).toContain(conv1.id);
      expect(bookmarked.map(b => b.conversation_id)).toContain(conv2.id);
    });
  });

  describe('Message Bookmarks', () => {
    it('should bookmark a message', () => {
      const conversation = dbService.createConversation('Message Bookmark Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Test message'
      });

      const bookmark = dbService.bookmarkMessage(messageId, conversation.id);

      expect(bookmark.message_id).toBe(messageId);
      expect(bookmark.conversation_id).toBe(conversation.id);
      expect(bookmark.bookmark_type).toBe('message');
    });

    it('should bookmark a message with a label', () => {
      const conversation = dbService.createConversation('Labeled Message');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Important response'
      });

      const bookmark = dbService.bookmarkMessage(messageId, conversation.id, 'Key insight');

      expect(bookmark.label).toBe('Key insight');
    });

    it('should get all bookmarked messages for a conversation', () => {
      const conversation = dbService.createConversation('Multi-Bookmark Chat');

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

      dbService.bookmarkMessage(msg1, conversation.id);
      dbService.bookmarkMessage(msg2, conversation.id);

      const bookmarked = dbService.getBookmarkedMessages(conversation.id);

      expect(bookmarked.length).toBeGreaterThanOrEqual(2);
      expect(bookmarked.map(b => b.message_id)).toContain(msg1);
      expect(bookmarked.map(b => b.message_id)).toContain(msg2);
    });
  });

  describe('Bookmark Management', () => {
    it('should remove a specific bookmark by ID', () => {
      const conversation = dbService.createConversation('Remove Bookmark');
      const bookmark = dbService.bookmarkConversation(conversation.id);

      dbService.removeBookmark(bookmark.id);

      const isBookmarked = dbService.isConversationBookmarked(conversation.id);
      expect(isBookmarked).toBeNull();
    });

    it('should update bookmark label', () => {
      const conversation = dbService.createConversation('Update Label');
      const bookmark = dbService.bookmarkConversation(conversation.id, 'Old Label');

      dbService.updateBookmarkLabel(bookmark.id, 'New Label');

      const updated = dbService.isConversationBookmarked(conversation.id);
      expect(updated?.label).toBe('New Label');
    });

    it('should get all bookmarks', () => {
      const conv1 = dbService.createConversation('Bookmarks Test 1');
      const conv2 = dbService.createConversation('Bookmarks Test 2');

      dbService.bookmarkConversation(conv1.id);

      const msg = dbService.addMessage({
        conversation_id: conv2.id,
        role: 'user',
        content: 'Test'
      });
      dbService.bookmarkMessage(msg, conv2.id);

      const allBookmarks = dbService.getAllBookmarks();

      expect(allBookmarks.length).toBeGreaterThanOrEqual(2);
      expect(allBookmarks.filter(b => b.bookmark_type === 'conversation').length).toBeGreaterThan(0);
      expect(allBookmarks.filter(b => b.bookmark_type === 'message').length).toBeGreaterThan(0);
    });
  });

  describe('Bookmark Statistics', () => {
    it('should calculate bookmark statistics', () => {
      const conv = dbService.createConversation('Stats Test');
      dbService.bookmarkConversation(conv.id);

      const msg = dbService.addMessage({
        conversation_id: conv.id,
        role: 'user',
        content: 'Message'
      });
      dbService.bookmarkMessage(msg, conv.id);

      const stats = dbService.getBookmarkStats();

      expect(stats.totalBookmarks).toBeGreaterThanOrEqual(2);
      expect(stats.conversationBookmarks).toBeGreaterThanOrEqual(1);
      expect(stats.messageBookmarks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Conversations with Bookmark Status', () => {
    it('should return conversations with bookmark indicators', () => {
      const conv1 = dbService.createConversation('Bookmarked Chat');
      const conv2 = dbService.createConversation('Non-bookmarked Chat');

      dbService.bookmarkConversation(conv1.id, 'Important');

      const conversations = dbService.getConversationsWithBookmarkStatus();

      const bookmarkedConv = conversations.find(c => c.id === conv1.id);
      const nonBookmarkedConv = conversations.find(c => c.id === conv2.id);

      expect(bookmarkedConv?.isBookmarked).toBe(true);
      expect(bookmarkedConv?.bookmarkLabel).toBe('Important');
      expect(nonBookmarkedConv?.isBookmarked).toBe(false);
    });

    it('should include bookmark label in status', () => {
      const conversation = dbService.createConversation('Labeled Bookmark');
      const label = 'Review Before Deploy';

      dbService.bookmarkConversation(conversation.id, label);

      const conversations = dbService.getConversationsWithBookmarkStatus();
      const conv = conversations.find(c => c.id === conversation.id);

      expect(conv?.bookmarkLabel).toBe(label);
    });
  });

  describe('Edge Cases', () => {
    it('should handle bookmarking already bookmarked conversation', () => {
      const conversation = dbService.createConversation('Double Bookmark');
      dbService.bookmarkConversation(conversation.id, 'Label 1');

      // Second bookmark should create a separate entry
      const bookmark2 = dbService.bookmarkConversation(conversation.id, 'Label 2');

      expect(bookmark2).toBeDefined();
      expect(bookmark2.label).toBe('Label 2');
    });

    it('should handle empty bookmark list', () => {
      const conversation = dbService.createConversation('No Messages');

      const bookmarks = dbService.getBookmarkedMessages(conversation.id);

      expect(bookmarks).toHaveLength(0);
    });

    it('should handle removing non-existent bookmark', () => {
      expect(() => {
        dbService.removeBookmark('non-existent-id');
      }).not.toThrow();
    });

    it('should preserve bookmark order by creation time', () => {
      const conv = dbService.createConversation('Order Test');

      const bm1 = dbService.bookmarkConversation(conv.id, 'First');
      const bm2 = dbService.bookmarkConversation(conv.id, 'Second');

      const bookmarked = dbService.getBookmarkedConversations();
      const relevant = bookmarked.filter(b => b.conversation_id === conv.id);

      if (relevant.length >= 2) {
        expect(relevant[0].created_at).toBeGreaterThanOrEqual(relevant[1].created_at);
      }
    });

    it('should handle bookmark label with special characters', () => {
      const conversation = dbService.createConversation('Special Chars');
      const label = 'Important! @#$% "Review" \'ASAP\'';

      const bookmark = dbService.bookmarkConversation(conversation.id, label);

      expect(bookmark.label).toBe(label);

      const updated = dbService.isConversationBookmarked(conversation.id);
      expect(updated?.label).toBe(label);
    });
  });
});
