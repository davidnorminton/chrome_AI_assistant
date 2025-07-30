import { useEffect, useState } from "react";
import type { AIContextConfig, AIModelConfig } from "../types";
import { defaultAIContextManager } from "../utils/aiContextManager";
import { useNavigate } from "react-router-dom";
import CollapsibleSection from "./CollapsibleSection";

// Define both the values _and_ user-friendly labels
const modelOptions = [
  { value: "sonar",       label: "Sonar",       description: "Balanced performance and features" },
  { value: "sonar-pro",   label: "Sonar Pro",   description: "Advanced capabilities for complex tasks" },
];

const contextLevelOptions = [
  { value: "minimal", label: "Minimal", description: "Basic context, faster responses" },
  { value: "standard", label: "Standard", description: "Balanced context and performance" },
  { value: "comprehensive", label: "Comprehensive", description: "Detailed context, more thorough analysis" },
];

export default function SettingsPanel() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("sonar");
  const [saveMsg, setSaveMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Google Sign-in state
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string>('');
  
  // Firebase status state
  const [firebaseStatus, setFirebaseStatus] = useState<'configured' | 'not-configured'>('not-configured');
  
  // Sync data state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
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
    model: "sonar",
    apiKey: "",
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: undefined,
  });

  // Check extension permissions and provide debugging info
  const checkExtensionPermissions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      try {
        const manifest = chrome.runtime.getManifest();
        console.log('Extension manifest:', manifest);
        console.log('Extension permissions:', manifest.permissions);
        console.log('Extension ID:', chrome.runtime.id);
      } catch (error) {
        console.error('Error getting manifest:', error);
      }
    }
  };

  useEffect(() => {
    loadSettings();
    checkExtensionPermissions();
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const result = await chrome.storage.local.get(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userProfile']);
        if (result.userAuthenticated && result.googleAuthToken) {
          // Check if token is still valid (24 hours)
          const tokenAge = Date.now() - (result.authTimestamp || 0);
          if (tokenAge < 24 * 60 * 60 * 1000) {
            setIsAuthenticated(true);
            // Get user name from profile
            if (result.userProfile) {
              setUserName(result.userProfile.displayName || result.userProfile.email || 'Guest');
            } else {
              setUserName('Guest');
            }
          } else {
            // Token expired, clear it
            await chrome.storage.local.remove(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userProfile']);
            setIsAuthenticated(false);
            setUserName('');
          }
        } else {
          setIsAuthenticated(false);
          setUserName('');
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuthStatus();
    
    // Listen for authentication changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.userAuthenticated || changes.userProfile) {
        checkAuthStatus();
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Check Firebase configuration status
  useEffect(() => {
    const checkFirebaseConfig = async () => {
      try {
        const result = await chrome.storage.local.get(['firebaseConfig']);
        if (result.firebaseConfig && result.firebaseConfig.apiKey) {
          setFirebaseStatus('configured');
        } else {
          setFirebaseStatus('not-configured');
        }
      } catch (error) {
        console.error('Error checking Firebase config:', error);
        setFirebaseStatus('not-configured');
      }
    };

    checkFirebaseConfig();
  }, []);

  // Listen for Firebase config changes
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.firebaseConfig) {
        const checkFirebaseConfig = async () => {
          try {
            const result = await chrome.storage.local.get(['firebaseConfig']);
            if (result.firebaseConfig && result.firebaseConfig.apiKey) {
              setFirebaseStatus('configured');
            } else {
              setFirebaseStatus('not-configured');
            }
          } catch (error) {
            console.error('Error checking Firebase config:', error);
            setFirebaseStatus('not-configured');
          }
        };
        checkFirebaseConfig();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) {
      alert('Please enter your Perplexity API key');
      return;
    }

    try {
      // Store API key as plain text (no encoding)
      const plainApiKey = apiKey.trim();
      
      // Update modelConfig with current state
      const updatedModelConfig = {
        ...modelConfig,
        apiKey: plainApiKey,
        model: model
      };
      
      await chrome.storage.local.set({
        apiKey: plainApiKey,
        model: model,
        aiModelConfig: updatedModelConfig,
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

      // Handle API key
      if (data.apiKey) {
        setApiKey(data.apiKey);
      }

      // Handle model
      if (data.model) {
        setModel(data.model);
      }

      // Handle AI model config
      if (data.aiModelConfig) {
        setModelConfig(data.aiModelConfig);
      }

      // Handle AI context config
      if (data.aiContextConfig) {
        setContextConfig(data.aiContextConfig);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError(null);
    
    try {
      console.log('Chrome identity API is available, attempting sign-in...');
      const { signInWithGoogle } = await import('../services/firebase');
      const user = await signInWithGoogle();
      console.log('Received token from Chrome identity:', user);
      
      // Store authentication state
      await chrome.storage.local.set({
        userAuthenticated: true,
        authTimestamp: Date.now()
      });
      
      console.log('Authentication state saved successfully');
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Google sign-in error:', error);
      setSignInError(error instanceof Error ? error.message : 'Sign-in failed');
      setIsAuthenticated(false);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncMessage('Syncing data to Firebase...');
    
    try {
      // Check if Firebase is configured
      const { isFirebaseConfigured } = await import('../services/storage');
      const firebaseConfigured = await isFirebaseConfigured();
      
      if (!firebaseConfigured) {
        setSyncMessage('❌ Firebase is not configured. Please set up Firebase first.');
        return;
      }
      
      // Check if user is authenticated
      const { isUserAuthenticated } = await import('../services/storage');
      const userAuthenticated = await isUserAuthenticated();
      
      if (!userAuthenticated) {
        setSyncMessage('❌ Please sign in with Google first before syncing data.');
        return;
      }
      
      // Perform the migration
      const { migrateToFirebase } = await import('../services/storage');
      const result = await migrateToFirebase();
      
      if (result) {
        setSyncMessage('✅ Data synced successfully to Firebase!');
      } else {
        setSyncMessage('❌ Failed to sync data. Please check your Firebase configuration.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage(`❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
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
        <CollapsibleSection title="API Configuration" icon="fas fa-key" defaultExpanded={true}>
          
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
        </CollapsibleSection>

        {/* Google Authentication Section */}
        <CollapsibleSection title="Google Authentication" icon="fab fa-google">
          
          <div className="setting-item">
            <div className="setting-label">
              <label>
                <i className="fas fa-user"></i>
                Authentication Status
              </label>
            </div>
            <div className="auth-status">
              <span className="auth-status-indicator">
                <i className={`fas fa-circle ${isAuthenticated ? 'status-online' : ''}`}></i>
                {isAuthenticated ? `Signed in as ${userName}` : 'Not Signed In'}
              </span>
            </div>
            <p className="setting-help">
              Sign in with Google to enable cloud storage and sync across devices
            </p>
          </div>

          <div className="setting-item">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="google-signin-btn"
            >
              {isSigningIn ? (
                <>
                  <div className="btn-spinner"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <i className="fab fa-google"></i>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
            {signInError && (
              <div className="setting-error">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{signInError}</span>
              </div>
            )}
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <label>
                <i className="fas fa-info-circle"></i>
                OAuth Configuration
              </label>
            </div>
            <div className="oauth-info">
              <p><strong>Client ID:</strong> 110625604157-dd7t9aa7bh0m4dietf5kn10k1qnrq62j.apps.googleusercontent.com</p>
              <p><strong>Project ID:</strong> orla-extension</p>
              <p><strong>Status:</strong> Configured</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Firebase Database Setup Wizard */}
        <CollapsibleSection title="Firebase Database Setup" icon="fas fa-database">
          
          <div className="setting-item">
            <div className="setting-label">
              <label>
                <i className="fas fa-info-circle"></i>
                Database Status
              </label>
            </div>
            <div className="firebase-status">
              <span className={`firebase-status-indicator ${firebaseStatus === 'configured' ? 'configured' : ''}`}>
                <i className="fas fa-circle"></i>
                {firebaseStatus === 'configured' ? 'Configured' : 'Not Configured'}
              </span>
            </div>
            <p className="setting-help">
              {firebaseStatus === 'configured' 
                ? 'Firebase Firestore database is configured and ready for cloud storage'
                : 'Set up Firebase Firestore database for cloud storage and data sync'
              }
            </p>
          </div>

          <div className="setting-item">
            <button
              onClick={() => navigate('/firebase-setup')}
              className="firebase-setup-btn"
            >
              <i className="fas fa-cog"></i>
              <span>
                {firebaseStatus === 'configured' ? 'Reconfigure Firebase' : 'Setup Firebase Database'}
              </span>
            </button>
            <p className="setting-help">
              {firebaseStatus === 'configured' 
                ? 'Click to reconfigure your Firebase database settings'
                : 'Follow the step-by-step wizard to configure Firebase Firestore'
              }
            </p>
          </div>

          {firebaseStatus === 'configured' && (
            <div className="setting-item">
              <button
                onClick={handleSyncData}
                disabled={isSyncing}
                className="sync-data-btn"
              >
                <i className="fas fa-sync-alt"></i>
                <span>
                  {isSyncing ? 'Syncing...' : 'Sync Data to Firebase'}
                </span>
              </button>
              <p className="setting-help">
                Push your local notes and history to Firebase cloud storage
              </p>
              {syncMessage && (
                <div className={`sync-message ${syncMessage.includes('✅') ? 'success' : 'error'}`}>
                  {syncMessage}
                </div>
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* AI Context Configuration */}
        <CollapsibleSection title="AI Context Configuration" icon="fas fa-cogs">
          
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
        </CollapsibleSection>

        {/* AI Model Configuration */}
        <CollapsibleSection title="Model Parameters" icon="fas fa-sliders-h">
          
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
        </CollapsibleSection>

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