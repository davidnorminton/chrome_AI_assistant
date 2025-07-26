// src/prompt/Prompt.tsx
import { useState, useRef, useEffect } from "react";

interface PromptProps {
  /** Called for the "Send" button */
  onSend: (query: string, fileData: string | null, usePageContext: boolean) => void;
  /** Called for the "Summarize" button */
  onSummarize: () => void;
  /** Whether any request is in flight */
  loading: boolean;
  /** Whether to use page context */
  useContext: boolean;
  /** Setter for context toggle */
  setUseContext: (val: boolean) => void;
  /** Called when a screenshot is captured */
  onScreenshotCapture?: (imageData: string) => void;
}

export default function Prompt({ onSend, onSummarize, loading, useContext, setUseContext, onScreenshotCapture }: PromptProps) {
  const [text, setText] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [canTakeScreenshot, setCanTakeScreenshot] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    onSend(text.trim(), fileData, useContext);
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

          {/* Summarize */}
          <button
            id="summarizeBtn"
            className="nice-button"
            title="Summarize"
            onClick={onSummarize}
            disabled={loading}
            data-action="summarize"
          >
            <span>Summarize</span>
          </button>

          {/* Send */}
          <div className="end">
            <button
              id="cmdBtn"
              className="icon-button send-button"
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