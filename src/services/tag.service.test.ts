import { describe, it, expect, beforeEach } from 'vitest';
import { dbService, Tag, Conversation } from './db.service';

describe('Tag Management Service', () => {
  beforeEach(async () => {
    // Initialize database for testing
    await dbService.initialize();
  });

  describe('Tag Creation', () => {
    it('should create a new tag', () => {
      const tag = dbService.createTag('Important', '#FF5733');

      expect(tag).toBeDefined();
      expect(tag.name).toBe('Important');
      expect(tag.color).toBe('#FF5733');
      expect(tag.id).toMatch(/^tag-/);
      expect(tag.created_at).toBeLessThanOrEqual(Date.now());
    });

    it('should create a tag without color', () => {
      const tag = dbService.createTag('Review');

      expect(tag.name).toBe('Review');
      expect(tag.color).toBeUndefined();
    });

    it('should retrieve all created tags', () => {
      dbService.createTag('Work', '#0000FF');
      dbService.createTag('Personal', '#FF00FF');
      dbService.createTag('Urgent', '#FF0000');

      const tags = dbService.getAllTags();

      expect(tags).toHaveLength(3);
      expect(tags.map(t => t.name)).toEqual(['Personal', 'Urgent', 'Work']); // Alphabetical order
    });

    it('should enforce unique tag names', () => {
      dbService.createTag('Duplicate');

      // Attempting to create duplicate should throw error
      expect(() => {
        dbService.createTag('Duplicate');
      }).toThrow();
    });
  });

  describe('Conversation Tagging', () => {
    it('should add a tag to a conversation', () => {
      const conversation = dbService.createConversation('Test Chat');
      const tag = dbService.createTag('Important');

      dbService.addTagToConversation(conversation.id, tag.id);

      const conversationTags = dbService.getConversationTags(conversation.id);

      expect(conversationTags).toHaveLength(1);
      expect(conversationTags[0].id).toBe(tag.id);
      expect(conversationTags[0].name).toBe('Important');
    });

    it('should add multiple tags to a conversation', () => {
      const conversation = dbService.createConversation('Multi-tagged Chat');
      const tag1 = dbService.createTag('Work');
      const tag2 = dbService.createTag('Urgent');
      const tag3 = dbService.createTag('Follow-up');

      dbService.addTagToConversation(conversation.id, tag1.id);
      dbService.addTagToConversation(conversation.id, tag2.id);
      dbService.addTagToConversation(conversation.id, tag3.id);

      const conversationTags = dbService.getConversationTags(conversation.id);

      expect(conversationTags).toHaveLength(3);
      expect(conversationTags.map(t => t.name)).toEqual(['Follow-up', 'Urgent', 'Work']); // Alphabetical
    });

    it('should handle duplicate tag assignment gracefully', () => {
      const conversation = dbService.createConversation('Duplicate Tag Test');
      const tag = dbService.createTag('Important');

      dbService.addTagToConversation(conversation.id, tag.id);
      dbService.addTagToConversation(conversation.id, tag.id); // Add same tag again

      const conversationTags = dbService.getConversationTags(conversation.id);

      expect(conversationTags).toHaveLength(1); // Should not duplicate
    });

    it('should remove a tag from a conversation', () => {
      const conversation = dbService.createConversation('Remove Tag Test');
      const tag1 = dbService.createTag('Keep');
      const tag2 = dbService.createTag('Remove');

      dbService.addTagToConversation(conversation.id, tag1.id);
      dbService.addTagToConversation(conversation.id, tag2.id);

      dbService.removeTagFromConversation(conversation.id, tag2.id);

      const conversationTags = dbService.getConversationTags(conversation.id);

      expect(conversationTags).toHaveLength(1);
      expect(conversationTags[0].id).toBe(tag1.id);
    });

    it('should get conversation with all its tags', () => {
      const conversation = dbService.createConversation('Tagged Conversation');
      const tag1 = dbService.createTag('Tag1');
      const tag2 = dbService.createTag('Tag2');

      dbService.addTagToConversation(conversation.id, tag1.id);
      dbService.addTagToConversation(conversation.id, tag2.id);

      const enrichedConversation = dbService.getConversationWithTags(conversation.id);

      expect(enrichedConversation).toBeDefined();
      expect(enrichedConversation?.tags).toHaveLength(2);
      expect(enrichedConversation?.title).toBe('Tagged Conversation');
    });
  });

  describe('Tag-based Filtering', () => {
    beforeEach(() => {
      // Create test data
      dbService.createConversation('Chat 1');
      dbService.createConversation('Chat 2');
      dbService.createConversation('Chat 3');
    });

    it('should get conversations by single tag', () => {
      const conversations = dbService.getConversations();
      const tag = dbService.createTag('Work');

      dbService.addTagToConversation(conversations[0].id, tag.id);
      dbService.addTagToConversation(conversations[1].id, tag.id);

      const tagged = dbService.getConversationsByTag(tag.id);

      expect(tagged).toHaveLength(2);
      expect(tagged.map(c => c.id)).toContain(conversations[0].id);
      expect(tagged.map(c => c.id)).toContain(conversations[1].id);
    });

    it('should get conversations by any tag (OR filter)', () => {
      const conversations = dbService.getConversations();
      const tag1 = dbService.createTag('Work');
      const tag2 = dbService.createTag('Personal');

      dbService.addTagToConversation(conversations[0].id, tag1.id);
      dbService.addTagToConversation(conversations[1].id, tag2.id);
      dbService.addTagToConversation(conversations[2].id, tag1.id);

      const tagged = dbService.getConversationsByAnyTag([tag1.id, tag2.id]);

      expect(tagged).toHaveLength(3); // All conversations have either tag1 or tag2
    });

    it('should get conversations by all tags (AND filter)', () => {
      const conversations = dbService.getConversations();
      const tag1 = dbService.createTag('Urgent');
      const tag2 = dbService.createTag('Work');

      dbService.addTagToConversation(conversations[0].id, tag1.id);
      dbService.addTagToConversation(conversations[0].id, tag2.id);

      dbService.addTagToConversation(conversations[1].id, tag1.id); // Only tag1

      const tagged = dbService.getConversationsByAllTags([tag1.id, tag2.id]);

      expect(tagged).toHaveLength(1); // Only conversations[0] has both tags
      expect(tagged[0].id).toBe(conversations[0].id);
    });
  });

  describe('Tag Statistics', () => {
    it('should calculate tag usage statistics', () => {
      const conversations = dbService.getConversations();
      const tag1 = dbService.createTag('Popular');
      const tag2 = dbService.createTag('Rare');

      if (conversations.length > 0) {
        dbService.addTagToConversation(conversations[0].id, tag1.id);
      }
      if (conversations.length > 1) {
        dbService.addTagToConversation(conversations[1].id, tag1.id);
        dbService.addTagToConversation(conversations[1].id, tag2.id);
      }

      const stats = dbService.getTagStats();

      expect(stats.totalTags).toBeGreaterThanOrEqual(2);
      expect(stats.tagUsage).toHaveLength(stats.totalTags);

      const popularTag = stats.tagUsage.find(t => t.tagName === 'Popular');
      expect(popularTag?.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Tag Deletion', () => {
    it('should delete a tag and remove it from all conversations', () => {
      const conversations = dbService.getConversations();
      const tag = dbService.createTag('ToDelete');

      if (conversations.length > 0) {
        dbService.addTagToConversation(conversations[0].id, tag.id);
        dbService.addTagToConversation(conversations[1]?.id || conversations[0].id, tag.id);
      }

      dbService.deleteTag(tag.id);

      const remainingTags = dbService.getAllTags();
      expect(remainingTags.map(t => t.id)).not.toContain(tag.id);

      if (conversations.length > 0) {
        const conversationTags = dbService.getConversationTags(conversations[0].id);
        expect(conversationTags.map(t => t.id)).not.toContain(tag.id);
      }
    });

    it('should handle deletion of non-existent tag gracefully', () => {
      // Should not throw error
      expect(() => {
        dbService.deleteTag('non-existent-tag');
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tag list for conversation', () => {
      const conversation = dbService.createConversation('No Tags');

      const tags = dbService.getConversationTags(conversation.id);

      expect(tags).toHaveLength(0);
    });

    it('should handle filtering with empty tag list', () => {
      const results = dbService.getConversationsByAnyTag([]);

      expect(results).toHaveLength(0);
    });

    it('should return null for non-existent conversation tags query', () => {
      const result = dbService.getConversationWithTags('non-existent-id');

      expect(result).toBeNull();
    });

    it('should preserve tag color through operations', () => {
      const tag = dbService.createTag('Colored', '#ABCDEF');
      const allTags = dbService.getAllTags();
      const retrievedTag = allTags.find(t => t.id === tag.id);

      expect(retrievedTag?.color).toBe('#ABCDEF');
    });
  });
});
