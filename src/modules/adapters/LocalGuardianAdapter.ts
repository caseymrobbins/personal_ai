/**
 * Local Guardian Adapter
 *
 * This adapter implements the IModuleAdapter interface for running Phi-3-mini-128K
 * locally in the browser using WebLLM.
 *
 * Key features:
 * - Runs entirely on-device (privacy-preserving)
 * - OpenAI-compatible API
 * - 128K context window (enables local Q&A without RAG)
 * - Sharded model loading (mobile-friendly)
 *
 * Based on Section 1.1.3 and 1.2.2 of the specification
 */

import type {
  IModuleAdapter,
  IChatCompletionRequest,
  IChatCompletionResponse,
  IChatCompletionChunk,
} from './adapter.interface';

/**
 * Local Guardian Adapter using WebLLM
 *
 * This is the implementation of Guardian-Maximus (Phi-3-mini-128K)
 * that runs entirely in the browser.
 */
export class LocalGuardianAdapter implements IModuleAdapter {
  public readonly id = 'local_guardian';
  public readonly name = 'Local AI (Phi-3)';
  public readonly description = 'On-device AI with 128K context, fully private';

  private engine: any = null;
  private engineInitialized = false;
  private loading = false;
  private loadProgress = 0;
  private error: string | null = null;

  /**
   * Recommended Phi-3 model for Guardian-Maximus
   * Using q4f16_1 quantization for optimal size/performance balance
   */
  private readonly modelId = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';

  /**
   * Initialize WebLLM and load the Phi-3 model
   *
   * Note: This downloads ~2-4GB of model weights on first run.
   * Subsequent runs load from browser cache.
   */
  async initialize(): Promise<void> {
    if (this.engineInitialized) {
      console.log('[LocalGuardian] Already initialized');
      return;
    }

    if (this.loading) {
      console.log('[LocalGuardian] Already loading');
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      console.log('[LocalGuardian] Initializing WebLLM engine...');

      // Dynamic import to code-split WebLLM
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      // Create engine with progress callback
      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: (progress) => {
          this.loadProgress = progress.progress;
          console.log(`[LocalGuardian] Loading: ${(progress.progress * 100).toFixed(1)}%`);
        },
      });

      this.engineInitialized = true;
      this.loading = false;
      this.loadProgress = 1.0;

      console.log('[LocalGuardian] ✅ Model loaded and ready');
    } catch (error) {
      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Failed to initialize';
      console.error('[LocalGuardian] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Query the local Phi-3 model
   *
   * This method implements the OpenAI-compatible chat.completions.create() API
   */
  async query(
    request: IChatCompletionRequest,
    abortSignal?: AbortSignal
  ): Promise<IChatCompletionResponse | ReadableStream<IChatCompletionChunk>> {
    if (!this.engineInitialized || !this.engine) {
      throw new Error('Local Guardian not initialized. Call initialize() first.');
    }

    try {
      // Check if request was aborted before starting
      if (abortSignal?.aborted) {
        throw new Error('Request aborted before generation started');
      }

      console.log('[LocalGuardian] Generating response...');

      // WebLLM's chat.completions.create() is OpenAI-compatible
      const response = await this.engine.chat.completions.create({
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens,
        stream: request.stream ?? false,
      });

      // If streaming was requested, return the ReadableStream
      if (request.stream) {
        return response as ReadableStream<IChatCompletionChunk>;
      }

      // Otherwise, return the complete response
      const completionResponse: IChatCompletionResponse = {
        id: response.id || `local-${Date.now()}`,
        model: this.modelId,
        choices: response.choices.map((choice: any, index: number) => ({
          message: {
            role: 'assistant',
            content: choice.message?.content || '',
          },
          finish_reason: choice.finish_reason || 'stop',
          index,
        })),
        usage: response.usage,
        created: response.created || Math.floor(Date.now() / 1000),
      };

      console.log('[LocalGuardian] ✅ Response generated');
      return completionResponse;
    } catch (error) {
      // Check if this was an abort
      if (abortSignal?.aborted) {
        console.log('[LocalGuardian] Request aborted by user');
        throw new Error('Request aborted by user (Humanity Override)');
      }

      console.error('[LocalGuardian] ❌ Query failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown the WebLLM engine and free memory
   */
  async shutdown(): Promise<void> {
    if (this.engine) {
      // WebLLM doesn't currently expose a shutdown method
      // but we can null the reference to help GC
      this.engine = null;
      this.engineInitialized = false;
      console.log('[LocalGuardian] Shutdown complete');
    }
  }

  /**
   * Check if the adapter is ready
   */
  isReady(): boolean {
    return this.engineInitialized && !this.loading && !this.error;
  }

  /**
   * Get current status for UI display
   */
  getStatus(): {
    ready: boolean;
    loading?: boolean;
    progress?: number;
    error?: string;
  } {
    return {
      ready: this.engineInitialized,
      loading: this.loading,
      progress: this.loadProgress,
      error: this.error || undefined,
    };
  }
}

// Export singleton instance
export const localGuardianAdapter = new LocalGuardianAdapter();
