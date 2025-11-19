/**
 * PERSISTENCE ADAPTER SERVICE
 * ===========================
 * Bridges between SML Guardian services and the database layer
 * Automatically persists data from all services
 *
 * Handles:
 * - Memory consolidations
 * - Dream cycles and schedules
 * - Profile evolution snapshots
 * - Emotional states and history
 * - User interactions and sessions
 * - Access logs and audit trails
 * - System metrics and health data
 */

import { DatabaseService, Collection, QueryOptions } from './database.service';

export interface PersistenceConfig {
  enableAutoSave: boolean;
  autoSaveInterval: number; // milliseconds
  enableOfflineMode: boolean;
  cacheSize: number; // number of records to cache
  syncOnReconnect: boolean;
}

export interface SyncStatus {
  isSynced: boolean;
  pendingWrites: number;
  lastSyncTime?: Date;
  nextSyncTime?: Date;
  syncLatency: number; // ms
}

/**
 * Persistence Adapter Service
 * Manages data persistence across all SML Guardian services
 */
class PersistenceAdapterService {
  private static instance: PersistenceAdapterService;
  private db: DatabaseService;
  private config: PersistenceConfig = {
    enableAutoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    enableOfflineMode: true,
    cacheSize: 10000,
    syncOnReconnect: true,
  };
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private pendingWrites: Array<{ collection: string; operation: string; data: any }> = [];
  private syncStatus: SyncStatus = {
    isSynced: true,
    pendingWrites: 0,
    syncLatency: 0,
  };
  private collections = {
    memories: null as Collection<any> | null,
    dreamCycles: null as Collection<any> | null,
    profileSnapshots: null as Collection<any> | null,
    emotionalStates: null as Collection<any> | null,
    interactions: null as Collection<any> | null,
    sessions: null as Collection<any> | null,
    accessLogs: null as Collection<any> | null,
    metrics: null as Collection<any> | null,
  };

  static getInstance(): PersistenceAdapterService {
    if (!PersistenceAdapterService.instance) {
      PersistenceAdapterService.instance = new PersistenceAdapterService();
    }
    return PersistenceAdapterService.instance;
  }

  /**
   * Initialize persistence adapter with database
   */
  async initialize(db: DatabaseService, config?: Partial<PersistenceConfig>): Promise<void> {
    console.log('💾 Persistence Adapter initializing');
    this.db = db;
    this.config = { ...this.config, ...config };

    // Initialize collections
    this.collections.memories = this.db.getCollection('memories');
    this.collections.dreamCycles = this.db.getCollection('dream_cycles');
    this.collections.profileSnapshots = this.db.getCollection('profile_snapshots');
    this.collections.emotionalStates = this.db.getCollection('emotional_states');
    this.collections.interactions = this.db.getCollection('interactions');
    this.collections.sessions = this.db.getCollection('sessions');
    this.collections.accessLogs = this.db.getCollection('access_logs');
    this.collections.metrics = this.db.getCollection('metrics');

    // Start auto-save
    if (this.config.enableAutoSave) {
      this.startAutoSave();
    }

    console.log(`✓ Persistence Adapter ready (auto-save: ${this.config.enableAutoSave})`);
  }

  /**
   * Persist memory consolidation
   */
  async persistMemory(memory: any): Promise<string> {
    const operation = async () => {
      const memoryDoc = {
        ...memory,
        persistedAt: new Date(),
        dataCategory: 'memory',
      };
      return this.collections.memories!.insertOne(memoryDoc);
    };

    return this.queueWrite('memories', 'insert', memory, operation);
  }

  /**
   * Persist dream cycle
   */
  async persistDreamCycle(cycle: any): Promise<string> {
    const operation = async () => {
      const cycleDoc = {
        ...cycle,
        persistedAt: new Date(),
        dataCategory: 'memory',
      };
      return this.collections.dreamCycles!.insertOne(cycleDoc);
    };

    return this.queueWrite('dreamCycles', 'insert', cycle, operation);
  }

  /**
   * Persist profile snapshot
   */
  async persistProfileSnapshot(snapshot: any): Promise<string> {
    const operation = async () => {
      const snapshotDoc = {
        ...snapshot,
        persistedAt: new Date(),
        dataCategory: 'profile-data',
      };
      return this.collections.profileSnapshots!.insertOne(snapshotDoc);
    };

    return this.queueWrite('profileSnapshots', 'insert', snapshot, operation);
  }

  /**
   * Persist emotional state
   */
  async persistEmotionalState(userId: string, state: any): Promise<string> {
    const operation = async () => {
      const stateDoc = {
        userId,
        ...state,
        timestamp: new Date(),
        dataCategory: 'emotional-state',
      };
      return this.collections.emotionalStates!.insertOne(stateDoc);
    };

    return this.queueWrite('emotionalStates', 'insert', { userId, ...state }, operation);
  }

  /**
   * Persist user interaction
   */
  async persistInteraction(userId: string, sessionId: string, interaction: any): Promise<string> {
    const operation = async () => {
      const interactionDoc = {
        userId,
        sessionId,
        ...interaction,
        timestamp: new Date(),
        dataCategory: 'interaction-history',
      };
      return this.collections.interactions!.insertOne(interactionDoc);
    };

    return this.queueWrite('interactions', 'insert', { userId, sessionId, ...interaction }, operation);
  }

  /**
   * Persist session
   */
  async persistSession(sessionId: string, userId: string, sessionData: any): Promise<string> {
    const operation = async () => {
      const sessionDoc = {
        sessionId,
        userId,
        ...sessionData,
        createdAt: new Date(),
        dataCategory: 'interaction-history',
      };
      return this.collections.sessions!.insertOne(sessionDoc);
    };

    return this.queueWrite('sessions', 'insert', { sessionId, userId, ...sessionData }, operation);
  }

  /**
   * Persist access log (for privacy auditing)
   */
  async persistAccessLog(accessLog: any): Promise<string> {
    const operation = async () => {
      const logDoc = {
        ...accessLog,
        loggedAt: new Date(),
        dataCategory: 'audit-log',
      };
      return this.collections.accessLogs!.insertOne(logDoc);
    };

    return this.queueWrite('accessLogs', 'insert', accessLog, operation);
  }

  /**
   * Persist system metrics
   */
  async persistMetrics(metrics: any): Promise<string> {
    const operation = async () => {
      const metricsDoc = {
        ...metrics,
        timestamp: new Date(),
        dataCategory: 'system-config',
      };
      return this.collections.metrics!.insertOne(metricsDoc);
    };

    return this.queueWrite('metrics', 'insert', metrics, operation);
  }

  /**
   * Retrieve memories with filtering
   */
  async getMemories(options?: QueryOptions): Promise<any[]> {
    return this.collections.memories!.findMany(options);
  }

  /**
   * Retrieve dream cycles
   */
  async getDreamCycles(userId?: string, options?: QueryOptions): Promise<any[]> {
    if (userId) {
      const filter = { ...options?.filter, userId };
      return this.collections.dreamCycles!.findMany({ ...options, filter });
    }
    return this.collections.dreamCycles!.findMany(options);
  }

  /**
   * Retrieve profile snapshots
   */
  async getProfileSnapshots(userId?: string, options?: QueryOptions): Promise<any[]> {
    if (userId) {
      const filter = { ...options?.filter, userId };
      return this.collections.profileSnapshots!.findMany({ ...options, filter });
    }
    return this.collections.profileSnapshots!.findMany(options);
  }

  /**
   * Retrieve emotional history for user
   */
  async getEmotionalHistory(userId: string, options?: QueryOptions): Promise<any[]> {
    const filter = { ...options?.filter, userId };
    return this.collections.emotionalStates!.findMany({ ...options, filter });
  }

  /**
   * Retrieve interactions for session
   */
  async getSessionInteractions(sessionId: string, options?: QueryOptions): Promise<any[]> {
    const filter = { ...options?.filter, sessionId };
    return this.collections.interactions!.findMany({ ...options, filter });
  }

  /**
   * Retrieve access logs for auditing
   */
  async getAccessLogs(userId?: string, options?: QueryOptions): Promise<any[]> {
    if (userId) {
      const filter = { ...options?.filter, userId };
      return this.collections.accessLogs!.findMany({ ...options, filter });
    }
    return this.collections.accessLogs!.findMany(options);
  }

  /**
   * Queue write operation (for batch processing)
   */
  private async queueWrite(
    collection: string,
    operation: string,
    data: any,
    executeFn: () => Promise<string>
  ): Promise<string> {
    // Add to pending writes queue
    this.pendingWrites.push({ collection, operation, data });
    this.syncStatus.pendingWrites = this.pendingWrites.length;

    // Execute immediately if small queue
    if (this.pendingWrites.length <= 5) {
      return await executeFn();
    }

    // Otherwise queue for batch write
    return `queued-${Date.now()}`;
  }

  /**
   * Start automatic save interval
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(async () => {
      await this.flushPendingWrites();
    }, this.config.autoSaveInterval);

    console.log(
      `⏰ Auto-save started (${this.config.autoSaveInterval}ms interval)`
    );
  }

  /**
   * Flush pending writes to database
   */
  async flushPendingWrites(): Promise<void> {
    if (this.pendingWrites.length === 0) {
      return;
    }

    const startTime = Date.now();
    console.log(`💾 Flushing ${this.pendingWrites.length} pending writes...`);

    try {
      const txnId = await this.db.startTransaction();

      // Group by collection
      const byCollection = new Map<string, any[]>();
      for (const write of this.pendingWrites) {
        if (!byCollection.has(write.collection)) {
          byCollection.set(write.collection, []);
        }
        byCollection.get(write.collection)!.push(write.data);
      }

      // Batch insert per collection
      for (const [collection, docs] of byCollection.entries()) {
        const col = this.db.getCollection(collection);
        await col.insertMany(docs);
      }

      await this.db.commitTransaction(txnId);

      const latency = Date.now() - startTime;
      this.syncStatus.syncLatency = latency;
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.pendingWrites = 0;
      this.pendingWrites = [];

      console.log(`✓ Flushed in ${latency}ms`);
    } catch (error) {
      console.error('✗ Flush failed:', error);
      this.syncStatus.isSynced = false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Manual sync (for offline mode recovery)
   */
  async manualSync(): Promise<boolean> {
    console.log('🔄 Manual sync initiated');
    try {
      await this.flushPendingWrites();
      this.syncStatus.isSynced = true;
      console.log('✓ Manual sync completed');
      return true;
    } catch (error) {
      console.error('✗ Manual sync failed:', error);
      return false;
    }
  }

  /**
   * Delete old data based on retention policies
   */
  async applyRetentionPolicies(): Promise<void> {
    console.log('🧹 Applying retention policies');

    const policies = {
      memories: 730, // 2 years
      dreamCycles: 730,
      profileSnapshots: 1095, // 3 years
      emotionalStates: 180, // 6 months
      interactions: 90, // 3 months
      accessLogs: 2555, // 7 years
      metrics: 365, // 1 year
    };

    for (const [collection, retentionDays] of Object.entries(policies)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const col = this.db.getCollection(collection);
      const deleted = await col.deleteMany({ _createdAt: { $lt: cutoffDate } });

      if (deleted > 0) {
        console.log(`  Deleted ${deleted} records from ${collection}`);
      }
    }

    console.log('✓ Retention policies applied');
  }

  /**
   * Export data for GDPR right to access
   */
  async exportUserData(userId: string): Promise<{ [key: string]: any[] }> {
    console.log(`📦 Exporting data for user ${userId}`);

    const data: { [key: string]: any[] } = {};

    data.memories = await this.collections.memories!.findMany({
      filter: { userId },
    });

    data.dreamCycles = await this.collections.dreamCycles!.findMany({
      filter: { userId },
    });

    data.profileSnapshots = await this.collections.profileSnapshots!.findMany({
      filter: { userId },
    });

    data.emotionalHistory = await this.collections.emotionalStates!.findMany({
      filter: { userId },
    });

    data.interactions = await this.collections.interactions!.findMany({
      filter: { userId },
    });

    data.sessions = await this.collections.sessions!.findMany({
      filter: { userId },
    });

    data.accessLogs = await this.collections.accessLogs!.findMany({
      filter: { userId },
    });

    console.log(`✓ Exported ${Object.keys(data).length} data categories`);
    return data;
  }

  /**
   * Delete all user data (GDPR right to be forgotten)
   */
  async deleteUserData(userId: string): Promise<number> {
    console.log(`🗑️  Deleting all data for user ${userId}`);

    let totalDeleted = 0;

    const collections = Object.values(this.collections).filter((c) => c !== null);
    for (const col of collections) {
      const deleted = await col!.deleteMany({ userId });
      totalDeleted += deleted;
    }

    console.log(`✓ Deleted ${totalDeleted} records for user ${userId}`);
    return totalDeleted;
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('⏹️  Auto-save stopped');
    }
  }

  /**
   * Reset adapter (for testing)
   */
  async reset(): Promise<void> {
    this.stopAutoSave();
    this.pendingWrites = [];
    this.syncStatus = {
      isSynced: true,
      pendingWrites: 0,
      syncLatency: 0,
    };
    console.log('🔄 Persistence Adapter reset');
  }
}

export const persistenceAdapter = PersistenceAdapterService.getInstance();
export { PersistenceAdapterService };
