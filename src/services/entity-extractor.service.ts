/**
 * Entity Extractor Service (Phase 1 - Task 7)
 *
 * Automatically extracts entities from conversations and working memory.
 * Populates the Declarative Knowledge Base with facts learned from interactions.
 *
 * Entity types detected:
 * - Technologies (Python, React, GraphQL)
 * - Projects (user's projects they mention)
 * - Concepts (AI, Machine Learning, etc.)
 * - Tools (VSCode, Git, etc.)
 * - People (if mentioned)
 * - Domains (web development, data science)
 *
 * Runs asynchronously during cognitive cycles to avoid blocking interactions.
 */

import { dbService } from './db.service';
import { declarativeKBService, EntityType } from './declarative-kb.service';

export interface ExtractedEntity {
  type: EntityType;
  name: string;
  description?: string;
  context: string; // Where it was mentioned
  confidence: number;
  frequency: number; // How many times seen
  lastSeen: number;
}

export interface ExtractionResult {
  text: string;
  entitiesFound: number;
  newEntitiesAdded: number;
  updatedEntities: number;
  extractedAt: number;
}

export interface EntityPattern {
  pattern: RegExp;
  type: EntityType;
  confidence: number;
  context?: string;
}

/**
 * EntityExtractorService
 *
 * NLP-based entity extraction for populating knowledge base
 */
class EntityExtractorService {
  private knownEntities: Map<string, ExtractedEntity> = new Map();
  private extractionPatterns: EntityPattern[] = [];

  /**
   * Initialize entity extractor
   */
  async initialize(): Promise<void> {
    try {
      // Create extraction log table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS entity_extractions (
          id TEXT PRIMARY KEY,
          source_text TEXT NOT NULL,
          entities_found INTEGER NOT NULL,
          new_entities INTEGER NOT NULL,
          updated_entities INTEGER NOT NULL,
          extracted_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create tracked entities table
      dbService.exec(`
        CREATE TABLE IF NOT EXISTS extracted_entities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          context TEXT,
          confidence REAL NOT NULL,
          frequency INTEGER DEFAULT 1,
          last_seen INTEGER NOT NULL,
          created_at INTEGER DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_extracted_entities_name
        ON extracted_entities(name)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_extracted_entities_type
        ON extracted_entities(type)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_extracted_entities_confidence
        ON extracted_entities(confidence DESC)
      `);

      dbService.exec(`
        CREATE INDEX IF NOT EXISTS idx_extractions_timestamp
        ON entity_extractions(extracted_at DESC)
      `);

      await dbService.save();

      // Initialize extraction patterns
      this.initializePatterns();

      console.log('[EntityExtractor] ✅ Service initialized');
    } catch (error) {
      console.error('[EntityExtractor] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize regex patterns for entity detection
   */
  private initializePatterns(): void {
    this.extractionPatterns = [
      // Technologies (common languages, frameworks, libraries)
      {
        pattern:
          /\b(Python|JavaScript|TypeScript|Java|Go|Rust|C\+\+|C#|PHP|Ruby|Swift|Kotlin)\b/gi,
        type: 'technology',
        confidence: 0.95,
        context: 'programming language',
      },
      {
        pattern:
          /\b(React|Vue|Angular|Svelte|Next\.js|Nuxt|Express|FastAPI|Django|Spring|Laravel)\b/gi,
        type: 'technology',
        confidence: 0.95,
        context: 'framework',
      },
      {
        pattern:
          /\b(TensorFlow|PyTorch|Keras|scikit-learn|OpenCV|NLTK|spaCy|HuggingFace)\b/gi,
        type: 'technology',
        confidence: 0.92,
        context: 'ML/AI library',
      },
      {
        pattern:
          /\b(PostgreSQL|MongoDB|MySQL|Redis|Elasticsearch|Neo4j|Cassandra|DynamoDB)\b/gi,
        type: 'technology',
        confidence: 0.93,
        context: 'database',
      },
      {
        pattern:
          /\b(Docker|Kubernetes|AWS|Google Cloud|Azure|Terraform|Ansible|GitLab CI|GitHub Actions)\b/gi,
        type: 'technology',
        confidence: 0.92,
        context: 'DevOps/Infrastructure',
      },

      // Tools
      {
        pattern: /\b(VS Code|Visual Studio|Git|GitHub|GitLab|Jira|Slack|Discord)\b/gi,
        type: 'tool',
        confidence: 0.91,
        context: 'development tool',
      },

      // Domains
      {
        pattern:
          /\b(web development|data science|machine learning|AI|DevOps|backend|frontend|full-stack|mobile development)\b/gi,
        type: 'domain',
        confidence: 0.85,
        context: 'technical domain',
      },

      // Concepts
      {
        pattern:
          /\b(REST API|GraphQL|microservices|serverless|real-time|streaming|distributed|concurrent|async|event-driven)\b/gi,
        type: 'concept',
        confidence: 0.88,
        context: 'technical concept',
      },
    ];
  }

  /**
   * Extract entities from text
   */
  async extractFromText(text: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    const foundEntities: ExtractedEntity[] = [];
    const extractedNames = new Set<string>();

    // Apply each pattern
    for (const patternDef of this.extractionPatterns) {
      const matches = text.matchAll(patternDef.pattern);

      for (const match of matches) {
        const entityName = match[1] || match[0];
        if (extractedNames.has(entityName.toLowerCase())) continue;

        extractedNames.add(entityName.toLowerCase());

        const entity: ExtractedEntity = {
          type: patternDef.type,
          name: entityName,
          description: patternDef.context,
          context: text.substring(
            Math.max(0, match.index! - 50),
            Math.min(text.length, match.index! + match[0].length + 50)
          ),
          confidence: patternDef.confidence,
          frequency: 1,
          lastSeen: Date.now(),
        };

        foundEntities.push(entity);
      }
    }

    // Also extract capitalized phrases (potential project/person names)
    const capitalizedPhrases = this.extractCapitalizedPhrases(text);
    capitalizedPhrases.forEach((phrase) => {
      foundEntities.push({
        type: 'project',
        name: phrase,
        context: text,
        confidence: 0.6, // Lower confidence for unsupervised extraction
        frequency: 1,
        lastSeen: Date.now(),
      });
    });

    // Process found entities
    let newEntitiesAdded = 0;
    let updatedEntities = 0;

    for (const entity of foundEntities) {
      const existing = this.knownEntities.get(entity.name.toLowerCase());

      if (existing) {
        // Update existing
        existing.frequency++;
        existing.lastSeen = Date.now();
        existing.confidence = Math.min(
          1,
          existing.confidence + entity.confidence * 0.05
        );
        updatedEntities++;
      } else {
        // Add new
        this.knownEntities.set(entity.name.toLowerCase(), entity);
        newEntitiesAdded++;

        // Add to knowledge base if confident enough
        if (entity.confidence >= 0.7) {
          try {
            declarativeKBService.addEntity(
              entity.type,
              entity.name,
              entity.description || `Extracted from text: ${entity.context.substring(0, 100)}`,
              entity.confidence,
              ['entity_extractor', 'text_analysis']
            );
          } catch (error) {
            console.warn(
              `[EntityExtractor] Failed to add entity to KB: ${entity.name}`,
              error
            );
          }
        }
      }
    }

    // Store extraction result
    const resultId = `extraction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    dbService.exec(
      `INSERT INTO entity_extractions
       (id, source_text, entities_found, new_entities, updated_entities, extracted_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        resultId,
        text.substring(0, 1000), // Truncate for storage
        foundEntities.length,
        newEntitiesAdded,
        updatedEntities,
        startTime,
      ]
    );

    console.log(
      `[EntityExtractor] 🔍 Extracted ${foundEntities.length} entities (${newEntitiesAdded} new, ${updatedEntities} updated)`
    );

    return {
      text: text.substring(0, 100),
      entitiesFound: foundEntities.length,
      newEntitiesAdded,
      updatedEntities,
      extractedAt: startTime,
    };
  }

  /**
   * Extract capitalized phrases (potential names, projects)
   */
  private extractCapitalizedPhrases(text: string): string[] {
    const phrases: string[] = [];
    // Match capitalized words/phrases (2+ words)
    const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    const matches = text.matchAll(regex);

    for (const match of matches) {
      const phrase = match[0];
      // Skip common words
      if (
        !['The', 'And', 'But', 'That', 'This', 'With', 'From', 'For', 'Has']
          .includes(phrase)
      ) {
        phrases.push(phrase);
      }
    }

    return Array.from(new Set(phrases)); // Deduplicate
  }

  /**
   * Extract entities from working memory
   */
  async extractFromWorkingMemory(workingMemoryItems: any[]): Promise<ExtractionResult> {
    const combinedText = workingMemoryItems
      .map((item) => item.content)
      .join(' ');

    return this.extractFromText(combinedText);
  }

  /**
   * Extract entities from long-term memories
   */
  async extractFromMemories(memories: any[]): Promise<ExtractionResult> {
    const combinedText = memories.map((mem) => mem.content).join(' ');
    return this.extractFromText(combinedText);
  }

  /**
   * Get extracted entities by type
   */
  getEntitiesByType(type: EntityType): ExtractedEntity[] {
    return Array.from(this.knownEntities.values()).filter((e) => e.type === type);
  }

  /**
   * Get top entities by frequency
   */
  getTopEntities(limit: number = 20): ExtractedEntity[] {
    return Array.from(this.knownEntities.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get high-confidence entities
   */
  getHighConfidenceEntities(minConfidence: number = 0.8): ExtractedEntity[] {
    return Array.from(this.knownEntities.values()).filter(
      (e) => e.confidence >= minConfidence
    );
  }

  /**
   * Find entity by name
   */
  findEntity(name: string): ExtractedEntity | undefined {
    return this.knownEntities.get(name.toLowerCase());
  }

  /**
   * Get extraction statistics
   */
  getStats(): {
    totalEntitiesExtracted: number;
    entitiesByType: Record<EntityType, number>;
    averageConfidence: number;
    totalExtractions: number;
    lastExtractionTime: number | null;
  } {
    const entities = Array.from(this.knownEntities.values());

    const entitiesByType: Record<EntityType, number> = {
      concept: 0,
      person: 0,
      project: 0,
      tool: 0,
      technology: 0,
      domain: 0,
      other: 0,
    };

    entities.forEach((e) => {
      entitiesByType[e.type]++;
    });

    const avgConfidence =
      entities.length > 0
        ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
        : 0;

    return {
      totalEntitiesExtracted: entities.length,
      entitiesByType,
      averageConfidence: avgConfidence,
      totalExtractions: 0, // Would query from DB
      lastExtractionTime: null,
    };
  }

  /**
   * Merge duplicate entities
   */
  mergeEntities(source: string, target: string): void {
    const sourceEntity = this.knownEntities.get(source.toLowerCase());
    const targetEntity = this.knownEntities.get(target.toLowerCase());

    if (!sourceEntity || !targetEntity) return;

    // Merge frequency and confidence
    targetEntity.frequency += sourceEntity.frequency;
    targetEntity.confidence = Math.max(
      sourceEntity.confidence,
      targetEntity.confidence
    );
    targetEntity.lastSeen = Math.max(
      sourceEntity.lastSeen,
      targetEntity.lastSeen
    );

    // Remove source
    this.knownEntities.delete(source.toLowerCase());

    console.log(`[EntityExtractor] 🔀 Merged entities: ${source} → ${target}`);
  }

  /**
   * Clear all extracted entities
   */
  clear(): void {
    this.knownEntities.clear();
    dbService.exec('DELETE FROM extracted_entities');
    dbService.exec('DELETE FROM entity_extractions');
    console.log('[EntityExtractor] ⚠️ All extracted entities cleared');
  }

  /**
   * Add custom extraction pattern
   */
  addPattern(pattern: RegExp, type: EntityType, confidence: number = 0.8): void {
    this.extractionPatterns.push({
      pattern,
      type,
      confidence,
    });
    console.log(`[EntityExtractor] ➕ Added custom pattern for type: ${type}`);
  }
}

// Export singleton instance
export const entityExtractorService = new EntityExtractorService();
