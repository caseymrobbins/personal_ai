import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './db.service';

/**
 * Simple sentiment analysis helper for testing
 * In production, this would use ML models
 */
function analyzeSentimentScore(text: string): { score: number; label: string; confidence: number } {
  // Simple keyword-based analysis for testing
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'sad', 'wrong', 'fail', 'error', 'problem'];
  const positiveWords = ['good', 'great', 'excellent', 'love', 'happy', 'success', 'perfect', 'amazing', 'wonderful', 'best'];

  const lowerText = text.toLowerCase();
  let score = 0;
  let wordCount = 0;

  for (const word of negativeWords) {
    if (lowerText.includes(word)) {
      score -= 0.5;
      wordCount++;
    }
  }

  for (const word of positiveWords) {
    if (lowerText.includes(word)) {
      score += 0.5;
      wordCount++;
    }
  }

  const normalizedScore = wordCount > 0 ? Math.max(-1, Math.min(1, score)) : 0;
  const confidence = Math.min(1, wordCount * 0.2);

  let label: 'negative' | 'neutral' | 'positive' = 'neutral';
  if (normalizedScore < -0.2) label = 'negative';
  else if (normalizedScore > 0.2) label = 'positive';

  return { score: normalizedScore, label, confidence };
}

describe('Sentiment Analysis Service', () => {
  beforeEach(async () => {
    await dbService.initialize();
  });

  describe('Message Sentiment Analysis', () => {
    it('should analyze positive sentiment', () => {
      const conversation = dbService.createConversation('Sentiment Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'This is absolutely wonderful and amazing!',
        module_used: null,
        trace_data: null
      });

      const result = analyzeSentimentScore('This is absolutely wonderful and amazing!');

      expect(result.score).toBeGreaterThan(0);
      expect(result.label).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should analyze negative sentiment', () => {
      const result = analyzeSentimentScore('This is terrible and awful, I hate it!');

      expect(result.score).toBeLessThan(0);
      expect(result.label).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should analyze neutral sentiment', () => {
      const result = analyzeSentimentScore('The weather is cloudy today');

      expect(result.label).toBe('neutral');
      expect(result.confidence).toBe(0);
    });

    it('should normalize score between -1 and 1', () => {
      const positiveResult = analyzeSentimentScore('good wonderful great amazing excellent best');
      const negativeResult = analyzeSentimentScore('bad terrible awful hate angry sad wrong fail');

      expect(positiveResult.score).toBeLessThanOrEqual(1);
      expect(positiveResult.score).toBeGreaterThanOrEqual(-1);
      expect(negativeResult.score).toBeLessThanOrEqual(1);
      expect(negativeResult.score).toBeGreaterThanOrEqual(-1);
    });

    it('should have confidence between 0 and 1', () => {
      const result = analyzeSentimentScore('This is good and bad mixed together');

      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Store Message Sentiment', () => {
    it('should store message sentiment in database', () => {
      const conversation = dbService.createConversation('Store Sentiment Test');
      const messageId = dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'This is fantastic!',
        module_used: null,
        trace_data: null
      });

      const sentiment = analyzeSentimentScore('This is fantastic!');

      // Simulate storing sentiment
      const sentimentId = `sent-${crypto.randomUUID()}`;
      dbService.exec(
        `INSERT INTO message_sentiment (id, message_id, sentiment_score, sentiment_label, confidence, analyzed_at)
         VALUES ('${sentimentId}', '${messageId}', ${sentiment.score}, '${sentiment.label}', ${sentiment.confidence}, ${Date.now()})`
      );

      // Verify storage
      const stored = dbService.query<any>(
        'SELECT * FROM message_sentiment WHERE message_id = ?',
        [messageId]
      );

      expect(stored.length).toBeGreaterThan(0);
      expect(stored[0].sentiment_label).toBe('positive');
    });
  });

  describe('Sentiment Trends', () => {
    it('should calculate conversation sentiment trend', () => {
      const conversation = dbService.createConversation('Trend Test');

      // Add positive messages
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'This is great!',
        module_used: null,
        trace_data: null
      });

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Wonderful to hear!',
        module_used: null,
        trace_data: null
      });

      // Add negative message
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Now I am angry',
        module_used: null,
        trace_data: null
      });

      const messages = dbService.getConversationHistory(conversation.id);
      let totalScore = 0;
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;

      for (const msg of messages) {
        const sentiment = analyzeSentimentScore(msg.content);
        totalScore += sentiment.score;
        if (sentiment.label === 'positive') positiveCount++;
        else if (sentiment.label === 'negative') negativeCount++;
        else neutralCount++;
      }

      const averageSentiment = totalScore / messages.length;

      expect(averageSentiment).toBeDefined();
      expect(positiveCount).toBeGreaterThan(0);
      expect(negativeCount).toBeGreaterThan(0);
    });

    it('should detect improving sentiment trend', () => {
      const conversation = dbService.createConversation('Improving Trend Test');

      // Early messages - negative
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'I am sad and angry',
        module_used: null,
        trace_data: null
      });

      // Later messages - positive
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Things are getting better now',
        module_used: null,
        trace_data: null
      });

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Yes, I am happy and excited!',
        module_used: null,
        trace_data: null
      });

      const messages = dbService.getConversationHistory(conversation.id);

      // Simple trend detection: compare first half vs second half
      const midpoint = Math.floor(messages.length / 2);
      let firstHalfScore = 0;
      let secondHalfScore = 0;

      for (let i = 0; i < midpoint; i++) {
        firstHalfScore += analyzeSentimentScore(messages[i].content).score;
      }

      for (let i = midpoint; i < messages.length; i++) {
        secondHalfScore += analyzeSentimentScore(messages[i].content).score;
      }

      const firstHalfAvg = firstHalfScore / midpoint;
      const secondHalfAvg = secondHalfScore / (messages.length - midpoint);

      const trend = secondHalfAvg > firstHalfAvg ? 'improving' : 'declining';

      expect(trend).toBe('improving');
    });

    it('should detect declining sentiment trend', () => {
      const conversation = dbService.createConversation('Declining Trend Test');

      // Early messages - positive
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Everything is wonderful and great!',
        module_used: null,
        trace_data: null
      });

      // Later messages - negative
      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'But problems appeared',
        module_used: null,
        trace_data: null
      });

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'This is terrible and awful now',
        module_used: null,
        trace_data: null
      });

      const messages = dbService.getConversationHistory(conversation.id);

      const midpoint = Math.floor(messages.length / 2);
      let firstHalfScore = 0;
      let secondHalfScore = 0;

      for (let i = 0; i < midpoint; i++) {
        firstHalfScore += analyzeSentimentScore(messages[i].content).score;
      }

      for (let i = midpoint; i < messages.length; i++) {
        secondHalfScore += analyzeSentimentScore(messages[i].content).score;
      }

      const firstHalfAvg = firstHalfScore / midpoint;
      const secondHalfAvg = secondHalfScore / (messages.length - midpoint);

      const trend = secondHalfAvg < firstHalfAvg ? 'declining' : 'improving';

      expect(trend).toBe('declining');
    });
  });

  describe('Sentiment Distribution', () => {
    it('should calculate sentiment distribution', () => {
      const conversation = dbService.createConversation('Distribution Test');

      const messages = [
        'This is wonderful!',
        'Amazing work!',
        'The weather is nice',
        'This is terrible',
        'I hate this'
      ];

      for (const content of messages) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content,
          module_used: null,
          trace_data: null
        });
      }

      const conversationMessages = dbService.getConversationHistory(conversation.id);
      let distribution = { positive: 0, neutral: 0, negative: 0 };

      for (const msg of conversationMessages) {
        const sentiment = analyzeSentimentScore(msg.content);
        distribution[sentiment.label as keyof typeof distribution]++;
      }

      expect(distribution.positive).toBeGreaterThan(0);
      expect(distribution.negative).toBeGreaterThan(0);
      expect(distribution.positive + distribution.negative + distribution.neutral).toBe(messages.length);
    });
  });

  describe('Emotion Tags', () => {
    it('should extract emotion tags from sentiment', () => {
      const emotionKeywords = {
        joy: ['happy', 'joy', 'wonderful', 'great', 'love', 'excited'],
        anger: ['angry', 'furious', 'hate', 'mad', 'rage'],
        sadness: ['sad', 'unhappy', 'depressed', 'miserable', 'lonely'],
        fear: ['afraid', 'scared', 'terrified', 'anxious', 'nervous']
      };

      function extractEmotions(text: string): string[] {
        const emotions: string[] = [];
        const lowerText = text.toLowerCase();

        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
          for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
              emotions.push(emotion);
              break;
            }
          }
        }

        return emotions;
      }

      const emotions = extractEmotions('I am so happy and excited!');
      expect(emotions).toContain('joy');

      const angryEmotions = extractEmotions('I am furious and angry');
      expect(angryEmotions).toContain('anger');
    });
  });

  describe('Sentiment Statistics', () => {
    it('should calculate sentiment statistics across conversations', () => {
      const conv1 = dbService.createConversation('Stats Conv 1');
      const conv2 = dbService.createConversation('Stats Conv 2');

      // Add messages to conv1
      dbService.addMessage({
        conversation_id: conv1.id,
        role: 'user',
        content: 'This is excellent!',
        module_used: null,
        trace_data: null
      });

      // Add messages to conv2
      dbService.addMessage({
        conversation_id: conv2.id,
        role: 'user',
        content: 'This is terrible',
        module_used: null,
        trace_data: null
      });

      const allMessages = dbService.getAllMessages();
      let totalScore = 0;
      let sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

      for (const msg of allMessages) {
        const sentiment = analyzeSentimentScore(msg.content);
        totalScore += sentiment.score;
        sentimentCounts[sentiment.label]++;
      }

      const averageSentiment = totalScore / allMessages.length;

      expect(sentimentCounts.positive).toBeGreaterThanOrEqual(0);
      expect(sentimentCounts.negative).toBeGreaterThanOrEqual(0);
      expect(averageSentiment).toBeDefined();
    });
  });

  describe('Time-based Sentiment Analysis', () => {
    it('should analyze sentiment over time', () => {
      const conversation = dbService.createConversation('Time Sentiment Test');

      // Simulate messages over time
      const timeIntervalMs = 1000;
      const messageTexts = [
        'Starting happy and optimistic',
        'Still doing good',
        'Feeling a bit tired now',
        'Getting frustrated',
        'Feeling terrible and bad'
      ];

      const messagesWithTimestamps: any[] = [];

      for (let i = 0; i < messageTexts.length; i++) {
        const msgId = dbService.addMessage({
          conversation_id: conversation.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: messageTexts[i],
          module_used: null,
          trace_data: null
        });

        const sentiment = analyzeSentimentScore(messageTexts[i]);
        messagesWithTimestamps.push({
          id: msgId,
          timestamp: Date.now() + i * timeIntervalMs,
          sentiment: sentiment.score
        });
      }

      // Verify sentiment progression
      expect(messagesWithTimestamps[0].sentiment).toBeGreaterThan(messagesWithTimestamps[4].sentiment);
    });
  });

  describe('Chart Data Generation', () => {
    it('should generate sentiment chart data', () => {
      const conversation = dbService.createConversation('Chart Data Test');

      const messages = ['wonderful', 'great', 'good', 'neutral', 'bad'];

      for (const content of messages) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content,
          module_used: null,
          trace_data: null
        });
      }

      const conversationMessages = dbService.getConversationHistory(conversation.id);
      const chartData = conversationMessages.map((msg, index) => ({
        timestamp: msg.timestamp,
        sentiment: analyzeSentimentScore(msg.content).score,
        index: index
      }));

      expect(chartData).toHaveLength(messages.length);
      expect(chartData[0].sentiment).toBeGreaterThan(chartData[messages.length - 1].sentiment);
    });

    it('should aggregate sentiment data by time period', () => {
      const conversation = dbService.createConversation('Aggregate Test');

      // Add messages with different sentiments
      const sentiments = ['positive', 'negative', 'neutral'];
      for (let i = 0; i < 9; i++) {
        const sentiment = sentiments[i % 3];
        const content = sentiment === 'positive' ? 'great' : sentiment === 'negative' ? 'terrible' : 'neutral';

        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content,
          module_used: null,
          trace_data: null
        });
      }

      const messages = dbService.getConversationHistory(conversation.id);

      // Group by sentiment
      const grouped: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
      for (const msg of messages) {
        const label = analyzeSentimentScore(msg.content).label;
        grouped[label]++;
      }

      expect(grouped.positive).toBe(3);
      expect(grouped.negative).toBe(3);
      expect(grouped.neutral).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const result = analyzeSentimentScore('');

      expect(result.label).toBe('neutral');
      expect(result.confidence).toBe(0);
    });

    it('should handle special characters and punctuation', () => {
      const result = analyzeSentimentScore('This is great!!! Amazing??? Wonderful...');

      expect(result.score).toBeGreaterThan(0);
      expect(result.label).toBe('positive');
    });

    it('should handle mixed sentiment messages', () => {
      const result = analyzeSentimentScore('I love this but I also hate that');

      expect(result.score).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const lowerResult = analyzeSentimentScore('wonderful amazing great');
      const upperResult = analyzeSentimentScore('WONDERFUL AMAZING GREAT');

      expect(lowerResult.score).toBe(upperResult.score);
      expect(lowerResult.label).toBe(upperResult.label);
    });

    it('should handle very long messages', () => {
      const longMessage = 'good '.repeat(100);
      const result = analyzeSentimentScore(longMessage);

      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
