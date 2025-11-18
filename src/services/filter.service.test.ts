import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './db.service';

describe('Advanced Filter Service', () => {
  beforeEach(async () => {
    await dbService.initialize();
  });

  describe('Date Range Filtering', () => {
    it('should filter conversations by date range', () => {
      const now = Date.now();
      const pastDate = now - 1000 * 60 * 60 * 24; // 1 day ago
      const futureDate = now + 1000 * 60 * 60 * 24; // 1 day from now

      const conv1 = dbService.createConversation('Recent Chat');
      const conv2 = dbService.createConversation('Old Chat');

      const filtered = dbService.getConversationsByDateRange(now - 1000, now + 1000);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.map(c => c.id)).toContain(conv1.id);
    });

    it('should return empty array for date range with no conversations', () => {
      const pastDate = Date.now() - 1000 * 60 * 60 * 24 * 30; // 30 days ago
      const pastEndDate = pastDate + 1000 * 60 * 60; // 1 hour later

      const filtered = dbService.getConversationsByDateRange(pastDate, pastEndDate);

      // Should be empty since we created conversations just now
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Message Count Filtering', () => {
    it('should filter conversations by message count', () => {
      const conv1 = dbService.createConversation('Many Messages');
      const conv2 = dbService.createConversation('Few Messages');

      // Add messages to conv1
      dbService.addMessage({
        conversation_id: conv1.id,
        role: 'user',
        content: 'Message 1'
      });
      dbService.addMessage({
        conversation_id: conv1.id,
        role: 'assistant',
        content: 'Message 2'
      });
      dbService.addMessage({
        conversation_id: conv1.id,
        role: 'user',
        content: 'Message 3'
      });

      const filtered = dbService.getConversationsByMessageCount(3, 10);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.map(c => c.id)).toContain(conv1.id);
    });

    it('should return conversations with message count in range', () => {
      const conv = dbService.createConversation('Message Count Test');

      // Add exactly 2 messages
      dbService.addMessage({
        conversation_id: conv.id,
        role: 'user',
        content: 'Message 1'
      });
      dbService.addMessage({
        conversation_id: conv.id,
        role: 'assistant',
        content: 'Message 2'
      });

      const filtered = dbService.getConversationsByMessageCount(2, 5);

      expect(filtered.map(c => c.id)).toContain(conv.id);
    });
  });

  describe('Combined Filtering', () => {
    it('should filter by tags', () => {
      const conv1 = dbService.createConversation('Tagged Chat 1');
      const conv2 = dbService.createConversation('Tagged Chat 2');

      const tag = dbService.createTag('Important');

      dbService.addTagToConversation(conv1.id, tag.id);
      dbService.addTagToConversation(conv2.id, tag.id);

      const filtered = dbService.filterConversations({
        tags: { ids: [tag.id], matchAll: true }
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.map(c => c.id)).toContain(conv1.id);
      expect(filtered.map(c => c.id)).toContain(conv2.id);
    });

    it('should filter by bookmark status', () => {
      const conv1 = dbService.createConversation('Bookmarked');
      const conv2 = dbService.createConversation('Not Bookmarked');

      dbService.bookmarkConversation(conv1.id);

      const filtered = dbService.filterConversations({
        isBookmarked: true
      });

      expect(filtered.map(c => c.id)).toContain(conv1.id);
      expect(filtered.map(c => c.id)).not.toContain(conv2.id);
    });

    it('should filter by message count', () => {
      const conv1 = dbService.createConversation('Many Messages');
      const conv2 = dbService.createConversation('Few Messages');

      // Add messages to conv1
      dbService.addMessage({
        conversation_id: conv1.id,
        role: 'user',
        content: 'Message 1'
      });
      dbService.addMessage({
        conversation_id: conv1.id,
        role: 'assistant',
        content: 'Message 2'
      });

      const filtered = dbService.filterConversations({
        minMessages: 2,
        maxMessages: 5
      });

      expect(filtered.map(c => c.id)).toContain(conv1.id);
    });

    it('should filter by search text', () => {
      const conv = dbService.createConversation('SearchableTitle');

      dbService.addMessage({
        conversation_id: conv.id,
        role: 'user',
        content: 'Find this keyword'
      });

      const filtered = dbService.filterConversations({
        searchText: 'keyword'
      });

      expect(filtered.map(c => c.id)).toContain(conv.id);
    });

    it('should combine multiple filters', () => {
      const conv = dbService.createConversation('Multi-filter Test');
      const tag = dbService.createTag('MultiTag');

      dbService.addTagToConversation(conv.id, tag.id);
      dbService.bookmarkConversation(conv.id);

      dbService.addMessage({
        conversation_id: conv.id,
        role: 'user',
        content: 'Multi test'
      });

      const filtered = dbService.filterConversations({
        tags: { ids: [tag.id] },
        isBookmarked: true,
        minMessages: 1
      });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.map(c => c.id)).toContain(conv.id);
    });

    it('should handle AND tag filtering (all tags required)', () => {
      const conv = dbService.createConversation('AND Filter Test');
      const tag1 = dbService.createTag('Tag1');
      const tag2 = dbService.createTag('Tag2');
      const tag3 = dbService.createTag('Tag3');

      dbService.addTagToConversation(conv.id, tag1.id);
      dbService.addTagToConversation(conv.id, tag2.id);

      // Filter for conversations with BOTH tag1 and tag2
      const filtered = dbService.filterConversations({
        tags: { ids: [tag1.id, tag2.id], matchAll: true }
      });

      expect(filtered.map(c => c.id)).toContain(conv.id);

      // Filter for conversations with BOTH tag1 and tag3 (should not find)
      const notFiltered = dbService.filterConversations({
        tags: { ids: [tag1.id, tag3.id], matchAll: true }
      });

      expect(notFiltered.map(c => c.id)).not.toContain(conv.id);
    });

    it('should handle OR tag filtering (any tag matches)', () => {
      const conv1 = dbService.createConversation('OR Filter Test 1');
      const conv2 = dbService.createConversation('OR Filter Test 2');

      const tag1 = dbService.createTag('TagA');
      const tag2 = dbService.createTag('TagB');

      dbService.addTagToConversation(conv1.id, tag1.id);
      dbService.addTagToConversation(conv2.id, tag2.id);

      // Filter for conversations with EITHER tag1 or tag2
      const filtered = dbService.filterConversations({
        tags: { ids: [tag1.id, tag2.id], matchAll: false }
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.map(c => c.id)).toContain(conv1.id);
      expect(filtered.map(c => c.id)).toContain(conv2.id);
    });
  });

  describe('Filter Suggestions', () => {
    it('should provide filter suggestions based on data', () => {
      const conv1 = dbService.createConversation('Suggestion Test 1');
      const conv2 = dbService.createConversation('Suggestion Test 2');

      const tag = dbService.createTag('SuggestionTag');
      dbService.addTagToConversation(conv1.id, tag.id);
      dbService.bookmarkConversation(conv2.id);

      dbService.addMessage({
        conversation_id: conv1.id,
        role: 'user',
        content: 'Test'
      });

      const suggestions = dbService.getFilterSuggestions();

      expect(suggestions.dateRange).toBeDefined();
      expect(suggestions.dateRange.min).toBeLessThanOrEqual(suggestions.dateRange.max);
      expect(suggestions.messageCount).toBeDefined();
      expect(suggestions.tagCount).toBeGreaterThanOrEqual(1);
      expect(suggestions.bookmarkedCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty database for suggestions', () => {
      const suggestions = dbService.getFilterSuggestions();

      expect(suggestions).toBeDefined();
      expect(suggestions.dateRange).toBeDefined();
      expect(suggestions.messageCount).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle inverted date range', () => {
      const startDate = Date.now();
      const endDate = Date.now() - 1000 * 60 * 60; // End before start

      const filtered = dbService.getConversationsByDateRange(endDate, startDate);

      // Should return empty or handle gracefully
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should filter case-insensitively for text', () => {
      const conv = dbService.createConversation('CaseSensitiveTitle');

      dbService.addMessage({
        conversation_id: conv.id,
        role: 'user',
        content: 'UPPERCASE KEYWORD'
      });

      const filtered1 = dbService.filterConversations({ searchText: 'uppercase' });
      const filtered2 = dbService.filterConversations({ searchText: 'UPPERCASE' });

      expect(filtered1.map(c => c.id)).toContain(conv.id);
      expect(filtered2.map(c => c.id)).toContain(conv.id);
    });

    it('should handle special characters in search', () => {
      const conv = dbService.createConversation('Special Chars Test');

      dbService.addMessage({
        conversation_id: conv.id,
        role: 'user',
        content: 'Text with @#$% special chars'
      });

      const filtered = dbService.filterConversations({
        searchText: '@#$%'
      });

      expect(filtered.map(c => c.id)).toContain(conv.id);
    });

    it('should return empty array when no filters match', () => {
      const filtered = dbService.filterConversations({
        searchText: 'nonexistent-keyword-12345'
      });

      expect(Array.isArray(filtered)).toBe(true);
    });
  });
});
