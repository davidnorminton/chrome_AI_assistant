// src/routes/home.tsx
import { useState, useEffect, useContext as useReactContext, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import Welcome from "../welcome/welcome";
import Prompt from "../prompt/prompt";
import { getPageInfoFromTab, type PageInfo } from "../utils/tabs";
import { sendQueryToAI, type AIResponse } from "../utils/api";
import { addHistory } from "../utils/storage";
import { HistoryNavigationContext, AppActionsContext } from "../App";

interface LinkItem {
  title: string;
  url: string;
  description: string;
}

export default function Home() {
  const location = useLocation();
  const nav = useReactContext(HistoryNavigationContext);
  const actions = useReactContext(AppActionsContext);
  
  console.log('=== HOME COMPONENT MOUNTED ===');
  console.log('nav context available:', !!nav);
  console.log('actions context available:', !!actions);
  
  const [outputHtml, setOutputHtml] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(""); // Track current search query
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    text: "",
    url: "",
    title: "",
    favicon: "",
  });
  const [savedPageInfo, setSavedPageInfo] = useState<{ title: string; url: string; favicon: string } | null>(null);
  const [usePageContext, setUsePageContext] = useState(true);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const lastProcessedIndexRef = useRef<number | null>(null);

  // Simple logic: show welcome only when there's no content
  const showWelcome = !outputHtml && tags.length === 0 && suggested.length === 0 && links.length === 0;
  
  // Debug showWelcome computation
  console.log('=== SHOW WELCOME COMPUTATION ===');
  console.log('outputHtml:', !!outputHtml);
  console.log('tags.length:', tags.length);
  console.log('suggested.length:', suggested.length);
  console.log('links.length:', links.length);
  console.log('showWelcome:', showWelcome);

  // Track component mounting and context availability
  useEffect(() => {
    console.log('=== HOME COMPONENT EFFECT ===');
    console.log('actions available:', !!actions);
    console.log('nav available:', !!nav);
  }, [actions, nav]);

  // Track actions object changes
  useEffect(() => {
    console.log('=== ACTIONS OBJECT CHANGED ===');
    console.log('actions object:', actions);
  }, [actions]);

  // Restore from history when clicked or when nav changes
  useEffect(() => {
    console.log('=== HOME RESTORE EFFECT START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Home restore: nav?.currentIndex', nav?.currentIndex);
    console.log('Home restore: nav?.history.length', nav?.history?.length);
    console.log('Home restore: nav?.history', nav?.history);
    console.log('Home restore: nav.history[nav.currentIndex]', nav?.history?.[nav?.currentIndex ?? -1]);
    console.log('Home restore: location.state', location.state);
    console.log('Last processed index:', lastProcessedIndexRef.current);
    console.log('Current showWelcome state:', showWelcome);
    console.log('nav?.initialized:', nav?.initialized);

    // Prevent processing the same index multiple times
    if (nav?.currentIndex === lastProcessedIndexRef.current) {
      console.log('=== SKIPPING - ALREADY PROCESSED THIS INDEX ===');
      return;
    }

    // Check if we have valid history and a valid index
    if (nav && nav.history && nav.history.length > 0 && nav.currentIndex >= 0 && nav.currentIndex < nav.history.length && nav.history[nav.currentIndex]) {
      console.log('=== USING NAVIGATION CONTEXT ===');
      const item = nav.history[nav.currentIndex];
      console.log('Loading history item:', item.title);
      setTags(item.tags ?? []);
      setSuggested(item.suggestedQuestions ?? []);
      setLinks(item.links ?? []);
      setSearchQuery("");
      setSavedPageInfo(item.pageInfo ?? null);
      if (item.links && item.links.length > 0 && item.title.startsWith("Search links for")) {
        setOutputHtml("");
      } else {
        // Add a small delay to prevent immediate clearing
        setTimeout(() => {
          console.log('Setting outputHtml with delay:', item.response.substring(0, 100) + '...');
          setOutputHtml(item.response);
        }, 100);
      }
      lastProcessedIndexRef.current = nav.currentIndex;
      console.log('=== NAVIGATION CONTEXT SET ===');
      // Clear location.state after using navigation context
      if (location.state) {
        window.history.replaceState(null, '', window.location.pathname);
        console.log('=== LOCATION STATE CLEARED AFTER NAVIGATION ===');
      }
    } else if (location.state && (location.state as any).response) {
      console.log('=== USING LOCATION STATE ===');
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
      setSearchQuery("");
      setSavedPageInfo(state.pageInfo ?? null);
      if (state.links && state.links.length > 0 && state.title?.startsWith("Search links for")) {
        setOutputHtml("");
      } else {
        setOutputHtml(state.response!);
      }
      // Clear location.state after using it to prevent interference with navigation
      window.history.replaceState(null, '', window.location.pathname);
      console.log('=== LOCATION STATE SET AND CLEARED ===');
    } else if (!nav || !nav.history || nav.history.length === 0 || !nav.initialized) {
      console.log('=== CLEARING TO WELCOME (NO HISTORY OR NOT INITIALIZED) ===');
      console.log('nav exists:', !!nav);
      console.log('nav.history exists:', !!nav?.history);
      console.log('nav.history.length:', nav?.history?.length);
      console.log('nav.initialized:', nav?.initialized);
      // Show welcome if no history or app not yet initialized
      setOutputHtml("");
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setSearchQuery("");
      setSavedPageInfo(null);
      lastProcessedIndexRef.current = null;
      console.log('=== WELCOME STATE SET ===');
    } else if (nav && nav.history && nav.history.length > 0 && nav.initialized) {
      console.log('=== NAVIGATION WITH HISTORY BUT NO VALID INDEX ===');
      console.log('nav.currentIndex:', nav.currentIndex);
      console.log('nav.history.length:', nav.history.length);
      // We have history but no valid index, go to most recent (index 0)
      const item = nav.history[0];
      console.log('Loading most recent history item:', item.title);
      setTags(item.tags ?? []);
      setSuggested(item.suggestedQuestions ?? []);
      setLinks(item.links ?? []);
      setSearchQuery("");
      setSavedPageInfo(item.pageInfo ?? null);
      if (item.links && item.links.length > 0 && item.title.startsWith("Search links for")) {
        setOutputHtml("");
      } else {
        setTimeout(() => {
          console.log('Setting outputHtml with delay:', item.response.substring(0, 100) + '...');
          setOutputHtml(item.response);
        }, 100);
      }
      lastProcessedIndexRef.current = 0;
      console.log('=== MOST RECENT HISTORY LOADED ===');
    } else {
      console.log('=== NO ACTION TAKEN ===');
      console.log('nav?.currentIndex:', nav?.currentIndex);
      console.log('location.state exists:', !!location.state);
      console.log('nav?.history.length:', nav?.history?.length);
      console.log('nav?.initialized:', nav?.initialized);
    }
    console.log('=== HOME RESTORE EFFECT END ===');
  }, [location.state, nav?.currentIndex, nav?.history]);

  // Debug effect to track when content is cleared
  useEffect(() => {
    console.log('Content changed - outputHtml:', outputHtml ? 'has content' : 'empty');
    console.log('Content changed - tags:', tags.length);
    console.log('Content changed - suggested:', suggested.length);
    console.log('Content changed - links:', links.length);
    console.log('Content changed - showWelcome:', showWelcome);
  }, [outputHtml, tags, suggested, links, showWelcome]);

  // Debug effect to track showWelcome changes
  useEffect(() => {
    console.log('showWelcome changed to:', showWelcome);
    console.log('Current outputHtml has content:', !!outputHtml);
    console.log('Current tags length:', tags.length);
    console.log('Current suggested length:', suggested.length);
    console.log('Current links length:', links.length);
  }, [showWelcome, outputHtml, tags, suggested, links]);

  // Add a test function to manually trigger welcome
  const testWelcome = () => {
    console.log('=== TEST WELCOME FUNCTION ===');
    setOutputHtml("");
    setTags([]);
    setSuggested([]);
    setLinks([]);
    console.log('Set showWelcome to true and cleared all content');
  };

  // Fetch page metadata on mount
  useEffect(() => {
    (async () => {
      const info = await getPageInfoFromTab();
      setPageInfo(info);
    })();
  }, []);

  // Summarize handler
  const handleSummarize = async (userPrompt?: string, customLoadingMessage?: string) => {
    console.log('=== HANDLE SUMMARIZE CALLED ===');
    console.log('userPrompt:', userPrompt);
    console.log('customLoadingMessage:', customLoadingMessage);
    
    // Clear everything and show loading message
    setOutputHtml(`<p class="loading-status-message centered-message">${customLoadingMessage || 'Asking AI for a summary...'}</p>`);
    setTags([]);
    setSuggested([]);
    setLinks([]);
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

      console.log('Got AI response, setting outputHtml');
      setOutputHtml(res.text);
      setTags(res.tags ?? []);
      setSuggested(res.suggestedQuestions ?? []);

      // Use custom title for suggested questions, default title for regular summaries
      const historyTitle = userPrompt ? userPrompt : (info.title || "Page Summary");

      await addHistory({
        title: historyTitle,
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
      setOutputHtml(`<p class=\"error\">${e.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  };

  // Direct question handler
  const handleSend = async (
    query: string,
    fileData: string | null,
    _useContext: boolean
  ) => {
    setLoading(true);
    setLinks([]);
    setSearchQuery(""); // Clear search query
    setOutputHtml(""); // Hide welcome when starting operations
    
    // Use screenshot data if available, otherwise use fileData
    const imageData = screenshotData || fileData;
    
    try {
      const info = await getPageInfoFromTab();
      setPageInfo(info);

      let finalQuery = query;
      if (_useContext && !imageData) {
        finalQuery = `Based on this page:\n${info.text}\n\nUser question: ${query}`;
      } else if (imageData) {
        // For screenshots, don't use page context, just send the image with the question
        finalQuery = query;
      }

      const res: AIResponse = await sendQueryToAI({
        query: finalQuery,
        action: "direct_question",
        file: imageData,
      });

      setOutputHtml(res.text);
      setTags(res.tags ?? []);
      setSuggested(res.suggestedQuestions ?? []);

      // Title suggestion for direct responses
      const titleRes = await sendQueryToAI({
        query: `Suggest a concise title (5 words or less) for this response: ${res.text}`,
        action: "direct_question",
      });
      const saveTitle = titleRes.text.replace(/<[^>]+>/g, "").split("\n")[0] || "AI Response";

      await addHistory({
        title: saveTitle,
        response: res.text,
        tags: res.tags ?? [],
        suggestedQuestions: res.suggestedQuestions ?? [],
        pageInfo: {
          title: info.title || "",
          url: info.url || "",
          favicon: info.favicon || "",
        },
      });
      
      // Clear screenshot data after successful send
      setScreenshotData(null);
    } catch (e: any) {
      setOutputHtml(`<p class="error">${e.message}</p>`);
      setTags([]);
      setSuggested([]);
    } finally {
      setLoading(false);
    }
  };

  // Tag click → get related links
  const handleTagClick = async (tag: string) => {
    setLoading(true);
    setLinks([]);
    setSearchQuery(tag); // Set the search query for display
    setTags([]); // Clear tags
    setSuggested([]); // Clear suggested questions
    setOutputHtml(`<p class=\"loading-status-message centered-message\">Searching for \"${tag}\"...</p>`); // Show searching message
    try {
      const res: AIResponse = await sendQueryToAI({
        query: tag,
        action: "get_links",
      });
      const linksArr = res.links?.slice(0, 10) ?? [];
      setLinks(linksArr);
      setOutputHtml(res.text); // Show the AI's full response (may include HTML, suggested questions, etc.)

      // Save to history with full AI response and links
      await addHistory({
        title: `Search links for "${tag}"`,
        response: res.text,
        tags: [],
        suggestedQuestions: [],
        links: linksArr,
      });
    } catch (e: any) {
      setOutputHtml(`<p class=\"error\">${e.message}</p>`);
    } finally {
      setLoading(false);
    }
  };

  // Send news query function
  const sendNewsQuery = useCallback((query: string) => {
    console.log('=== SEND NEWS QUERY CALLED ===');
    console.log('Query:', query);
    
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
      
      // Show the loading message
      setOutputHtml(`<p class="loading-status-message centered-message">${loadingMessage}</p>`);
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setSearchQuery("");
      setLoading(true);
      
      // Send the actual query to AI
      setTimeout(() => {
        handleSend(actualQuery, null, false);
      }, 100);
      
      return;
    }
    
    // Regular query (for world news)
    setOutputHtml(`<p class="loading-status-message centered-message">Getting latest news...</p>`);
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setSearchQuery("");
    setLoading(true);
    
    // Send the query to AI
    handleSend(query, null, false);
  }, []);

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
      setOutputHtml(`<p class="loading-status-message centered-message">${loadingMessage}</p>`);
      setTags([]);
      setSuggested([]);
      setLinks([]);
      setSearchQuery("");
      setLoading(true);
      handleSend(query, null, false);
    }
  };

  // Handle screenshot capture
  const handleScreenshotCapture = (imageData: string) => {
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
  };

  // Clear all content
  const handleClearContent = () => {
    setOutputHtml("");
    setTags([]);
    setSuggested([]);
    setLinks([]);
    setScreenshotData(null);
    setSearchQuery("");
    setSavedPageInfo(null);
  };

  // Set the context functions
  useEffect(() => {
    console.log('=== SETTING CONTEXT FUNCTIONS ===');
    console.log('actions available:', !!actions);
    if (actions?.setSendNewsQuery) {
      console.log('Setting sendNewsQuery function in context');
      actions.setSendNewsQuery(sendNewsQuery);
      console.log('Context function set successfully');
    } else {
      console.log('actions or setSendNewsQuery not available');
    }
  }, [actions, sendNewsQuery]);

  // Helper to determine if we should show the page header
  function shouldShowPageHeader() {
    // If there are links and the title is a search, do not show
    if ((links.length > 0 && (nav?.currentIndex !== null && nav?.history[nav.currentIndex]?.title?.startsWith("Search links for") ||
      (location.state as any)?.title?.startsWith("Search links for"))) ||
      (!savedPageInfo && !pageInfo.title)) {
      return false;
    }
    // Show only if we have a pageInfo title (summary or direct question about page)
    return !!(savedPageInfo?.title || pageInfo.title);
  }

  return (
    <div id="tabContent">
      <div id="currentTab" className="tab-panel active">
        {/* Header */}
        {outputHtml && shouldShowPageHeader() && (
          <div className="page-link-header">
            {(savedPageInfo?.favicon || pageInfo.favicon) && (
              <img
                src={savedPageInfo?.favicon || pageInfo.favicon}
                alt="Favicon"
                className="header-favicon"
              />
            )}
            {(savedPageInfo?.title || pageInfo.title) && (
              <a href={savedPageInfo?.url || pageInfo.url} target="_blank" rel="noopener noreferrer">
                {savedPageInfo?.title || pageInfo.title}
              </a>
            )}
          </div>
        )}

        <div id="responseBox">
          <div id="output">
            {/* Link list mode */}
            {links.length > 0 && (nav?.currentIndex !== null && nav?.history[nav.currentIndex]?.title?.startsWith("Search links for") ||
              (location.state as any)?.title?.startsWith("Search links for")) ? (
              <div>
                <h3 className="search-results-title">
                  Showing results for "{nav?.currentIndex !== null && nav?.history[nav.currentIndex]?.title?.replace('Search links for ', '').replace(/"/g, '') ||
                    ((location.state as any)?.title?.replace('Search links for ', '').replace(/"/g, '') ?? searchQuery)}"
                </h3>
                <ul className="link-list">
                  {links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.title}
                      </a>
                      {link.description && <p>{link.description}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : showWelcome ? (
              <div key="welcome-container">
                <Welcome onSummarize={() => handleSummarize()} />
              </div>
            ) : outputHtml ? (
              <div key="content-container">
                <div className="content-header">
                  <button 
                    className="clear-content-button"
                    onClick={handleClearContent}
                    title="Clear content"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
                {tags.length > 0 && (
                  <div className="tags-container">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="tag-item"
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {suggested.length > 0 && (
                  <div className="suggested-questions-container">
                    <ul>
                      {suggested.map((q) => (
                        <li key={q} onClick={() => {
                          setLoading(true);
                          setLinks([]);
                          setSearchQuery("");
                          setTags([]); // Clear tags
                          setSuggested([]); // Clear suggested questions
                          setOutputHtml(`<p class="loading-status-message centered-message">Asking AI "${q}"...</p>`);
                          handleSummarize(q, `Asking AI "${q}"...`);
                        }}>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div key="empty-container"></div>
            )}
          </div>
        </div>

        <Prompt
          onSend={handleSend}
          onSummarize={() => handleSummarize()}
          loading={loading}
          useContext={usePageContext}
          setUseContext={setUsePageContext}
          onScreenshotCapture={handleScreenshotCapture}
        />
      </div>
    </div>
  );
}