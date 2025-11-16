/**
 * Module Adapter Interface
 *
 * This is the standardized "plugin" interface from Step 3 of the specification.
 * Every module, from the local SML Guardian to external APIs, must implement this contract.
 *
 * The OpenAI Chat Completions API is the standardized interface for this architecture.
 * This dramatically simplifies development as both local and external adapters
 * use the same API contract.
 *
 * Based on Section 2.2.1: The Standardized IModuleAdapter Interface
 */

/**
 * OpenAI-compatible message format
 */
export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI-compatible chat completion request
 */
export interface IChatCompletionRequest {
  /** Model identifier (e.g., 'phi-3-mini-128k', 'gpt-4o') */
  model: string;

  /** Array of messages in the conversation */
  messages: ChatCompletionMessage[];

  /** Temperature for response generation (0.0 - 2.0) */
  temperature?: number;

  /** Whether to stream the response */
  stream?: boolean;

  /** Maximum tokens to generate */
  max_tokens?: number;

  /** Additional OpenAI-compatible parameters */
  [key: string]: unknown;
}

/**
 * OpenAI-compatible chat completion response
 */
export interface IChatCompletionResponse {
  /** Unique response ID */
  id: string;

  /** Model that generated the response */
  model: string;

  /** Response choices (typically just one) */
  choices: Array<{
    message: ChatCompletionMessage;
    finish_reason?: string;
    index: number;
  }>;

  /** Token usage information (optional) */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };

  /** Creation timestamp */
  created?: number;
}

/**
 * Streaming chunk for chat completions
 */
export interface IChatCompletionChunk {
  id: string;
  model: string;
  choices: Array<{
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason?: string | null;
    index: number;
  }>;
  created?: number;
}

/**
 * The standardized module adapter interface
 *
 * Every AI module (local or external) must implement this interface.
 * This ensures that modules are interchangeable "black boxes" that can be
 * swapped without changing the application logic.
 *
 * From Step 3: "This design makes every module an interchangeable black box."
 */
export interface IModuleAdapter {
  /**
   * Unique identifier for this module
   * Examples: 'local_guardian', 'openai_gpt-4o', 'claude_sonnet'
   */
  id: string;

  /**
   * Human-readable name for the UI
   * Examples: 'Local AI', 'OpenAI (GPT-4o)', 'Claude (Sonnet)'
   */
  name: string;

  /**
   * Description of the module's capabilities
   */
  description?: string;

  /**
   * The core query function
   *
   * @param request - OpenAI-compatible chat completion request
   * @param abortSignal - AbortSignal for "Humanity Override" (Step 5)
   * @returns Promise resolving to response or ReadableStream for streaming
   */
  query(
    request: IChatCompletionRequest,
    abortSignal?: AbortSignal
  ): Promise<IChatCompletionResponse | ReadableStream<IChatCompletionChunk>>;

  /**
   * Initialize the module
   * For local models: loads the model into memory
   * For external APIs: validates API key, checks connection
   *
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the module
   * For local models: frees memory
   * For external APIs: cleanup any resources
   *
   * @returns Promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>;

  /**
   * Check if the module is ready to handle queries
   * @returns true if the module is initialized and ready
   */
  isReady(): boolean;

  /**
   * Get the current status of the module
   * @returns Status information for UI display
   */
  getStatus(): {
    ready: boolean;
    loading?: boolean;
    progress?: number;
    error?: string;
  };
}
