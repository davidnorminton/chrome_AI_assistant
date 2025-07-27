import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useLocation } from "react-router-dom";
import { getPageInfoFromTab, type PageInfo } from "../utils/tabs";
import { sendQueryToAI } from "../utils/api";
import type { AIResponse } from "../types";
import { addHistory } from "../utils/storage";
import { processImagesWithBase64 } from "../utils/imageUtils";
import { HistoryNavigationContext, AppActionsContext } from "../App";
import { getYouTubeVideoInfo, YouTubeVideoInfo } from "../utils/youtube";
import { useStreaming } from '../context/StreamingContext';

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
  const [usePageContext, setUsePageContext] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [restoredScreenshotData, setRestoredScreenshotData] = useState<string | null>(null);
  const [currentHistoryItemType, setCurrentHistoryItemType] = useState<string | null>(null);
  const [currentHistoryItemFileName, setCurrentHistoryItemFileName] = useState<string | null>(null);
  const lastProcessedIndexRef = useRef<number | null>(null);

  const { startStream, stopStream, isStreaming, streamContent, resetStream } = useStreaming();

  // Simple logic: show welcome only when there's no content
  const showWelcome = !outputHtml && !isStreaming && streamContent === '' && tags.length === 0 && suggested.length === 0 && links.length === 0;

  // Debug restoredScreenshotData changes
  useEffect(() => {
    console.log('restoredScreenshotData changed to:', restoredScreenshotData ? 'has data' : 'null/undefined');
  }, [restoredScreenshotData]);

  // Fetch page metadata on mount
  useEffect(() => {
    (async () => {
      const info = await getPageInfoFromTab();
      setPageInfo(info);
    })();
  }, []);

  // Restore from history when clicked or when nav changes
  useEffect(() => {
    console.log('=== HISTORY NAVIGATION EFFECT ===');
    console.log('nav?.currentIndex:', nav?.currentIndex);
    console.log('lastProcessedIndexRef.current:', lastProcessedIndexRef.current);
    console.log('nav?.history?.length:', nav?.history?.length);
    
    // Prevent processing the same index multiple times
    if (nav?.currentIndex === lastProcessedIndexRef.current) {
      console.log('Skipping - same index already processed');
      return;
    }

    // Don't restore history if we're currently loading or streaming
    if (loading || isStreaming) {
      console.log('Skipping - currently loading or streaming');
      return;
    }

    // Check if we have valid history and a valid index
    if (nav && nav.history && nav.history.length > 0 && nav.currentIndex >= 0 && nav.currentIndex < nav.history.length && nav.history[nav.currentIndex]) {
      console.log('Processing valid history item at index:', nav.currentIndex);
      const item = nav.history[nav.currentIndex];
      console.log('=== HISTORY RESTORATION ===');
      console.log('Item type:', item.type);
      console.log('Item title:', item.title);
      console.log('Item links:', item.links);
      console.log('Item screenshotData:', item.screenshotData ? 'present' : 'not present');
      console.log('Setting restoredScreenshotData to:', item.screenshotData ? 'screenshot data' : 'null');
      
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
      console.log('Display logic - item.links:', item.links?.length);
      console.log('Display logic - item.type:', item.type);
      
      if (item.links && item.links.length > 0 && item.type === 'search') {
        console.log('Setting output HTML to empty for search results');
        setOutputHtml("");
      } else {
        console.log('Setting output HTML to response:', item.response);
        setTimeout(() => {
          setOutputHtml(item.response);
        }, 100);
      }
      lastProcessedIndexRef.current = nav.currentIndex;
      console.log('Set lastProcessedIndexRef to:', nav.currentIndex);
      if (location.state) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else if (location.state && (location.state as any).response) {
      console.log('Processing location state response');
      const state = location.state as {
        response?: string;
        tags?: string[];
        suggestedQuestions?: string[];
        links?: LinkItem[];
        title?: string;
        pageInfo?: { title: string; url: string; favicon: string };
      };
      setTags(state.tags ?? []);
      setSuggested(state.suggestedQuestions ?? []);
      setLinks(state.links ?? []);
      setRestoredScreenshotData(null); // No screenshot data in location state
      
      // Set search query for search results
      if (state.title?.startsWith("Search results for")) {
        const match = state.title.match(/Search results for "([^"]+)"/);
        setSearchQuery(match ? match[1] : "");
      } else {
        setSearchQuery("");
      }
      
      setSavedPageInfo(state.pageInfo ?? null);
      if (state.links && state.links.length > 0 && state.title?.startsWith("Search results for")) {
        setOutputHtml("");
      } else {
        setOutputHtml(state.response!);
      }
      window.history.replaceState(null, '', window.location.pathname);
      lastProcessedIndexRef.current = nav?.currentIndex ?? null;
      console.log('Set lastProcessedIndexRef to (location state):', nav?.currentIndex);
    } else if (!nav || !nav.history || nav.history.length === 0 || !nav.initialized) {
      console.log('Clearing state - no valid history');
      setOutputHtml("");
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setRestoredScreenshotData(null);
      setCurrentHistoryItemType(null);
      setCurrentHistoryItemFileName(null);

      setSearchQuery("");
      setSavedPageInfo(null);
      lastProcessedIndexRef.current = null;
    } else if (nav && nav.history && nav.history.length > 0 && nav.initialized) {
      console.log('Processing first history item (fallback)');
      const item = nav.history[0];
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
      } else {
        setTimeout(() => {
          setOutputHtml(item.response);
        }, 100);
      }
      lastProcessedIndexRef.current = 0;
      console.log('Set lastProcessedIndexRef to 0 (fallback)');
    }
  }, [location.state, nav?.currentIndex, nav?.history, nav?.initialized, loading, isStreaming]);

  // Summarize handler
  const handleSummarize = useCallback(async (userPrompt?: string, customLoadingMessage?: string) => {
    // Check if we're on a YouTube video page
    const youtubeInfo = await getYouTubeVideoInfo();
    
    if (youtubeInfo.isYouTubeVideo && !userPrompt) {
      // Show confirmation dialog for YouTube video summarization
      const confirmSummarize = confirm(
        `Would you like to summarize this YouTube video?\n\n"${youtubeInfo.title}"\n\nThis will use the video's transcription for summarization.`
      );
      
      if (!confirmSummarize) {
        return;
      }
      
      // Use transcription for YouTube video summarization
      if (youtubeInfo.transcription) {
        console.log('Using video transcription for analysis');
        setLoading(true);
        setTags([]);
        setSuggested([]);
        setLinks([]);
        setRestoredScreenshotData(null);
        setSearchQuery("");
        
        try {
          const res: AIResponse = await sendQueryToAI({
            query: `Summarize this YouTube video based on its transcription:\n\n${youtubeInfo.transcription}`,
            action: "summarize_page",
          });

          setOutputHtml(res.text);
          setTags(res.tags ?? []);
          setSuggested(res.suggestedQuestions ?? []);

          // Save page info for header display
          setSavedPageInfo({
            title: youtubeInfo.title || "YouTube Video",
            url: window.location.href,
            favicon: "https://www.youtube.com/favicon.ico",
          });

          await addHistory({
            title: youtubeInfo.title || "YouTube Video Summary",
            type: 'summary',
            response: res.text,
            tags: res.tags ?? [],
            suggestedQuestions: res.suggestedQuestions ?? [],
            pageInfo: {
              title: youtubeInfo.title || "YouTube Video",
              url: window.location.href,
              favicon: "https://www.youtube.com/favicon.ico",
            },
          });
        } catch (e: any) {
          setOutputHtml(`<p class="error">Error summarizing video: ${e.message}</p>`);
          setTags([]);
          setSuggested([]);
        } finally {
          setLoading(false);
        }
        return;
      } else {
        // No transcription available, fall back to regular page summarization
        setOutputHtml(`<p class="error">No transcription available for this video. Summarizing the page content instead.</p>`);
      }
    }

    // Regular page summarization (for non-YouTube pages or when transcription is not available)
    setTags([]);
    setSuggested([]);
    setLinks([]);
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

      const res: AIResponse = await sendQueryToAI({
        query,
        action: "summarize_page",
      });

      setOutputHtml(res.text);
      setTags(res.tags ?? []);
      setSuggested(res.suggestedQuestions ?? []);

      // Save page info for header display
      setSavedPageInfo({
        title: info.title || "",
        url: info.url || "",
        favicon: info.favicon || "",
      });

      const historyTitle = userPrompt ? userPrompt : (info.title || "Page Summary");
      
      // Create title with favicon + page title for summaries
      const summaryTitle = info.title ? `${info.title}` : "Page Summary";

      await addHistory({
        title: summaryTitle,
        type: 'summary',
        response: res.text,
        tags: res.tags ?? [],
        suggestedQuestions: res.suggestedQuestions ?? [],
        pageInfo: {
          title: info.title || "",
          url: info.url || "",
          favicon: info.favicon || "",
        },
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
    setLoading(true);
    setLinks([]);
    setRestoredScreenshotData(null); // Clear restored screenshot data for new queries
    setSearchQuery("");
    
    const imageData = screenshotData || fileData;
    
    try {
      const info = await getPageInfoFromTab();
      setPageInfo(info);

      let finalQuery = query;
      if (_useContext && !imageData) {
        finalQuery = `Based on this page:\n${info.text}\n\nUser question: ${query}`;
      } else if (_useWebSearch) {
        // Disable page context when web search is active
        setUsePageContext(false);
        
        // Use the same approach as tag search - get actual links
        console.log('=== WEB SEARCH REQUEST ===');
        console.log('Query:', query);
        
        setLoading(true);
        setTags([]);
        setSuggested([]);
        setLinks([]);
        setRestoredScreenshotData(null);
        setSearchQuery(query);
        
        const res: AIResponse = await sendQueryToAI({
          query: query,
          action: "get_links",
        });
        
        console.log('=== WEB SEARCH RESPONSE ===');
        console.log('Complete AI Response:', res);
        console.log('Response text:', res.text);
        console.log('Response links:', res.links);
        console.log('Response tags:', res.tags);
        console.log('Response suggestedQuestions:', res.suggestedQuestions);
        
        const linksArr = res.links?.slice(0, 15) ?? [];
        console.log('Processed links array:', linksArr);
        
        setLinks(linksArr);
        
        // Don't set output HTML when we have links - let LinkList handle the display
        if (linksArr.length === 0) {
          setOutputHtml(`<p>No web search results found for "${query}".</p>`);
        } else {
          setOutputHtml(''); // Clear output HTML since LinkList will show the results
        }

        await addHistory({
          title: `Web search results for "${query}"`,
          type: 'search',
          response: linksArr.length > 0 ? `Found ${linksArr.length} web search results for "${query}":` : `No web search results found for "${query}".`,
          tags: [],
          suggestedQuestions: [],
          links: linksArr,
        });
        
        setScreenshotData(null);
        setLoading(false);
        return; // Exit early since we handled the web search separately
      } else if (imageData) {
        finalQuery = query;
      }

      // Determine action based on whether we have a file
      const action = imageData ? "summarize_file" : "direct_question";
      
      // If there's a file, combine the user's query with file analysis request
      let queryToSend = finalQuery;
      if (imageData && query.trim()) {
        queryToSend = `Analyze this file and answer: ${query.trim()}`;
      } else if (imageData && !query.trim()) {
        queryToSend = "Please analyze and summarize this file";
      }
      
      // Use regular API call for general questions, streaming for specific actions
      if (imageData) {
        // For file analysis, use streaming
        await startStream(queryToSend, action, imageData);
        setTags([]);
        setSuggested([]);
      } else {
        // For general questions, use regular API call
        const res: AIResponse = await sendQueryToAI({
          query: queryToSend,
          action: action,
        });
        
        setOutputHtml(res.text);
        setTags(res.tags ?? []);
        setSuggested(res.suggestedQuestions ?? []);
        
        // Save to history
        await addHistory({
          title: query.length > 50 ? query.substring(0, 50) + "..." : query,
          type: 'question',
          response: res.text,
          tags: res.tags ?? [],
          suggestedQuestions: res.suggestedQuestions ?? [],
          pageInfo: {
            title: info.title || "",
            url: info.url || "",
            favicon: info.favicon || "",
          },
        });
      }
      
      // Save page info for header display if this is a context-based question
      if (_useContext && !imageData) {
        setSavedPageInfo({
          title: info.title || "",
          url: info.url || "",
          favicon: info.favicon || "",
        });
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

  return {
    // State
    outputHtml,
    tags,
    suggested,
    links,
    loading,
    searchQuery,
    pageInfo,
    savedPageInfo,
    usePageContext,
    setUsePageContext,
    useWebSearch,
    setUseWebSearch,

    screenshotData,
    restoredScreenshotData,
    currentHistoryItemType,
    currentHistoryItemFileName,
    showWelcome,
    
    // Handlers
    handleSummarize,
    handleSend,
    handleTagClick,
    handleSuggestedClick,
    handleScreenshotCapture,
    handleClearContent,
    
    // Helpers
    shouldShowPageHeader,
    shouldShowLinkList,

    sendNewsQuery,
    isStreaming,
    streamContent,
    stopStream,
    resetStream
  };
} 