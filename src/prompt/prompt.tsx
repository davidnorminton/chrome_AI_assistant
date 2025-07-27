// src/prompt/Prompt.tsx
import { useState, useRef, useEffect } from "react";

interface PromptProps {
  /** Called for the "Send" button */
  onSend: (query: string, fileData: string | null, usePageContext: boolean, useWebSearch: boolean) => void;
  /** Called for the "Summarize" button */
  onSummarize: () => void;
  /** Whether any request is in flight */
  loading: boolean;
  /** Whether to use page context */
  useContext: boolean;
  /** Setter for context toggle */
  setUseContext: (val: boolean) => void;
  /** Whether to use web search */
  useWebSearch: boolean;
  /** Setter for web search toggle */
  setUseWebSearch: (val: boolean) => void;
  /** Called when a screenshot is captured */
  onScreenshotCapture?: (imageData: string) => void;
}

export default function Prompt({ onSend, onSummarize, loading, useContext, setUseContext, useWebSearch, setUseWebSearch, onScreenshotCapture }: PromptProps) {
  const [text, setText] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [canTakeScreenshot, setCanTakeScreenshot] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isSmallPanel, setIsSmallPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if screenshot is allowed on current page
  useEffect(() => {
    const checkScreenshotAvailability = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (currentTab?.url) {
          const url = currentTab.url;
          // Disable screenshot on restricted pages
          const isRestricted = /^(chrome|edge|about|view-source|file|data|blob):/.test(url);
          setCanTakeScreenshot(!isRestricted);
        }
      } catch (error) {
        console.error('Error checking screenshot availability:', error);
        setCanTakeScreenshot(false);
      }
    };

    checkScreenshotAvailability();
  }, []);

  // Auto-resize the textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [text]);

  // Check panel size and handle menu clicks
  useEffect(() => {
    const checkPanelSize = () => {
      const panel = document.getElementById('bottomControls');
      if (panel) {
        const width = panel.offsetWidth;
        setIsSmallPanel(width < 415);
      }
    };

    checkPanelSize();
    window.addEventListener('resize', checkPanelSize);
    return () => window.removeEventListener('resize', checkPanelSize);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // When a file is selected, read it as Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return setFileData(null);
    const reader = new FileReader();
    reader.onload = () => setFileData(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSendClick = () => {
    if (!text.trim() && !fileData) return;
    onSend(text.trim(), fileData, useContext, useWebSearch);
    setText("");
    setFileData(null);
  };

  const handleScreenshotClick = () => {
    setIsScreenshotMode(true);
    
    // Send message to content script to start screenshot mode
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startScreenshot" });
      }
    });

    // Listen for screenshot data from content script
    const handleScreenshotMessage = (message: any, sender: any) => {
      if (message.action === "screenshotCaptured" && message.imageData) {
        setIsScreenshotMode(false);
        setFileData(message.imageData);
        if (onScreenshotCapture) {
          onScreenshotCapture(message.imageData);
        }
        // Remove the listener
        chrome.runtime.onMessage.removeListener(handleScreenshotMessage);
      }
    };

    chrome.runtime.onMessage.addListener(handleScreenshotMessage);
  };

  return (
    <div id="bottomControls">
      <div className="main-prompt-area">
        <textarea
          id="cmdInput"
          ref={textareaRef}
          value={text}
          placeholder={useContext ? "Ask a question about this page" : "Ask anything"}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />

        <div className="action-buttons-row">
          {/* Hidden file input */}
          <input
            type="file"
            id="hiddenFileInput"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*,application/pdf,.txt"
            onChange={handleFileChange}
          />

          {/* File upload */}
          <button
            id="fileUploadBtn"
            className="icon-button file-upload-button"
            title="Upload File"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <i className="fas fa-plus" />
          </button>

          {/* Responsive buttons - show full buttons on large panels */}
          {!isSmallPanel && (
            <>
              {/* Screenshot button */}
              <button
                id="screenshotBtn"
                className={`icon-button screenshot-button ${isScreenshotMode ? 'active' : ''}`}
                title="Take Screenshot"
                onClick={handleScreenshotClick}
                disabled={loading || !canTakeScreenshot}
              >
                <i className="fas fa-camera" />
              </button>

              {/* Toggle context */}
              <button
                id="toggleContextBtn"
                className={`nice-button context-toggle-button ${useContext ? "active" : ""}`}
                onClick={() => setUseContext(!useContext)}
                disabled={loading}
              >
                <i className="fas fa-book-open" />
                <span>Page Context</span>
              </button>

              {/* Toggle web search */}
              <button
                id="toggleWebSearchBtn"
                className={`nice-button web-search-button ${useWebSearch ? "active" : ""}`}
                onClick={() => {
                  const newWebSearchState = !useWebSearch;
                  setUseWebSearch(newWebSearchState);
                  // Disable page context when web search is enabled
                  if (newWebSearchState) {
                    setUseContext(false);
                  }
                }}
                disabled={loading}
                title="Web Search"
              >
                <i className="fas fa-globe" />
              </button>

              {/* Summarize */}
              <button
                id="summarizeBtn"
                className={`nice-button ${loading ? 'loading' : ''}`}
                title="Summarize"
                onClick={onSummarize}
                disabled={loading}
                data-action="summarize"
              >
                <span>Summarize</span>
              </button>
            </>
          )}

          {/* Small panel layout - Page Context button + 3-dots menu */}
          {isSmallPanel && (
            <>
              {/* Page Context button - always visible */}
              <button
                id="toggleContextBtn"
                className={`nice-button context-toggle-button ${useContext ? "active" : ""}`}
                onClick={() => setUseContext(!useContext)}
                disabled={loading}
              >
                <i className="fas fa-book-open" />
                <span>Page Context</span>
              </button>

              {/* 3-dots menu for other options */}
              <div className="responsive-menu-container" ref={menuRef}>
                <button
                  className="icon-button menu-toggle-button"
                  onClick={() => setShowMenu(!showMenu)}
                  title="More options"
                >
                  <i className="fas fa-ellipsis-h" />
                </button>
                
                {showMenu && (
                  <div className="responsive-menu">
                    <button
                      className="menu-item"
                      onClick={() => {
                        handleScreenshotClick();
                        setShowMenu(false);
                      }}
                      disabled={loading || !canTakeScreenshot}
                    >
                      Take Screenshot
                    </button>
                    <button
                      className={`menu-item ${useWebSearch ? "active" : ""}`}
                      onClick={() => {
                        const newWebSearchState = !useWebSearch;
                        setUseWebSearch(newWebSearchState);
                        if (newWebSearchState) {
                          setUseContext(false);
                        }
                        setShowMenu(false);
                      }}
                      disabled={loading}
                    >
                      Web Search
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => {
                        onSummarize();
                        setShowMenu(false);
                      }}
                      disabled={loading}
                    >
                      Summarize
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Send */}
          <div className="end">
            <button
              id="cmdBtn"
              className={`icon-button send-button ${loading ? 'loading' : ''}`}
              title="Send"
              onClick={handleSendClick}
              disabled={loading}
            >
              {loading
                ? <div id="loaderIcon" className="spinner" />
                : <i id="arrowIcon" className="fas fa-arrow-up" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}