import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAIInteractions } from '../../hooks/useAIInteractions';
import { sendQueryToAI } from '../../utils/api';

// Mock the API module
vi.mock('../../utils/api', () => ({
  sendQueryToAI: vi.fn(),
}));

describe('useAIInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAIInteractions());

    expect(result.current.loading).toBe(false);
    expect(result.current.outputHtml).toBe('');
    expect(result.current.tags).toEqual([]);
    expect(result.current.suggested).toEqual([]);
    expect(result.current.links).toEqual([]);
  });

  it('should set loading state correctly', () => {
    const { result } = renderHook(() => useAIInteractions());

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.loading).toBe(true);
  });

  it('should clear AI state correctly', () => {
    const { result } = renderHook(() => useAIInteractions());

    // Set some state first
    act(() => {
      result.current.setOutputHtml('test content');
      result.current.setTags(['tag1', 'tag2']);
      result.current.setSuggested(['question1']);
      result.current.setLinks([{ title: 'Link', url: 'http://example.com', description: 'Test' }]);
    });

    // Clear the state
    act(() => {
      result.current.clearAIState();
    });

    expect(result.current.outputHtml).toBe('');
    expect(result.current.tags).toEqual([]);
    expect(result.current.suggested).toEqual([]);
    expect(result.current.links).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch tags and questions when enabled', async () => {
    const mockResponse = {
      tags: ['tag1', 'tag2', 'tag3'],
      suggestedQuestions: ['question1', 'question2'],
    };

    (sendQueryToAI as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAIInteractions({
      userSettings: {
        contextConfig: { 
          showTags: true, 
          showSuggestedQuestions: true,
          usePageContext: true,
          useWebSearch: false,
          contextLevel: 'standard',
          includeMetadata: true,
          includeLinks: true,
          includeImages: false,
          maxContextLength: 8000,
        },
        modelConfig: { 
          model: 'sonar-small',
          apiKey: 'test-key',
          temperature: 0.7,
          maxTokens: 4000,
        },
      },
    }));

    const pageContext = 'Test page content';

    await act(async () => {
      const response = await result.current.fetchTagsAndQuestions(pageContext);
      expect(response).toEqual({
        tags: ['tag1', 'tag2', 'tag3'],
        suggestedQuestions: ['question1', 'question2'],
      });
    });

    expect(sendQueryToAI).toHaveBeenCalledWith({
      query: expect.stringContaining('Analyze this page content'),
      action: 'direct_question',
      contextConfig: expect.any(Object),
      modelConfig: expect.any(Object),
    });
  });

  it('should not fetch tags and questions when disabled', async () => {
    const { result } = renderHook(() => useAIInteractions({
      userSettings: {
        contextConfig: { 
          showTags: false, 
          showSuggestedQuestions: false,
          usePageContext: true,
          useWebSearch: false,
          contextLevel: 'standard',
          includeMetadata: true,
          includeLinks: true,
          includeImages: false,
          maxContextLength: 8000,
        },
        modelConfig: { 
          model: 'sonar-small',
          apiKey: 'test-key',
          temperature: 0.7,
          maxTokens: 4000,
        },
      },
    }));

    const pageContext = 'Test page content';

    await act(async () => {
      const response = await result.current.fetchTagsAndQuestions(pageContext);
      expect(response).toEqual({
        tags: [],
        suggestedQuestions: [],
      });
    });

    expect(sendQueryToAI).not.toHaveBeenCalled();
  });

  it('should handle web search correctly', async () => {
    const mockResponse = {
      text: 'Found 2 relevant links',
      links: [
        { title: 'Link 1', url: 'http://example1.com', description: 'Description 1' },
        { title: 'Link 2', url: 'http://example2.com', description: 'Description 2' },
      ],
    };

    (sendQueryToAI as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAIInteractions({
      userSettings: {
        contextConfig: { 
          showTags: true, 
          showSuggestedQuestions: true,
          usePageContext: true,
          useWebSearch: false,
          contextLevel: 'standard',
          includeMetadata: true,
          includeLinks: true,
          includeImages: false,
          maxContextLength: 8000,
        },
        modelConfig: { 
          model: 'sonar-small',
          apiKey: 'test-key',
          temperature: 0.7,
          maxTokens: 4000,
        },
      },
    }));

    const query = 'test search query';

    await act(async () => {
      const response = await result.current.sendWebSearch(query);
      expect(response).toEqual({
        title: 'Web search results for "test search query"',
        type: 'search',
        response: 'Found 2 web search results for "test search query":',
        tags: [],
        suggestedQuestions: [],
        links: [
          { title: 'Link 1', url: 'http://example1.com', description: 'Description 1' },
          { title: 'Link 2', url: 'http://example2.com', description: 'Description 2' },
        ],
      });
    });

    expect(result.current.links).toEqual([
      { title: 'Link 1', url: 'http://example1.com', description: 'Description 1' },
      { title: 'Link 2', url: 'http://example2.com', description: 'Description 2' },
    ]);
    expect(result.current.outputHtml).toBe('');
  });

  it('should handle web search with no results', async () => {
    const mockResponse = {
      text: 'No results found',
      links: [],
    };

    (sendQueryToAI as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAIInteractions({
      userSettings: {
        contextConfig: { 
          showTags: true, 
          showSuggestedQuestions: true,
          usePageContext: true,
          useWebSearch: false,
          contextLevel: 'standard',
          includeMetadata: true,
          includeLinks: true,
          includeImages: false,
          maxContextLength: 8000,
        },
        modelConfig: { 
          model: 'sonar-small',
          apiKey: 'test-key',
          temperature: 0.7,
          maxTokens: 4000,
        },
      },
    }));

    const query = 'test search query';

    await act(async () => {
      const response = await result.current.sendWebSearch(query);
      expect(response).toEqual({
        title: 'Web search results for "test search query"',
        type: 'search',
        response: 'No web search results found for "test search query".',
        tags: [],
        suggestedQuestions: [],
        links: [],
      });
    });

    expect(result.current.outputHtml).toBe('<p>No web search results found for "test search query".</p>');
  });

  it('should handle API errors gracefully', async () => {
    const error = new Error('API Error');
    (sendQueryToAI as any).mockRejectedValue(error);

    const { result } = renderHook(() => useAIInteractions({
      userSettings: {
        contextConfig: { 
          showTags: true, 
          showSuggestedQuestions: true,
          usePageContext: true,
          useWebSearch: false,
          contextLevel: 'standard',
          includeMetadata: true,
          includeLinks: true,
          includeImages: false,
          maxContextLength: 8000,
        },
        modelConfig: { 
          model: 'sonar-small',
          apiKey: 'test-key',
          temperature: 0.7,
          maxTokens: 4000,
        },
      },
    }));

    const pageContext = 'Test page content';

    await act(async () => {
      const response = await result.current.fetchTagsAndQuestions(pageContext);
      expect(response).toEqual({
        tags: [],
        suggestedQuestions: [],
      });
    });
  });

  it('should handle web search errors', async () => {
    const error = new Error('Web search failed');
    (sendQueryToAI as any).mockRejectedValue(error);

    const { result } = renderHook(() => useAIInteractions({
      userSettings: {
        contextConfig: { 
          showTags: true, 
          showSuggestedQuestions: true,
          usePageContext: true,
          useWebSearch: false,
          contextLevel: 'standard',
          includeMetadata: true,
          includeLinks: true,
          includeImages: false,
          maxContextLength: 8000,
        },
        modelConfig: { 
          model: 'sonar-small',
          apiKey: 'test-key',
          temperature: 0.7,
          maxTokens: 4000,
        },
      },
    }));

    const query = 'test search query';

    await act(async () => {
      await expect(result.current.sendWebSearch(query)).rejects.toThrow('Web search failed');
    });

    expect(result.current.outputHtml).toBe('<p class="error">Error performing web search: Web search failed</p>');
  });
}); 