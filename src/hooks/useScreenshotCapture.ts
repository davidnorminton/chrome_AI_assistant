import { useState, useCallback } from 'react';

interface ScreenshotState {
  screenshotData: string | null;
  restoredScreenshotData: string | null;
  isScreenshotMode: boolean;
}

export function useScreenshotCapture() {
  const [state, setState] = useState<ScreenshotState>({
    screenshotData: null,
    restoredScreenshotData: null,
    isScreenshotMode: false,
  });

  const setScreenshotData = useCallback((screenshotData: string | null) => {
    setState(prev => ({ ...prev, screenshotData }));
  }, []);

  const setRestoredScreenshotData = useCallback((restoredScreenshotData: string | null) => {
    setState(prev => ({ ...prev, restoredScreenshotData }));
  }, []);

  const setIsScreenshotMode = useCallback((isScreenshotMode: boolean) => {
    setState(prev => ({ ...prev, isScreenshotMode }));
  }, []);

  const clearScreenshotState = useCallback(() => {
    setState({
      screenshotData: null,
      restoredScreenshotData: null,
      isScreenshotMode: false,
    });
  }, []);

  // Handle screenshot capture
  const handleScreenshotCapture = useCallback((imageData: string) => {
    setScreenshotData(imageData);
    setRestoredScreenshotData(null); // Clear restored data for new screenshots
  }, []);

  // Start screenshot mode
  const startScreenshotMode = useCallback(() => {
    setIsScreenshotMode(true);
    
    // Send message to content script to start screenshot mode
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startScreenshot" });
      }
    });
  }, []);

  // Check if screenshot is available
  const canTakeScreenshot = useCallback(async (): Promise<boolean> => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return false;
      
      const tab = tabs[0];
      if (!tab.url) return false;
      
      // Check if the tab is accessible (not a chrome:// or chrome-extension:// URL)
      const url = new URL(tab.url);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      console.error('Error checking screenshot availability:', error);
      return false;
    }
  }, []);

  return {
    // State
    ...state,
    
    // Setters
    setScreenshotData,
    setRestoredScreenshotData,
    setIsScreenshotMode,
    clearScreenshotState,
    
    // Actions
    handleScreenshotCapture,
    startScreenshotMode,
    canTakeScreenshot,
  };
} 