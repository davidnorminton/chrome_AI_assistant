import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { addHistory } from '../utils/storage';
import type { HistoryItem, PageInfo } from '../types';

interface HistoryState {
  currentHistoryItemType: string | null;
  currentHistoryItemFileName: string | null;
  savedPageInfo: { title: string; url: string; favicon: string } | null;
  searchQuery: string;
}

export function useHistoryManagement() {
  const location = useLocation();
  const lastProcessedIndexRef = useRef<number | null>(null);
  
  const [state, setState] = useState<HistoryState>({
    currentHistoryItemType: null,
    currentHistoryItemFileName: null,
    savedPageInfo: null,
    searchQuery: '',
  });

  const setCurrentHistoryItemType = useCallback((type: string | null) => {
    setState(prev => ({ ...prev, currentHistoryItemType: type }));
  }, []);

  const setCurrentHistoryItemFileName = useCallback((fileName: string | null) => {
    setState(prev => ({ ...prev, currentHistoryItemFileName: fileName }));
  }, []);

  const setSavedPageInfo = useCallback((pageInfo: { title: string; url: string; favicon: string } | null) => {
    setState(prev => ({ ...prev, savedPageInfo: pageInfo }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setState(prev => ({ ...prev, searchQuery }));
  }, []);

  const clearHistoryState = useCallback(() => {
    setState({
      currentHistoryItemType: null,
      currentHistoryItemFileName: null,
      savedPageInfo: null,
      searchQuery: '',
    });
  }, []);

  // Add history item
  const addHistoryItem = useCallback(async (historyData: {
    title: string;
    type: 'summary' | 'search' | 'question' | 'file_analysis';
    response: string;
    tags?: string[];
    suggestedQuestions?: string[];
    links?: { title: string; url: string; description: string }[];
    screenshotData?: string;
    fileName?: string;
    pageInfo?: { title: string; url: string; favicon: string };
  }) => {
    try {
      await addHistory(historyData);
    } catch (error) {
      console.error('Error adding history item:', error);
    }
  }, []);

  // Restore from history
  const restoreFromHistory = useCallback((item: HistoryItem) => {
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
  }, [setCurrentHistoryItemType, setCurrentHistoryItemFileName, setSearchQuery, setSavedPageInfo]);

  // Check if history should be restored
  const shouldRestoreHistory = useCallback((nav: any, loading: boolean, isStreaming: boolean, outputHtml: string) => {
    // Prevent processing the same index multiple times
    if (nav?.currentIndex === lastProcessedIndexRef.current) {
      return false;
    }

    // Don't restore history if we're currently loading or streaming
    if (loading || isStreaming) {
      return false;
    }

    // Don't restore history if we have active content being displayed
    if (outputHtml && outputHtml.trim() !== '') {
      return false;
    }

    // Check if we have valid history and a valid index
    if (nav && nav.history && nav.history.length > 0 && nav.currentIndex >= 0 && nav.currentIndex < nav.history.length && nav.history[nav.currentIndex]) {
      lastProcessedIndexRef.current = nav.currentIndex;
      return true;
    }

    return false;
  }, [lastProcessedIndexRef]);

  return {
    // State
    ...state,
    
    // Setters
    setCurrentHistoryItemType,
    setCurrentHistoryItemFileName,
    setSavedPageInfo,
    setSearchQuery,
    clearHistoryState,
    
    // Actions
    addHistoryItem,
    restoreFromHistory,
    shouldRestoreHistory,
    
    // Refs
    lastProcessedIndexRef,
  };
} 