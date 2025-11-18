import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './db.service';

describe('Conversation Tools Service', () => {
  beforeEach(async () => {
    await dbService.initialize();
  });

  describe('Conversation Templates', () => {
    it('should create a conversation template', () => {
      const template = dbService.createConversationTemplate(
        'Support Ticket',
        'For customer support requests',
        'Welcome to support. How can we help?'
      );

      expect(template).toBeDefined();
      expect(template.name).toBe('Support Ticket');
      expect(template.description).toBe('For customer support requests');
      expect(template.initial_message).toBe('Welcome to support. How can we help?');
      expect(template.id).toMatch(/^tpl-/);
    });

    it('should enforce unique template names', () => {
      dbService.createConversationTemplate('Unique Template');

      expect(() => {
        dbService.createConversationTemplate('Unique Template');
      }).toThrow();
    });

    it('should get all templates', () => {
      dbService.createConversationTemplate('Template 1');
      dbService.createConversationTemplate('Template 2');
      dbService.createConversationTemplate('Template 3');

      const templates = dbService.getAllTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(3);
      expect(templates.map(t => t.name)).toContain('Template 1');
    });

    it('should get template by ID', () => {
      const created = dbService.createConversationTemplate('Get Template Test');
      const retrieved = dbService.getTemplate(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Get Template Test');
    });

    it('should create conversation from template', () => {
      const template = dbService.createConversationTemplate(
        'Predefined Template',
        'Test description',
        'Initial system message'
      );

      const conversationId = dbService.createConversationFromTemplate(
        template.id,
        'My Support Request'
      );

      const conversation = dbService.getConversation(conversationId);
      expect(conversation?.title).toBe('My Support Request');

      const messages = dbService.getConversationHistory(conversationId);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toBe('Initial system message');
    });

    it('should delete template', () => {
      const template = dbService.createConversationTemplate('Delete Me');

      const deleted = dbService.deleteTemplate(template.id);

      expect(deleted).toBe(true);

      const retrieved = dbService.getTemplate(template.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent template', () => {
      const result = dbService.deleteTemplate('non-existent-template');
      expect(result).toBe(false);
    });
  });

  describe('Conversation Branching', () => {
    it('should create a conversation branch', () => {
      const conversation = dbService.createConversation('Branch Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Branch from here',
        module_used: null,
        trace_data: null
      });

      const branch = dbService.createConversationBranch(
        conversation.id,
        messageId,
        'Alternative Path'
      );

      expect(branch).toBeDefined();
      expect(branch.parent_conversation_id).toBe(conversation.id);
      expect(branch.from_message_id).toBe(messageId);
      expect(branch.branch_name).toBe('Alternative Path');
      expect(branch.id).toMatch(/^branch-/);
    });

    it('should throw error when branching from non-existent parent', () => {
      expect(() => {
        dbService.createConversationBranch('non-existent-conv', 'msg-id', 'Branch');
      }).toThrow();
    });

    it('should throw error when branching from non-existent message', () => {
      const conversation = dbService.createConversation('Branch Error Test');

      expect(() => {
        dbService.createConversationBranch(
          conversation.id,
          'non-existent-message',
          'Branch'
        );
      }).toThrow();
    });

    it('should get all branches of a conversation', () => {
      const conversation = dbService.createConversation('Get Branches Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1',
        module_used: null,
        trace_data: null
      });

      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2',
        module_used: null,
        trace_data: null
      });

      dbService.createConversationBranch(conversation.id, msg1, 'Branch 1');
      dbService.createConversationBranch(conversation.id, msg2, 'Branch 2');

      const branches = dbService.getConversationBranches(conversation.id);

      expect(branches.length).toBeGreaterThanOrEqual(2);
      expect(branches.map(b => b.branch_name)).toContain('Branch 1');
      expect(branches.map(b => b.branch_name)).toContain('Branch 2');
    });
  });

  describe('Message Position Queries', () => {
    it('should get messages after a point', () => {
      const conversation = dbService.createConversation('Messages After Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1',
        module_used: null,
        trace_data: null
      });

      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2',
        module_used: null,
        trace_data: null
      });

      const msg3 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 3',
        module_used: null,
        trace_data: null
      });

      const messagesAfter = dbService.getMessagesAfter(conversation.id, msg1);

      expect(messagesAfter.length).toBeGreaterThanOrEqual(2);
      expect(messagesAfter.map(m => m.id)).toContain(msg2);
      expect(messagesAfter.map(m => m.id)).toContain(msg3);
      expect(messagesAfter.map(m => m.id)).not.toContain(msg1);
    });

    it('should return empty array for messages after last message', () => {
      const conversation = dbService.createConversation('Last Message Test');

      const msg = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Last message',
        module_used: null,
        trace_data: null
      });

      const messagesAfter = dbService.getMessagesAfter(conversation.id, msg);

      expect(messagesAfter).toHaveLength(0);
    });
  });

  describe('Conversation Merging', () => {
    it('should merge two conversations', () => {
      const conv1 = dbService.createConversation('Conv 1');
      const conv2 = dbService.createConversation('Conv 2');

      const msg1 = dbService.addMessage({
        conversation_id: conv1.id,
        role: 'user',
        content: 'Message from conv 1',
        module_used: null,
        trace_data: null
      });

      const msg2 = dbService.addMessage({
        conversation_id: conv2.id,
        role: 'user',
        content: 'Message from conv 2',
        module_used: null,
        trace_data: null
      });

      const result = dbService.mergeConversations(conv1.id, conv2.id);

      expect(result).toBe(true);

      const mergedHistory = dbService.getConversationHistory(conv2.id);
      expect(mergedHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('should return false when merging with non-existent conversation', () => {
      const conversation = dbService.createConversation('Merge Test');

      const result = dbService.mergeConversations(conversation.id, 'non-existent');

      expect(result).toBe(false);
    });

    it('should return false when merging conversation with itself', () => {
      const conversation = dbService.createConversation('Self Merge Test');

      const result = dbService.mergeConversations(conversation.id, conversation.id);

      expect(result).toBe(false);
    });
  });

  describe('Conversation Splitting', () => {
    it('should split a conversation', () => {
      const conversation = dbService.createConversation('Split Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1',
        module_used: null,
        trace_data: null
      });

      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2',
        module_used: null,
        trace_data: null
      });

      const msg3 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 3',
        module_used: null,
        trace_data: null
      });

      const newConvId = dbService.splitConversation(
        conversation.id,
        msg2,
        'Split Conversation'
      );

      const originalMessages = dbService.getConversationHistory(conversation.id);
      const newMessages = dbService.getConversationHistory(newConvId);

      expect(originalMessages.map(m => m.id)).toContain(msg1);
      expect(originalMessages.map(m => m.id)).toContain(msg2);
      expect(originalMessages.map(m => m.id)).not.toContain(msg3);

      expect(newMessages.map(m => m.id)).toContain(msg3);
      expect(newMessages.map(m => m.id)).not.toContain(msg1);
    });

    it('should throw error when splitting with non-existent message', () => {
      const conversation = dbService.createConversation('Split Error Test');

      expect(() => {
        dbService.splitConversation(conversation.id, 'non-existent-msg', 'New Conv');
      }).toThrow();
    });
  });

  describe('Conversation Relations', () => {
    it('should track conversation merge relations', () => {
      const conv1 = dbService.createConversation('Merge Relation Test 1');
      const conv2 = dbService.createConversation('Merge Relation Test 2');

      dbService.mergeConversations(conv1.id, conv2.id);

      const relations = dbService.getConversationRelations(conv2.id);

      expect(relations.length).toBeGreaterThan(0);
      expect(relations.some(r => r.relation_type === 'merge')).toBe(true);
    });

    it('should get relations filtered by type', () => {
      const conversation = dbService.createConversation('Relation Filter Test');

      const msg = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Test message',
        module_used: null,
        trace_data: null
      });

      dbService.createConversationBranch(conversation.id, msg, 'Branch');

      const branchRelations = dbService.getConversationRelations(
        conversation.id,
        'branch'
      );

      expect(branchRelations.length).toBeGreaterThan(0);
      expect(branchRelations.every(r => r.relation_type === 'branch')).toBe(true);
    });
  });

  describe('Branch Conversation History', () => {
    it('should get branch conversation history up to branch point', () => {
      const conversation = dbService.createConversation('Branch History Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1',
        module_used: null,
        trace_data: null
      });

      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2 (branch point)',
        module_used: null,
        trace_data: null
      });

      const msg3 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 3',
        module_used: null,
        trace_data: null
      });

      const branchHistory = dbService.getBranchConversationHistory(
        conversation.id,
        msg2
      );

      expect(branchHistory.length).toBeGreaterThanOrEqual(2);
      expect(branchHistory.map(m => m.id)).toContain(msg1);
      expect(branchHistory.map(m => m.id)).toContain(msg2);
      expect(branchHistory.map(m => m.id)).not.toContain(msg3);
    });
  });

  describe('Conversation Tools Statistics', () => {
    it('should calculate conversation tools statistics', () => {
      const conversation = dbService.createConversation('Stats Test');

      const msg1 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Message 1',
        module_used: null,
        trace_data: null
      });

      const msg2 = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Message 2',
        module_used: null,
        trace_data: null
      });

      dbService.createConversationBranch(conversation.id, msg1, 'Branch 1');
      dbService.createConversationBranch(conversation.id, msg2, 'Branch 2');

      const stats = dbService.getConversationToolsStats(conversation.id);

      expect(stats.branchCount).toBeGreaterThanOrEqual(2);
      expect(stats.relationCount).toBeGreaterThanOrEqual(2);
    });

    it('should return zero stats for new conversation', () => {
      const conversation = dbService.createConversation('Zero Stats Test');

      const stats = dbService.getConversationToolsStats(conversation.id);

      expect(stats.branchCount).toBe(0);
      expect(stats.hasParent).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle template creation without optional fields', () => {
      const template = dbService.createConversationTemplate('Minimal Template');

      expect(template).toBeDefined();
      expect(template.description).toBeUndefined();
      expect(template.initial_message).toBeUndefined();
    });

    it('should handle creating conversation from template without initial message', () => {
      const template = dbService.createConversationTemplate('No Message Template');

      const conversationId = dbService.createConversationFromTemplate(
        template.id,
        'Test Conversation'
      );

      const messages = dbService.getConversationHistory(conversationId);

      expect(messages).toHaveLength(0);
    });

    it('should preserve message order during merge', () => {
      const conv1 = dbService.createConversation('Order Test Conv 1');
      const conv2 = dbService.createConversation('Order Test Conv 2');

      const msg1 = dbService.addMessage({
        conversation_id: conv1.id,
        role: 'user',
        content: 'Message 1',
        module_used: null,
        trace_data: null
      });

      const msg2 = dbService.addMessage({
        conversation_id: conv1.id,
        role: 'assistant',
        content: 'Message 2',
        module_used: null,
        trace_data: null
      });

      dbService.mergeConversations(conv1.id, conv2.id);

      const history = dbService.getConversationHistory(conv2.id);
      const lastTwoMessages = history.slice(-2);

      expect(lastTwoMessages[0].id).toBe(msg1);
      expect(lastTwoMessages[1].id).toBe(msg2);
    });

    it('should handle splitting conversation with multiple messages', () => {
      const conversation = dbService.createConversation('Multi Split Test');

      const messages = [];
      for (let i = 0; i < 5; i++) {
        messages.push(
          dbService.addMessage({
            conversation_id: conversation.id,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i + 1}`,
            module_used: null,
            trace_data: null
          })
        );
      }

      const midPoint = messages[2];
      const newConvId = dbService.splitConversation(
        conversation.id,
        midPoint,
        'Second Half'
      );

      const originalHistory = dbService.getConversationHistory(conversation.id);
      const newHistory = dbService.getConversationHistory(newConvId);

      expect(originalHistory.length).toBeLessThan(5);
      expect(newHistory.length).toBeGreaterThan(0);
      expect(originalHistory.length + newHistory.length).toBeLessThanOrEqual(5);
    });
  });
});
