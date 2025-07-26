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
    console.log('actions.setClearContent:', actions?.setClearContent);
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
    try {
      const info = await getPageInfoFromTab();
      setPageInfo(info);

      let finalQuery = query;
      if (_useContext) {
        finalQuery = `Based on this page:\n${info.text}\n\nUser question: ${query}`;
      }

      const res: AIResponse = await sendQueryToAI({
        query: finalQuery,
        action: "direct_question",
        file: fileData,
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
        />
      </div>
    </div>
  );
}