import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useLocation } from "react-router-dom";
import { getPageInfoFromTab, type PageInfo } from "../utils/tabs";
import { sendQueryToAI } from "../utils/api";
import type { AIResponse, AIContextConfig, AIModelConfig, AIAction } from "../types";
import { addHistory } from "../utils/storage";
import { processImagesWithBase64 } from "../utils/imageUtils";
import { HistoryNavigationContext, AppActionsContext } from "../App";
import { getYouTubeVideoInfo, YouTubeVideoInfo } from "../utils/youtube";
import { useStreaming } from '../context/StreamingContext';
import DOMPurify from 'dompurify';

// Add input sanitization function
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

interface LinkItem {
  title: string;
  url: string;
  description: string;
}

export function useHomeLogic() {
  const location = useLocation();
  const nav = useContext(HistoryNavigationContext);
  const actions = useContext(AppActionsContext);
  
  const [outputHtml, setOutputHtml] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);

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
  const lastProcessedIndexRef = useRef<number | null>(null);

  const { startStream, stopStream, isStreaming, streamContent, resetStream } = useStreaming();

  // Simple logic: show welcome only when there's no content
  const showWelcome = !outputHtml && !isStreaming && streamContent === '' && tags.length === 0 && suggested.length === 0 && links.length === 0;

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
      
      console.log('Restoring history item:', item.title, 'at index:', nav.currentIndex);
      
      setTags(item.tags ?? []);
      setSuggested(item.suggestedQuestions ?? []);
      setLinks(item.links ?? []);
      setRestoredScreenshotData(item.screenshotData || null);
      setCurrentHistoryItemType(item.type);
      setCurrentHistoryItemFileName(item.fileName || null);
      
      // Set search query for search results
      if (item.type === 'search' && item.title.startsWith("Search results for")) {
        const match = item.title.match(/Search results for "([^"]+)"/);
        setSearchQuery(match ? match[1] : "");
      } else {
        setSearchQuery("");
      }
      
      setSavedPageInfo(item.pageInfo ?? null);
      
      if (item.links && item.links.length > 0 && item.type === 'search') {
        setOutputHtml("");
      } else if (item.response) {
        setOutputHtml(item.response);
      }
      
      lastProcessedIndexRef.current = nav.currentIndex;
    } else if (nav && nav.history && nav.history.length > 0 && nav.currentIndex === 0) {
      // Handle location state response
      const item = nav.history[0];
      if (item.type === 'summary') {
        setTags(item.tags ?? []);
        setSuggested(item.suggestedQuestions ?? []);
        setLinks(item.links ?? []);
        setOutputHtml(item.response || "");
        setCurrentHistoryItemType(item.type);
        setCurrentHistoryItemFileName(item.fileName || null);
        setSavedPageInfo(item.pageInfo ?? null);
        lastProcessedIndexRef.current = nav?.currentIndex;
      }
    } else {
      // Clear state if no valid history
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setOutputHtml("");
      setRestoredScreenshotData(null);
      setCurrentHistoryItemType(null);
      setCurrentHistoryItemFileName(null);
      setSavedPageInfo(null);
      setSearchQuery("");
    }
  }, [nav, loading, isStreaming]);

  // Summarize page handler
  const handleSummarize = useCallback(async (userPrompt?: string) => {
    setRestoredScreenshotData(null); // Clear screenshot data when summarizing
    setSearchQuery("");
    setLoading(true);
    
    try {
      const info = await getPageInfoFromTab();
      setPageInfo(info);
      if (info.error) throw new Error(info.error);

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

        const historyTitle = userPrompt ? userPrompt : (info.title || "Page Summary");
        const summaryTitle = info.title ? `${info.title}` : "Page Summary";

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

  // Direct question handler
  const handleSend = useCallback(async (
    query: string,
    fileData: string | null,
    _useContext: boolean,
    _useWebSearch: boolean,
    fileName?: string | null
  ) => {
    if (loading || isStreaming) return;
    
    setLoading(true);
    setOutputHtml("");
    setTags([]);
    setSuggested([]);
    setLinks([]);
    resetStream(); // Reset streaming content for new query
    
    try {
      const info = await getPageInfoFromTab();
      setPageInfo(info);
      if (info.error) throw new Error(info.error);

      let finalQuery = query;
      let action: AIAction = "direct_question";
      let imageData: string | null = null;

      // Handle file uploads
      if (fileData) {
        imageData = fileData;
        action = fileData.startsWith('data:image/') ? "direct_question" : "summarize_file";
        
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
        if (userSettings?.contextConfig?.usePageContext && !imageData) {
          const sanitizedQuery = sanitizeInput(query);
          finalQuery = `Based on this page:\n${info.text}\n\nUser question: ${sanitizedQuery}`;
        } else if (userSettings?.contextConfig?.useWebSearch) {
          // Disable page context when web search is active
          const sanitizedQuery = sanitizeInput(query);
          finalQuery = `Search the web for: ${sanitizedQuery}`;
          action = "get_links";
          
          // Handle web search separately
          try {
            const res: AIResponse = await sendQueryToAI({
              query: sanitizedQuery,
              action: "get_links",
            });
            const linksArr = res.links?.slice(0, 15) ?? [];
            setLinks(linksArr);
            setOutputHtml(`<div class="search-results"><h3>Web Search Results for: "${sanitizedQuery}"</h3><p>Found ${linksArr.length} results. You can now ask follow-up questions about these results.</p></div>`);
          } catch (error) {
            setOutputHtml(`<p class="error">Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}</p>`);
          }
          
          setLoading(false);
          return; // Exit early since we handled the web search separately
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
        
        // For general questions, append to the existing title
        if (!isPageSpecific && !imageData) {
          setOutputHtml(`<h2 class="question-title">${query}</h2>${htmlContent}`);
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
        
        // Save to history with structured data
        setTimeout(async () => {
          console.log('About to save to history with query:', query);
          // Only include page info if this is a page-specific query
          const isPageSpecific = userSettings?.contextConfig?.usePageContext && !imageData && !userSettings?.contextConfig?.useWebSearch;
          console.log('Is page specific:', isPageSpecific);
          
          const historyItem: any = {
            title: query,
            type: 'question',
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
      const res: AIResponse = await sendQueryToAI({
        query: tag,
        action: "get_links",
      });
      const linksArr = res.links?.slice(0, 10) ?? [];
      setLinks(linksArr);
      
      // Don't set output HTML when we have links - let LinkList handle the display
      if (linksArr.length === 0) {
        setOutputHtml(`<p>No results found for "${tag}".</p>`);
      } else {
        setOutputHtml(''); // Clear output HTML since LinkList will show the results
      }

      await addHistory({
        title: `Search results for "${tag}"`,
        type: 'search',
        response: linksArr.length > 0 ? `Found ${linksArr.length} results for "${tag}":` : `No results found for "${tag}".`,
        tags: [],
        suggestedQuestions: [],
        links: linksArr,
      });
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Suggested question click handler
  const handleSuggestedClick = useCallback(async (question: string) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setRestoredScreenshotData(null);
    setSearchQuery("");
    
    try {
      await handleSummarize(question);
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
    } finally {
      setLoading(false);
    }
  }, [handleSummarize]);

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
    // Don't show header for search results
    if (links.length > 0 && (nav?.currentIndex !== null && nav?.history[nav.currentIndex]?.title?.startsWith("Search results for") ||
      (location.state as any)?.title?.startsWith("Search results for"))) {
      return false;
    }
    
    // Don't show header if we have no page info
    if (!savedPageInfo && !pageInfo.title) {
      return false;
    }
    
    // Only show header for summaries or when we have saved page info from a summary
    // Check if this is a summary response (has tags and suggested questions)
    const isSummaryResponse = tags.length > 0 || suggested.length > 0;
    
    // Show header if we have page info AND this is either:
    // 1. A summary response (has tags/suggested)
    // 2. We have saved page info (from a previous summary)
    return isSummaryResponse || !!savedPageInfo;
  }, [links.length, nav, location.state, savedPageInfo, pageInfo.title, tags.length, suggested.length]);

  // Helper to determine if we should show link list
  const shouldShowLinkList = useCallback(() => {
    // Show link list whenever we have links (for search results)
    return links.length > 0;
  }, [links.length]);



  // Send news query function
  const sendNewsQuery = useCallback(async (query: string) => {
    setLoading(true);
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setRestoredScreenshotData(null);
    setSearchQuery("");
    
    try {
      // Check if this is a location form
      if (query.startsWith('LOCATION_FORM:')) {
        const parts = query.split(':');
        const option = parts[1];
        const formHTML = parts.slice(2).join(':');
        
        // Show the location form
        setOutputHtml(formHTML);
        setTags([]);
        setSuggested([]);
        setLinks([]);
        setRestoredScreenshotData(null); // Clear screenshot data
        setSearchQuery("");
        setLoading(false);
        
        // Add event listeners after a short delay to ensure DOM is ready
        setTimeout(() => {
          addLocationFormListeners(option);
        }, 100);
        
        return;
      }
      
      // Check if this is a loading message with query
      if (query.startsWith('LOADING:')) {
        const parts = query.split(':');
        const loadingMessage = parts[1];
        const actualQuery = parts.slice(2).join(':');
        
        setTags([]);
        setSuggested([]);
        setLinks([]);
        setRestoredScreenshotData(null); // Clear screenshot data
        setSearchQuery("");
        setLoading(true);
        
        // Send the actual query to AI
        setTimeout(() => {
          handleSend(actualQuery, null, false, false);
        }, 100);
        
        return;
      }
      
      // Regular query (for world news)
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setRestoredScreenshotData(null); // Clear screenshot data
      setSearchQuery("");
      setLoading(true);
      
      // Send the query to AI
      handleSend(query, null, false, false);
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  }, [handleSend]);

  // Add event listeners for location form
  const addLocationFormListeners = (option: string) => {
    // Handle saved location buttons
    const locationButtons = document.querySelectorAll('.location-btn[data-city]');
    locationButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const city = target.getAttribute('data-city');
        const country = target.getAttribute('data-country');
        
        if (city && country) {
          // Save location and build query
          saveLocation(city, country);
          buildAndSendQuery(option, city, country);
        }
      });
    });
    
    // Handle use current location button
    const useCurrentBtn = document.getElementById('useCurrentLocation');
    if (useCurrentBtn) {
      useCurrentBtn.addEventListener('click', async () => {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            });
          });
          
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await response.json();
          const addressParts = data.display_name.split(', ');
          const city = addressParts[0];
          const country = addressParts[addressParts.length - 1];
          
          saveLocation(city, country);
          buildAndSendQuery(option, city, country);
        } catch (error) {
          console.log('Could not get current location');
        }
      });
    }
    
    // Handle submit button
    const submitBtn = document.getElementById('submitLocation');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const cityInput = document.getElementById('cityInput') as HTMLInputElement;
        const countryInput = document.getElementById('countryInput') as HTMLInputElement;
        
        const city = cityInput?.value?.trim();
        const country = countryInput?.value?.trim();
        
        if (city && country) {
          saveLocation(city, country);
          buildAndSendQuery(option, city, country);
        } else {
          alert('Please enter both city and country');
        }
      });
    }
  };

  // Helper functions for location management
  const saveLocation = (city: string, country: string) => {
    const savedLocations = JSON.parse(localStorage.getItem('savedLocations') || '[]');
    const newLocation = { city, country, timestamp: Date.now() };
    
    // Check if location already exists
    const exists = savedLocations.find((loc: any) => 
      loc.city.toLowerCase() === city.toLowerCase() && 
      loc.country.toLowerCase() === country.toLowerCase()
    );
    
    if (!exists) {
      savedLocations.push(newLocation);
      // Keep only last 10 locations
      if (savedLocations.length > 10) {
        savedLocations.shift();
      }
      localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
    }
  };

  const buildAndSendQuery = (option: string, location: string, country: string) => {
    let query = '';
    let loadingMessage = '';
    
    // Build query based on option and location
    switch (option) {
      case 'local':
        if (location && country) {
          query = `Get the latest local news for ${location}, ${country} and surrounding areas within 100 miles. Include breaking news, community events, and local developments.`;
          loadingMessage = `Getting local news for ${location}, ${country}...`;
        } else if (location) {
          query = `Get the latest local news for ${location} and surrounding areas within 100 miles. Include breaking news, community events, and local developments.`;
          loadingMessage = `Getting local news for ${location}...`;
        } else {
          query = `Get the latest local news for my current area and surrounding regions within 100 miles. Include breaking news, community events, and local developments.`;
          loadingMessage = 'Getting local news for your area...';
        }
        break;
      case 'national':
        if (country) {
          query = `Get the latest national news from ${country}. Include top headlines, major political developments, economic news, and significant national events.`;
          loadingMessage = `Getting national news from ${country}...`;
        } else {
          query = `Get the latest national news from across the country. Include top headlines, major political developments, economic news, and significant national events.`;
          loadingMessage = 'Getting national news...';
        }
        break;
      case 'world':
        query = `Get the latest world news and top international headlines. Include major global events, international politics, economic developments, and significant world news.`;
        loadingMessage = 'Getting world news...';
        break;
      case 'events':
        if (location && country) {
          query = `Get upcoming events, concerts, festivals, and activities happening in ${location}, ${country} and within 100 miles. Include dates, venues, and event details.`;
          loadingMessage = `Getting events near ${location}, ${country}...`;
        } else if (location) {
          query = `Get upcoming events, concerts, festivals, and activities happening in ${location} and within 100 miles. Include dates, venues, and event details.`;
          loadingMessage = `Getting events near ${location}...`;
        } else {
          query = `Get upcoming events, concerts, festivals, and activities happening in my area within 100 miles. Include dates, venues, and event details.`;
          loadingMessage = 'Getting events in your area...';
        }
        break;
      case 'weather':
        if (location && country) {
          query = `Get the current weather forecast for ${location}, ${country}. Include current conditions, temperature, humidity, wind speed, and a 5-day forecast. Also provide weather alerts if any.`;
          loadingMessage = `Getting weather for ${location}, ${country}...`;
        } else if (location) {
          query = `Get the current weather forecast for ${location}. Include current conditions, temperature, humidity, wind speed, and a 5-day forecast. Also provide weather alerts if any.`;
          loadingMessage = `Getting weather for ${location}...`;
        } else {
          query = `Get the current weather forecast for my current location. Include current conditions, temperature, humidity, wind speed, and a 5-day forecast. Also provide weather alerts if any.`;
          loadingMessage = 'Getting weather for your location...';
        }
        break;
    }
    
    // Send the query to AI
    if (query) {
      console.log('Sending query:', query);
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setSearchQuery("");
      setLoading(true);
      handleSend(query, null, false, false);
    }
  };

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
    pageInfo,
    savedPageInfo,
    restoredScreenshotData,
    currentHistoryItemType,
    currentHistoryItemFileName,
    loading,
    isStreaming,
    streamContent,
    stopStream,
    resetStream,
    handleSend,
    handleSummarize,
    handleTagClick,
    handleSuggestedClick,
    handleScreenshotCapture,
    screenshotData,
    showWelcome,
    handleClearContent,
    shouldShowPageHeader: () => !loading && savedPageInfo && !isStreaming,
    shouldShowLinkList: () => !loading && links.length > 0 && !isStreaming,
    sendNewsQuery,
    usePageContext: userSettings?.contextConfig?.usePageContext ?? true,
    setUsePageContext,
    useWebSearch: userSettings?.contextConfig?.useWebSearch ?? false,
    setUseWebSearch,
  };
} 