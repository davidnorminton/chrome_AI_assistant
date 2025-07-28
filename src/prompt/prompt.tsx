// src/prompt/Prompt.tsx
import { useState, useRef, useEffect } from "react";
import { extractTextFromPDF, isPDFFile, extractTextFromFile, isTextFile } from "../utils/pdfUtils";

interface PromptProps {
  /** Called for the "Send" button */
  onSend: (query: string, fileData: string | null, usePageContext: boolean, useWebSearch: boolean, fileName?: string | null) => void;
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
  /** Called when file processing state changes */
  onFileProcessingChange?: (isProcessing: boolean, fileName: string | null, fileType: string | null) => void;
}

export default function Prompt({ onSend, onSummarize, loading, useContext, setUseContext, useWebSearch, setUseWebSearch, onScreenshotCapture, onFileProcessingChange }: PromptProps) {
  const [text, setText] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [canTakeScreenshot, setCanTakeScreenshot] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isSmallPanel, setIsSmallPanel] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [processingFileType, setProcessingFileType] = useState<string | null>(null);
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

  // Notify parent when file processing state changes
  useEffect(() => {
    if (onFileProcessingChange) {
      onFileProcessingChange(isProcessingFile, processingFileName, processingFileType);
    }
  }, [isProcessingFile, processingFileName, processingFileType, onFileProcessingChange]);

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

  // Enhanced file validation
  const isValidFileType = (file: File): boolean => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv', 'application/json',
      'text/markdown', 'text/xml'
    ];
    
    const allowedExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'csv', 'json', 'md', 'xml'
    ];
    
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    return allowedTypes.includes(file.type) && 
           fileExtension !== undefined && 
           allowedExtensions.includes(fileExtension);
  };

  // When a file is selected, validate and read it
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileData(null);
      setFileName(null);
      setFileType(null);
      return;
    }

    // Validate file type
    if (!isValidFileType(file)) {
      alert(`File type "${file.type}" is not supported. Please upload an image file (JPEG, PNG, GIF, WebP), PDF, or text file (TXT, CSV, JSON, etc.).`);
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    // Start processing state
    setIsProcessingFile(true);
    setProcessingFileName(file.name);
    setProcessingFileType(file.type);

    try {
      // Handle different file types
      if (isPDFFile(file)) {
        const pdfText = await extractTextFromPDF(file);
        setFileData(pdfText);
        setFileName(file.name);
        setFileType(file.type);
        // Disable page context when file is uploaded
        setUseContext(false);
      } else if (isTextFile(file)) {
        const textContent = await extractTextFromFile(file);
        setFileData(textContent);
        setFileName(file.name);
        setFileType(file.type);
        // Disable page context when file is uploaded
        setUseContext(false);
      } else {
        // Handle image files
        const reader = new FileReader();
        reader.onload = () => {
          setFileData(reader.result as string);
          setFileName(file.name);
          setFileType(file.type);
          // Disable page context when file is uploaded
          setUseContext(false);
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      alert(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clear processing state
      setIsProcessingFile(false);
      setProcessingFileName(null);
      setProcessingFileType(null);
    }
  };

  // Remove uploaded file
  const removeFile = () => {
    setFileData(null);
    setFileName(null);
    setFileType(null);
    // Re-enable page context when file is removed
    setUseContext(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendClick = () => {
    if (!text.trim() && !fileData) return;
    onSend(text.trim(), fileData, useContext, useWebSearch, fileName);
    setText("");
    setFileData(null);
    setFileName(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        // Disable page context when screenshot is taken
        setUseContext(false);
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

        {/* File display */}
        {fileName && (
          <div className="uploaded-file-display">
            <div className="file-info">
              <i className="fas fa-file"></i>
              <span className="file-name">{fileName}</span>
              <span className="file-type">({fileType})</span>
            </div>
            <button
              className="remove-file-btn"
              onClick={removeFile}
              title="Remove file"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className="action-buttons-row">
          {/* Hidden file input */}
          <input
            type="file"
            id="hiddenFileInput"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*,.pdf,.txt,.csv,.json,.xml,.html,.js,.md,.yml,.yaml"
            onChange={handleFileChange}
          />

          {/* File upload */}
          <button
            id="fileUploadBtn"
            className="icon-button file-upload-button tooltip"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <i className="fas fa-plus" />
            <span className="tooltiptext">Upload File</span>
          </button>

          {/* Responsive buttons - show full buttons on large panels */}
          {!isSmallPanel && (
            <>
              {/* Screenshot button */}
              <button
                id="screenshotBtn"
                className={`icon-button screenshot-button tooltip ${isScreenshotMode ? 'active' : ''}`}
                onClick={handleScreenshotClick}
                disabled={loading || !canTakeScreenshot}
              >
                <i className="fas fa-camera" />
                <span className="tooltiptext">Screenshot</span>
              </button>

              {/* Toggle context */}
              <button
                id="toggleContextBtn"
                className={`nice-button context-toggle-button tooltip ${useContext ? "active" : "inactive"}`}
                onClick={() => setUseContext(!useContext)}
                disabled={loading || Boolean(fileData && fileData.startsWith('data:image/'))}
              >
                <i className="fas fa-book-open" />
                <span>Page Context</span>
                <span className="tooltiptext">
                  {fileData && fileData.startsWith('data:image/') 
                    ? "Page Context disabled for screenshots" 
                    : (useContext ? "Disable Page Context" : "Enable Page Context")
                  }
                </span>
              </button>

              {/* Toggle web search */}
              <button
                id="toggleWebSearchBtn"
                className={`nice-button web-search-button tooltip ${useWebSearch ? "active" : ""}`}
                onClick={() => {
                  const newWebSearchState = !useWebSearch;
                  setUseWebSearch(newWebSearchState);
                  // Disable page context when web search is enabled
                  if (newWebSearchState) {
                    setUseContext(false);
                  }
                }}
                disabled={loading}
              >
                <i className="fas fa-globe" />
                <span className="tooltiptext">{useWebSearch ? "Disable Web Search" : "Enable Web Search"}</span>
              </button>

              {/* Summarize */}
              <button
                id="summarizeBtn"
                className={`nice-button tooltip ${loading ? 'loading' : ''}`}
                onClick={onSummarize}
                disabled={loading}
                data-action="summarize"
              >
                <span>Summarize</span>
                <span className="tooltiptext">Summarize</span>
              </button>
            </>
          )}

          {/* Small panel layout - Page Context button + 3-dots menu */}
          {isSmallPanel && (
            <>
              {/* Page Context button - always visible */}
              <button
                id="toggleContextBtn"
                className={`nice-button context-toggle-button tooltip ${useContext ? "active" : "inactive"}`}
                onClick={() => setUseContext(!useContext)}
                disabled={loading || Boolean(fileData && fileData.startsWith('data:image/'))}
              >
                <i className="fas fa-book-open" />
                <span>Page Context</span>
                <span className="tooltiptext">
                  {fileData && fileData.startsWith('data:image/') 
                    ? "Page Context disabled for screenshots" 
                    : (useContext ? "Disable Page Context" : "Enable Page Context")
                  }
                </span>
              </button>

              {/* 3-dots menu for other options */}
              <div className="responsive-menu-container" ref={menuRef}>
                <button
                  className="icon-button menu-toggle-button tooltip"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <i className="fas fa-ellipsis-h" />
                  <span className="tooltiptext">More Options</span>
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
              className={`icon-button send-button tooltip ${loading ? 'loading' : ''}`}
              onClick={handleSendClick}
              disabled={loading}
            >
              {loading
                ? <div id="loaderIcon" className="spinner" />
                : <i id="arrowIcon" className="fas fa-arrow-up" />}
              <span className="tooltiptext">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}