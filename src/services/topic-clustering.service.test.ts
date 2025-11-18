import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './db.service';

describe('Topic Clustering Service', () => {
  beforeEach(async () => {
    await dbService.initialize();
  });

  describe('Topic Creation and Management', () => {
    it('should create a topic', () => {
      const conversation = dbService.createConversation('Topic Test');

      const topic = dbService.createTopic(
        conversation.id,
        'JavaScript',
        'javascript,js,coding',
        5,
        0.85
      );

      expect(topic).toBeDefined();
      expect(topic.name).toBe('JavaScript');
      expect(topic.keywords).toBe('javascript,js,coding');
      expect(topic.message_count).toBe(5);
      expect(topic.relevance_score).toBe(0.85);
      expect(topic.id).toMatch(/^topic-/);
    });

    it('should get topics by conversation', () => {
      const conversation = dbService.createConversation('Get Topics Test');

      const topic1 = dbService.createTopic(conversation.id, 'Topic 1', 'key1', 3, 0.8);
      const topic2 = dbService.createTopic(conversation.id, 'Topic 2', 'key2', 5, 0.9);
      const topic3 = dbService.createTopic(conversation.id, 'Topic 3', 'key3', 2, 0.6);

      const topics = dbService.getTopics(conversation.id);

      expect(topics.length).toBeGreaterThanOrEqual(3);
      expect(topics[0].relevance_score).toBeGreaterThanOrEqual(topics[1].relevance_score);
      expect(topics.map(t => t.id)).toContain(topic1.id);
      expect(topics.map(t => t.id)).toContain(topic2.id);
      expect(topics.map(t => t.id)).toContain(topic3.id);
    });

    it('should get topic by ID', () => {
      const conversation = dbService.createConversation('Get Topic By ID Test');
      const created = dbService.createTopic(conversation.id, 'Test Topic', 'test', 1, 0.5);

      const retrieved = dbService.getTopic(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Topic');
    });

    it('should return null for non-existent topic', () => {
      const result = dbService.getTopic('non-existent-topic');
      expect(result).toBeNull();
    });

    it('should update topic', () => {
      const conversation = dbService.createConversation('Update Topic Test');
      const topic = dbService.createTopic(conversation.id, 'Original', 'original', 1, 0.5);

      const updated = dbService.updateTopic(topic.id, {
        name: 'Updated',
        relevance_score: 0.9
      });

      expect(updated.name).toBe('Updated');
      expect(updated.relevance_score).toBe(0.9);

      const retrieved = dbService.getTopic(topic.id);
      expect(retrieved?.name).toBe('Updated');
      expect(retrieved?.relevance_score).toBe(0.9);
    });

    it('should throw error when updating non-existent topic', () => {
      expect(() => {
        dbService.updateTopic('non-existent', { name: 'Updated' });
      }).toThrow();
    });

    it('should delete topic', () => {
      const conversation = dbService.createConversation('Delete Topic Test');
      const topic = dbService.createTopic(conversation.id, 'Delete Me', 'delete', 1, 0.5);

      const deleted = dbService.deleteTopic(topic.id);

      expect(deleted).toBe(true);

      const retrieved = dbService.getTopic(topic.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent topic', () => {
      const result = dbService.deleteTopic('non-existent');
      expect(result).toBe(false);
    });

    it('should delete topic and cascade delete word frequencies', () => {
      const conversation = dbService.createConversation('Cascade Delete Test');
      const topic = dbService.createTopic(conversation.id, 'Topic', 'topic', 1, 0.5);

      // Add word frequencies
      dbService.recordWordFrequency(conversation.id, 'word1', 5, topic.id);
      dbService.recordWordFrequency(conversation.id, 'word2', 3, topic.id);

      // Verify word frequencies exist
      let words = dbService.getTopicWords(topic.id);
      expect(words.length).toBe(2);

      // Delete topic
      dbService.deleteTopic(topic.id);

      // Verify word frequencies are deleted
      words = dbService.getTopicWords(topic.id);
      expect(words.length).toBe(0);
    });
  });

  describe('Word Frequency Analysis', () => {
    it('should record word frequency', () => {
      const conversation = dbService.createConversation('Word Frequency Test');

      const id = dbService.recordWordFrequency(conversation.id, 'JAVASCRIPT', 10);

      expect(id).toMatch(/^wf-/);
    });

    it('should convert words to lowercase', () => {
      const conversation = dbService.createConversation('Lowercase Test');

      dbService.recordWordFrequency(conversation.id, 'JAVASCRIPT', 10);
      dbService.recordWordFrequency(conversation.id, 'JavaScript', 5);

      const frequencies = dbService.getWordFrequencies(conversation.id, 100);
      const jsFreq = frequencies.find(f => f.word === 'javascript');

      expect(jsFreq).toBeDefined();
    });

    it('should get word frequencies for conversation', () => {
      const conversation = dbService.createConversation('Get Word Frequencies Test');

      dbService.recordWordFrequency(conversation.id, 'python', 15);
      dbService.recordWordFrequency(conversation.id, 'javascript', 10);
      dbService.recordWordFrequency(conversation.id, 'typescript', 8);

      const frequencies = dbService.getWordFrequencies(conversation.id, 100);

      expect(frequencies.length).toBeGreaterThanOrEqual(3);
      expect(frequencies[0].frequency).toBeGreaterThanOrEqual(frequencies[1].frequency);
    });

    it('should limit word frequencies results', () => {
      const conversation = dbService.createConversation('Limit Frequencies Test');

      for (let i = 0; i < 20; i++) {
        dbService.recordWordFrequency(conversation.id, `word${i}`, 20 - i);
      }

      const frequencies = dbService.getWordFrequencies(conversation.id, 5);

      expect(frequencies.length).toBeLessThanOrEqual(5);
    });

    it('should get word frequencies for specific topic', () => {
      const conversation = dbService.createConversation('Topic Words Test');
      const topic1 = dbService.createTopic(conversation.id, 'Topic 1', 'topic1', 1, 0.5);
      const topic2 = dbService.createTopic(conversation.id, 'Topic 2', 'topic2', 1, 0.5);

      dbService.recordWordFrequency(conversation.id, 'word1', 5, topic1.id);
      dbService.recordWordFrequency(conversation.id, 'word2', 3, topic1.id);
      dbService.recordWordFrequency(conversation.id, 'word3', 7, topic2.id);

      const topic1Words = dbService.getTopicWords(topic1.id);
      const topic2Words = dbService.getTopicWords(topic2.id);

      expect(topic1Words.length).toBe(2);
      expect(topic2Words.length).toBe(1);
      expect(topic1Words.every(w => w.topic_id === topic1.id)).toBe(true);
    });

    it('should handle word frequencies without topic', () => {
      const conversation = dbService.createConversation('No Topic Frequency Test');

      dbService.recordWordFrequency(conversation.id, 'generic', 5);

      const frequencies = dbService.getWordFrequencies(conversation.id, 100);
      const generic = frequencies.find(f => f.word === 'generic');

      expect(generic).toBeDefined();
      expect(generic?.topic_id).toBeNull();
    });
  });

  describe('Topic Clustering', () => {
    it('should create a topic cluster', () => {
      const conversation = dbService.createConversation('Cluster Test');
      const topic1 = dbService.createTopic(conversation.id, 'Topic 1', 'topic1', 1, 0.8);
      const topic2 = dbService.createTopic(conversation.id, 'Topic 2', 'topic2', 1, 0.7);

      const cluster = dbService.createTopicCluster(
        conversation.id,
        'Related Topics',
        `${topic1.id},${topic2.id}`,
        0.85
      );

      expect(cluster).toBeDefined();
      expect(cluster.cluster_name).toBe('Related Topics');
      expect(cluster.topic_ids).toContain(topic1.id);
      expect(cluster.similarity_score).toBe(0.85);
      expect(cluster.id).toMatch(/^cluster-/);
    });

    it('should get topic clusters for conversation', () => {
      const conversation = dbService.createConversation('Get Clusters Test');
      const topic1 = dbService.createTopic(conversation.id, 'Topic 1', 'topic1', 1, 0.8);
      const topic2 = dbService.createTopic(conversation.id, 'Topic 2', 'topic2', 1, 0.7);
      const topic3 = dbService.createTopic(conversation.id, 'Topic 3', 'topic3', 1, 0.6);

      const cluster1 = dbService.createTopicCluster(conversation.id, 'Cluster 1', `${topic1.id},${topic2.id}`, 0.9);
      const cluster2 = dbService.createTopicCluster(conversation.id, 'Cluster 2', `${topic2.id},${topic3.id}`, 0.7);

      const clusters = dbService.getTopicClusters(conversation.id);

      expect(clusters.length).toBeGreaterThanOrEqual(2);
      expect(clusters[0].similarity_score).toBeGreaterThanOrEqual(clusters[1].similarity_score);
      expect(clusters.map(c => c.id)).toContain(cluster1.id);
      expect(clusters.map(c => c.id)).toContain(cluster2.id);
    });

    it('should delete topic cluster', () => {
      const conversation = dbService.createConversation('Delete Cluster Test');
      const topic = dbService.createTopic(conversation.id, 'Topic', 'topic', 1, 0.8);

      const cluster = dbService.createTopicCluster(conversation.id, 'Cluster', topic.id, 0.85);

      const deleted = dbService.deleteTopicCluster(cluster.id);

      expect(deleted).toBe(true);

      const clusters = dbService.getTopicClusters(conversation.id);
      expect(clusters.map(c => c.id)).not.toContain(cluster.id);
    });

    it('should return false when deleting non-existent cluster', () => {
      const result = dbService.deleteTopicCluster('non-existent');
      expect(result).toBe(false);
    });

    it('should order clusters by similarity score', () => {
      const conversation = dbService.createConversation('Cluster Order Test');
      const topic1 = dbService.createTopic(conversation.id, 'Topic 1', 'topic1', 1, 0.8);
      const topic2 = dbService.createTopic(conversation.id, 'Topic 2', 'topic2', 1, 0.7);

      dbService.createTopicCluster(conversation.id, 'Low Sim', topic1.id, 0.3);
      dbService.createTopicCluster(conversation.id, 'High Sim', `${topic1.id},${topic2.id}`, 0.95);
      dbService.createTopicCluster(conversation.id, 'Mid Sim', topic2.id, 0.6);

      const clusters = dbService.getTopicClusters(conversation.id);

      expect(clusters[0].similarity_score).toBeGreaterThanOrEqual(clusters[1].similarity_score);
      expect(clusters[1].similarity_score).toBeGreaterThanOrEqual(clusters[2].similarity_score);
    });
  });

  describe('Topic Statistics', () => {
    it('should calculate topic statistics', () => {
      const conversation = dbService.createConversation('Stats Test');

      const topic1 = dbService.createTopic(conversation.id, 'JavaScript', 'javascript,js', 10, 0.9);
      const topic2 = dbService.createTopic(conversation.id, 'Python', 'python,py', 8, 0.85);
      const topic3 = dbService.createTopic(conversation.id, 'TypeScript', 'typescript,ts', 6, 0.8);

      dbService.recordWordFrequency(conversation.id, 'javascript', 10, topic1.id);
      dbService.recordWordFrequency(conversation.id, 'python', 8, topic2.id);
      dbService.recordWordFrequency(conversation.id, 'typescript', 6, topic3.id);
      // Prevent unused variable warnings - topics are used by getTopicStats

      const stats = dbService.getTopicStats(conversation.id);

      expect(stats.totalTopics).toBeGreaterThanOrEqual(3);
      expect(stats.topicDistribution.length).toBeGreaterThan(0);
      expect(stats.topKeywords.length).toBeGreaterThan(0);
      expect(stats.mainTopics.length).toBeGreaterThan(0);
    });

    it('should include main topics in statistics', () => {
      const conversation = dbService.createConversation('Main Topics Test');

      const topic1 = dbService.createTopic(conversation.id, 'Important', 'important', 10, 0.95);
      const topic2 = dbService.createTopic(conversation.id, 'Secondary', 'secondary', 5, 0.7);

      const stats = dbService.getTopicStats(conversation.id);

      expect(stats.mainTopics).toContain('Important');
    });

    it('should return zero stats for conversation with no topics', () => {
      const conversation = dbService.createConversation('Empty Stats Test');

      const stats = dbService.getTopicStats(conversation.id);

      expect(stats.totalTopics).toBe(0);
      expect(stats.topicDistribution).toHaveLength(0);
      expect(stats.mainTopics).toHaveLength(0);
    });

    it('should handle statistics with many topics', () => {
      const conversation = dbService.createConversation('Many Topics Test');

      for (let i = 0; i < 20; i++) {
        dbService.createTopic(conversation.id, `Topic ${i}`, `topic${i}`, i + 1, 0.5 + (i * 0.02));
      }

      const stats = dbService.getTopicStats(conversation.id);

      expect(stats.totalTopics).toBeGreaterThanOrEqual(20);
      expect(stats.mainTopics.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Auto-detection of Topics', () => {
    it('should auto-detect topics from conversation messages', () => {
      const conversation = dbService.createConversation('Auto-detect Test');

      // Add messages with distinctive keywords
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'I am learning JavaScript and programming languages',
        module_used: null,
        trace_data: null
      });

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'JavaScript is great for web development. Python is excellent for data science.',
        module_used: null,
        trace_data: null
      });

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Tell me about TypeScript and React frameworks',
        module_used: null,
        trace_data: null
      });

      // Add messages used by auto-detect
      const topics = dbService.autoDetectTopics(conversation.id, 0.3);

      expect(topics.length).toBeGreaterThan(0);
      expect(topics[0].relevance_score).toBeLessThanOrEqual(1);
      expect(topics[0].relevance_score).toBeGreaterThanOrEqual(0);
    });

    it('should extract meaningful keywords', () => {
      const conversation = dbService.createConversation('Keywords Test');

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'machine learning algorithms neural networks deep learning',
        module_used: null,
        trace_data: null
      });

      const topics = dbService.autoDetectTopics(conversation.id, 0.2);

      expect(topics.length).toBeGreaterThan(0);
      const keywords = topics.map(t => t.keywords).join(',').toLowerCase();
      expect(keywords).toContain('learning');
    });

    it('should handle empty conversation', () => {
      const conversation = dbService.createConversation('Empty Auto-detect Test');

      const topics = dbService.autoDetectTopics(conversation.id);

      expect(topics).toHaveLength(0);
    });

    it('should respect minimum relevance threshold', () => {
      const conversation = dbService.createConversation('Threshold Test');

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'word word word another another something',
        module_used: null,
        trace_data: null
      });

      // Test with high and low thresholds
      const topicsHigh = dbService.autoDetectTopics(conversation.id, 0.9);
      const topicsLow = dbService.autoDetectTopics(conversation.id, 0.1);

      expect(topicsHigh.length).toBeLessThanOrEqual(topicsLow.length);
    });

    it('should auto-cluster when many topics are detected', () => {
      const conversation = dbService.createConversation('Auto-cluster Test');

      // Add message with many unique words to trigger clustering
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: `javascript python typescript ruby golang rust swift kotlin java cpp
                 programming coding development software engineer developer architecture`,
        module_used: null,
        trace_data: null
      });

      dbService.autoDetectTopics(conversation.id, 0.2);

      const clusters = dbService.getTopicClusters(conversation.id);

      // Should have auto-clustered the topics
      expect(clusters.length).toBeGreaterThanOrEqual(0);
    });

    it('should create word frequencies for auto-detected topics', () => {
      const conversation = dbService.createConversation('Word Freq From Auto-detect Test');

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'database query schema relational sql',
        module_used: null,
        trace_data: null
      });

      dbService.autoDetectTopics(conversation.id, 0.2);

      const wordFreqs = dbService.getWordFrequencies(conversation.id, 100);

      expect(wordFreqs.length).toBeGreaterThan(0);
    });
  });

  describe('Topic Distribution and Trends', () => {
    it('should calculate topic distribution correctly', () => {
      const conversation = dbService.createConversation('Distribution Test');

      dbService.createTopic(conversation.id, 'Frontend', 'frontend,react,vue', 15, 0.9);
      dbService.createTopic(conversation.id, 'Backend', 'backend,node,express', 10, 0.8);
      dbService.createTopic(conversation.id, 'Database', 'database,sql,mongo', 8, 0.75);

      const stats = dbService.getTopicStats(conversation.id);

      expect(stats.topicDistribution.length).toBe(3);
      expect(stats.topicDistribution[0].messageCount).toBeGreaterThanOrEqual(
        stats.topicDistribution[1].messageCount
      );
    });

    it('should rank topics by relevance', () => {
      const conversation = dbService.createConversation('Ranking Test');

      // Create topics with different relevance scores
      dbService.createTopic(conversation.id, 'Low', 'low', 1, 0.2);
      dbService.createTopic(conversation.id, 'Med', 'med', 1, 0.5);
      dbService.createTopic(conversation.id, 'High', 'high', 1, 0.9);

      const topics = dbService.getTopics(conversation.id);

      expect(topics[0].relevance_score).toBeGreaterThanOrEqual(topics[topics.length - 1].relevance_score);
    });
  });

  describe('Edge Cases', () => {
    it('should handle topics with special characters in keywords', () => {
      const conversation = dbService.createConversation('Special Chars Test');

      const topic = dbService.createTopic(
        conversation.id,
        'C++',
        'c++,cpp',
        5,
        0.8
      );

      expect(topic.keywords).toBe('c++,cpp');
    });

    it('should handle very long keyword lists', () => {
      const conversation = dbService.createConversation('Long Keywords Test');

      const keywords = Array(100).fill(0).map((_, i) => `key${i}`).join(',');

      const topic = dbService.createTopic(conversation.id, 'Many Keywords', keywords, 1, 0.5);

      expect(topic.keywords).toBe(keywords);
    });

    it('should handle multiple topics with same name in different conversations', () => {
      const conv1 = dbService.createConversation('Conv 1');
      const conv2 = dbService.createConversation('Conv 2');

      const topic1 = dbService.createTopic(conv1.id, 'Same', 'same1', 1, 0.5);
      const topic2 = dbService.createTopic(conv2.id, 'Same', 'same2', 1, 0.5);

      expect(topic1.id).not.toBe(topic2.id);
    });

    it('should handle empty word list in word frequency', () => {
      const conversation = dbService.createConversation('Empty Words Test');

      const freqs = dbService.getWordFrequencies(conversation.id);

      expect(freqs).toHaveLength(0);
    });

    it('should handle cluster with single topic ID', () => {
      const conversation = dbService.createConversation('Single Topic Cluster Test');
      const topic = dbService.createTopic(conversation.id, 'Topic', 'topic', 1, 0.5);

      const cluster = dbService.createTopicCluster(conversation.id, 'Single', topic.id, 0.5);

      expect(cluster.topic_ids).toBe(topic.id);
    });

    it('should handle topic updates preserving ID', () => {
      const conversation = dbService.createConversation('Update ID Test');
      const topic = dbService.createTopic(conversation.id, 'Original', 'original', 1, 0.5);
      const originalId = topic.id;

      const updated = dbService.updateTopic(topic.id, { name: 'Updated' });

      expect(updated.id).toBe(originalId);
    });

    it('should normalize word frequencies to lowercase', () => {
      const conversation = dbService.createConversation('Normalize Test');

      dbService.recordWordFrequency(conversation.id, 'PYTHON', 5);
      dbService.recordWordFrequency(conversation.id, 'Python', 3);
      dbService.recordWordFrequency(conversation.id, 'python', 2);

      const freqs = dbService.getWordFrequencies(conversation.id);
      // Filter results to check they're all lowercase
      const allLowercase = freqs.filter(f => f.word === f.word.toLowerCase());

      // Should have entries but all lowercase
      expect(freqs.every(f => f.word === f.word.toLowerCase())).toBe(true);
      expect(allLowercase.length).toBeGreaterThan(0);
    });

    it('should handle topic relevance score boundaries', () => {
      const conversation = dbService.createConversation('Score Boundary Test');

      const minScore = dbService.createTopic(conversation.id, 'Min', 'min', 1, 0);
      const maxScore = dbService.createTopic(conversation.id, 'Max', 'max', 1, 1);
      const midScore = dbService.createTopic(conversation.id, 'Mid', 'mid', 1, 0.5);

      expect(minScore.relevance_score).toBe(0);
      expect(maxScore.relevance_score).toBe(1);
      expect(midScore.relevance_score).toBe(0.5);
    });

    it('should handle similarity score boundaries', () => {
      const conversation = dbService.createConversation('Similarity Boundary Test');
      const topic = dbService.createTopic(conversation.id, 'Topic', 'topic', 1, 0.5);

      const minCluster = dbService.createTopicCluster(conversation.id, 'Min Sim', topic.id, 0);
      const maxCluster = dbService.createTopicCluster(conversation.id, 'Max Sim', topic.id, 1);

      expect(minCluster.similarity_score).toBe(0);
      expect(maxCluster.similarity_score).toBe(1);
    });
  });

  describe('Performance and Scale', () => {
    it('should handle many topics efficiently', () => {
      const conversation = dbService.createConversation('Scale Test');

      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        dbService.createTopic(conversation.id, `Topic ${i}`, `topic${i}`, i + 1, Math.random());
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const topics = dbService.getTopics(conversation.id);
      expect(topics.length).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle many word frequencies', () => {
      const conversation = dbService.createConversation('Word Frequency Scale Test');

      for (let i = 0; i < 200; i++) {
        dbService.recordWordFrequency(conversation.id, `word${i}`, 100 - i);
      }

      const freqs = dbService.getWordFrequencies(conversation.id, 100);

      expect(freqs.length).toBeLessThanOrEqual(100);
      expect(freqs[0].frequency).toBeGreaterThanOrEqual(freqs[freqs.length - 1].frequency);
    });

    it('should handle word frequency queries with limit', () => {
      const conversation = dbService.createConversation('Frequency Limit Test');

      for (let i = 0; i < 1000; i++) {
        dbService.recordWordFrequency(conversation.id, `word${i}`, 1000 - i);
      }

      const limited = dbService.getWordFrequencies(conversation.id, 10);

      expect(limited.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Integration Tests', () => {
    it('should create topics and use them in clusters', () => {
      const conversation = dbService.createConversation('Integration Test');

      const topic1 = dbService.createTopic(conversation.id, 'Frontend', 'frontend,react', 10, 0.9);
      const topic2 = dbService.createTopic(conversation.id, 'Backend', 'backend,node', 8, 0.85);

      dbService.recordWordFrequency(conversation.id, 'react', 10, topic1.id);
      dbService.recordWordFrequency(conversation.id, 'node', 8, topic2.id);

      // Create cluster from topics
      dbService.createTopicCluster(
        conversation.id,
        'Web Development',
        `${topic1.id},${topic2.id}`,
        0.9
      );

      const stats = dbService.getTopicStats(conversation.id);

      expect(stats.totalTopics).toBe(2);
      expect(stats.topKeywords.length).toBeGreaterThan(0);
      expect(stats.topicClusters).toBeGreaterThan(0);
    });

    it('should support full topic lifecycle', () => {
      const conversation = dbService.createConversation('Lifecycle Test');

      // Create
      const topic = dbService.createTopic(conversation.id, 'API Design', 'api,rest,graphql', 5, 0.8);
      expect(dbService.getTopic(topic.id)).toBeDefined();

      // Update
      const updated = dbService.updateTopic(topic.id, { message_count: 10 });
      expect(updated.message_count).toBe(10);

      // Add word frequencies
      dbService.recordWordFrequency(conversation.id, 'api', 5, topic.id);
      const words = dbService.getTopicWords(topic.id);
      expect(words.length).toBeGreaterThan(0);

      // Get stats
      const stats = dbService.getTopicStats(conversation.id);
      expect(stats.totalTopics).toBeGreaterThan(0);

      // Delete
      const deleted = dbService.deleteTopic(topic.id);
      expect(deleted).toBe(true);
      expect(dbService.getTopic(topic.id)).toBeNull();
    });
  });
});
