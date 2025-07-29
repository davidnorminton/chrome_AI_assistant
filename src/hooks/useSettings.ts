import { useState, useEffect, useCallback } from 'react';
import type { AIContextConfig, AIModelConfig } from '../types';

interface SettingsState {
  userSettings: {
    contextConfig: AIContextConfig;
    modelConfig: AIModelConfig;
  } | null;
  isLoading: boolean;
}

export function useSettings() {
  const [state, setState] = useState<SettingsState>({
    userSettings: null,
    isLoading: true,
  });

  // Load all user settings
  const loadUserSettings = useCallback(async () => {
    const result = await chrome.storage.local.get(['aiContextConfig', 'aiModelConfig']);
    const contextConfig = result.aiContextConfig || {
      usePageContext: true,
      useWebSearch: false,
      contextLevel: 'standard',
      includeMetadata: true,
      includeLinks: true,
      includeImages: false,
      maxContextLength: 8000,
      customInstructions: undefined,
      showTags: true,
      showSuggestedQuestions: true,
    };
    const modelConfig = result.aiModelConfig || {
      model: result.model || 'sonar',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 4000,
      systemPrompt: undefined,
    };
    return { contextConfig, modelConfig };
  }, []);

  // Get user settings for tags and suggested questions
  const getUserSettings = useCallback(async () => {
    const result = await chrome.storage.local.get(['aiContextConfig']);
    const config = result.aiContextConfig || {
      showTags: true,
      showSuggestedQuestions: true,
    };
    return config;
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<{
    contextConfig: AIContextConfig;
    modelConfig: AIModelConfig;
  }>) => {
    const currentSettings = state.userSettings;
    if (!currentSettings) return;

    const updatedSettings = {
      contextConfig: { ...currentSettings.contextConfig, ...newSettings.contextConfig },
      modelConfig: { ...currentSettings.modelConfig, ...newSettings.modelConfig },
    };

    setState(prev => ({
      ...prev,
      userSettings: updatedSettings,
    }));

    // Save to storage
    await chrome.storage.local.set({
      aiContextConfig: updatedSettings.contextConfig,
      aiModelConfig: updatedSettings.modelConfig,
    });
  }, [state.userSettings]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await loadUserSettings();
        setState({
          userSettings: settings,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error loading settings:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadSettings();
  }, [loadUserSettings]);

  return {
    // State
    userSettings: state.userSettings,
    isLoading: state.isLoading,
    
    // Actions
    loadUserSettings,
    getUserSettings,
    updateSettings,
  };
} 