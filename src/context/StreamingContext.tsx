import React, { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';

interface StreamingContextType {
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamContent: string;
  setStreamContent: (content: string) => void;
  startStream: (query: string, action: string, file?: string | null, onComplete?: (content: string) => void, onStreamStart?: () => void) => Promise<void>;
  stopStream: () => void;
  resetStream: () => void;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

export const StreamingProvider = ({ children }: { children: ReactNode }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (query: string, action: string, file?: string | null, onComplete?: (content: string) => void, onStreamStart?: () => void) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsStreaming(true);
    setStreamContent('');
    
    // Call onStreamStart callback when streaming begins
    onStreamStart?.();

    try {
      // Get API key and model from storage
      const result = await chrome.storage.local.get(['apiKey', 'model', 'aiModelConfig']);
      const apiKey = result.apiKey;
      const model = result.model ?? 'sonar';
      const modelConfig = result.aiModelConfig || {};
      
      if (!apiKey) {
        throw new Error('API key not found. Please set your Perplexity API key in settings.');
      }

      // Build the request payload - simplified for plain text streaming
      const payload: any = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Provide clear, concise, and accurate responses. Use markdown formatting for better readability. Respond with plain text only, no JSON formatting.'
          }
        ],
        stream: true,
        max_tokens: modelConfig.maxTokens || 4000,
        temperature: modelConfig.temperature || 0.7
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
          content: query
        });
      }

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
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

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        if (abortControllerRef.current?.signal.aborted) break;

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
            setIsStreaming(false);
            // Use a callback to get the most current streamContent
            setStreamContent(prev => {
              const finalContent = prev;
              onComplete?.(finalContent); // Call the onComplete callback with final content
              return prev; // Keep the content
            });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              const content = parsed.choices[0].delta.content;
              setStreamContent(prev => prev + content);
            }
          } catch (error) {
            console.warn('Failed to parse streaming chunk:', error);
          }
        }
      }

      setIsStreaming(false);
      // Use a callback to get the most current streamContent
      setStreamContent(prev => {
        const finalContent = prev;
        onComplete?.(finalContent); // Call the onComplete callback with final content
        return prev; // Keep the content
      });
    } catch (error) {
      console.error('Streaming error:', error);
      setIsStreaming(false);
      if (error instanceof Error && error.name !== 'AbortError') {
        setStreamContent(prev => prev + `\n\n**Error:** ${error.message}`);
      }
    }
  }, [streamContent]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  }, []);

  const resetStream = useCallback(() => {
    stopStream();
    setStreamContent('');
  }, [stopStream]);

  return (
    <StreamingContext.Provider
      value={{
        isStreaming,
        setIsStreaming,
        streamContent,
        setStreamContent,
        startStream,
        stopStream,
        resetStream
      }}
    >
      {children}
    </StreamingContext.Provider>
  );
};

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreaming must be used within a StreamingProvider');
  }
  return context;
}; 