/**
 * Cohere External Adapter
 *
 * Connects to Cohere API with user's own API key (BYOK)
 * Converts between OpenAI format and Cohere API format
 */

import {
  IModuleAdapter,
  IChatCompletionRequest,
  IChatCompletionResponse,
  IChatCompletionChunk,
  ChatCompletionMessage,
} from './adapter.interface';
import { apiKeyService } from '../../services/apikey.service';

export interface CohereAdapterConfig {
  model?: string;
  baseURL?: string;
}

export class CohereAdapter implements IModuleAdapter {
  public readonly id = 'cohere';
  public readonly name = 'Cohere';
  public readonly description = 'External Cohere API with your own API key';

  private apiKey: string | null = null;
  private ready = false;
  private error: string | null = null;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: CohereAdapterConfig = {}) {
    this.baseURL = config.baseURL || 'https://api.cohere.ai/v1';
    this.defaultModel = config.model || 'command-r-plus';
  }

  async initialize(): Promise<void> {
    try {
      // Retrieve API key from secure storage
      this.apiKey = await apiKeyService.getAPIKey('cohere');

      if (!this.apiKey) {
        throw new Error('Cohere API key not configured. Please add your API key.');
      }

      this.ready = true;
      this.error = null;
      console.log('[Cohere] Adapter initialized');
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      this.ready = false;
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    this.apiKey = null;
    this.ready = false;
    console.log('[Cohere] Adapter shut down');
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
      throw new Error('Cohere adapter not initialized');
    }

    const model = request.model || this.defaultModel;
    const url = `${this.baseURL}/chat`;

    // Convert OpenAI format to Cohere format
    const messages = this.convertMessages(request.messages);

    const body = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens || 4096,
      stream: request.stream ?? false,
    };

    if (request.stream) {
      return this.queryStream(url, body, abortSignal);
    } else {
      return this.queryNonStream(url, body, abortSignal);
    }
  }

  private async queryNonStream(
    url: string,
    body: any,
    abortSignal?: AbortSignal
  ): Promise<IChatCompletionResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'SML-Guardian/1.0',
      },
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere API error: ${error.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Convert Cohere response to OpenAI format
    return {
      id: data.generation_id || `cohere-${Date.now()}`,
      model: body.model || this.defaultModel,
      choices: [
        {
          message: {
            role: 'assistant',
            content: data.text || '',
          },
          finish_reason: 'stop',
          index: 0,
        },
      ],
      created: Math.floor(Date.now() / 1000),
    };
  }

  private async queryStream(
    url: string,
    body: any,
    abortSignal?: AbortSignal
  ): Promise<ReadableStream<IChatCompletionChunk>> {
    const decoder = new TextDecoder();
    let buffer = '';
    const apiKey = this.apiKey;
    const defaultModel = this.defaultModel;

    return new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'User-Agent': 'SML-Guardian/1.0',
            },
            body: JSON.stringify(body),
            signal: abortSignal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Cohere API error: ${error.message || 'Unknown error'}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.text) {
                    const chunk: IChatCompletionChunk = {
                      id: data.generation_id || `cohere-${Date.now()}`,
                      model: defaultModel,
                      choices: [
                        {
                          delta: {
                            content: data.text,
                          },
                          finish_reason: data.finish_reason || null,
                          index: 0,
                        },
                      ],
                    };
                    controller.enqueue(chunk);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  private convertMessages(messages: ChatCompletionMessage[]): any[] {
    // Cohere chat API expects messages in a similar format to OpenAI
    // System messages should be handled separately or combined with first message
    const convertedMessages: any[] = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n';
      } else {
        convertedMessages.push({
          role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
          message: msg.content,
        });
      }
    }

    // Prepend system prompt to first user message if present
    if (systemPrompt && convertedMessages.length > 0) {
      const firstUserIdx = convertedMessages.findIndex((m) => m.role === 'USER');
      if (firstUserIdx >= 0) {
        convertedMessages[firstUserIdx].message = systemPrompt + convertedMessages[firstUserIdx].message;
      }
    }

    return convertedMessages;
  }
}
