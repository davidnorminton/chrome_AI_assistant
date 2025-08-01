import { useState, useCallback, useContext } from "react";
import { sendQueryWithContext, defaultAIContextManager } from "../utils/api";
import { addHistory } from "../utils/storage";
import { getPageInfoFromTab } from "../utils/tabs";
import { getYouTubeVideoInfo } from "../utils/youtube";
import type { AIResponse, PageInfo, AIContextConfig, AIModelConfig } from "../types";

export interface UseAILogicReturn {
  // State
  outputHtml: string;
  tags: string[];
  suggested: string[];
  links: { title: string; url: string; description: string }[];
  loading: boolean;
  transcription?: string | null;
  
  // Actions
  sendQuery: (query: string, options?: SendQueryOptions) => Promise<void>;
  summarizePage: (userPrompt?: string) => Promise<void>;
  analyzeFile: (fileData: string, fileName?: string) => Promise<void>;
  
  // Context management
  updateContextConfig: (config: Partial<AIContextConfig>) => void;
  getContextConfig: () => AIContextConfig;
}

export interface SendQueryOptions {
  fileData?: string | null;
  contextConfig?: Partial<AIContextConfig>;
  modelConfig?: Partial<AIModelConfig>;
  useWebSearch?: boolean;
}

export function useAILogic(): UseAILogicReturn {
  const [outputHtml, setOutputHtml] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [links, setLinks] = useState<{ title: string; url: string; description: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string | null>(null);

  // Send a general query with context
  const sendQuery = useCallback(async (query: string, options: SendQueryOptions = {}) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);

    try {
      const pageInfo = await getPageInfoFromTab();
      
      const response = await sendQueryWithContext(query, pageInfo, {
        fileData: options.fileData,
        contextConfig: options.contextConfig,
        modelConfig: options.modelConfig,
        useWebSearch: options.useWebSearch,
      });

      setOutputHtml(response.text);
      setTags(response.tags ?? []);
      setSuggested(response.suggestedQuestions ?? []);

      // Save to history
      await addHistory({
        title: query,
        type: 'question',
        response: response.text,
        tags: response.tags ?? [],
        suggestedQuestions: response.suggestedQuestions ?? [],
        pageInfo: undefined, // Don't store page info for general questions
      });

    } catch (error: any) {
      setOutputHtml(`<p class="error">Error: ${error.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Summarize the current page
  const summarizePage = useCallback(async (userPrompt?: string) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);

    try {
      const pageInfo = await getPageInfoFromTab();
      
      // Check for YouTube video
      console.log('🔍 Starting YouTube detection...');
      const youtubeInfo = await getYouTubeVideoInfo();
      console.log('🔍 YouTube detection result:', youtubeInfo);
      console.log('🔍 YouTube videoId:', youtubeInfo.videoId);
      console.log('🔍 YouTube transcription:', youtubeInfo.transcription ? 'present' : 'null');
      
      if (youtubeInfo.videoId) {
        if (youtubeInfo.transcription) {
          console.log('✅ YouTube video with transcription detected:', youtubeInfo.title);
          const confirmSummarize = confirm(
            `Would you like to summarize this YouTube video?\n\n"${youtubeInfo.title}"\n\nThis will use the video's transcription for summarization.`
          );
          
          if (confirmSummarize) {
            const response = await sendQueryWithContext(
              `Summarize this YouTube video based on its transcription:\n\n${youtubeInfo.transcription}`,
              pageInfo,
              { contextConfig: { usePageContext: false } }
            );

            setOutputHtml(response.text);
            setTags(response.tags ?? []);
            setSuggested(response.suggestedQuestions ?? []);

            // Store both transcription and summary separately
            const summaryResponse = `## YouTube Video Summary\n\n${response.text}`;
            setTranscription(youtubeInfo.transcription || ''); // Set raw transcription for toggle
            
            await addHistory({
              title: youtubeInfo.title || "YouTube Video Summary",
              type: 'video',
              response: summaryResponse,
              transcription: youtubeInfo.transcription || '', // Store raw transcription
              videoInfo: {
                videoId: youtubeInfo.videoId || '',
                title: youtubeInfo.title || "YouTube Video",
                summary: response.text,
                transcription: youtubeInfo.transcription || '',
              },
              tags: response.tags ?? [],
              suggestedQuestions: response.suggestedQuestions ?? [],
              pageInfo: {
                title: youtubeInfo.title || "YouTube Video",
                url: window.location.href,
                favicon: "https://www.youtube.com/favicon.ico",
              },
            });
            
            setLoading(false);
            return;
          }
        } else {
          // YouTube video detected but no transcription available
          console.log('⚠️ YouTube video detected but no transcription available:', youtubeInfo.title);
          const confirmPageAnalysis = confirm(
            `YouTube video detected: "${youtubeInfo.title}"\n\nNo transcription is available for this video. Would you like to analyze the page content instead?`
          );
          
          if (confirmPageAnalysis) {
            // Continue with regular page analysis
            console.log('Proceeding with page content analysis for YouTube video');
          } else {
            setLoading(false);
            return;
          }
        }
      } else {
        console.log('❌ Not a YouTube video or no videoId detected');
      }

      // Regular page summarization
      const query = userPrompt
        ? `Based on this page:\n${pageInfo.text}\n\nUser question: ${userPrompt}`
        : pageInfo.text;

      const response = await sendQueryWithContext(query, pageInfo, {
        contextConfig: { usePageContext: true }
      });

      setOutputHtml(response.text);
      setTags(response.tags ?? []);
      setSuggested(response.suggestedQuestions ?? []);

      const summaryTitle = pageInfo.title ? `${pageInfo.title}` : "Page Summary";

      await addHistory({
        title: summaryTitle,
        type: 'summary',
        response: response.text,
        tags: response.tags ?? [],
        suggestedQuestions: response.suggestedQuestions ?? [],
        pageInfo: {
          title: pageInfo.title || "",
          url: pageInfo.url || "",
          favicon: pageInfo.favicon || "",
        },
      });

    } catch (error: any) {
      setOutputHtml(`<p class="error">Error: ${error.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  }, []);



  // Analyze a file
  const analyzeFile = useCallback(async (fileData: string, fileName?: string) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);

    try {
      const pageInfo = await getPageInfoFromTab();
      
      const response = await sendQueryWithContext(
        "Please analyze and summarize this file",
        pageInfo,
        {
          fileData,
          contextConfig: { usePageContext: false }
        }
      );

      setOutputHtml(response.text);
      setTags(response.tags ?? []);
      setSuggested(response.suggestedQuestions ?? []);

      await addHistory({
        title: fileName || "File Analysis",
        type: 'file_analysis',
        response: response.text,
        tags: response.tags ?? [],
        suggestedQuestions: response.suggestedQuestions ?? [],
        fileName,
      });

    } catch (error: any) {
      setOutputHtml(`<p class="error">Error: ${error.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Context management
  const updateContextConfig = useCallback((config: Partial<AIContextConfig>) => {
    defaultAIContextManager.updateConfig(config);
  }, []);

  const getContextConfig = useCallback(() => {
    return defaultAIContextManager.getConfig();
  }, []);

  return {
    // State
    outputHtml,
    tags,
    suggested,
    links,
    loading,
    transcription,
    
    // Actions
    sendQuery,
    summarizePage,
    analyzeFile,
    
    // Context management
    updateContextConfig,
    getContextConfig,
  };
} 