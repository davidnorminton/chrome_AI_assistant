import React, { useState } from 'react';
import '../css/firebaseSetupWizard.css';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface FirebaseSetupWizardProps {
  onComplete: (config: FirebaseConfig) => void;
  onCancel: () => void;
}

const FirebaseSetupWizard: React.FC<FirebaseSetupWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [errors, setErrors] = useState<Partial<FirebaseConfig>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

  const steps = [
    {
      number: 1,
      title: 'Create Firebase Project',
      description: 'First, you need to create a Firebase project in the Firebase Console.'
    },
    {
      number: 2,
      title: 'Create Firestore Database',
      description: 'Set up Firestore database for storing your data.'
    },
    {
      number: 3,
      title: 'Get Configuration',
      description: 'Copy your Firebase configuration values.'
    },
    {
      number: 4,
      title: 'Test Configuration',
      description: 'Verify your configuration works correctly.'
    }
  ];

  const validateConfig = (): boolean => {
    const newErrors: Partial<FirebaseConfig> = {};
    
    if (!config.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    } else if (config.apiKey === "YOUR_API_KEY") {
      newErrors.apiKey = 'Please enter your actual Firebase API Key, not the placeholder';
    }
    
    if (!config.authDomain.trim()) newErrors.authDomain = 'Auth Domain is required';
    if (!config.projectId.trim()) newErrors.projectId = 'Project ID is required';
    if (!config.storageBucket.trim()) newErrors.storageBucket = 'Storage Bucket is required';
    if (!config.messagingSenderId.trim()) newErrors.messagingSenderId = 'Messaging Sender ID is required';
    if (!config.appId.trim()) newErrors.appId = 'App ID is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FirebaseConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      if (!validateConfig()) {
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    if (!validateConfig()) {
      return;
    }

    // Don't auto-complete, just move to the summary step
    setCurrentStep(steps.length);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <div className="step-instructions">
              <h3>Step 1: Create Firebase Project</h3>
              <ol>
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
                <li>Click "Create a project" or "Add project"</li>
                <li>Enter a project name (e.g., "Orla Extension")</li>
                <li>Choose whether to enable Google Analytics (optional)</li>
                <li>Click "Create project"</li>
              </ol>
              <div className="step-note">
                <i className="fas fa-info-circle"></i>
                <span>You'll need a Google account to create a Firebase project.</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="step-instructions">
              <h3>Step 2: Create Firestore Database</h3>
              <ol>
                <li>In your Firebase project, go to "Firestore Database" in the left sidebar</li>
                <li>Click "Create database"</li>
                <li>Choose "Start in test mode" for now</li>
                <li>Select a location (choose the closest to your users)</li>
                <li>Click "Done"</li>
              </ol>
              <div className="step-note">
                <i className="fas fa-info-circle"></i>
                <span>Test mode allows read/write access. You can secure it later.</span>
              </div>
              
              <div className="database-structure">
                <h4>Database Structure</h4>
                <p>Your data will be organized as follows:</p>
                <div className="structure-tree">
                  <div className="tree-item">
                    <i className="fas fa-users"></i>
                    <span>users/</span>
                  </div>
                  <div className="tree-item indent">
                    <i className="fas fa-user"></i>
                    <span>your-user-id/</span>
                  </div>
                  <div className="tree-item indent-2">
                    <i className="fas fa-sticky-note"></i>
                    <span>notes/</span>
                  </div>
                  <div className="tree-item indent-2">
                    <i className="fas fa-cog"></i>
                    <span>settings/</span>
                  </div>
                  <div className="tree-item indent-2">
                    <i className="fas fa-history"></i>
                    <span>history/</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="step-instructions">
              <h3>Step 3: Get Configuration Values</h3>
              <ol>
                <li>In your Firebase project, click the gear icon ⚙️ next to "Project Overview"</li>
                <li>Select "Project settings"</li>
                <li>Scroll down to "Your apps" section</li>
                <li>Click the web icon (&lt;/&gt;) to add a web app</li>
                <li>Enter a nickname (e.g., "Orla Extension")</li>
                <li>Click "Register app"</li>
                <li>Copy the configuration values below</li>
              </ol>
            </div>
            
            <div className="config-form">
              <div className="form-group">
                <label htmlFor="apiKey">API Key *</label>
                <input
                  type="text"
                  id="apiKey"
                  value={config.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  placeholder="AIzaSyC..."
                  className={errors.apiKey ? 'error' : ''}
                />
                {errors.apiKey && <span className="error-message">{errors.apiKey}</span>}
                <div className="field-help">
                  <i className="fas fa-info-circle"></i>
                  <span>Find this in your Firebase project settings under "General" tab → "Your apps" → Web app configuration</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="authDomain">Auth Domain *</label>
                <input
                  type="text"
                  id="authDomain"
                  value={config.authDomain}
                  onChange={(e) => handleInputChange('authDomain', e.target.value)}
                  placeholder="your-project.firebaseapp.com"
                  className={errors.authDomain ? 'error' : ''}
                />
                {errors.authDomain && <span className="error-message">{errors.authDomain}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="projectId">Project ID *</label>
                <input
                  type="text"
                  id="projectId"
                  value={config.projectId}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
                  placeholder="your-project-id"
                  className={errors.projectId ? 'error' : ''}
                />
                {errors.projectId && <span className="error-message">{errors.projectId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="storageBucket">Storage Bucket *</label>
                <input
                  type="text"
                  id="storageBucket"
                  value={config.storageBucket}
                  onChange={(e) => handleInputChange('storageBucket', e.target.value)}
                  placeholder="your-project.appspot.com"
                  className={errors.storageBucket ? 'error' : ''}
                />
                {errors.storageBucket && <span className="error-message">{errors.storageBucket}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="messagingSenderId">Messaging Sender ID *</label>
                <input
                  type="text"
                  id="messagingSenderId"
                  value={config.messagingSenderId}
                  onChange={(e) => handleInputChange('messagingSenderId', e.target.value)}
                  placeholder="123456789"
                  className={errors.messagingSenderId ? 'error' : ''}
                />
                {errors.messagingSenderId && <span className="error-message">{errors.messagingSenderId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="appId">App ID *</label>
                <input
                  type="text"
                  id="appId"
                  value={config.appId}
                  onChange={(e) => handleInputChange('appId', e.target.value)}
                  placeholder="1:123456789:web:abc123"
                  className={errors.appId ? 'error' : ''}
                />
                {errors.appId && <span className="error-message">{errors.appId}</span>}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <div className="step-instructions">
              <h3>Step 4: Test Configuration</h3>
              <p>We'll test your Firebase configuration to ensure everything is set up correctly.</p>
              
              <div className="config-summary">
                <h4>Configuration Summary:</h4>
                <div className="summary-item">
                  <span className="label">Project ID:</span>
                  <span className="value">{config.projectId}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Auth Domain:</span>
                  <span className="value">{config.authDomain}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Storage Bucket:</span>
                  <span className="value">{config.storageBucket}</span>
                </div>
              </div>

              <div className="step-note">
                <i className="fas fa-info-circle"></i>
                <span>Click "Complete Setup" to test and save your configuration.</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="firebase-setup-wizard">
      <div className="wizard-header">
        <h2>Firebase Setup Wizard</h2>
        <p>Follow these steps to configure Firebase for cloud storage</p>
      </div>

      <div className="wizard-progress">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`progress-step ${currentStep >= step.number ? 'active' : ''} ${currentStep === step.number ? 'current' : ''}`}
          >
            <div className="step-number">{step.number}</div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-description">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="wizard-content">
        {renderStepContent()}
      </div>

      <div className="wizard-actions">
        <button
          className="btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        
        <div className="wizard-nav">
          {currentStep > 1 && (
            <button
              className="btn-secondary"
              onClick={handleBack}
              disabled={isLoading}
            >
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
          )}
          
          {currentStep < steps.length ? (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={isLoading}
            >
              Next
              <i className="fas fa-arrow-right"></i>
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="btn-spinner"></div>
                  Testing...
                </>
              ) : (
                <>
                  Complete Setup
                  <i className="fas fa-check"></i>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {currentStep === steps.length && (
        <div className="firebase-setup-summary">
          <div className="setup-complete-header">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Setup Complete</h3>
            <p>Your Firebase configuration has been saved successfully.</p>
          </div>
          
          <div className="connection-test-section">
            <h4>Test Your Connection</h4>
            <button
              className="check-connection-btn"
              onClick={async () => {
                setIsLoading(true);
                setConnectionStatus(null);
                try {
                  // Try to initialize Firebase with the provided config
                  const { getFirestore, collection, getDocs } = await import('firebase/firestore');
                  const { initializeApp } = await import('firebase/app');
                  const app = initializeApp(config);
                  const db = getFirestore(app);
                  await getDocs(collection(db, 'test-connection'));
                  setConnectionStatus('success');
                } catch (error) {
                  setConnectionStatus('error');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Checking...' : 'Check Connection'}
            </button>
            {connectionStatus === 'success' && (
              <div className="connection-success">✅ Connection successful!</div>
            )}
            {connectionStatus === 'error' && (
              <div className="connection-error">❌ Connection failed. Please check your config.</div>
            )}
          </div>
          
          {connectionStatus === 'success' && (
            <div className="migration-section">
              <div className="auth-info">
                <h4>Authentication Status</h4>
                <p>
                  <i className="fas fa-check-circle"></i>
                  You're already signed in with Google. Your credentials will be used for Firebase authentication.
                </p>
              </div>
              
              <div className="migration-options">
                <h4>Migrate Your Data</h4>
                <p>Upload your existing notes and history to Firebase:</p>
                
                <button
                  className="clear-config-btn"
                  onClick={async () => {
                    try {
                      await chrome.storage.local.remove(['firebaseConfig']);
                      setMigrationMessage('✅ Invalid Firebase config cleared. Please reconfigure with valid credentials.');
                    } catch (error) {
                      console.error('Failed to clear config:', error);
                      setMigrationMessage('❌ Failed to clear invalid config.');
                    }
                  }}
                >
                  Clear Invalid Config & Start Fresh
                </button>
                
                <button
                  className="create-test-data-btn"
                  onClick={async () => {
                    try {
                      const { createTestData } = await import('../services/storage');
                      const result = await createTestData();
                      if (result) {
                        setMigrationMessage('✅ Test data created! You can now try the migration.');
                      } else {
                        setMigrationMessage('❌ Failed to create test data.');
                      }
                    } catch (error) {
                      console.error('Test data creation error:', error);
                      setMigrationMessage(`❌ Failed to create test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                >
                  Create Test Data (if no data exists)
                </button>
                
                <button
                  className="upload-to-firebase-btn"
                  onClick={async () => {
                    setIsMigrating(true);
                    setMigrationMessage('Uploading your notes and history to Firebase...');
                    try {
                      // First, save the Firebase config to storage so it can be used
                      await chrome.storage.local.set({ firebaseConfig: config });
                      
                      // Reset Firebase to ensure it uses the new config
                      const { resetFirebase } = await import('../services/firebase');
                      resetFirebase();
                      
                      // Wait a moment for the config to be saved and Firebase to reset
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      // Then attempt migration
                      const { migrateToFirebase } = await import('../services/storage');
                      const result = await migrateToFirebase();
                      if (result) {
                        setMigrationMessage('✅ Upload complete! Your local data is kept as a backup. Please verify your data in Firebase.');
                      } else {
                        setMigrationMessage('❌ Upload failed. Your local data is unchanged. Please check your Firebase configuration and try again.');
                      }
                    } catch (error) {
                      console.error('Migration error:', error);
                      setMigrationMessage(`❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}. Your local data is unchanged.`);
                    } finally {
                      setIsMigrating(false);
                    }
                  }}
                  disabled={isMigrating}
                >
                  {isMigrating ? 'Uploading...' : 'Upload my current notes and history to Firebase'}
                </button>
                
                {migrationMessage && (
                  <div className="migration-message">{migrationMessage}</div>
                )}
                
                <div className="migration-note">
                  <strong>Note:</strong> Your local data will be kept as a backup in case you need to revert.
                </div>
              </div>
            </div>
          )}
          
          {/* Finish Setup Button */}
          <div className="finish-setup-section">
            <button
              className="finish-setup-btn"
              onClick={() => onComplete(config)}
            >
              Finish Setup
              <i className="fas fa-check"></i>
            </button>
            <p className="finish-setup-note">
              Click "Finish Setup" to complete the Firebase configuration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FirebaseSetupWizard; 