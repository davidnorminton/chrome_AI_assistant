import './App.css'
import './css/index.css' // Updated to use modular CSS structure
import './css/tooltips.css' // Tooltip styles
import Menu from './menu/menu'
import { Outlet } from 'react-router-dom';
import { createContext, useState, useEffect, useCallback } from 'react';
import { getHistory } from './utils/storage';
import type { HistoryItem } from './types';
import { StreamingProvider } from './context/StreamingContext';

// Import STORAGE_KEY from storage utility
const STORAGE_KEY = "extensionHistory";

export interface HistoryNavContextType {
  history: HistoryItem[];
  currentIndex: number;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  canGoBack: boolean;
  canGoForward: boolean;
  setIndex: (idx: number | null) => void;
  initialized: boolean;
  refreshHistory: () => Promise<void>;
}

export interface AppActionsContextType {
  clearContent: (() => void) | null;
  setClearContent: (fn: () => void) => void;
}

export const HistoryNavigationContext = createContext<HistoryNavContextType | undefined>(undefined);
export const AppActionsContext = createContext<AppActionsContextType | undefined>(undefined);

export default function App() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0); // Always start at 0, never null
  const [initialized, setInitialized] = useState<boolean>(false); // Track if app has been initialized
  const [clearContent, setClearContent] = useState<(() => void) | null>(null);

  // Debug when setClearContent is called
  const setClearContentWithDebug = useCallback((fn: () => void) => {
    setClearContent(() => fn);
  }, []);

  useEffect(() => {
    getHistory().then((historyItems) => {
      setHistory(historyItems);
      setInitialized(true); // Mark as initialized after loading history
    });
  }, []);

  // Listen for storage changes to keep history in sync
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[STORAGE_KEY]) {
        getHistory().then((historyItems) => {
          setHistory(historyItems);
        });
      }
    };

    // Also listen for Firebase-related changes
    const handleFirebaseChange = async () => {
      try {
        const historyItems = await getHistory();
        setHistory(historyItems);
      } catch (error) {
        console.error('Error refreshing history from Firebase:', error);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // Set up a periodic refresh for Firebase data (every 30 seconds)
    const firebaseRefreshInterval = setInterval(handleFirebaseChange, 30000);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(firebaseRefreshInterval);
    };
  }, []);

  // Update history if it changes in storage (optional: add a listener for more reactivity)

  const goBack = useCallback(async () => {
    if (history.length === 0) {
      return;
    }
    
    // Refresh history from Firebase to ensure we have the latest data
    try {
      const historyItems = await getHistory();
      setHistory(historyItems);
      
      // After refreshing, navigate back if possible
      if (historyItems.length > 0 && currentIndex > 0) {
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
      } else {
        // Fallback to existing logic if refresh fails
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
        }
      }
    } catch (error) {
      console.error('Error refreshing history for goBack:', error);
      // Fallback to existing logic if refresh fails
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, history.length]);

  const goForward = useCallback(async () => {
    if (history.length === 0) {
      return;
    }
    
    // Refresh history from Firebase to ensure we have the latest data
    try {
      const historyItems = await getHistory();
      setHistory(historyItems);
      
      // After refreshing, navigate forward if possible
      if (historyItems.length > 0 && currentIndex < historyItems.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
      } else {
        // Fallback to existing logic if refresh fails
        if (currentIndex < history.length - 1) {
          const newIndex = currentIndex + 1;
          setCurrentIndex(newIndex);
        }
      }
    } catch (error) {
      console.error('Error refreshing history for goForward:', error);
      // Fallback to existing logic if refresh fails
      if (currentIndex < history.length - 1) {
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, history.length]);

  // Fix the canGoBack and canGoForward logic
  const canGoBack = history.length > 0 && currentIndex > 0;
  const canGoForward = history.length > 0 && currentIndex < history.length - 1;

  // Debug navigation state
  useEffect(() => {
    // console.log('Navigation state:', {
    //   historyLength: history.length,
    //   currentIndex,
    //   canGoBack,
    //   canGoForward,
    //   currentHistoryItem: history[currentIndex] || 'none'
    // });
  }, [history.length, currentIndex, canGoBack, canGoForward, history]);

  const setIndex = (idx: number | null) => {
    if (history.length === 0) {
      setCurrentIndex(0); // Keep at 0 even if no history
    } else if (typeof idx === 'number') {
      if (idx < 0) setCurrentIndex(0);
      else if (idx >= history.length) setCurrentIndex(history.length - 1);
      else setCurrentIndex(idx);
    } else {
      // If idx is null but we have history, set to most recent (index 0)
      setCurrentIndex(0);
    }
  };

  const refreshHistory = useCallback(async () => {
    try {
      const historyItems = await getHistory();
      setHistory(historyItems);
    } catch (error) {
      console.error('Error refreshing history:', error);
    }
  }, []);

  // Ensure currentIndex is always valid
  useEffect(() => {
    if (history.length === 0) {
      setCurrentIndex(0); // Keep at 0 even if no history
    } else if (currentIndex >= history.length) {
      setCurrentIndex(history.length - 1);
    }
  }, [history.length, currentIndex]);

  useEffect(() => {
    // console.log('App useEffect - history.length:', history.length, 'currentIndex:', currentIndex);
  }, [history.length, currentIndex]);

  useEffect(() => {
    // console.log('App render: currentIndex', currentIndex, 'history.length', history.length);
  }, [currentIndex, history.length]);

  return (
    <HistoryNavigationContext.Provider value={{
      history,
      currentIndex,
      goBack,
      goForward,
      canGoBack,
      canGoForward,
      setIndex,
      initialized,
      refreshHistory
    }}>
      <AppActionsContext.Provider value={{
        clearContent,
        setClearContent: setClearContentWithDebug
      }}>
        <StreamingProvider>
          <Outlet />
          <Menu />
        </StreamingProvider>
      </AppActionsContext.Provider>
    </HistoryNavigationContext.Provider>
  )
}

