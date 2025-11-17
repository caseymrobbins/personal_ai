/**
 * Anthropic Claude External Adapter
 *
 * Connects to Anthropic API with user's own API key (BYOK)
 * Converts between OpenAI format and Anthropic Messages API
 */

import {
  IModuleAdapter,
  IChatCompletionRequest,
  IChatCompletionResponse,
  IChatCompletionChunk,
  ChatCompletionMessage,
} from './adapter.interface';
import { apiKeyService } from '../../services/apikey.service';

export interface AnthropicAdapterConfig {
  model?: string;
  baseURL?: string;
}

export class AnthropicAdapter implements IModuleAdapter {
  public readonly id = 'anthropic';
  public readonly name = 'Anthropic (Claude)';
  public readonly description = 'External Anthropic API with your own API key';

  private apiKey: string | null = null;
  private ready = false;
  private error: string | null = null;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: AnthropicAdapterConfig = {}) {
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.defaultModel = config.model || 'claude-3-5-sonnet-20241022';
  }

  async initialize(): Promise<void> {
    try {
      // Retrieve API key from secure storage
      this.apiKey = await apiKeyService.getAPIKey('anthropic');

      if (!this.apiKey) {
        throw new Error('Anthropic API key not configured. Please add your API key.');
      }

      // Validate key format (basic check)
      if (!this.apiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid Anthropic API key format');
      }

      this.ready = true;
      this.error = null;
      console.log('[Anthropic] Adapter initialized');
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      this.ready = false;
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    this.apiKey = null;
    this.ready = false;
    console.log('[Anthropic] Adapter shut down');
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
      throw new Error('Anthropic adapter not initialized');
    }

    const model = request.model || this.defaultModel;
    const url = `${this.baseURL}/messages`;

    // Convert OpenAI format to Anthropic format
    const { system, messages } = this.convertMessages(request.messages);

    const body: any = {
      model,
      messages,
      max_tokens: request.max_tokens || 4096,
      temperature: request.temperature ?? 0.7,
      stream: request.stream ?? false,
    };

    // Add system message if present
    if (system) {
      body.system = system;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText}. ${
          errorData.error?.message || ''
        }`
      );
    }

    if (request.stream) {
      // For streaming, we need to convert Anthropic's SSE format to OpenAI format
      return this.createStreamAdapter(response.body as ReadableStream);
    } else {
      // Convert Anthropic response to OpenAI format
      const data = await response.json();
      return this.convertResponse(data);
    }
  }

  /**
   * Convert OpenAI messages format to Anthropic format
   */
  private convertMessages(messages: ChatCompletionMessage[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let system: string | undefined;
    const convertedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Anthropic uses a separate system parameter
        system = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        convertedMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return { system, messages: convertedMessages };
  }

  /**
   * Convert Anthropic response to OpenAI format
   */
  private convertResponse(anthropicResponse: any): IChatCompletionResponse {
    return {
      id: anthropicResponse.id,
      created: Math.floor(Date.now() / 1000),
      model: anthropicResponse.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: anthropicResponse.content[0].text,
          },
          finish_reason: this.mapStopReason(anthropicResponse.stop_reason),
        },
      ],
      usage: {
        prompt_tokens: anthropicResponse.usage.input_tokens,
        completion_tokens: anthropicResponse.usage.output_tokens,
        total_tokens:
          anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens,
      },
    };
  }

  /**
   * Map Anthropic stop_reason to OpenAI finish_reason
   */
  private mapStopReason(stopReason: string): 'stop' | 'length' | 'content_filter' {
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop'; // Default to 'stop' for unknown reasons
    }
  }

  /**
   * Create a stream adapter that converts Anthropic SSE to OpenAI format
   */
  private createStreamAdapter(
    anthropicStream: ReadableStream
  ): ReadableStream<IChatCompletionChunk> {
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream({
      async start(controller) {
        const reader = anthropicStream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events (separated by double newline)
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep incomplete event in buffer

            for (const event of events) {
              if (!event.trim()) continue;

              // Parse SSE event (format: "event: type\ndata: {...}")
              const lines = event.split('\n');
              let eventType = '';
              let eventData = '';

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                  eventData = line.slice(6).trim();
                }
              }

              // Skip non-data events
              if (!eventData) continue;

              try {
                const anthropicEvent = JSON.parse(eventData);

                // Convert Anthropic events to OpenAI chunk format
                if (eventType === 'content_block_delta' && anthropicEvent.delta?.text) {
                  const chunk: IChatCompletionChunk = {
                    id: anthropicEvent.id || `chatcmpl-${Date.now()}`,
                    model: this.defaultModel,
                    created: Math.floor(Date.now() / 1000),
                    choices: [
                      {
                        index: 0,
                        delta: {
                          content: anthropicEvent.delta.text,
                        },
                        finish_reason: null,
                      },
                    ],
                  };
                  controller.enqueue(chunk);
                } else if (eventType === 'message_start') {
                  // Send initial chunk with role
                  const chunk: IChatCompletionChunk = {
                    id: anthropicEvent.message?.id || `chatcmpl-${Date.now()}`,
                    model: anthropicEvent.message?.model || this.defaultModel,
                    created: Math.floor(Date.now() / 1000),
                    choices: [
                      {
                        index: 0,
                        delta: {
                          role: 'assistant',
                        },
                        finish_reason: null,
                      },
                    ],
                  };
                  controller.enqueue(chunk);
                } else if (eventType === 'message_delta' && anthropicEvent.delta?.stop_reason) {
                  // Send final chunk with finish_reason
                  const chunk: IChatCompletionChunk = {
                    id: `chatcmpl-${Date.now()}`,
                    model: this.defaultModel,
                    created: Math.floor(Date.now() / 1000),
                    choices: [
                      {
                        index: 0,
                        delta: {},
                        finish_reason: this.mapStopReason(anthropicEvent.delta.stop_reason),
                      },
                    ],
                  };
                  controller.enqueue(chunk);
                }
              } catch (err) {
                console.error('[Anthropic] Failed to parse SSE event:', err);
              }
            }
          }
        } catch (err) {
          console.error('[Anthropic] Stream error:', err);
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
      console.error('[Anthropic] Connection test failed:', error);
      return false;
    }
  }
}
