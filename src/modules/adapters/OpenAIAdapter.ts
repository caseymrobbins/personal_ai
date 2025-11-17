/**
 * OpenAI External Adapter
 *
 * Connects to OpenAI API with user's own API key (BYOK)
 * Integrates with anonymizer for PII protection
 */

import {
  IModuleAdapter,
  IChatCompletionRequest,
  IChatCompletionResponse,
  IChatCompletionChunk,
} from './adapter.interface';
import { apiKeyService } from '../../services/apikey.service';

export interface OpenAIAdapterConfig {
  model?: string;
  baseURL?: string;
}

export class OpenAIAdapter implements IModuleAdapter {
  public readonly id = 'openai';
  public readonly name = 'OpenAI (GPT-4, etc.)';
  public readonly description = 'External OpenAI API with your own API key';

  private apiKey: string | null = null;
  private ready = false;
  private error: string | null = null;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: OpenAIAdapterConfig = {}) {
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.defaultModel = config.model || 'gpt-4';
  }

  async initialize(): Promise<void> {
    try {
      // Retrieve API key from secure storage
      this.apiKey = await apiKeyService.getAPIKey('openai');

      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured. Please add your API key.');
      }

      // Validate key format (basic check)
      if (!this.apiKey.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format');
      }

      this.ready = true;
      this.error = null;
      console.log('[OpenAI] Adapter initialized');
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      this.ready = false;
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    this.apiKey = null;
    this.ready = false;
    console.log('[OpenAI] Adapter shut down');
  }

  isReady(): boolean {
    return this.ready;
  }

  getStatus() {
    return {
      ready: this.ready,
      error: this.error || undefined,
    };
  }

  async query(
    request: IChatCompletionRequest,
    abortSignal?: AbortSignal
  ): Promise<IChatCompletionResponse | ReadableStream<IChatCompletionChunk>> {
    if (!this.ready || !this.apiKey) {
      throw new Error('OpenAI adapter not initialized');
    }

    const model = request.model || this.defaultModel;
    const url = `${this.baseURL}/chat/completions`;

    const body = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens,
      stream: request.stream ?? false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    if (request.stream) {
      // Return streaming response with proper SSE parsing
      if (!response.body) {
        throw new Error('No response body for streaming');
      }
      return this.parseSSEStream(response.body);
    } else {
      // Return full response
      const data: IChatCompletionResponse = await response.json();
      return data;
    }
  }

  /**
   * Parse OpenAI's SSE stream and convert to typed chunks
   */
  private parseSSEStream(stream: ReadableStream<Uint8Array>): ReadableStream<IChatCompletionChunk> {
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim();

              // Skip empty lines and comments
              if (!trimmedLine || trimmedLine.startsWith(':')) continue;

              // OpenAI uses "data: " prefix for SSE
              if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.slice(6); // Remove "data: " prefix

                // Check for end of stream
                if (data === '[DONE]') {
                  continue;
                }

                try {
                  const chunk: IChatCompletionChunk = JSON.parse(data);
                  controller.enqueue(chunk);
                } catch (err) {
                  console.error('[OpenAI] Failed to parse SSE chunk:', err);
                }
              }
            }
          }
        } catch (err) {
          console.error('[OpenAI] Stream error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });
  }

  /**
   * Test API key validity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.query({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });

      return 'choices' in response && response.choices.length > 0;
    } catch (error) {
      console.error('[OpenAI] Connection test failed:', error);
      return false;
    }
  }
}
