/**
 * Embeddings Service (Sprint 6: RDI - Reality Drift Index)
 *
 * Generates vector embeddings for text using transformers.js.
 * Used for concept drift detection and fact-checking.
 *
 * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 * - Fast inference in browser
 * - High-quality semantic embeddings
 * - Small model size (~23MB)
 *
 * OPTIMIZATION (Sprint 12):
 * - Dynamic import for transformers.js (loaded only when needed)
 * - Reduces initial bundle size by ~5.5MB
 */

// Type imports don't add to bundle size
import type { FeatureExtractionPipeline } from '@xenova/transformers';

class EmbeddingsService {
  private model: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

  /**
   * Initialize the embedding model
   * Uses lazy loading - model AND library load on first use
   */
  async initialize(): Promise<void> {
    // Return existing initialization if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.model) {
      return;
    }

    this.initPromise = (async () => {
      try {
        console.log('[Embeddings] Loading transformers.js library...');

        // Dynamic import - only loads when needed (Sprint 12 optimization)
        const { pipeline } = await import('@xenova/transformers');

        console.log('[Embeddings] Initializing model:', this.MODEL_NAME);
        console.log('[Embeddings] This may take a moment on first load...');

        // Create feature extraction pipeline
        this.model = await pipeline('feature-extraction', this.MODEL_NAME);

        console.log('[Embeddings] ✅ Model initialized successfully');
      } catch (error) {
        console.error('[Embeddings] ❌ Failed to initialize:', error);
        this.model = null;
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding for text
   *
   * @param text Input text to embed
   * @returns 384-dimensional vector as Float32Array
   */
  async embed(text: string): Promise<Float32Array> {
    // Ensure model is initialized
    await this.initialize();

    if (!this.model) {
      throw new Error('Embeddings model not initialized');
    }

    try {
      // Generate embedding
      const output = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the embedding tensor
      // Output is a nested structure, we need the data array
      const embedding = output.data as Float32Array;

      console.log(`[Embeddings] Generated ${embedding.length}D embedding for text (${text.substring(0, 50)}...)`);

      return embedding;
    } catch (error) {
      console.error('[Embeddings] Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   *
   * Returns value between -1 and 1:
   * - 1: Identical vectors (same concept)
   * - 0: Orthogonal vectors (unrelated concepts)
   * - -1: Opposite vectors (opposing concepts)
   *
   * @param embedding1 First embedding vector
   * @param embedding2 Second embedding vector
   * @returns Cosine similarity score
   */
  cosineSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  /**
   * Serialize embedding to BLOB for database storage
   *
   * @param embedding Float32Array embedding
   * @returns Uint8Array suitable for BLOB storage
   */
  serializeEmbedding(embedding: Float32Array): Uint8Array {
    // Float32Array uses 4 bytes per float
    const buffer = new ArrayBuffer(embedding.length * 4);
    const view = new Float32Array(buffer);
    view.set(embedding);
    return new Uint8Array(buffer);
  }

  /**
   * Deserialize embedding from BLOB
   *
   * @param blob Uint8Array from database
   * @returns Float32Array embedding
   */
  deserializeEmbedding(blob: Uint8Array): Float32Array {
    return new Float32Array(blob.buffer);
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.model !== null;
  }
}

// Export singleton instance
export const embeddingsService = new EmbeddingsService();
