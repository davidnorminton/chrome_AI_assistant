// src/utils/api.ts

import type { AIResponse, AIAction, AIModelConfig, AIContextConfig } from '../types';
import { defaultAIContextManager } from './aiContextManager';

// Base summarization prompt template for consistent, high-quality summaries
const BASE_SUMMARIZATION_PROMPT = `
You are an AI assistant specialized in creating comprehensive, well-structured summaries.

Your summarization should follow this structure:

1. **Brief Overview** (2-3 sentences): Provide a concise introduction explaining what the page/document is about and its main purpose.

2. **Key Points Summary** (bullet points): Extract and explain the most important points, concepts, or findings from the content. Focus on:
   - Main topics or themes
   - Important facts, data, or statistics
   - Key conclusions or insights
   - Notable features or characteristics
   - Critical information that readers should know

3. **Content Quality**: Ensure your summary is:
   - Clear and easy to understand
   - Comprehensive but concise
   - Well-organized with logical flow
   - Focused on the most valuable information

Format your response as a single JSON object with keys:
  "summary" (HTML string with the structured summary),
  "tags" (array of exactly 6 relevant tags),
  "suggestedQuestions" (array of exactly 3 follow-up questions).

Use only basic HTML tags (<p>, <ul>, <li>, <strong>, <em>, <h3>).
Return exactly the JSON object.
`.trim();

export interface SendQueryOptions {
  query: string;
  action: AIAction;
  file?: string | null;
  contextConfig?: Partial<AIContextConfig>;
  modelConfig?: Partial<AIModelConfig>;
}

export async function sendQueryToAI(options: SendQueryOptions): Promise<AIResponse> {
  const { query, action, file, contextConfig, modelConfig } = options;

  // Update context manager with provided configuration
  if (contextConfig) {
    defaultAIContextManager.updateConfig(contextConfig);
  }

  // Load model & API key
  const { model, apiKey, modelConfig: existingModelConfig } = await new Promise<{ model: string; apiKey: string; modelConfig: any }>(resolve => {
    chrome.storage.local.get(['model', 'apiKey', 'aiModelConfig'], data =>
      resolve({
        model: data.model ?? 'sonar-small-online',
        apiKey: data.apiKey,
        modelConfig: data.aiModelConfig || {}
      })
    );
  });
  
  if (!apiKey) {
    throw new Error('API key not set in Settings');
  }

  // Build system prompt using context manager
  const systemPrompt = defaultAIContextManager.createSystemPrompt(action);

  // Prepare the content to send
  let contentToSend: string;
  let contentType: 'text' | 'image_url' = 'text';

  if (file) {
    if (file.startsWith('data:image/')) {
      contentToSend = file;
      contentType = 'image_url';
    } else {
      // For text files, clean and truncate the content
      contentToSend = cleanTextContent(file);
      if (contentToSend.length > 8000) {
        contentToSend = contentToSend.substring(0, 8000) + '...';
        console.warn('File content truncated to 8000 characters');
      }
    }
  } else {
    contentToSend = query;
  }

  // Build the request payload
  const payload: any = {
    model: modelConfig?.model || existingModelConfig?.model || model,
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
      content: contentToSend
    });
  }

  // Add optional parameters if provided
  if (modelConfig?.temperature !== undefined) {
    payload.temperature = modelConfig.temperature;
  } else if (existingModelConfig?.temperature !== undefined) {
    payload.temperature = existingModelConfig.temperature;
  }
  if (modelConfig?.maxTokens !== undefined) {
    payload.max_tokens = modelConfig.maxTokens;
  } else if (existingModelConfig?.maxTokens !== undefined) {
    payload.max_tokens = existingModelConfig.maxTokens;
  }

  try {
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
    return parseAIResponse(aiResponse, action);
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    throw error;
  }
}

// Helper function to clean text content
function cleanTextContent(text: string): string {
  return text
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,!?;:()\[\]{}"'`~@#$%^&*+=|\\<>/-]/g, '') // Remove special characters
    .trim();
}

// Parse AI response based on action type
function parseAIResponse(response: string, action: AIAction): AIResponse {
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
    } else if (action === 'direct_question' && parsed.tags && parsed.suggestedQuestions) {
      // For direct questions that return tags and questions
      return {
        text: response, // Keep the original response for debugging
        model: 'perplexity',
        tags: parsed.tags,
        suggestedQuestions: parsed.suggestedQuestions,
      };
    } else {
      // For other actions, expect structured response
      if (parsed.summary && Array.isArray(parsed.tags) && Array.isArray(parsed.suggestedQuestions)) {
        return {
          text: parsed.summary,
          model: 'perplexity',
          tags: parsed.tags,
          suggestedQuestions: parsed.suggestedQuestions,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse AI response as JSON, treating as plain text');
  }

  // Fallback: treat as plain text
  return {
    text: response,
    model: 'perplexity',
    tags: [],
  };
}

// Enhanced function with context management
export async function sendQueryWithContext(
  userQuery: string,
  pageInfo: { text: string; url: string; title: string; favicon: string },
  options: {
    fileData?: string | null;
    contextConfig?: Partial<AIContextConfig>;
    modelConfig?: Partial<AIModelConfig>;
    useWebSearch?: boolean;
  } = {}
): Promise<AIResponse> {
  const { fileData, contextConfig, modelConfig, useWebSearch } = options;

  // Update context manager
  if (contextConfig) {
    defaultAIContextManager.updateConfig(contextConfig);
  }

  // Determine action
  const action = defaultAIContextManager.determineAction(userQuery, fileData, useWebSearch);

  // Build context-aware query
  const contextQuery = defaultAIContextManager.buildQuery(userQuery, pageInfo, action, fileData);

  return sendQueryToAI({
    query: contextQuery,
    action,
    file: fileData,
    contextConfig,
    modelConfig,
  });
}

// Export the context manager for external use
export { defaultAIContextManager };