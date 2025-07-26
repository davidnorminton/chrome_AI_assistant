/// <reference types="chrome" />
import { useEffect, useState } from "react";

// Define both the values _and_ user-friendly labels
const modelOptions = [
  { value: "sonar-small-online", label: "Sonar Small (Online)", description: "Fast and efficient for most tasks" },
  { value: "sonar-pro",        label: "Sonar Pro",          description: "Advanced capabilities for complex tasks" },
  { value: "sonar",            label: "Sonar",              description: "Balanced performance and features" },
];

export default function SettingsPanel() {
  const [apiKey, setApiKey]   = useState("");
  // Default to the first option so there's always a match
  const [model,   setModel]   = useState(modelOptions[0].value);
  const [saveMsg, setSaveMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(["apiKey", "model"], (data: { apiKey?: string; model?: string }) => {
      if (data.apiKey)   setApiKey(data.apiKey);
      if (data.model && modelOptions.some(opt => opt.value === data.model)) {
        setModel(data.model);
      }
      setIsLoading(false);
    });
  }, []);

  const saveSettings = () => {
    if (!apiKey.trim()) {
      setSaveMsg("API key is required!");
      return;
    }
    
    setIsLoading(true);
    chrome.storage.local.set({ apiKey: apiKey.trim(), model }, () => {
      setSaveMsg("Settings saved successfully!");
      setIsLoading(false);
      setTimeout(() => setSaveMsg(""), 3000);
    });
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (saveMsg) setSaveMsg(""); // Clear any previous messages
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
    if (saveMsg) setSaveMsg(""); // Clear any previous messages
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

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2><i className="fas fa-cog"></i> Settings</h2>
        <p className="settings-subtitle">Configure your AI assistant preferences</p>
      </div>

      <div className="settings-content">
        <div className="setting-group">
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

        <div className="setting-group">
          <div className="setting-label">
            <label htmlFor="model">
              <i className="fas fa-brain"></i>
              AI Model
            </label>
          </div>
          <div className="setting-input-container">
            <select 
              id="model"
              value={model} 
              onChange={handleModelChange}
              className="setting-select"
            >
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="input-status">
              <i className="fas fa-check-circle status-valid"></i>
            </div>
          </div>
          <p className="setting-help">
            {modelOptions.find(opt => opt.value === model)?.description}
          </p>
        </div>

        <div className="setting-actions">
          <button 
            onClick={saveSettings}
            className="save-button"
            disabled={!apiKey.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Save Settings
              </>
            )}
          </button>
          
          {saveMsg && (
            <div className={`save-message ${saveMsg.includes('required') ? 'error' : 'success'}`}>
              <i className={`fas ${saveMsg.includes('required') ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
              {saveMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}