import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../../services/AIService';
import { mockChromeStorage, mockSuccessfulAPIResponse, mockFailedAPIResponse } from '../setup';

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    aiService = AIService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendQuery', () => {
    beforeEach(() => {
      mockChromeStorage({
        apiKey: 'test-api-key',
        model: 'sonar-small',
        aiModelConfig: {
          temperature: 0.7,
          maxTokens: 4000,
        },
      });
    });

    it('should send a query successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a test response'
          }
        }]
      };

      mockSuccessfulAPIResponse(mockResponse);

      const result = await aiService.sendQuery({
        query: 'Test query',
        action: 'direct_question',
      });

      expect(result).toEqual({
        text: 'This is a test response',
        model: 'perplexity',
        tags: [],
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test query'),
        })
      );
    });

    it('should handle API errors', async () => {
      mockFailedAPIResponse(401, 'Unauthorized');

      await expect(aiService.sendQuery({
        query: 'Test query',
        action: 'direct_question',
      })).rejects.toThrow('API request failed: 401 Unauthorized');
    });

    it('should handle missing API key', async () => {
      mockChromeStorage({
        apiKey: '',
        model: 'sonar-small',
      });

      await expect(aiService.sendQuery({
        query: 'Test query',
        action: 'direct_question',
      })).rejects.toThrow('API key not set in Settings');
    });

    it('should handle multimodal queries with images', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is an image analysis'
          }
        }]
      };

      mockSuccessfulAPIResponse(mockResponse);

      const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      const result = await aiService.sendQuery({
        query: 'What is in this image?',
        action: 'direct_question',
        file: imageData,
      });

      expect(result).toEqual({
        text: 'This is an image analysis',
        model: 'perplexity',
        tags: [],
      });

      const callBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(callBody.messages[1].content).toEqual([
        { type: 'text', text: 'What is in this image?' },
        { type: 'image_url', image_url: { url: imageData } }
      ]);
    });

    it('should parse JSON responses correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              tags: ['tag1', 'tag2'],
              suggestedQuestions: ['question1', 'question2']
            })
          }
        }]
      };

      mockSuccessfulAPIResponse(mockResponse);

      const result = await aiService.sendQuery({
        query: 'Analyze this content',
        action: 'direct_question',
      });

      expect(result).toEqual({
        text: expect.stringContaining('{"tags":'),
        model: 'perplexity',
        tags: ['tag1', 'tag2'],
        suggestedQuestions: ['question1', 'question2'],
      });
    });

    it('should handle get_links action correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              { title: 'Link 1', url: 'http://example1.com', description: 'Description 1' },
              { title: 'Link 2', url: 'http://example2.com', description: 'Description 2' },
            ])
          }
        }]
      };

      mockSuccessfulAPIResponse(mockResponse);

      const result = await aiService.sendQuery({
        query: 'Search for information',
        action: 'get_links',
      });

      expect(result).toEqual({
        text: 'Found 2 relevant links',
        model: 'perplexity',
        tags: [],
        links: [
          { title: 'Link 1', url: 'http://example1.com', description: 'Description 1' },
          { title: 'Link 2', url: 'http://example2.com', description: 'Description 2' },
        ],
      });
    });
  });

  describe('streamQuery', () => {
    beforeEach(() => {
      mockChromeStorage({
        apiKey: 'test-api-key',
        model: 'sonar-small',
        aiModelConfig: {
          temperature: 0.7,
          maxTokens: 4000,
        },
      });
    });

    it('should stream query successfully', async () => {
      const mockStreamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'));
            controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" World"}}]}\n'));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
            controller.close();
          }
        })
      );

      (fetch as any).mockResolvedValue(mockStreamResponse);

      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await aiService.streamQuery({
        query: 'Test streaming',
        action: 'direct_question',
        onChunk,
        onComplete,
        onError,
      });

      expect(onChunk).toHaveBeenCalledWith('Hello');
      expect(onChunk).toHaveBeenCalledWith(' World');
      expect(onComplete).toHaveBeenCalledWith('Hello World');
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      const mockErrorResponse = new Response('Error', { status: 500 });

      (fetch as any).mockResolvedValue(mockErrorResponse);

      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      await aiService.streamQuery({
        query: 'Test streaming error',
        action: 'direct_question',
        onChunk,
        onComplete,
        onError,
      });

      expect(onChunk).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle abort signal', async () => {
      const abortController = new AbortController();
      const mockStreamResponse = new Response(
        new ReadableStream({
          start(controller) {
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'));
            }, 100);
          }
        })
      );

      (fetch as any).mockResolvedValue(mockStreamResponse);

      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      // Abort after a short delay
      setTimeout(() => abortController.abort(), 50);

      await aiService.streamQuery({
        query: 'Test abort',
        action: 'direct_question',
        onChunk,
        onComplete,
        onError,
        abortSignal: abortController.signal,
      });

      expect(onChunk).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('analyzeImage', () => {
    beforeEach(() => {
      mockChromeStorage({
        apiKey: 'test-api-key',
        model: 'sonar-small',
      });
    });

    it('should analyze image successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This image shows a red square'
          }
        }]
      };

      mockSuccessfulAPIResponse(mockResponse);

      const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      const result = await aiService.analyzeImage(imageData, 'What is in this image?');

      expect(result).toEqual({
        text: 'This image shows a red square',
        model: 'perplexity',
        tags: [],
      });

      const callBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(callBody.messages[1].content).toEqual([
        { type: 'text', text: 'What is in this image?' },
        { type: 'image_url', image_url: { url: imageData } }
      ]);
    });
  });
}); 