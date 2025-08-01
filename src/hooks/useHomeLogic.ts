import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useLocation } from "react-router-dom";
import { getPageInfoFromTab, type PageInfo } from "../utils/tabs";
import { sendQueryToAI, sendQueryWithContext } from "../utils/api";
import { getYouTubeVideoInfo } from "../utils/youtube";
import type { AIContextConfig, AIModelConfig, AIAction } from "../types";
import { addHistory } from "../utils/storage";
import { HistoryNavigationContext, AppActionsContext } from "../App";
import { useStreaming } from '../context/StreamingContext';
import DOMPurify from 'dompurify';
import { uploadScreenshotToFirebase, getCurrentUser } from '../services/firebase';

// Import citation extraction functions
const extractCitations = (text: string): string[] => {
  const citationRegex = /\[(\d+)\]/g;
  const matches = text.match(citationRegex);
  if (matches) {
    return [...new Set(matches)]; // Remove duplicates
  }
  return [];
};

const extractReferences = (text: string): { id: string; title: string; url: string; description?: string }[] => {
  const references: { id: string; title: string; url: string; description?: string }[] = [];
  
  // Multiple patterns to catch different reference formats
  const patterns = [
    // Pattern 1: "References:" or "Sources:" section
    /(?:references?|sources?):\s*\n([\s\S]*?)(?=\n\n|$)/i,
    // Pattern 2: Lines starting with [number] followed by content
    /\[(\d+)\]\s*([^\n]+?)(?:\s*-\s*(https?:\/\/[^\s]+))?/g,
    // Pattern 3: Lines with URLs that might be references
    /\[(\d+)\]\s*([^\n]+?)(?:\s*\(([^)]+)\))?/g,
    // Pattern 4: Simple numbered list with URLs
    /(\d+)\.\s*([^\n]+?)(?:\s*-\s*(https?:\/\/[^\s]+))?/g
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    if (pattern.global) {
      // For global patterns, find all matches
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const id = match[1];
        const title = match[2]?.trim() || '';
        const url = match[3] || '';
        
        if (title && !references.some(ref => ref.id === id)) {
          references.push({
            id,
            title,
            url,
          });
        }
      }
    } else {
      // For non-global patterns, try to match the section
      const match = text.match(pattern);
      if (match) {
        const referenceText = match[1];
        const referenceLines = referenceText.split('\n').filter(line => line.trim());
        
        referenceLines.forEach((line, index) => {
          const id = (index + 1).toString();
          const urlMatch = line.match(/https?:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : '';
          const title = line.replace(/\[?\d+\]?\s*/, '').replace(url, '').trim();
          
          if (title && !references.some(ref => ref.id === id)) {
            references.push({
              id,
              title,
              url,
            });
          }
        });
      }
    }
  }
  
  // Sort by ID to ensure proper order
  return references.sort((a, b) => parseInt(a.id) - parseInt(b.id));
};

// Add input sanitization function
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

// Process slash commands
const processSlashCommand = (query: string): { isCommand: boolean; command: string; query: string } => {
  const trimmedQuery = query.trim();
  
  // Check if query starts with forward slash
  if (!trimmedQuery.startsWith('/')) {
    return { isCommand: false, command: '', query };
  }
  
  // Parse the command
  const parts = trimmedQuery.split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ').trim();
  
  // Handle /news command
  if (command === '/news') {
    if (args) {
      // /news <location> - Get news for specific location
      return {
        isCommand: true,
        command: 'news',
        query: `Get the latest local news for ${args} and surrounding areas within 100 miles. Include breaking news, community events, and local developments.`
      };
    } else {
      // /news - Get world news headlines
      return {
        isCommand: true,
        command: 'news',
        query: `Get the latest world news and top international headlines. Include major global events, international politics, economic developments, and significant world news.`
      };
    }
  }
  
  // Handle /weather command
  if (command === '/weather') {
    if (args) {
      // /weather <location> - Get weather for specific location
      return {
        isCommand: true,
        command: 'weather',
        query: `Get the current weather report and forecast for ${args}. Include current temperature, conditions, humidity, wind speed, and a 5-day forecast.`
      };
    } else {
      // /weather - Get weather for current location (fallback)
      return {
        isCommand: true,
        command: 'weather',
        query: `Get the current weather report and forecast. Include current temperature, conditions, humidity, wind speed, and a 5-day forecast.`
      };
    }
  }
  
  // Handle /events command
  if (command === '/events') {
    if (args) {
      // /events <location> - Get events for specific location
      return {
        isCommand: true,
        command: 'events',
        query: `Get upcoming events, concerts, festivals, and activities happening in ${args}. Include dates, venues, and event details.`
      };
    } else {
      // /events - Get world events
      return {
        isCommand: true,
        command: 'events',
        query: `Get the latest and upcoming major events, festivals, concerts, and activities from around the world. Include international events, cultural festivals, and significant global happenings.`
      };
    }
  }
  
  // Not a recognized command
  return { isCommand: false, command: '', query };
};

interface LinkItem {
  title: string;
  url: string;
  description: string;
}

export function useHomeLogic() {
  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string): string => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Centralized title management function
  const generateHistoryTitle = useCallback((
    type: 'summary' | 'search' | 'question' | 'file_analysis' | 'definition' | 'news' | 'weather' | 'events' | 'video',
    query: string,
    pageTitle?: string,
    fileName?: string,
    tag?: string
  ): string => {
    switch (type) {
      case 'summary':
        return capitalizeWords(pageTitle || 'Page Summary');
      case 'search':
        return capitalizeWords(`Searching for ${query}`);
      case 'question':
        return capitalizeWords(query); // Use the question as title
      case 'file_analysis':
        return capitalizeWords(`File analysis: ${fileName || 'Unknown File'}`);
      case 'definition':
        return capitalizeWords(tag || query); // Use tag text directly
      case 'news':
        return capitalizeWords(`News: ${query}`);
      case 'weather':
        return capitalizeWords(`Weather: ${query}`);
      case 'events':
        return capitalizeWords(`Events: ${query}`);
      case 'video':
        return capitalizeWords(pageTitle || 'YouTube Video');
      default:
        return capitalizeWords(query);
    }
  }, []);

  // State management
  const nav = useContext(HistoryNavigationContext); 
  const [outputHtml, setOutputHtml] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [citations, setCitations] = useState<string[]>([]);
  const [references, setReferences] = useState<{ id: string; title: string; url: string; description?: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    text: "",
    url: "",
    title: "",
    favicon: "",
  });
  const [savedPageInfo, setSavedPageInfo] = useState<{ title: string; url: string; favicon: string } | null>(null);
  const [restoredScreenshotData, setRestoredScreenshotData] = useState<string | null>(null);
  const [firebaseScreenshotURL, setFirebaseScreenshotURL] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{
    videoId: string;
    title: string;
    summary: string;
    transcription: string;
  } | null>(null);
  const [showYouTubeConfirmation, setShowYouTubeConfirmation] = useState(false);
  const [pendingYouTubeInfo, setPendingYouTubeInfo] = useState<{
    videoId: string;
    title: string;
    transcription?: string;
  } | null>(null);

  // Get user settings for tags and suggested questions
  const getUserSettings = async () => {
    const result = await chrome.storage.local.get(['aiContextConfig']);
    const config = result.aiContextConfig || {
      showTags: true,
      showSuggestedQuestions: true,
    };
    return config;
  };

  // Load all user settings
  const loadUserSettings = async () => {
    const result = await chrome.storage.local.get(['aiContextConfig', 'aiModelConfig']);
    const contextConfig = result.aiContextConfig || {
      usePageContext: true,
      useWebSearch: false,
      contextLevel: 'standard',
      includeMetadata: true,
      includeLinks: true,
      includeImages: false,
      maxContextLength: 8000,
      customInstructions: undefined,
      showTags: true,
      showSuggestedQuestions: true,
    };
    const modelConfig = result.aiModelConfig || {
      model: result.model || 'sonar',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 4000,
      systemPrompt: undefined,
    };
    return { contextConfig, modelConfig };
  };

  // Parallel query for tags and suggested questions
  const fetchTagsAndQuestions = useCallback(async (pageContext: string) => {
    try {
      const settings = await getUserSettings();
      
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
        }, []);

  const [userSettings, setUserSettings] = useState<{
    contextConfig: AIContextConfig;
    modelConfig: AIModelConfig;
  } | null>(null);

  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [currentHistoryItemType, setCurrentHistoryItemType] = useState<string | null>(null);
  const [currentHistoryItemFileName, setCurrentHistoryItemFileName] = useState<string | null>(null);
  const [currentHistoryItemTitle, setCurrentHistoryItemTitle] = useState<string | null>(null);
  const lastProcessedIndexRef = useRef<number | null>(null);

  const { startStream, stopStream, isStreaming, streamContent, resetStream } = useStreaming();

  // Welcome is now a separate page - no longer needed here

  // Debug restoredScreenshotData changes
  useEffect(() => {
    // Debug logging removed for production
  }, [restoredScreenshotData]);

  // Fetch page metadata on mount
  useEffect(() => {
    (async () => {
      const info = await getPageInfoFromTab();
      setPageInfo(info);
    })();
  }, []);

  // Load user settings on mount
  useEffect(() => {
    (async () => {
      const settings = await loadUserSettings();
      setUserSettings(settings);
    })();
  }, []);

  // Restore from history when clicked or when nav changes
  useEffect(() => {
    // Prevent processing the same index multiple times
    if (nav?.currentIndex === lastProcessedIndexRef.current) {
      return;
    }

    // Don't restore history if we're currently loading or streaming
    if (loading || isStreaming) {
      return;
    }

    // Check if we have valid history and a valid index
    if (nav && nav.history && nav.history.length > 0 && nav.currentIndex >= 0 && nav.currentIndex < nav.history.length && nav.history[nav.currentIndex]) {
      const item = nav.history[nav.currentIndex];
      
      setTags(item.tags ?? []);
      setSuggested(item.suggestedQuestions ?? []);
      setLinks(item.links ?? []);
      setRestoredScreenshotData(item.screenshotData || null);
      setCurrentHistoryItemType(item.type);
      setCurrentHistoryItemFileName(item.fileName || null);
      setCurrentHistoryItemTitle(item.title || null); // Set the new state
      
      // Handle video type - set transcription and videoInfo
      if (item.type === 'video' && item.videoInfo) {
        setTranscription(item.transcription || null);
        setVideoInfo(item.videoInfo);
      } else {
        setTranscription(item.transcription || null);
        setVideoInfo(null);
      }
      
      // Extract citations and references from the response
      if (item.response) {
        const extractedCitations = extractCitations(item.response);
        const extractedReferences = extractReferences(item.response);
        console.log('History restore - extracted citations:', extractedCitations);
        console.log('History restore - extracted references:', extractedReferences);
        setCitations(extractedCitations);
        setReferences(extractedReferences);
      } else {
        setCitations([]);
        setReferences([]);
      }
      
      console.log('[History Restore]', { type: item.type, title: item.title });
      
      // Set search query for search results
      if (item.type === 'search' && item.title.startsWith("Search results for")) {
        const match = item.title.match(/Search results for "([^"]+)"/);
        setSearchQuery(match ? match[1] : "");
      } else if (item.type === 'definition') {
        // For definition type, use the title directly as search query
        setSearchQuery(item.title || "");
      } else {
        setSearchQuery("");
      }
      
      setSavedPageInfo(item.pageInfo ?? null);
      
      if (item.links && item.links.length > 0 && item.type === 'search') {
        setOutputHtml("");
      } else if (item.response) {
        // Show title above content for all content types
        const titleHtml = `<h2 class="history-title">${item.title}</h2>`;
        setOutputHtml(titleHtml + item.response);
      }
      
      lastProcessedIndexRef.current = nav.currentIndex;
    } else if (nav && nav.history && nav.history.length > 0 && nav.currentIndex === 0) {
      // Handle location state response - handle all content types, not just summary
      const item = nav.history[0];
      setTags(item.tags ?? []);
      setSuggested(item.suggestedQuestions ?? []);
      setLinks(item.links ?? []);
      // Show title above content for all content types
      const titleHtml = `<h2 class="history-title">${item.title}</h2>`;
      setOutputHtml(titleHtml + (item.response || ""));
      setCurrentHistoryItemType(item.type);
      setCurrentHistoryItemFileName(item.fileName || null);
      setCurrentHistoryItemTitle(item.title || null); // Set the new state
      
      // Handle video type - set transcription and videoInfo
      if (item.type === 'video' && item.videoInfo) {
        setTranscription(item.transcription || null);
        setVideoInfo(item.videoInfo);
      } else {
        setTranscription(item.transcription || null);
        setVideoInfo(null);
      }
      
      // Extract citations and references from the response
      if (item.response) {
        const extractedCitations = extractCitations(item.response);
        const extractedReferences = extractReferences(item.response);
        console.log('History restore - extracted citations:', extractedCitations);
        console.log('History restore - extracted references:', extractedReferences);
        setCitations(extractedCitations);
        setReferences(extractedReferences);
      } else {
        setCitations([]);
        setReferences([]);
      }
      
      console.log('[History Restore]', { type: item.type, title: item.title });
      setSavedPageInfo(item.pageInfo ?? null);
      lastProcessedIndexRef.current = nav?.currentIndex;
    } else {
      // Clear state if no valid history
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setCitations([]);
      setReferences([]);
      setOutputHtml("");
      setRestoredScreenshotData(null);
      setCurrentHistoryItemType(null);
      setCurrentHistoryItemFileName(null);
      setCurrentHistoryItemTitle(null); // Clear the new state
      setTranscription(null);
      setVideoInfo(null);
      setSavedPageInfo(null);
      setSearchQuery("");
    }
  }, [nav, loading, isStreaming]);

  // Summarize page handler
  const handleSummarize = useCallback(async (userPrompt?: string) => {
    console.log('🚀 handleSummarize called with userPrompt:', userPrompt);
    setRestoredScreenshotData(null); // Clear screenshot data when summarizing
    setSearchQuery("");
    setLoading(true);
    
    try {
      const info = await getPageInfoFromTab();
      setPageInfo(info);
      if (info.error) throw new Error(info.error);

      // Check for YouTube video first
      console.log('🔍 Starting YouTube detection in handleSummarize...');
      let youtubeInfo;
      try {
        youtubeInfo = await getYouTubeVideoInfo();
        console.log('🔍 YouTube detection result in handleSummarize:', youtubeInfo);
        console.log('🔍 YouTube videoId:', youtubeInfo.videoId);
        console.log('🔍 YouTube transcription:', youtubeInfo.transcription ? 'present' : 'null');
      } catch (error) {
        console.error('❌ Error in YouTube detection:', error);
        youtubeInfo = { isYouTubeVideo: false };
      }
      
      if (youtubeInfo.videoId) {
        // Show custom confirmation instead of browser confirm
        setPendingYouTubeInfo({
          videoId: youtubeInfo.videoId,
          title: youtubeInfo.title || "YouTube Video",
          transcription: youtubeInfo.transcription
        });
        setShowYouTubeConfirmation(true);
        setLoading(false);
        return;
      } else {
        console.log('❌ Not a YouTube video or no videoId detected in handleSummarize');
      }

      const query = userPrompt
        ? `Based on this page:\n${info.text}\n\nUser question: ${userPrompt}`
        : info.text;

      // Start both API calls simultaneously
      let fetchedTags: string[] = [];
      let fetchedQuestions: string[] = [];
      
      // Start the tags/questions API call immediately (for page summaries)
      let tagsPromise: Promise<{ tags: string[]; suggestedQuestions: string[] }> | null = null;
      tagsPromise = fetchTagsAndQuestions(info.text);
      
      // Use streaming for summarization
      await startStream(query, "summarize_page", null, async (streamedContent) => {
        // Convert markdown to HTML and save to outputHtml
        const md = new (await import('markdown-it')).default({
          html: true,
          linkify: true,
          typographer: true,
        });
        const htmlContent = md.render(streamedContent);
        setOutputHtml(htmlContent);
        
        // Wait for tags/questions to complete
        try {
          const result = await tagsPromise;
          if (result) {
            fetchedTags = result.tags;
            fetchedQuestions = result.suggestedQuestions;
          }
          
          setTags(fetchedTags);
          setSuggested(fetchedQuestions);
        } catch (error) {
          console.error('Error getting structured data:', error);
          // Continue without tags/questions if they fail
        }
        
        // Save page info for header display
        setSavedPageInfo({
          title: info.title || "",
          url: info.url || "",
          favicon: info.favicon || "",
        });

        const summaryTitle = generateHistoryTitle('summary', query, info.title);

        await addHistory({
          title: summaryTitle,
          type: 'summary',
          response: streamedContent,
          tags: fetchedTags,
          suggestedQuestions: fetchedQuestions,
          pageInfo: {
            title: info.title || "",
            url: info.url || "",
            favicon: info.favicon || "",
          },
        });
      }, () => {
        // Clear loading state when streaming starts
        setLoading(false);
      });
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // YouTube confirmation handlers
  const handleYouTubeConfirm = useCallback(async () => {
    if (!pendingYouTubeInfo) return;
    
    setLoading(true);
    setShowYouTubeConfirmation(false);
    setOutputHtml("");
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setCitations([]);
    setReferences([]);
    setTranscription(null);
    setVideoInfo(null);
    
    try {
      const info = await getPageInfoFromTab();
      
      if (pendingYouTubeInfo.transcription) {
        // Summarize YouTube video with transcription
        console.log('✅ Processing YouTube video with transcription:', pendingYouTubeInfo.title);
        
        const response = await sendQueryWithContext(
          `Summarize this YouTube video based on its transcription:\n\n${pendingYouTubeInfo.transcription}`,
          info,
          { contextConfig: { usePageContext: false } }
        );

        setOutputHtml(response.text);
        setTags(response.tags ?? []);
        setSuggested(response.suggestedQuestions ?? []);

        // Store both transcription and summary separately
        const summaryResponse = `## YouTube Video Summary\n\n${response.text}`;
        setTranscription(pendingYouTubeInfo.transcription); // Set raw transcription for toggle
        
        await addHistory({
          title: pendingYouTubeInfo.title || "YouTube Video Summary",
          type: 'video',
          response: summaryResponse,
          transcription: pendingYouTubeInfo.transcription, // Store raw transcription
          videoInfo: {
            videoId: pendingYouTubeInfo.videoId,
            title: pendingYouTubeInfo.title || "YouTube Video",
            summary: response.text,
            transcription: pendingYouTubeInfo.transcription,
          },
          tags: response.tags ?? [],
          suggestedQuestions: response.suggestedQuestions ?? [],
          pageInfo: {
            title: pendingYouTubeInfo.title || "YouTube Video",
            url: window.location.href,
            favicon: "https://www.youtube.com/favicon.ico",
          },
        });
      } else {
        // Analyze page content for YouTube video without transcription
        console.log('⚠️ Analyzing page content for YouTube video without transcription:', pendingYouTubeInfo.title);
        
        const query = `Based on this page:\n${info.text}\n\nAnalyze this YouTube video page content.`;
        
        // Start both API calls simultaneously
        let fetchedTags: string[] = [];
        let fetchedQuestions: string[] = [];
        
        // Start the tags/questions API call immediately
        let tagsPromise: Promise<{ tags: string[]; suggestedQuestions: string[] }> | null = null;
        tagsPromise = fetchTagsAndQuestions(info.text);
        
        let finalContent = '';
        
        // Use streaming for summarization
        await startStream(query, "summarize_page", null, async (streamedContent) => {
          finalContent = streamedContent;
          // Convert markdown to HTML and save to outputHtml
          const md = new (await import('markdown-it')).default({
            html: true,
            linkify: true,
            typographer: true,
          });
          const htmlContent = md.render(streamedContent);
          setOutputHtml(htmlContent);
          
          // Wait for tags/questions to complete
          try {
            const result = await tagsPromise;
            fetchedTags = result.tags;
            fetchedQuestions = result.suggestedQuestions;
            setTags(fetchedTags);
            setSuggested(fetchedQuestions);
          } catch (error) {
            console.error('Error fetching tags and questions:', error);
          }
        });
        
        await addHistory({
          title: generateHistoryTitle('summary', query, info.title),
          type: 'summary' as const,
          response: finalContent,
          tags: fetchedTags,
          suggestedQuestions: fetchedQuestions,
          pageInfo: {
            title: info.title,
            url: info.url,
            favicon: info.favicon,
          },
        });
      }
    } catch (error) {
      console.error('Error in handleYouTubeConfirm:', error);
    } finally {
      setLoading(false);
      setPendingYouTubeInfo(null);
    }
  }, [pendingYouTubeInfo, generateHistoryTitle]);

  const handleYouTubeCancel = useCallback(() => {
    setShowYouTubeConfirmation(false);
    setPendingYouTubeInfo(null);
    setLoading(false);
  }, []);

  // Direct question handler
  const handleSend = useCallback(async (
    query: string,
    fileData: string | null,
    usePageContext: boolean,
    fileName?: string | null
  ) => {
    if (loading || isStreaming) return;
    
    setLoading(true);
    setOutputHtml("");
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setCitations([]);
    setReferences([]);
    resetStream(); // Reset streaming content for new query
    
    try {
      const info = await getPageInfoFromTab();
      setPageInfo(info);
      if (info.error) throw new Error(info.error);

      let finalQuery = query;
      let action: AIAction = "direct_question";
      let imageData: string | null = null;
      let isNewsCommand = false; // Track if this is a news command
      let isWeatherCommand = false; // Track if this is a weather command
      let isEventsCommand = false; // Track if this is an events command

      // Check for slash commands
      const commandResult = processSlashCommand(query);
      if (commandResult.isCommand) {
        finalQuery = commandResult.query;
        isNewsCommand = commandResult.command === 'news';
        isWeatherCommand = commandResult.command === 'weather';
        isEventsCommand = commandResult.command === 'events';
        console.log('Detected slash command:', commandResult.command, 'with query:', finalQuery);
      }

      // Handle file uploads
      if (fileData) {
        imageData = fileData;
        action = fileData.startsWith('data:image/') ? "direct_question" : "summarize_file";
        
        // Upload screenshot to Firebase if it's an image
        if (fileData.startsWith('data:image/')) {
          try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              const downloadURL = await uploadScreenshotToFirebase(currentUser.uid, fileData, query);
              setFirebaseScreenshotURL(downloadURL);
              console.log('Screenshot uploaded to Firebase:', downloadURL);
            }
          } catch (error) {
            console.error('Failed to upload screenshot to Firebase:', error);
            // Continue with local screenshot if Firebase upload fails
          }
        }
        
        let queryToSend = "";
        if (fileData.startsWith('data:image/')) {
          // For images, use the user's query directly
          queryToSend = query.trim() || "Please analyze this image";
        } else {
          // For text files, combine the user's query with file analysis request
          if (query.trim()) {
            queryToSend = `Analyze this file and answer: ${query.trim()}`;
          } else {
            queryToSend = "Please analyze and summarize this file";
          }
        }
        finalQuery = queryToSend;
      } else {
        // Handle regular queries
        if (usePageContext && !imageData) {
          const sanitizedQuery = sanitizeInput(query);
          finalQuery = `Based on this page:\n${info.text}\n\nUser question: ${sanitizedQuery}`;
        } else if (userSettings?.contextConfig?.useWebSearch) {
          // Disable page context when web search is active
          const sanitizedQuery = sanitizeInput(query);
          finalQuery = `Search the web for: ${sanitizedQuery}`;
          action = "get_links";
          
          // Use streaming for web search
          await startStream(finalQuery, action, imageData, async (streamedContent) => {
            // Convert markdown to HTML
            const md = new (await import('markdown-it')).default({
              html: true,
              linkify: true,
              typographer: true,
            });
            const htmlContent = md.render(streamedContent);
            
            setOutputHtml(htmlContent);
            
            // Save to history
            await addHistory({
              title: generateHistoryTitle('search', sanitizedQuery),
              type: 'search',
              response: streamedContent,
              tags: [],
              suggestedQuestions: [],
              links: [],
            });
          }, () => {
            setLoading(false);
          });
          
          setLoading(false);
          return; // Exit early since we handled the web search with streaming
        } else if (imageData) {
          finalQuery = sanitizeInput(query);
        } else {
          // General question - use the query directly
          finalQuery = sanitizeInput(query);
        }
      }
      
      // Display title for general questions before streaming starts
      const isPageSpecific = userSettings?.contextConfig?.usePageContext && !imageData && !userSettings?.contextConfig?.useWebSearch;
      if (!isPageSpecific && !imageData) {
        // For general questions, show the question as title immediately
        setOutputHtml(`<h2 class="question-title">${query}</h2>`);
      }
      
      // Start both API calls simultaneously
      let fetchedTags: string[] = [];
      let fetchedQuestions: string[] = [];
      
      // Start the tags/questions API call immediately (for non-screenshots)
      let tagsPromise: Promise<{ tags: string[]; suggestedQuestions: string[] }> | null = null;
      if (!imageData || !imageData.startsWith('data:image/')) {
        // Only fetch tags/questions for page-specific queries
        const isPageSpecific = userSettings?.contextConfig?.usePageContext && !imageData && !userSettings?.contextConfig?.useWebSearch;
        if (isPageSpecific) {
          // Use page content for page-specific queries
          console.log('Generating tags/questions from page content');
          tagsPromise = fetchTagsAndQuestions(info.text);
        } else {
          // Use the question itself for general queries
          console.log('Generating tags/questions from user question:', query);
          tagsPromise = fetchTagsAndQuestions(query);
        }
      }
      
      // Use streaming for main response
      await startStream(finalQuery, action, imageData, async (streamedContent) => {
        // Convert markdown to HTML and save to outputHtml
        const md = new (await import('markdown-it')).default({
          html: true,
          linkify: true,
          typographer: true,
        });
        const htmlContent = md.render(streamedContent);
        
        // For general questions, show title above content
        if (!isPageSpecific && !imageData) {
          setOutputHtml(`<h2 class="question-title">${query}</h2><div class="question-content">${htmlContent}</div>`);
        } else {
          setOutputHtml(htmlContent);
        }
        
        // Wait for tags/questions to complete (if they were started)
        if (tagsPromise) {
          try {
            const result = await tagsPromise;
            fetchedTags = result.tags;
            fetchedQuestions = result.suggestedQuestions;
            
            setTags(fetchedTags);
            setSuggested(fetchedQuestions);
          } catch (error) {
            console.error('Error getting structured data:', error);
            // Continue without tags/questions if they fail
          }
        } else {
          // For screenshots, don't fetch tags/questions
          setTags([]);
          setSuggested([]);
        }
        
        // Get citations and references from the streamed content
        try {
          const extractedCitations = extractCitations(streamedContent);
          const extractedReferences = extractReferences(streamedContent);
          console.log('Extracted citations:', extractedCitations);
          console.log('Extracted references:', extractedReferences);
          setCitations(extractedCitations);
          setReferences(extractedReferences);
        } catch (error) {
          console.error('Error extracting citations and references:', error);
        }
        
        // Save to history with structured data
        setTimeout(async () => {
          console.log('About to save to history with query:', query);
          // Only include page info if this is a page-specific query
          const isPageSpecific = userSettings?.contextConfig?.usePageContext && !imageData && !userSettings?.contextConfig?.useWebSearch;
          console.log('Is page specific:', isPageSpecific);
          
          // Determine type and title based on content type
          let type: 'summary' | 'search' | 'question' | 'file_analysis' | 'definition' | 'news' | 'weather' | 'events' = 'question';
          let title = '';
          
          if (imageData) {
            type = 'question';
            title = generateHistoryTitle('question', query, info.title);
          } else if (fileName) {
            type = 'file_analysis';
            title = generateHistoryTitle('file_analysis', query, undefined, fileName);
          } else if (isNewsCommand) {
            type = 'news';
            title = generateHistoryTitle('news', query);
          } else if (isWeatherCommand) {
            type = 'weather';
            title = generateHistoryTitle('weather', query);
          } else if (isEventsCommand) {
            type = 'events';
            title = generateHistoryTitle('events', query);
          } else if (userSettings?.contextConfig?.useWebSearch) {
            type = 'search';
            title = generateHistoryTitle('search', query);
          } else {
            type = 'question';
            title = generateHistoryTitle('question', query, isPageSpecific ? info.title : undefined);
          }
          
          const historyItem: any = {
            title: title,
            type: type,
            response: streamedContent,
            tags: fetchedTags,
            suggestedQuestions: fetchedQuestions,
          };
          
          // Only add pageInfo if it's a page-specific query
          if (isPageSpecific) {
            historyItem.pageInfo = {
              title: info.title || "",
              url: info.url || "",
              favicon: info.favicon || "",
            };
          }
          
          await addHistory(historyItem);
          console.log('History saved successfully');
        }, 1000); // Delay history saving by 1 second
      }, () => {
        // Clear loading state when streaming starts
        setLoading(false);
      });
      
      // Save page info for header display if this is a context-based question
      if (userSettings?.contextConfig?.usePageContext && !imageData) {
        setSavedPageInfo({
          title: info.title || "",
          url: info.url || "",
          favicon: info.favicon || "",
        });
      } else {
        // Clear page info for general questions
        setSavedPageInfo(null);
      }

      setScreenshotData(null);
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  }, [screenshotData, startStream]);

  // Tag click handler
  const handleTagClick = useCallback(async (tag: string) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setRestoredScreenshotData(null);
    setSearchQuery(tag);
    
    try {
      // Use streaming for tag search results
      await startStream(tag, "get_links", null, async (streamedContent) => {
        // Convert markdown to HTML
        const md = new (await import('markdown-it')).default({
          html: true,
          linkify: true,
          typographer: true,
        });
        const htmlContent = md.render(streamedContent);
        
        setOutputHtml(htmlContent);
        
        // Save to history
        await addHistory({
          title: generateHistoryTitle('definition', tag, undefined, undefined, tag),
          type: 'definition',
          response: streamedContent,
          tags: [],
          suggestedQuestions: [],
          links: [],
        });
      }, () => {
        setLoading(false);
      });
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
      setLoading(false);
    }
  }, [startStream]);

  // Suggested question click handler
  const handleSuggestedClick = useCallback(async (question: string) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setRestoredScreenshotData(null);
    setSearchQuery("");
    
    try {
      // Use the question as the title and send it as a direct question
      const info = await getPageInfoFromTab();
      setPageInfo(info);
      if (info.error) throw new Error(info.error);

      // Use streaming for the suggested question
      await startStream(question, "direct_question", null, async (streamedContent) => {
        // Convert markdown to HTML
        const md = new (await import('markdown-it')).default({
          html: true,
          linkify: true,
          typographer: true,
        });
        const htmlContent = md.render(streamedContent);
        
        // Show the question as title above content
        setOutputHtml(`<h2 class="question-title">${question}</h2><div class="question-content">${htmlContent}</div>`);
        
        // Save to history
        await addHistory({
          title: generateHistoryTitle('question', question),
          type: 'question',
          response: streamedContent,
          tags: [],
          suggestedQuestions: [],
          links: [],
        });
      }, () => {
        setLoading(false);
      });
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
      setLoading(false);
    }
  }, [startStream]);

  // Screenshot capture handler
  const handleScreenshotCapture = useCallback((imageData: string) => {
    setScreenshotData(imageData);
    setOutputHtml(`
      <div class="screenshot-preview">
        <h3><i class="fas fa-camera"></i> Screenshot Captured</h3>
        <p>You can now ask questions about this image. Type your question in the prompt below and click send.</p>
        <img src="${imageData}" alt="Screenshot" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
      </div>
    `);
    setTags([]);
    setSuggested([]);
    setLinks([]);
  }, []);

  // Clear content handler
  const handleClearContent = useCallback(() => {
    setOutputHtml("");
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setScreenshotData(null);
    setSearchQuery("");
    setSavedPageInfo(null);
  }, []);

  // Helper to determine if we should show the page header
  const shouldShowPageHeader = useCallback(() => {
    // Page header disabled - titles are now shown in content area
    return false;
  }, []);

  // Helper to determine if we should show link list
  const shouldShowLinkList = useCallback(() => {
    // Show link list whenever we have links (for search results)
    return links.length > 0;
  }, [links.length]);



  // Setter functions for context and web search
  const setUsePageContext = useCallback(async (value: boolean) => {
    try {
      const currentConfig = userSettings?.contextConfig || {
        usePageContext: true,
        useWebSearch: false,
        contextLevel: 'standard',
        includeMetadata: true,
        includeLinks: true,
        includeImages: false,
        maxContextLength: 8000,
        customInstructions: undefined,
        showTags: true,
        showSuggestedQuestions: true,
      };
      
      const newContextConfig = {
        ...currentConfig,
        usePageContext: value
      };
      
      await chrome.storage.local.set({
        aiContextConfig: newContextConfig
      });
      
      // Update local state
      setUserSettings(prev => prev ? {
        ...prev,
        contextConfig: newContextConfig
      } : null);
    } catch (error) {
      console.error('Error updating page context setting:', error);
    }
  }, [userSettings?.contextConfig]);

  const setUseWebSearch = useCallback(async (value: boolean) => {
    try {
      const currentConfig = userSettings?.contextConfig || {
        usePageContext: true,
        useWebSearch: false,
        contextLevel: 'standard',
        includeMetadata: true,
        includeLinks: true,
        includeImages: false,
        maxContextLength: 8000,
        customInstructions: undefined,
        showTags: true,
        showSuggestedQuestions: true,
      };
      
      const newContextConfig = {
        ...currentConfig,
        useWebSearch: value
      };
      
      await chrome.storage.local.set({
        aiContextConfig: newContextConfig
      });
      
      // Update local state
      setUserSettings(prev => prev ? {
        ...prev,
        contextConfig: newContextConfig
      } : null);
    } catch (error) {
      console.error('Error updating web search setting:', error);
    }
  }, [userSettings?.contextConfig]);

  return {
    outputHtml,
    tags,
    suggested,
    links,
    searchQuery,
    restoredScreenshotData,
    firebaseScreenshotURL,
    currentHistoryItemType,
    currentHistoryItemFileName,
    loading,
    transcription,
    videoInfo,
    handleSend,
    handleSummarize,
    handleTagClick,
    handleSuggestedClick,
    handleScreenshotCapture,
    handleClearContent,
    shouldShowLinkList: () => !loading && links.length > 0 && !isStreaming,
    usePageContext: userSettings?.contextConfig?.usePageContext ?? true,
    setUsePageContext,
    useWebSearch: userSettings?.contextConfig?.useWebSearch ?? false,
    setUseWebSearch,
    userSettings, // Add user settings to return object
    showYouTubeConfirmation,
    pendingYouTubeInfo,
    handleYouTubeConfirm,
    handleYouTubeCancel,
  };
} 