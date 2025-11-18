/**
 * Google Gemini External Adapter
 *
 * Connects to Google Gemini API with user's own API key (BYOK)
 * Converts between OpenAI format and Google Generative AI API format
 */

import {
  IModuleAdapter,
  IChatCompletionRequest,
  IChatCompletionResponse,
  IChatCompletionChunk,
  ChatCompletionMessage,
} from './adapter.interface';
import { apiKeyService } from '../../services/apikey.service';

export interface GeminiAdapterConfig {
  model?: string;
  baseURL?: string;
}

export class GeminiAdapter implements IModuleAdapter {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  public readonly description = 'External Google Gemini API with your own API key';

  private apiKey: string | null = null;
  private ready = false;
  private error: string | null = null;
  private baseURL: string;
  private defaultModel: string;

  constructor(config: GeminiAdapterConfig = {}) {
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultModel = config.model || 'gemini-2.0-flash';
  }

  async initialize(): Promise<void> {
    try {
      // Retrieve API key from secure storage
      this.apiKey = await apiKeyService.getAPIKey('gemini');

      if (!this.apiKey) {
        throw new Error('Google Gemini API key not configured. Please add your API key.');
      }

      this.ready = true;
      this.error = null;
      console.log('[Gemini] Adapter initialized');
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      this.ready = false;
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    this.apiKey = null;
    this.ready = false;
    console.log('[Gemini] Adapter shut down');
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
      throw new Error('Gemini adapter not initialized');
    }

    const model = request.model || this.defaultModel;
    const streamMode = request.stream ?? false;
    const endpoint = streamMode ? 'streamGenerateContent' : 'generateContent';
    const url = `${this.baseURL}/models/${model}:${endpoint}?key=${this.apiKey}`;

    // Convert OpenAI format to Gemini format
    const contents = this.convertMessages(request.messages);

    const body = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.max_tokens || 4096,
        topP: 0.95,
        topK: 40,
      },
    };

    if (streamMode) {
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Convert Gemini response to OpenAI format
    return {
      id: `gemini-${Date.now()}`,
      model: body.model || this.defaultModel,
      choices: [
        {
          message: {
            role: 'assistant',
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          },
          finish_reason: data.candidates?.[0]?.finishReason || 'stop',
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
    const defaultModel = this.defaultModel;

    return new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: abortSignal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
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
                  const chunk: IChatCompletionChunk = {
                    id: `gemini-${Date.now()}`,
                    model: defaultModel,
                    choices: [
                      {
                        delta: {
                          content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                        },
                        finish_reason: data.candidates?.[0]?.finishReason || null,
                        index: 0,
                      },
                    ],
                  };
                  controller.enqueue(chunk);
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
    const contents: any[] = [];
    let currentRole: string | null = null;
    let currentParts: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini doesn't have explicit system role, prepend to first user message
        if (contents.length === 0) {
          contents.push({
            role: 'user',
            parts: [{ text: msg.content }],
          });
        }
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';

      if (currentRole !== role) {
        if (currentParts.length > 0) {
          contents.push({
            role: currentRole || 'user',
            parts: currentParts,
          });
        }
        currentRole = role;
        currentParts = [];
      }

      currentParts.push({
        text: msg.content,
      });
    }

    if (currentParts.length > 0) {
      contents.push({
        role: currentRole || 'user',
        parts: currentParts,
      });
    }

    return contents;
  }
}
