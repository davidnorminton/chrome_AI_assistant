import { useState, useCallback, useMemo } from 'react';
import { sendQueryToAI } from '../utils/api';
import type { AIResponse, AIContextConfig, AIModelConfig, AIAction } from '../types';

interface AIInteractionsState {
  loading: boolean;
  outputHtml: string;
  tags: string[];
  suggested: string[];
  links: { title: string; url: string; description: string }[];
}

interface UseAIInteractionsOptions {
  userSettings?: {
    contextConfig: AIContextConfig;
    modelConfig: AIModelConfig;
  } | null;
}

export function useAIInteractions(options: UseAIInteractionsOptions = {}) {
  const { userSettings } = options;
  
  const [state, setState] = useState<AIInteractionsState>({
    loading: false,
    outputHtml: '',
    tags: [],
    suggested: [],
    links: [],
  });

  // Memoized setters to prevent unnecessary re-renders
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setOutputHtml = useCallback((outputHtml: string) => {
    setState(prev => ({ ...prev, outputHtml }));
  }, []);

  const setTags = useCallback((tags: string[]) => {
    setState(prev => ({ ...prev, tags }));
  }, []);

  const setSuggested = useCallback((suggested: string[]) => {
    setState(prev => ({ ...prev, suggested }));
  }, []);

  const setLinks = useCallback((links: { title: string; url: string; description: string }[]) => {
    setState(prev => ({ ...prev, links }));
  }, []);

  const clearAIState = useCallback(() => {
    setState({
      loading: false,
      outputHtml: '',
      tags: [],
      suggested: [],
      links: [],
    });
  }, []);

  // Memoized settings to prevent unnecessary API calls
  const settings = useMemo(() => {
    return userSettings?.contextConfig || {
      showTags: true,
      showSuggestedQuestions: true,
    };
  }, [userSettings?.contextConfig]);

  // Fetch tags and suggested questions
  const fetchTagsAndQuestions = useCallback(async (pageContext: string) => {
    try {
      // Only fetch if user has enabled these features
      if (!settings.showTags && !settings.showSuggestedQuestions) {
        return { tags: [], suggestedQuestions: [] };
      }

      // Build the analysis query using page context - separate call for JSON format
      const analysisQuery = `Analyze this page content and return ONLY a JSON object with exactly 6 relevant tags and 3 suggested follow-up questions. The response must be valid JSON in this exact format:
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "suggestedQuestions": ["question1", "question2", "question3"]
}

Page Content:
${pageContext}`;

      const structuredResponse = await sendQueryToAI({
        query: analysisQuery,
        action: "direct_question",
        contextConfig: userSettings?.contextConfig,
        modelConfig: userSettings?.modelConfig,
      });

      const result = {
        tags: settings.showTags ? (structuredResponse.tags ?? []) : [],
        suggestedQuestions: settings.showSuggestedQuestions ? (structuredResponse.suggestedQuestions ?? []) : [],
      };
      
      return result;
    } catch (error) {
      console.error('Error fetching tags and questions:', error);
      return { tags: [], suggestedQuestions: [] };
    }
  }, [settings, userSettings?.contextConfig, userSettings?.modelConfig]);

  // Send web search query
  const sendWebSearch = useCallback(async (query: string) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);
    
    try {
      const res: AIResponse = await sendQueryToAI({
        query: query,
        action: "get_links",
        contextConfig: userSettings?.contextConfig,
        modelConfig: userSettings?.modelConfig,
      });
      
      const linksArr = res.links?.slice(0, 15) ?? [];
      
      setLinks(linksArr);
      
      // Don't set output HTML when we have links - let LinkList handle the display
      if (linksArr.length === 0) {
        setOutputHtml(`<p>No web search results found for "${query}".</p>`);
      } else {
        setOutputHtml(''); // Clear output HTML since LinkList will show the results
      }

      return {
        title: `Web search results for "${query}"`,
        type: 'search' as const,
        response: linksArr.length > 0 ? `Found ${linksArr.length} web search results for "${query}":` : `No web search results found for "${query}".`,
        tags: [],
        suggestedQuestions: [],
        links: linksArr,
      };
    } catch (error) {
      console.error('Web search error:', error);
      setOutputHtml(`<p class="error">Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}</p>`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userSettings?.contextConfig, userSettings?.modelConfig, setLoading, setTags, setSuggested, setLinks, setOutputHtml]);

  // Memoized return value to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    // State
    ...state,
    
    // Setters
    setLoading,
    setOutputHtml,
    setTags,
    setSuggested,
    setLinks,
    clearAIState,
    
    // Actions
    fetchTagsAndQuestions,
    sendWebSearch,
  }), [
    state,
    setLoading,
    setOutputHtml,
    setTags,
    setSuggested,
    setLinks,
    clearAIState,
    fetchTagsAndQuestions,
    sendWebSearch,
  ]);

  return returnValue;
} 