import type { AIResponse, AIAction, AIContextConfig, AIModelConfig } from '../../types';
import type { AIProvider, SendQueryOptions, StreamOptions } from '../PluginManager';
import { defaultAIContextManager } from '../../utils/aiContextManager';

export class PerplexityProvider implements AIProvider {
  name = 'perplexity';
  description = 'Perplexity AI - Fast and accurate AI responses';
  version = '1.0.0';

  // Valid Perplexity models
  private validModels = ['sonar', 'sonar-pro'];

  async isAvailable(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['apiKey']);
      return !!result.apiKey;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    return this.validModels;
  }

  validateConfig(config: any): boolean {
    return config && 
           typeof config.apiKey === 'string' && 
           config.apiKey.length > 0 &&
           (!config.model || this.validModels.includes(config.model));
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
          model: data.model ?? 'sonar',
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

  async sendQuery(query: string, options: SendQueryOptions): Promise<AIResponse> {
    const { action, file, contextConfig, modelConfig } = options;

    // Update context manager with provided configuration
    if (contextConfig) {
      defaultAIContextManager.updateConfig(contextConfig);
    }

    // Load settings
    const { model, apiKey, modelConfig: existingModelConfig } = await this.loadSettings();
    
    if (!apiKey) {
      throw new Error('API key not set in Settings');
    }

    // Validate model
    const finalModel = modelConfig?.model || existingModelConfig?.model || model;
    if (!this.validModels.includes(finalModel)) {
      throw new Error(`Invalid model: ${finalModel}. Valid models are: ${this.validModels.join(', ')}`);
    }

    // Build system prompt
    const systemPrompt = defaultAIContextManager.createSystemPrompt(action);

    // Build payload
    const payload = this.buildPayload(
      query,
      file || null,
      finalModel,
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

  async streamQuery(query: string, options: StreamOptions): Promise<void> {
    const { action, file, contextConfig, modelConfig, onChunk, onComplete, onError, abortSignal } = options;

    // Update context manager with provided configuration
    if (contextConfig) {
      defaultAIContextManager.updateConfig(contextConfig);
    }

    // Load settings
    const { model, apiKey, modelConfig: existingModelConfig } = await this.loadSettings();
    
    if (!apiKey) {
      throw new Error('API key not found. Please set your Perplexity API key in settings.');
    }

    // Validate model
    const finalModel = modelConfig?.model || existingModelConfig?.model || model;
    if (!this.validModels.includes(finalModel)) {
      throw new Error(`Invalid model: ${finalModel}. Valid models are: ${this.validModels.join(', ')}`);
    }

    // Build system prompt
    const systemPrompt = 'You are a helpful AI assistant. Provide clear, concise, and accurate responses. Use markdown formatting for better readability. Respond with plain text only, no JSON formatting.';

    // Build payload
    const payload = this.buildPayload(
      query,
      file || null,
      finalModel,
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

  // Parse AI response based on action type
  private parseAIResponse(response: string, action: AIAction): AIResponse {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      if (action === 'get_links') {
        // For link searches, expect an array of links
        if (Array.isArray(parsed)) {
          return {
            text: JSON.stringify(parsed), // Return the actual JSON array
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