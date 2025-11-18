/**
 * Declarative Knowledge Base Service (Phase 1)
 *
 * Stores structured facts and concepts that the agent learns.
 * Unlike episodic memory (events), this is semantic knowledge:
 * - "Python is a programming language"
 * - "The user's project is called Agency Calculus"
 * - "Pytorch is a machine learning framework"
 *
 * Organized as a graph of entities and relationships.
 */

import { dbService } from './db.service';

export type EntityType =
  | 'concept'
  | 'person'
  | 'project'
  | 'tool'
  | 'technology'
  | 'domain'
  | 'other';

export type RelationType = 'uses' | 'related_to' | 'is_a' | 'part_of' | 'custom';

export interface KnowledgeEntity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  confidence: number; // 0.0-1.0
  discoveredAt: number;
  sources: string[]; // Where we learned this
  metadata?: Record<string, unknown>;
}

export interface KnowledgeRelationship {
  id: string;
  sourceId: string; // From entity
  targetId: string; // To entity
  type: RelationType;
  strength: number; // 0.0-1.0
  description?: string;
  discoveredAt: number;
  sources: string[];
}

export interface KnowledgeGraphStats {
  totalEntities: number;
  totalRelationships: number;
  entityTypes: Record<EntityType, number>;
  relationTypes: Record<RelationType, number>;
}

/**
 * DeclarativeKBService
 *
 * Manages structured knowledge graph
 */
class DeclarativeKBService {
  private entities: Map<string, KnowledgeEntity> = new Map();
  private relationships: Map<string, KnowledgeRelationship> = new Map();

  /**
   * Initialize knowledge base database
   */
  async initialize(): Promise<void> {
    try {
      // Create entity table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_entities (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          confidence REAL NOT NULL,
          discovered_at INTEGER NOT NULL,
          sources TEXT,
          metadata TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create relationship table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_relationships (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          type TEXT NOT NULL,
          strength REAL NOT NULL,
          description TEXT,
          discovered_at INTEGER NOT NULL,
          sources TEXT,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (source_id) REFERENCES knowledge_entities(id),
          FOREIGN KEY (target_id) REFERENCES knowledge_entities(id)
        )
      `);

      // Create indexes
      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_entities_name
        ON knowledge_entities(name)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_relationships_source
        ON knowledge_relationships(source_id)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_relationships_target
        ON knowledge_relationships(target_id)
      `);

      await dbService.save();

      console.log('[DeclarativeKB] ✅ Service initialized');
    } catch (error) {
      console.error('[DeclarativeKB] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Add or update an entity in the knowledge base
   */
  addEntity(
    type: EntityType,
    name: string,
    description: string,
    confidence: number,
    sources: string[] = []
  ): KnowledgeEntity {
    const id = `entity-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const entity: KnowledgeEntity = {
      id,
      type,
      name,
      description,
      confidence,
      discoveredAt: Date.now(),
      sources,
    };

    this.entities.set(id, entity);

    // Store in database
    dbService.exec(
      `INSERT INTO knowledge_entities
       (id, type, name, description, confidence, discovered_at, sources)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, type, name, description, confidence, entity.discoveredAt, JSON.stringify(sources)]
    );

    console.log(`[DeclarativeKB] 📚 Entity added: ${name} (${type})`);
    return entity;
  }

  /**
   * Get entity by name
   */
  getEntityByName(name: string): KnowledgeEntity | undefined {
    return Array.from(this.entities.values()).find(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get entities of a specific type
   */
  getEntitiesByType(type: EntityType): KnowledgeEntity[] {
    return Array.from(this.entities.values()).filter((e) => e.type === type);
  }

  /**
   * Add a relationship between entities
   */
  addRelationship(
    sourceId: string,
    targetId: string,
    type: RelationType,
    strength: number = 0.8,
    description?: string,
    sources: string[] = []
  ): KnowledgeRelationship {
    const id = `rel-${sourceId}-${targetId}-${Date.now()}`;

    const relationship: KnowledgeRelationship = {
      id,
      sourceId,
      targetId,
      type,
      strength,
      description,
      discoveredAt: Date.now(),
      sources,
    };

    this.relationships.set(id, relationship);

    // Store in database
    dbService.exec(
      `INSERT INTO knowledge_relationships
       (id, source_id, target_id, type, strength, description, discovered_at, sources)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sourceId,
        targetId,
        type,
        strength,
        description || null,
        relationship.discoveredAt,
        JSON.stringify(sources),
      ]
    );

    const source = this.entities.get(sourceId);
    const target = this.entities.get(targetId);
    const sourceName = source?.name || sourceId;
    const targetName = target?.name || targetId;

    console.log(
      `[DeclarativeKB] 🔗 Relationship added: ${sourceName} ${type} ${targetName}`
    );

    return relationship;
  }

  /**
   * Get all related entities
   */
  getRelated(entityId: string): KnowledgeEntity[] {
    const relatedIds = new Set<string>();

    // Find outgoing relationships
    this.relationships.forEach((rel) => {
      if (rel.sourceId === entityId) {
        relatedIds.add(rel.targetId);
      }
    });

    // Find incoming relationships
    this.relationships.forEach((rel) => {
      if (rel.targetId === entityId) {
        relatedIds.add(rel.sourceId);
      }
    });

    return Array.from(relatedIds)
      .map((id) => this.entities.get(id))
      .filter((e) => e !== undefined) as KnowledgeEntity[];
  }

  /**
   * Search knowledge base
   */
  search(query: string, limit: number = 10): KnowledgeEntity[] {
    const queryLower = query.toLowerCase();

    const results = Array.from(this.entities.values())
      .filter((e) => e.name.toLowerCase().includes(queryLower) ||
        (e.description && e.description.toLowerCase().includes(queryLower)))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    return results;
  }

  /**
   * Get knowledge graph statistics
   */
  getStats(): KnowledgeGraphStats {
    const entityTypes: Record<EntityType, number> = {
      concept: 0,
      person: 0,
      project: 0,
      tool: 0,
      technology: 0,
      domain: 0,
      other: 0,
    };

    const relationTypes: Record<RelationType, number> = {
      uses: 0,
      related_to: 0,
      is_a: 0,
      part_of: 0,
      custom: 0,
    };

    // Count entities
    this.entities.forEach((entity) => {
      entityTypes[entity.type]++;
    });

    // Count relationships
    this.relationships.forEach((rel) => {
      relationTypes[rel.type]++;
    });

    return {
      totalEntities: this.entities.size,
      totalRelationships: this.relationships.size,
      entityTypes,
      relationTypes,
    };
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): KnowledgeEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get relationships for entity
   */
  getRelationships(entityId: string): KnowledgeRelationship[] {
    return Array.from(this.relationships.values()).filter(
      (rel) => rel.sourceId === entityId || rel.targetId === entityId
    );
  }

  /**
   * Update entity confidence
   */
  updateConfidence(entityId: string, newConfidence: number): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.confidence = Math.min(1, Math.max(0, newConfidence));

      dbService.exec(
        `UPDATE knowledge_entities SET confidence = ? WHERE id = ?`,
        [entity.confidence, entityId]
      );

      console.log(
        `[DeclarativeKB] 📊 Updated confidence for ${entity.name}: ${entity.confidence}`
      );
    }
  }

  /**
   * Merge duplicate entities
   */
  mergeEntities(sourceId: string, targetId: string): void {
    const source = this.entities.get(sourceId);
    const target = this.entities.get(targetId);

    if (!source || !target) return;

    // Redirect relationships from source to target
    this.relationships.forEach((rel) => {
      if (rel.sourceId === sourceId) {
        rel.sourceId = targetId;
      }
      if (rel.targetId === sourceId) {
        rel.targetId = targetId;
      }
    });

    // Update confidence (take higher)
    target.confidence = Math.max(source.confidence, target.confidence);

    // Merge sources
    target.sources = Array.from(new Set([...source.sources, ...target.sources]));

    // Remove source entity
    this.entities.delete(sourceId);

    dbService.exec(`DELETE FROM knowledge_entities WHERE id = ?`, [sourceId]);

    console.log(`[DeclarativeKB] 🔀 Merged ${source.name} into ${target.name}`);
  }

  /**
   * Export knowledge graph as JSON
   */
  export(): { entities: KnowledgeEntity[]; relationships: KnowledgeRelationship[] } {
    return {
      entities: Array.from(this.entities.values()),
      relationships: Array.from(this.relationships.values()),
    };
  }

  /**
   * Clear all knowledge (dangerous)
   */
  clear(): void {
    this.entities.clear();
    this.relationships.clear();

    dbService.exec('DELETE FROM knowledge_relationships');
    dbService.exec('DELETE FROM knowledge_entities');

    console.log('[DeclarativeKB] ⚠️ Knowledge base cleared');
  }
}

// Export singleton instance
export const declarativeKBService = new DeclarativeKBService();
