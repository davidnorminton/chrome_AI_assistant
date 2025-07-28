import type { AIResponse, AIAction, AIContextConfig, AIModelConfig } from '../types';
import { defaultAIContextManager } from '../utils/aiContextManager';

export interface SendQueryOptions {
  query: string;
  action: AIAction;
  file?: string | null;
  contextConfig?: Partial<AIContextConfig>;
  modelConfig?: Partial<AIModelConfig>;
}

export interface StreamOptions extends SendQueryOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (finalContent: string) => void;
  onError?: (error: Error) => void;
  abortSignal?: AbortSignal;
}

export class AIService {
  private static instance: AIService;

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Load settings from storage
  private async loadSettings(): Promise<{
    model: string;
    apiKey: string;
    modelConfig: any;
  }> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['model', 'apiKey', 'aiModelConfig'], data =>
        resolve({
          model: data.model ?? 'sonar-small',
          apiKey: data.apiKey,
          modelConfig: data.aiModelConfig || {}
        })
      );
    });
  }

  // Build payload for API requests
  private buildPayload(
    query: string,
    file: string | null,
    model: string,
    modelConfig: any,
    systemPrompt: string
  ): any {
    const payload: any = {
      model: modelConfig?.model || model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ]
    };

    // Add the user message with proper content format
    if (file && file.startsWith('data:image/')) {
      // For images, use the multimodal format
      payload.messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: query
          },
          {
            type: 'image_url',
            image_url: {
              url: file
            }
          }
        ]
      });
    } else {
      // For text content
      payload.messages.push({
        role: 'user',
        content: file || query
      });
    }

    // Add optional parameters if provided
    if (modelConfig?.temperature !== undefined) {
      payload.temperature = modelConfig.temperature;
    }
    if (modelConfig?.maxTokens !== undefined) {
      payload.max_tokens = modelConfig.maxTokens;
    }

    return payload;
  }

  // Send a single query to AI
  async sendQuery(options: SendQueryOptions): Promise<AIResponse> {
    const { query, action, file, contextConfig, modelConfig } = options;

    // Update context manager with provided configuration
    if (contextConfig) {
      defaultAIContextManager.updateConfig(contextConfig);
    }

    // Load settings
    const { model, apiKey, modelConfig: existingModelConfig } = await this.loadSettings();
    
    if (!apiKey) {
      throw new Error('API key not set in Settings');
    }

    // Build system prompt
    const systemPrompt = defaultAIContextManager.createSystemPrompt(action);

    // Build payload
    const payload = this.buildPayload(
      query,
      file || null,
      model,
      modelConfig || existingModelConfig,
      systemPrompt
    );

    // Make API call
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response content received from AI');
    }

    // Parse the AI response
    return this.parseAIResponse(aiResponse, action);
  }

  // Stream a query to AI
  async streamQuery(options: StreamOptions): Promise<void> {
    const { query, action, file, contextConfig, modelConfig, onChunk, onComplete, onError, abortSignal } = options;

    // Update context manager with provided configuration
    if (contextConfig) {
      defaultAIContextManager.updateConfig(contextConfig);
    }

    // Load settings
    const { model, apiKey, modelConfig: existingModelConfig } = await this.loadSettings();
    
    if (!apiKey) {
      throw new Error('API key not found. Please set your Perplexity API key in settings.');
    }

    // Build system prompt
    const systemPrompt = 'You are a helpful AI assistant. Provide clear, concise, and accurate responses. Use markdown formatting for better readability. Respond with plain text only, no JSON formatting.';

    // Build payload
    const payload = this.buildPayload(
      query,
      file || null,
      model,
      modelConfig || existingModelConfig,
      systemPrompt
    );

    // Add streaming parameters
    payload.stream = true;
    payload.max_tokens = (modelConfig || existingModelConfig)?.maxTokens || 4000;
    payload.temperature = (modelConfig || existingModelConfig)?.temperature || 0.7;

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let streamContent = '';

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        if (abortSignal?.aborted) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') {
            onComplete?.(streamContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              const content = parsed.choices[0].delta.content;
              streamContent += content;
              onChunk?.(content);
            }
          } catch (error) {
            console.warn('Failed to parse streaming chunk:', error);
          }
        }
      }

      onComplete?.(streamContent);
    } catch (error) {
      console.error('Streaming error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  // Analyze an image with a query
  async analyzeImage(imageData: string, query: string, options?: {
    contextConfig?: Partial<AIContextConfig>;
    modelConfig?: Partial<AIModelConfig>;
  }): Promise<AIResponse> {
    return this.sendQuery({
      query,
      action: 'direct_question',
      file: imageData,
      ...options,
    });
  }

  // Parse AI response based on action type
  private parseAIResponse(response: string, action: AIAction): AIResponse {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      if (action === 'get_links') {
        // For link searches, expect an array of links
        if (Array.isArray(parsed)) {
          return {
            text: `Found ${parsed.length} relevant links`,
            model: 'perplexity',
            tags: [],
            links: parsed.slice(0, 15), // Limit to 15 links
          };
        }
      } else if (action === 'summarize_page' && parsed.summary) {
        // For page summaries, expect structured response
        return {
          text: parsed.summary,
          model: 'perplexity',
          tags: parsed.tags || [],
          suggestedQuestions: parsed.suggestedQuestions || [],
        };
      } else if (action === 'direct_question' && parsed.tags && parsed.suggestedQuestions) {
        // For direct questions that return tags and questions
        return {
          text: response, // Keep the original response for debugging
          model: 'perplexity',
          tags: parsed.tags,
          suggestedQuestions: parsed.suggestedQuestions,
        };
      }
      
      // Default: return as plain text
      return {
        text: response,
        model: 'perplexity',
        tags: [],
      };
    } catch (error) {
      // If JSON parsing fails, return as plain text
      return {
        text: response,
        model: 'perplexity',
        tags: [],
      };
    }
  }
}

// Export singleton instance
export const aiService = AIService.getInstance(); 