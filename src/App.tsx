import './App.css'
import Menu from './menu/menu'
import { Outlet } from 'react-router-dom';
import { createContext, useState, useEffect, useCallback } from 'react';
import { getHistory } from './utils/storage';
import type { HistoryItem } from './types';

export interface HistoryNavContextType {
  history: HistoryItem[];
  currentIndex: number;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  setIndex: (idx: number | null) => void;
  initialized: boolean;
}

export interface AppActionsContextType {
  sendNewsQuery: ((query: string) => void) | null;
  setSendNewsQuery: (fn: (query: string) => void) => void;
}

export const HistoryNavigationContext = createContext<HistoryNavContextType | undefined>(undefined);
export const AppActionsContext = createContext<AppActionsContextType | undefined>(undefined);

export default function App() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0); // Always start at 0, never null
  const [initialized, setInitialized] = useState<boolean>(false); // Track if app has been initialized
  const [sendNewsQuery, setSendNewsQuery] = useState<((query: string) => void) | null>(null);

  // Debug when setSendNewsQuery is called
  const setSendNewsQueryWithDebug = useCallback((fn: (query: string) => void) => {
    console.log('=== SET SEND NEWS QUERY CALLED ===');
    console.log('Setting sendNewsQuery function:', fn);
    setSendNewsQuery(() => fn);
  }, []);

  useEffect(() => {
    getHistory().then((historyItems) => {
      setHistory(historyItems);
      setInitialized(true); // Mark as initialized after loading history
    });
  }, []);

  // Update history if it changes in storage (optional: add a listener for more reactivity)

  const goBack = useCallback(() => {
    console.log('goBack called - currentIndex:', currentIndex, 'history.length:', history.length);
    if (history.length === 0) return;
    if (currentIndex < history.length - 1) {
      console.log('goBack: setting to index', currentIndex + 1);
      setCurrentIndex(currentIndex + 1);
    } else {
      console.log('goBack: already at oldest entry, doing nothing');
    }
  }, [currentIndex, history.length]);

  const goForward = useCallback(() => {
    console.log('goForward called - currentIndex:', currentIndex, 'history.length:', history.length);
    if (history.length === 0) return;
    if (currentIndex > 0) {
      console.log('goForward: setting to index', currentIndex - 1);
      setCurrentIndex(currentIndex - 1);
    } else {
      console.log('goForward: already at newest entry, doing nothing');
    }
  }, [currentIndex, history.length]);

  const canGoBack = history.length > 0 && currentIndex < history.length - 1;
  const canGoForward = history.length > 0 && currentIndex > 0;

  const setIndex = (idx: number | null) => {
    console.log('setIndex called with', idx, 'history.length', history.length);
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

  // Ensure currentIndex is always valid
  useEffect(() => {
    console.log('App useEffect - history.length:', history.length, 'currentIndex:', currentIndex);
    if (history.length === 0) {
      setCurrentIndex(0); // Keep at 0 even if no history
    } else if (currentIndex >= history.length) {
      console.log('Setting currentIndex to', history.length - 1, '(clamped)');
      setCurrentIndex(history.length - 1);
    }
  }, [history.length, currentIndex]);

  useEffect(() => {
    console.log('App render: currentIndex', currentIndex, 'history.length', history.length);
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
      initialized
    }}>
      <AppActionsContext.Provider value={{
        sendNewsQuery,
        setSendNewsQuery: setSendNewsQueryWithDebug
      }}>
        <Outlet />
        <Menu />
      </AppActionsContext.Provider>
    </HistoryNavigationContext.Provider>
  )
}

