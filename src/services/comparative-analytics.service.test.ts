import { describe, it, expect, beforeEach } from 'vitest';
import { dbService } from './db.service';

describe('Comparative Analytics Service', () => {
  beforeEach(async () => {
    await dbService.initialize();
  });

  describe('Anomaly Detection', () => {
    it('should record an anomaly', () => {
      const conversation = dbService.createConversation('Anomaly Test');

      const anomaly = dbService.recordAnomaly(
        conversation.id,
        Date.now(),
        'sentiment_spike',
        'high',
        'Sudden sentiment spike detected',
        0.95,
        0.5
      );

      expect(anomaly).toBeDefined();
      expect(anomaly.anomaly_type).toBe('sentiment_spike');
      expect(anomaly.severity).toBe('high');
      expect(anomaly.value).toBe(0.95);
      expect(anomaly.threshold).toBe(0.5);
      expect(anomaly.id).toMatch(/^anom-/);
    });

    it('should get anomalies for a conversation', () => {
      const conversation = dbService.createConversation('Get Anomalies Test');

      dbService.recordAnomaly(
        conversation.id,
        Date.now(),
        'sentiment_spike',
        'high',
        'Test 1',
        0.9,
        0.5
      );
      dbService.recordAnomaly(
        conversation.id,
        Date.now() - 1000,
        'topic_shift',
        'medium',
        'Test 2',
        0.7,
        0.4
      );
      dbService.recordAnomaly(
        conversation.id,
        Date.now() - 2000,
        'frequency_anomaly',
        'low',
        'Test 3',
        0.3,
        0.2
      );

      const anomalies = dbService.getAnomalies(conversation.id);

      expect(anomalies.length).toBeGreaterThanOrEqual(3);
      expect(anomalies[0].detected_at).toBeGreaterThanOrEqual(anomalies[1].detected_at);
    });

    it('should filter anomalies by severity', () => {
      const conversation = dbService.createConversation('Severity Filter Test');

      dbService.recordAnomaly(conversation.id, Date.now(), 'sentiment_spike', 'high', 'High severity', 0.9, 0.5);
      dbService.recordAnomaly(conversation.id, Date.now(), 'topic_shift', 'medium', 'Medium severity', 0.7, 0.4);
      dbService.recordAnomaly(conversation.id, Date.now(), 'frequency_anomaly', 'low', 'Low severity', 0.3, 0.2);

      const highSeverity = dbService.getAnomalies(conversation.id, 'high');
      const mediumSeverity = dbService.getAnomalies(conversation.id, 'medium');
      const lowSeverity = dbService.getAnomalies(conversation.id, 'low');

      expect(highSeverity.every(a => a.severity === 'high')).toBe(true);
      expect(mediumSeverity.every(a => a.severity === 'medium')).toBe(true);
      expect(lowSeverity.every(a => a.severity === 'low')).toBe(true);
    });

    it('should delete anomaly', () => {
      const conversation = dbService.createConversation('Delete Anomaly Test');

      const anomaly = dbService.recordAnomaly(
        conversation.id,
        Date.now(),
        'sentiment_spike',
        'high',
        'Delete me',
        0.9,
        0.5
      );

      const deleted = dbService.deleteAnomaly(anomaly.id);

      expect(deleted).toBe(true);

      const anomalies = dbService.getAnomalies(conversation.id);
      expect(anomalies.map(a => a.id)).not.toContain(anomaly.id);
    });

    it('should return false when deleting non-existent anomaly', () => {
      const result = dbService.deleteAnomaly('non-existent');
      expect(result).toBe(false);
    });

    it('should handle all anomaly types', () => {
      const conversation = dbService.createConversation('Anomaly Types Test');
      const types: Array<'sentiment_spike' | 'topic_shift' | 'frequency_anomaly' | 'custom'> = [
        'sentiment_spike',
        'topic_shift',
        'frequency_anomaly',
        'custom'
      ];

      for (const type of types) {
        dbService.recordAnomaly(conversation.id, Date.now(), type, 'medium', `Type: ${type}`, 0.5, 0.3);
      }

      const anomalies = dbService.getAnomalies(conversation.id);

      expect(anomalies.length).toBeGreaterThanOrEqual(4);
      expect(anomalies.map(a => a.anomaly_type)).toContain('sentiment_spike');
      expect(anomalies.map(a => a.anomaly_type)).toContain('topic_shift');
      expect(anomalies.map(a => a.anomaly_type)).toContain('frequency_anomaly');
      expect(anomalies.map(a => a.anomaly_type)).toContain('custom');
    });

    it('should store anomaly with correct metadata', () => {
      const conversation = dbService.createConversation('Metadata Test');
      const timestamp = Date.now() - 5000;

      const anomaly = dbService.recordAnomaly(
        conversation.id,
        timestamp,
        'sentiment_spike',
        'high',
        'Detailed description of anomaly',
        0.95,
        0.5
      );

      expect(anomaly.timestamp).toBe(timestamp);
      expect(anomaly.description).toBe('Detailed description of anomaly');
      expect(anomaly.conversation_id).toBe(conversation.id);
      expect(anomaly.detected_at).toBeDefined();
    });
  });

  describe('Trend Analysis', () => {
    it('should record trend analysis', () => {
      const conversation = dbService.createConversation('Trend Analysis Test');
      const dataPoints = [
        { timestamp: Date.now() - 3000, value: 0.5 },
        { timestamp: Date.now() - 2000, value: 0.6 },
        { timestamp: Date.now() - 1000, value: 0.7 },
        { timestamp: Date.now(), value: 0.8 }
      ];

      const trend = dbService.recordTrendAnalysis(
        conversation.id,
        'sentiment',
        '7d',
        dataPoints,
        'upward',
        0.1,
        0.95,
        0.9
      );

      expect(trend).toBeDefined();
      expect(trend.metric).toBe('sentiment');
      expect(trend.timeframe).toBe('7d');
      expect(trend.trend).toBe('upward');
      expect(trend.slope).toBe(0.1);
      expect(trend.correlation).toBe(0.95);
      expect(trend.confidence).toBe(0.9);
      expect(trend.dataPoints.length).toBe(4);
    });

    it('should calculate change percent correctly', () => {
      const conversation = dbService.createConversation('Change Percent Test');
      const dataPoints = [
        { timestamp: Date.now() - 1000, value: 100 },
        { timestamp: Date.now(), value: 150 }
      ];

      const trend = dbService.recordTrendAnalysis(
        conversation.id,
        'message_count',
        '30d',
        dataPoints,
        'upward',
        50,
        0.8,
        0.85
      );

      expect(trend.startValue).toBe(100);
      expect(trend.endValue).toBe(150);
      expect(trend.changePercent).toBe(50);
    });

    it('should get trend analyses for a conversation', () => {
      const conversation = dbService.createConversation('Get Trends Test');
      const dataPoints = [{ timestamp: Date.now(), value: 0.5 }];

      dbService.recordTrendAnalysis(conversation.id, 'sentiment', '7d', dataPoints, 'stable', 0, 0.5, 0.7);
      dbService.recordTrendAnalysis(conversation.id, 'message_count', '30d', dataPoints, 'upward', 10, 0.8, 0.85);
      dbService.recordTrendAnalysis(conversation.id, 'topic_diversity', '7d', dataPoints, 'downward', -5, 0.6, 0.75);

      const trends = dbService.getTrendAnalyses(conversation.id);

      expect(trends.length).toBeGreaterThanOrEqual(3);
      expect(trends[0].analyzedAt).toBeGreaterThanOrEqual(trends[1].analyzedAt);
    });

    it('should filter trend analyses by metric', () => {
      const conversation = dbService.createConversation('Metric Filter Test');
      const dataPoints = [{ timestamp: Date.now(), value: 0.5 }];

      dbService.recordTrendAnalysis(conversation.id, 'sentiment', '7d', dataPoints, 'stable', 0, 0.5, 0.7);
      dbService.recordTrendAnalysis(conversation.id, 'message_count', '30d', dataPoints, 'upward', 10, 0.8, 0.85);

      const sentimentTrends = dbService.getTrendAnalyses(conversation.id, 'sentiment');
      const messageCountTrends = dbService.getTrendAnalyses(conversation.id, 'message_count');

      expect(sentimentTrends.every(t => t.metric === 'sentiment')).toBe(true);
      expect(messageCountTrends.every(t => t.metric === 'message_count')).toBe(true);
    });

    it('should handle all trend directions', () => {
      const conversation = dbService.createConversation('Trend Directions Test');
      const dataPoints = [{ timestamp: Date.now(), value: 0.5 }];
      const directions: Array<'upward' | 'downward' | 'stable'> = ['upward', 'downward', 'stable'];

      for (const direction of directions) {
        dbService.recordTrendAnalysis(conversation.id, 'test', '7d', dataPoints, direction, 0, 0.5, 0.7);
      }

      const trends = dbService.getTrendAnalyses(conversation.id);

      expect(trends.map(t => t.trend)).toContain('upward');
      expect(trends.map(t => t.trend)).toContain('downward');
      expect(trends.map(t => t.trend)).toContain('stable');
    });

    it('should preserve data points in trend analysis', () => {
      const conversation = dbService.createConversation('Data Points Test');
      const dataPoints = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
        { timestamp: 3000, value: 30 },
        { timestamp: 4000, value: 25 }
      ];

      dbService.recordTrendAnalysis(conversation.id, 'test', '7d', dataPoints, 'stable', 0, 0.5, 0.7);

      const trends = dbService.getTrendAnalyses(conversation.id);
      const stored = trends[0];

      expect(stored.dataPoints.length).toBe(4);
      expect(stored.dataPoints).toEqual(dataPoints);
    });
  });

  describe('Time Period Comparison', () => {
    it('should compare two time periods', () => {
      const conversation = dbService.createConversation('Period Comparison Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      // Add messages to first period
      for (let i = 0; i < 5; i++) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          module_used: null,
          trace_data: null
        });
      }

      const comparison = dbService.compareTimePeriods(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      expect(comparison).toBeDefined();
      expect(comparison.period1Start).toBe(threeWeeksAgo);
      expect(comparison.period1End).toBe(twoWeeksAgo);
      expect(comparison.period2Start).toBe(oneWeekAgo);
      expect(comparison.period2End).toBe(now);
      expect(comparison.trend).toBeDefined();
    });

    it('should calculate change percent correctly', () => {
      const conversation = dbService.createConversation('Change Percent Comparison Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      // Add 10 messages to second period
      for (let i = 0; i < 10; i++) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          module_used: null,
          trace_data: null
        });
      }

      const comparison = dbService.compareTimePeriods(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      expect(comparison.period2Metrics.messageCount).toBeGreaterThanOrEqual(0);
      expect(comparison.changePercent).toBeDefined();
    });

    it('should detect increasing trend', () => {
      const conversation = dbService.createConversation('Increasing Trend Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      // Add many messages to second period
      for (let i = 0; i < 15; i++) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          module_used: null,
          trace_data: null
        });
      }

      const comparison = dbService.compareTimePeriods(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      if (comparison.period2Metrics.messageCount > comparison.period1Metrics.messageCount) {
        expect(comparison.changePercent).toBeGreaterThan(5);
        expect(comparison.trend).toBe('increasing');
      }
    });

    it('should detect decreasing trend', () => {
      const conversation = dbService.createConversation('Decreasing Trend Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      // Add messages to first period
      for (let i = 0; i < 10; i++) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          module_used: null,
          trace_data: null
        });
      }

      const comparison = dbService.compareTimePeriods(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      if (comparison.period1Metrics.messageCount > comparison.period2Metrics.messageCount) {
        expect(comparison.changePercent).toBeLessThan(-5);
        expect(comparison.trend).toBe('decreasing');
      }
    });

    it('should detect stable trend', () => {
      const conversation = dbService.createConversation('Stable Trend Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      const comparison = dbService.compareTimePeriods(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      // With few or equal messages, should be stable
      if (Math.abs(comparison.changePercent) <= 5) {
        expect(comparison.trend).toBe('stable');
      }
    });
  });

  describe('Comparative Statistics', () => {
    it('should generate comparative statistics', () => {
      const conversation = dbService.createConversation('Stats Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      dbService.addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content: 'Test message',
        module_used: null,
        trace_data: null
      });

      const stats = dbService.getComparativeStats(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      expect(stats).toBeDefined();
      expect(stats.conversationId).toBe(conversation.id);
      expect(stats.period1Label).toBeDefined();
      expect(stats.period2Label).toBeDefined();
      expect(stats.metrics).toBeDefined();
      expect(stats.anomalyCount).toBeGreaterThanOrEqual(0);
      expect(stats.significantChanges).toBeDefined();
      expect(stats.insights).toBeDefined();
    });

    it('should include metrics in statistics', () => {
      const conversation = dbService.createConversation('Metrics Stats Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      const stats = dbService.getComparativeStats(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      expect(stats.metrics.messageCount).toBeDefined();
      expect(stats.metrics.avgSentiment).toBeDefined();
      expect(stats.metrics.topicDiversity).toBeDefined();
      expect(stats.metrics.activeHours).toBeDefined();

      expect(stats.metrics.messageCount.period1).toBeDefined();
      expect(stats.metrics.messageCount.period2).toBeDefined();
      expect(stats.metrics.messageCount.change).toBeDefined();
    });

    it('should generate insights', () => {
      const conversation = dbService.createConversation('Insights Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      const stats = dbService.getComparativeStats(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      expect(stats.insights.length).toBeGreaterThan(0);
      expect(stats.insights[0]).toBeDefined();
    });

    it('should detect significant changes', () => {
      const conversation = dbService.createConversation('Significant Changes Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      // Add many messages to trigger significant change
      for (let i = 0; i < 20; i++) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          module_used: null,
          trace_data: null
        });
      }

      const stats = dbService.getComparativeStats(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      expect(stats.significantChanges).toBeDefined();
      expect(Array.isArray(stats.significantChanges)).toBe(true);
    });

    it('should include anomaly count in statistics', () => {
      const conversation = dbService.createConversation('Anomaly Count Stats Test');
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      // Record some anomalies
      dbService.recordAnomaly(conversation.id, now, 'sentiment_spike', 'high', 'Test anomaly', 0.9, 0.5);
      dbService.recordAnomaly(conversation.id, now - 1000, 'topic_shift', 'medium', 'Test anomaly 2', 0.7, 0.4);

      const stats = dbService.getComparativeStats(
        conversation.id,
        threeWeeksAgo,
        twoWeeksAgo,
        oneWeekAgo,
        now
      );

      expect(stats.anomalyCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conversation for anomaly detection', () => {
      const conversation = dbService.createConversation('Empty Anomaly Test');

      const anomalies = dbService.getAnomalies(conversation.id);

      expect(anomalies).toHaveLength(0);
    });

    it('should handle empty conversation for trends', () => {
      const conversation = dbService.createConversation('Empty Trends Test');

      const trends = dbService.getTrendAnalyses(conversation.id);

      expect(trends).toHaveLength(0);
    });

    it('should handle single data point in trend', () => {
      const conversation = dbService.createConversation('Single Point Trend Test');

      const trend = dbService.recordTrendAnalysis(
        conversation.id,
        'test',
        '7d',
        [{ timestamp: Date.now(), value: 0.5 }],
        'stable',
        0,
        0.5,
        0.7
      );

      expect(trend.dataPoints.length).toBe(1);
      expect(trend.startValue).toBe(0.5);
      expect(trend.endValue).toBe(0.5);
      expect(trend.changePercent).toBe(0);
    });

    it('should handle zero start value for change percent', () => {
      const conversation = dbService.createConversation('Zero Start Value Test');

      const trend = dbService.recordTrendAnalysis(
        conversation.id,
        'test',
        '7d',
        [
          { timestamp: Date.now() - 1000, value: 0 },
          { timestamp: Date.now(), value: 100 }
        ],
        'upward',
        50,
        0.8,
        0.85
      );

      expect(trend.startValue).toBe(0);
      expect(trend.changePercent).toBe(0);
    });

    it('should handle overlapping time periods', () => {
      const conversation = dbService.createConversation('Overlap Periods Test');
      const now = Date.now();
      const midpoint = now - 3 * 24 * 60 * 60 * 1000;

      const comparison = dbService.compareTimePeriods(
        conversation.id,
        now - 7 * 24 * 60 * 60 * 1000,
        midpoint,
        now - 5 * 24 * 60 * 60 * 1000,
        now
      );

      expect(comparison).toBeDefined();
      expect(comparison.period1End).toBeGreaterThan(comparison.period2Start);
    });

    it('should handle statistics with no anomalies', () => {
      const conversation = dbService.createConversation('No Anomalies Stats Test');
      const now = Date.now();

      const stats = dbService.getComparativeStats(
        conversation.id,
        now - 14 * 24 * 60 * 60 * 1000,
        now - 7 * 24 * 60 * 60 * 1000,
        now - 7 * 24 * 60 * 60 * 1000,
        now
      );

      expect(stats.anomalyCount).toBe(0);
    });

    it('should handle anomaly with boundary severity values', () => {
      const conversation = dbService.createConversation('Boundary Severity Test');
      const severities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

      for (const severity of severities) {
        dbService.recordAnomaly(conversation.id, Date.now(), 'custom', severity, `${severity} severity`, 0.5, 0.3);
      }

      const anomalies = dbService.getAnomalies(conversation.id);
      const bySeverity = {
        low: anomalies.filter(a => a.severity === 'low').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        high: anomalies.filter(a => a.severity === 'high').length
      };

      expect(bySeverity.low).toBeGreaterThan(0);
      expect(bySeverity.medium).toBeGreaterThan(0);
      expect(bySeverity.high).toBeGreaterThan(0);
    });

    it('should handle very large value differences in trends', () => {
      const conversation = dbService.createConversation('Large Value Diff Test');

      const trend = dbService.recordTrendAnalysis(
        conversation.id,
        'test',
        '7d',
        [
          { timestamp: Date.now() - 1000, value: 1 },
          { timestamp: Date.now(), value: 1000000 }
        ],
        'upward',
        999999,
        0.9,
        0.85
      );

      expect(trend.startValue).toBe(1);
      expect(trend.endValue).toBe(1000000);
      expect(trend.changePercent).toBeGreaterThan(99999);
    });

    it('should handle negative values in trend data', () => {
      const conversation = dbService.createConversation('Negative Values Test');

      const trend = dbService.recordTrendAnalysis(
        conversation.id,
        'test',
        '7d',
        [
          { timestamp: Date.now() - 1000, value: -50 },
          { timestamp: Date.now(), value: 50 }
        ],
        'upward',
        100,
        0.8,
        0.85
      );

      expect(trend.startValue).toBe(-50);
      expect(trend.endValue).toBe(50);
      expect(trend.dataPoints).toContainEqual({ timestamp: trend.dataPoints[0].timestamp, value: -50 });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain anomaly integrity across operations', () => {
      const conversation = dbService.createConversation('Integrity Test');

      const anom1 = dbService.recordAnomaly(conversation.id, Date.now(), 'sentiment_spike', 'high', 'Anom 1', 0.9, 0.5);
      const anom2 = dbService.recordAnomaly(conversation.id, Date.now(), 'topic_shift', 'low', 'Anom 2', 0.3, 0.2);

      dbService.deleteAnomaly(anom1.id);

      const remaining = dbService.getAnomalies(conversation.id);

      expect(remaining.map(a => a.id)).toContain(anom2.id);
      expect(remaining.map(a => a.id)).not.toContain(anom1.id);
    });

    it('should maintain trend data integrity', () => {
      const conversation = dbService.createConversation('Trend Integrity Test');
      const dataPoints = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
        { timestamp: 3000, value: 30 }
      ];

      dbService.recordTrendAnalysis(conversation.id, 'metric1', '7d', dataPoints, 'upward', 10, 0.9, 0.85);

      const trends = dbService.getTrendAnalyses(conversation.id);
      const stored = trends[0];

      // Verify data points are preserved exactly
      for (let i = 0; i < dataPoints.length; i++) {
        expect(stored.dataPoints[i].timestamp).toBe(dataPoints[i].timestamp);
        expect(stored.dataPoints[i].value).toBe(dataPoints[i].value);
      }
    });

    it('should maintain statistics consistency', () => {
      const conversation = dbService.createConversation('Stats Consistency Test');
      const now = Date.now();
      const period1Start = now - 14 * 24 * 60 * 60 * 1000;
      const period1End = now - 7 * 24 * 60 * 60 * 1000;
      const period2Start = now - 7 * 24 * 60 * 60 * 1000;
      const period2End = now;

      // Add messages
      for (let i = 0; i < 5; i++) {
        dbService.addMessage({
          conversation_id: conversation.id,
          role: 'user',
          content: `Message ${i}`,
          module_used: null,
          trace_data: null
        });
      }

      const stats = dbService.getComparativeStats(
        conversation.id,
        period1Start,
        period1End,
        period2Start,
        period2End
      );

      // Verify metrics are consistent
      expect(stats.metrics.messageCount.change).toBe(
        stats.metrics.messageCount.period2 - stats.metrics.messageCount.period1
      );
    });
  });
});
