/// <reference types="chrome" />
import { useEffect, useState } from "react";
import type { AIContextConfig, AIModelConfig } from "../types";
import { defaultAIContextManager } from "../utils/aiContextManager";

// Define both the values _and_ user-friendly labels
const modelOptions = [
  { value: "sonar-small", label: "Sonar Small", description: "Fast and efficient for most tasks" },
  { value: "sonar-pro",   label: "Sonar Pro",   description: "Advanced capabilities for complex tasks" },
  { value: "sonar",       label: "Sonar",       description: "Balanced performance and features" },
];

const contextLevelOptions = [
  { value: "minimal", label: "Minimal", description: "Basic context, faster responses" },
  { value: "standard", label: "Standard", description: "Balanced context and performance" },
  { value: "comprehensive", label: "Comprehensive", description: "Detailed context, more thorough analysis" },
];

export default function SettingsPanel() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(modelOptions[0].value);
  const [saveMsg, setSaveMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // AI Context Configuration
  const [contextConfig, setContextConfig] = useState<AIContextConfig>({
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
  });

  // AI Model Configuration
  const [modelConfig, setModelConfig] = useState<AIModelConfig>({
    model: modelOptions[0].value,
    apiKey: "",
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: undefined,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) {
      alert('Please enter your Perplexity API key');
      return;
    }

    try {
      // Basic encoding for API key (not encryption, but better than plain text)
      const encodedApiKey = btoa(apiKey.trim());
      
      await chrome.storage.local.set({
        apiKey: encodedApiKey,
        model: modelConfig.model,
        aiModelConfig: modelConfig,
        aiContextConfig: contextConfig,
      });

      alert('Settings saved successfully!');
    } catch (error) {
      alert('Error saving settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const loadSettings = async () => {
    try {
      const data = await chrome.storage.local.get([
        "apiKey",
        "model",
        "aiModelConfig",
        "aiContextConfig"
      ]);

      if (data.apiKey) {
        // Decode the API key
        try {
          setApiKey(atob(data.apiKey));
        } catch {
          // If decoding fails, use as-is (backward compatibility)
          setApiKey(data.apiKey);
        }
      }
      if (data.model) setModel(data.model);
      if (data.aiModelConfig) setModelConfig(data.aiModelConfig);
      if (data.aiContextConfig) setContextConfig(data.aiContextConfig);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (saveMsg) setSaveMsg("");
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
    if (saveMsg) setSaveMsg("");
  };

  const handleContextConfigChange = (key: keyof AIContextConfig, value: any) => {
    setContextConfig(prev => ({ ...prev, [key]: value }));
    if (saveMsg) setSaveMsg("");
  };

  const handleModelConfigChange = (key: keyof AIModelConfig, value: any) => {
    setModelConfig(prev => ({ ...prev, [key]: value }));
    if (saveMsg) setSaveMsg("");
  };

  const validateContextConfig = () => {
    const validation = defaultAIContextManager.validateConfig();
    return validation;
  };

  if (isLoading) {
    return (
      <div className="settings-panel">
        <div className="settings-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  const contextValidation = validateContextConfig();

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2><i className="fas fa-cog"></i> Settings</h2>
        <p className="settings-subtitle">Configure your AI assistant preferences</p>
      </div>

      <div className="settings-content">
        {/* API Configuration */}
        <div className="setting-group">
          <h3 className="setting-group-title">
            <i className="fas fa-key"></i> API Configuration
          </h3>
          
          <div className="setting-item">
            <div className="setting-label">
              <label htmlFor="apiKey">
                <i className="fas fa-key"></i>
                API Key
              </label>
              <span className="setting-required">*</span>
            </div>
            <div className="setting-input-container">
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your Perplexity API key"
                className="setting-input"
              />
              <div className="input-status">
                {apiKey ? (
                  <i className="fas fa-check-circle status-valid"></i>
                ) : (
                  <i className="fas fa-exclamation-circle status-required"></i>
                )}
              </div>
            </div>
            <p className="setting-help">
              Get your API key from the <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer">Perplexity settings page</a>
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <label htmlFor="model">
                <i className="fas fa-brain"></i>
                AI Model
              </label>
            </div>
            <select
              id="model"
              value={model}
              onChange={handleModelChange}
              className="setting-select"
            >
              {modelOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* AI Context Configuration */}
        <div className="setting-group">
          <h3 className="setting-group-title">
            <i className="fas fa-cogs"></i> AI Context Configuration
          </h3>
          
          <div className="setting-item">
            <div className="setting-label">
              <label htmlFor="contextLevel">
                <i className="fas fa-layer-group"></i>
                Context Level
              </label>
            </div>
            <select
              id="contextLevel"
              value={contextConfig.contextLevel}
              onChange={(e) => handleContextConfigChange('contextLevel', e.target.value)}
              className="setting-select"
            >
              {contextLevelOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <label htmlFor="maxContextLength">
                <i className="fas fa-ruler-horizontal"></i>
                Max Context Length
              </label>
            </div>
            <input
              id="maxContextLength"
              type="number"
              value={contextConfig.maxContextLength}
              onChange={(e) => handleContextConfigChange('maxContextLength', parseInt(e.target.value))}
              min="1000"
              max="20000"
              step="1000"
              className="setting-input"
            />
            <p className="setting-help">
              Maximum characters to include in context (1000-20000)
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <label htmlFor="customInstructions">
                <i className="fas fa-comment-dots"></i>
                Custom Instructions
              </label>
            </div>
            <textarea
              id="customInstructions"
              value={contextConfig.customInstructions || ""}
              onChange={(e) => handleContextConfigChange('customInstructions', e.target.value || undefined)}
              placeholder="Optional: Add custom instructions for the AI..."
              className="setting-textarea"
              rows={3}
            />
            <p className="setting-help">
              Additional instructions that will be included in every AI request
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-checkbox">
              <input
                id="usePageContext"
                type="checkbox"
                checked={contextConfig.usePageContext}
                onChange={(e) => handleContextConfigChange('usePageContext', e.target.checked)}
                className="setting-checkbox-input"
              />
              <label htmlFor="usePageContext">
                <i className="fas fa-file-alt"></i>
                Include Page Context
              </label>
            </div>
            <p className="setting-help">
              Include current page content when asking questions
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-checkbox">
              <input
                id="includeMetadata"
                type="checkbox"
                checked={contextConfig.includeMetadata}
                onChange={(e) => handleContextConfigChange('includeMetadata', e.target.checked)}
                className="setting-checkbox-input"
              />
              <label htmlFor="includeMetadata">
                <i className="fas fa-info-circle"></i>
                Include Page Metadata
              </label>
            </div>
            <p className="setting-help">
              Include page title and URL in context
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-checkbox">
              <input
                id="includeLinks"
                type="checkbox"
                checked={contextConfig.includeLinks}
                onChange={(e) => handleContextConfigChange('includeLinks', e.target.checked)}
                className="setting-checkbox-input"
              />
              <label htmlFor="includeLinks">
                <i className="fas fa-link"></i>
                Include Page Links
              </label>
            </div>
            <p className="setting-help">
              Include page links in context (when available)
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-checkbox">
              <input
                id="showTags"
                type="checkbox"
                checked={contextConfig.showTags}
                onChange={(e) => handleContextConfigChange('showTags', e.target.checked)}
                className="setting-checkbox-input"
              />
              <label htmlFor="showTags">
                <i className="fas fa-tags"></i>
                Show Tags
              </label>
            </div>
            <p className="setting-help">
              Display relevant tags after AI responses
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-checkbox">
              <input
                id="showSuggestedQuestions"
                type="checkbox"
                checked={contextConfig.showSuggestedQuestions}
                onChange={(e) => handleContextConfigChange('showSuggestedQuestions', e.target.checked)}
                className="setting-checkbox-input"
              />
              <label htmlFor="showSuggestedQuestions">
                <i className="fas fa-question-circle"></i>
                Show Suggested Questions
              </label>
            </div>
            <p className="setting-help">
              Display suggested follow-up questions after AI responses
            </p>
          </div>
        </div>

        {/* AI Model Configuration */}
        <div className="setting-group">
          <h3 className="setting-group-title">
            <i className="fas fa-sliders-h"></i> Model Parameters
          </h3>
          
          <div className="setting-item">
            <div className="setting-label">
              <label htmlFor="temperature">
                <i className="fas fa-thermometer-half"></i>
                Temperature
              </label>
            </div>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={modelConfig.temperature || 0.7}
              onChange={(e) => handleModelConfigChange('temperature', parseFloat(e.target.value))}
              className="setting-range"
            />
            <div className="setting-range-labels">
              <span>Focused (0.0)</span>
              <span>Balanced (0.7)</span>
              <span>Creative (2.0)</span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <label htmlFor="maxTokens">
                <i className="fas fa-hashtag"></i>
                Max Tokens
              </label>
            </div>
            <input
              id="maxTokens"
              type="number"
              value={modelConfig.maxTokens || 4000}
              onChange={(e) => handleModelConfigChange('maxTokens', parseInt(e.target.value))}
              min="1000"
              max="8000"
              step="500"
              className="setting-input"
            />
            <p className="setting-help">
              Maximum tokens in AI response (1000-8000)
            </p>
          </div>
        </div>

        {/* Validation Messages */}
        {!contextValidation.isValid && (
          <div className="setting-validation">
            <h4><i className="fas fa-exclamation-triangle"></i> Configuration Issues</h4>
            <ul>
              {contextValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Save Button */}
        <div className="setting-actions">
          <button
            onClick={handleSaveSettings}
            disabled={isLoading || !contextValidation.isValid}
            className="setting-save-btn"
          >
            <i className="fas fa-save"></i>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
          {saveMsg && (
            <div className={`save-message ${saveMsg.includes('Error') ? 'error' : 'success'}`}>
              {saveMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}