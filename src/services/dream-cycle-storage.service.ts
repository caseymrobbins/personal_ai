/**
 * DREAM CYCLE STORAGE & RETRIEVAL SERVICE
 * =======================================
 * Handles persistent storage and efficient retrieval of dream cycle data
 * Supports historical analysis, pattern matching, and temporal queries
 *
 * Storage layers:
 * - In-memory cache for active/recent cycles
 * - Structured data model for complex relationships
 * - Query interface for historical analysis
 */

import { DreamCycleSchedule } from './dream-cycle-scheduler.service';
import { ConsolidatedMemory } from './memory-consolidation.service';
import { CounterfactualSimulation } from './counterfactual-simulation.service';
import { ProfileSnapshot } from './profile-evolution-tracking.service';

export interface StoredDreamCycle {
  cycleId: string;
  timestamp: Date;
  schedule: DreamCycleSchedule;
  consolidatedMemories: ConsolidatedMemory[];
  simulations: CounterfactualSimulation[];
  profileSnapshot?: ProfileSnapshot;
  tags: string[];
  notes?: string;
  archived: boolean;
}

export interface DreamCycleQuery {
  startDate?: Date;
  endDate?: Date;
  status?: DreamCycleSchedule['status'];
  minInsights?: number;
  tags?: string[];
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  cycles: StoredDreamCycle[];
  totalCount: number;
  pageInfo: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface StorageMetrics {
  totalCyclesStored: number;
  totalMemoriesStored: number;
  totalSimulationsStored: number;
  storageSize: number;
  oldestCycle?: Date;
  newestCycle?: Date;
  averageMemoriesPerCycle: number;
  averageSimulationsPerCycle: number;
}

export interface CycleAnalysis {
  cycleId: string;
  duration: number;
  memoryCount: number;
  simulationCount: number;
  insightCount: number;
  topThemes: string[];
  emotionalProfile: {
    averageIntensity: number;
    primaryEmotions: string[];
  };
  outcomes: {
    breakthroughs: number;
    patterns: number;
    lessons: number;
  };
}

/**
 * Dream Cycle Storage & Retrieval Service
 * Manages persistence and querying of dream cycle data
 */
class DreamCycleStorageService {
  private static instance: DreamCycleStorageService;
  private storedCycles: StoredDreamCycle[] = [];
  private cycleIndex: Map<string, number> = new Map(); // cycleId -> array index
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> Set of cycleIds
  private dateIndex: Array<{ date: Date; cycleId: string }> = []; // For temporal queries
  private metrics: StorageMetrics = {
    totalCyclesStored: 0,
    totalMemoriesStored: 0,
    totalSimulationsStored: 0,
    storageSize: 0,
    averageMemoriesPerCycle: 0,
    averageSimulationsPerCycle: 0,
  };

  static getInstance(): DreamCycleStorageService {
    if (!DreamCycleStorageService.instance) {
      DreamCycleStorageService.instance = new DreamCycleStorageService();
    }
    return DreamCycleStorageService.instance;
  }

  /**
   * Initialize the storage service
   */
  initialize(): void {
    console.log('💾 Dream Cycle Storage Service initialized');
    this.loadStorageMetrics();
  }

  /**
   * Store a complete dream cycle with all associated data
   */
  storeDreamCycle(
    schedule: DreamCycleSchedule,
    memories: ConsolidatedMemory[],
    simulations: CounterfactualSimulation[],
    profileSnapshot?: ProfileSnapshot,
    tags?: string[],
    notes?: string
  ): StoredDreamCycle {
    const storedCycle: StoredDreamCycle = {
      cycleId: schedule.cycleId,
      timestamp: schedule.actualStartTime || new Date(),
      schedule,
      consolidatedMemories: memories,
      simulations,
      profileSnapshot,
      tags: tags || [],
      notes,
      archived: false,
    };

    // Add to main storage
    const index = this.storedCycles.length;
    this.storedCycles.push(storedCycle);
    this.cycleIndex.set(schedule.cycleId, index);

    // Update indices
    this.updateTagIndex(storedCycle);
    this.updateDateIndex(storedCycle);

    // Update metrics
    this.updateMetrics();

    console.log(`💾 Dream Cycle ${schedule.cycleId.slice(0, 8)} stored`);
    console.log(`   Memories: ${memories.length}, Simulations: ${simulations.length}`);
    console.log(`   Tags: ${tags?.join(', ') || 'none'}`);

    return storedCycle;
  }

  /**
   * Retrieve a specific cycle by ID
   */
  getCycleById(cycleId: string): StoredDreamCycle | null {
    const index = this.cycleIndex.get(cycleId);
    if (index !== undefined) {
      return this.storedCycles[index];
    }
    return null;
  }

  /**
   * Query cycles with flexible filtering
   */
  queryCycles(query: DreamCycleQuery): QueryResult {
    let results = [...this.storedCycles];

    // Filter by date range
    if (query.startDate || query.endDate) {
      results = results.filter((cycle) => {
        const cycleDate = cycle.timestamp.getTime();
        const afterStart = !query.startDate || cycleDate >= query.startDate.getTime();
        const beforeEnd = !query.endDate || cycleDate <= query.endDate.getTime();
        return afterStart && beforeEnd;
      });
    }

    // Filter by status
    if (query.status) {
      results = results.filter((cycle) => cycle.schedule.status === query.status);
    }

    // Filter by minimum insights
    if (query.minInsights) {
      results = results.filter((cycle) => cycle.schedule.insights.length >= query.minInsights);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((cycle) =>
        query.tags!.some((tag) => cycle.tags.includes(tag))
      );
    }

    // Search text in notes, insights, and tags
    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      results = results.filter(
        (cycle) =>
          cycle.notes?.toLowerCase().includes(searchLower) ||
          cycle.schedule.insights.some((insight) => insight.toLowerCase().includes(searchLower)) ||
          cycle.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination
    const totalCount = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 10;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      cycles: paginatedResults,
      totalCount,
      pageInfo: {
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    };
  }

  /**
   * Get all cycles with a specific tag
   */
  getCyclesByTag(tag: string): StoredDreamCycle[] {
    const cycleIds = this.tagIndex.get(tag.toLowerCase());
    if (!cycleIds) {
      return [];
    }

    return Array.from(cycleIds)
      .map((cycleId) => this.getCycleById(cycleId))
      .filter((cycle): cycle is StoredDreamCycle => cycle !== null);
  }

  /**
   * Get cycles within a date range
   */
  getCyclesByDateRange(startDate: Date, endDate: Date): StoredDreamCycle[] {
    return this.storedCycles.filter(
      (cycle) =>
        cycle.timestamp >= startDate &&
        cycle.timestamp <= endDate
    );
  }

  /**
   * Get recent cycles
   */
  getRecentCycles(limit: number = 10): StoredDreamCycle[] {
    return [...this.storedCycles].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  /**
   * Get all tags currently in use
   */
  getAllTags(): string[] {
    return Array.from(this.tagIndex.keys()).sort();
  }

  /**
   * Add tags to an existing cycle
   */
  addTagsToCycle(cycleId: string, tags: string[]): boolean {
    const cycle = this.getCycleById(cycleId);
    if (!cycle) {
      return false;
    }

    const newTags = tags.filter((tag) => !cycle.tags.includes(tag));
    cycle.tags.push(...newTags);

    // Update tag index
    newTags.forEach((tag) => {
      const lowerTag = tag.toLowerCase();
      if (!this.tagIndex.has(lowerTag)) {
        this.tagIndex.set(lowerTag, new Set());
      }
      this.tagIndex.get(lowerTag)!.add(cycleId);
    });

    console.log(`🏷️  Added ${newTags.length} tags to cycle ${cycleId.slice(0, 8)}`);
    return true;
  }

  /**
   * Remove tags from a cycle
   */
  removeTagsFromCycle(cycleId: string, tags: string[]): boolean {
    const cycle = this.getCycleById(cycleId);
    if (!cycle) {
      return false;
    }

    tags.forEach((tag) => {
      const index = cycle.tags.indexOf(tag);
      if (index > -1) {
        cycle.tags.splice(index, 1);

        // Update tag index
        const lowerTag = tag.toLowerCase();
        const cycleSet = this.tagIndex.get(lowerTag);
        if (cycleSet) {
          cycleSet.delete(cycleId);
          if (cycleSet.size === 0) {
            this.tagIndex.delete(lowerTag);
          }
        }
      }
    });

    console.log(`🏷️  Removed tags from cycle ${cycleId.slice(0, 8)}`);
    return true;
  }

  /**
   * Update notes for a cycle
   */
  updateCycleNotes(cycleId: string, notes: string): boolean {
    const cycle = this.getCycleById(cycleId);
    if (!cycle) {
      return false;
    }

    cycle.notes = notes;
    console.log(`📝 Updated notes for cycle ${cycleId.slice(0, 8)}`);
    return true;
  }

  /**
   * Archive a cycle (soft delete)
   */
  archiveCycle(cycleId: string): boolean {
    const cycle = this.getCycleById(cycleId);
    if (!cycle) {
      return false;
    }

    cycle.archived = true;
    console.log(`📦 Archived cycle ${cycleId.slice(0, 8)}`);
    return true;
  }

  /**
   * Unarchive a cycle
   */
  unarchiveCycle(cycleId: string): boolean {
    const cycle = this.getCycleById(cycleId);
    if (!cycle) {
      return false;
    }

    cycle.archived = false;
    console.log(`📦 Unarchived cycle ${cycleId.slice(0, 8)}`);
    return true;
  }

  /**
   * Perform detailed analysis of a cycle
   */
  analyzeCycle(cycleId: string): CycleAnalysis | null {
    const cycle = this.getCycleById(cycleId);
    if (!cycle) {
      return null;
    }

    const duration = cycle.schedule.actualEndTime
      ? cycle.schedule.actualEndTime.getTime() - (cycle.schedule.actualStartTime?.getTime() || 0)
      : 0;

    // Extract themes from consolidated memories
    const themes = new Set<string>();
    cycle.consolidatedMemories.forEach((memory) => {
      if (memory.type) {
        themes.add(memory.type.replace(/_/g, ' '));
      }
    });

    // Calculate emotional profile
    const emotionalIntensities = cycle.consolidatedMemories
      .map((m) => m.metadata?.emotionalContext?.intensity || 0)
      .filter((i) => i > 0);
    const averageIntensity =
      emotionalIntensities.length > 0
        ? emotionalIntensities.reduce((a, b) => a + b) / emotionalIntensities.length
        : 0;

    const primaryEmotions = new Set<string>();
    cycle.consolidatedMemories.forEach((memory) => {
      const emotion = memory.metadata?.emotionalContext?.primaryEmotion;
      if (emotion) {
        primaryEmotions.add(emotion);
      }
    });

    // Count outcomes
    const breakthroughs = cycle.schedule.breakthroughMoments?.length || 0;
    const patterns = cycle.consolidatedMemories.filter((m) => m.patterns?.length).length;
    const lessons = cycle.simulations.reduce((sum, sim) => sum + (sim.lessons?.length || 0), 0);

    return {
      cycleId,
      duration,
      memoryCount: cycle.consolidatedMemories.length,
      simulationCount: cycle.simulations.length,
      insightCount: cycle.schedule.insights.length,
      topThemes: Array.from(themes).slice(0, 5),
      emotionalProfile: {
        averageIntensity,
        primaryEmotions: Array.from(primaryEmotions).slice(0, 3),
      },
      outcomes: {
        breakthroughs,
        patterns,
        lessons,
      },
    };
  }

  /**
   * Get comparative analysis across multiple cycles
   */
  getComparativeAnalysis(query: DreamCycleQuery): {
    cycles: CycleAnalysis[];
    summary: {
      totalCycles: number;
      averageDuration: number;
      totalMemories: number;
      totalSimulations: number;
      topThemes: string[];
      emotionalTrend: 'increasing' | 'decreasing' | 'stable';
    };
  } {
    const results = this.queryCycles({ ...query, limit: 1000 });
    const analyses = results.cycles
      .map((cycle) => this.analyzeCycle(cycle.cycleId))
      .filter((analysis): analysis is CycleAnalysis => analysis !== null);

    const topThemesMap = new Map<string, number>();
    const emotionalIntensities: number[] = [];

    analyses.forEach((analysis) => {
      analysis.topThemes.forEach((theme) => {
        topThemesMap.set(theme, (topThemesMap.get(theme) || 0) + 1);
      });
      emotionalIntensities.push(analysis.emotionalProfile.averageIntensity);
    });

    const sortedThemes = Array.from(topThemesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);

    const emotionalTrend: 'increasing' | 'decreasing' | 'stable' =
      emotionalIntensities.length < 2
        ? 'stable'
        : emotionalIntensities[emotionalIntensities.length - 1] >
            emotionalIntensities[0] + 0.1
          ? 'increasing'
          : emotionalIntensities[emotionalIntensities.length - 1] <
              emotionalIntensities[0] - 0.1
            ? 'decreasing'
            : 'stable';

    const averageDuration =
      analyses.length > 0
        ? analyses.reduce((sum, a) => sum + a.duration, 0) / analyses.length
        : 0;

    return {
      cycles: analyses,
      summary: {
        totalCycles: analyses.length,
        averageDuration,
        totalMemories: analyses.reduce((sum, a) => sum + a.memoryCount, 0),
        totalSimulations: analyses.reduce((sum, a) => sum + a.simulationCount, 0),
        topThemes: sortedThemes,
        emotionalTrend,
      },
    };
  }

  /**
   * Export cycles to JSON for backup/sharing
   */
  exportCyclesToJson(query?: DreamCycleQuery): string {
    const results = this.queryCycles({ ...query, limit: 10000 });
    return JSON.stringify(results.cycles, null, 2);
  }

  /**
   * Import cycles from JSON
   */
  importCyclesFromJson(jsonData: string): number {
    try {
      const cycles = JSON.parse(jsonData) as StoredDreamCycle[];
      let importedCount = 0;

      cycles.forEach((cycle) => {
        if (!this.cycleIndex.has(cycle.cycleId)) {
          const index = this.storedCycles.length;
          this.storedCycles.push(cycle);
          this.cycleIndex.set(cycle.cycleId, index);
          this.updateTagIndex(cycle);
          this.updateDateIndex(cycle);
          importedCount++;
        }
      });

      this.updateMetrics();
      console.log(`📥 Imported ${importedCount} cycles from JSON`);
      return importedCount;
    } catch (error) {
      console.error('❌ Error importing cycles:', error);
      return 0;
    }
  }

  /**
   * Get storage metrics
   */
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  /**
   * Update tag index for a cycle
   */
  private updateTagIndex(cycle: StoredDreamCycle): void {
    cycle.tags.forEach((tag) => {
      const lowerTag = tag.toLowerCase();
      if (!this.tagIndex.has(lowerTag)) {
        this.tagIndex.set(lowerTag, new Set());
      }
      this.tagIndex.get(lowerTag)!.add(cycle.cycleId);
    });
  }

  /**
   * Update date index for a cycle
   */
  private updateDateIndex(cycle: StoredDreamCycle): void {
    this.dateIndex.push({ date: cycle.timestamp, cycleId: cycle.cycleId });
    this.dateIndex.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Update storage metrics
   */
  private updateMetrics(): void {
    this.metrics.totalCyclesStored = this.storedCycles.length;

    let totalMemories = 0;
    let totalSimulations = 0;

    this.storedCycles.forEach((cycle) => {
      totalMemories += cycle.consolidatedMemories.length;
      totalSimulations += cycle.simulations.length;
    });

    this.metrics.totalMemoriesStored = totalMemories;
    this.metrics.totalSimulationsStored = totalSimulations;
    this.metrics.averageMemoriesPerCycle =
      this.metrics.totalCyclesStored > 0
        ? totalMemories / this.metrics.totalCyclesStored
        : 0;
    this.metrics.averageSimulationsPerCycle =
      this.metrics.totalCyclesStored > 0
        ? totalSimulations / this.metrics.totalCyclesStored
        : 0;

    // Calculate approximate storage size (rough estimate)
    this.metrics.storageSize = JSON.stringify(this.storedCycles).length;

    if (this.storedCycles.length > 0) {
      const sortedByDate = [...this.storedCycles].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      this.metrics.oldestCycle = sortedByDate[0].timestamp;
      this.metrics.newestCycle = sortedByDate[sortedByDate.length - 1].timestamp;
    }
  }

  /**
   * Load storage metrics (initialize from existing data)
   */
  private loadStorageMetrics(): void {
    this.updateMetrics();
  }

  /**
   * Clear all archived cycles to free up space
   */
  purgeArchivedCycles(): number {
    const beforeCount = this.storedCycles.length;
    const archived = this.storedCycles.filter((c) => c.archived);

    archived.forEach((cycle) => {
      const index = this.storedCycles.indexOf(cycle);
      if (index > -1) {
        this.storedCycles.splice(index, 1);
        this.cycleIndex.delete(cycle.cycleId);

        // Clean up indices
        cycle.tags.forEach((tag) => {
          const tagSet = this.tagIndex.get(tag.toLowerCase());
          if (tagSet) {
            tagSet.delete(cycle.cycleId);
          }
        });
      }
    });

    const purgedCount = beforeCount - this.storedCycles.length;
    this.updateMetrics();

    console.log(`🗑️  Purged ${purgedCount} archived cycles`);
    return purgedCount;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.storedCycles = [];
    this.cycleIndex.clear();
    this.tagIndex.clear();
    this.dateIndex = [];
    this.metrics = {
      totalCyclesStored: 0,
      totalMemoriesStored: 0,
      totalSimulationsStored: 0,
      storageSize: 0,
      averageMemoriesPerCycle: 0,
      averageSimulationsPerCycle: 0,
    };
    console.log('🔄 Dream Cycle Storage Service reset');
  }
}

export const dreamCycleStorage = DreamCycleStorageService.getInstance();
export { DreamCycleStorageService };
