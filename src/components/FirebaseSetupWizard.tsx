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
      title: 'Enable Authentication',
      description: 'Enable Google authentication for your project.'
    },
    {
      number: 3,
      title: 'Create Firestore Database',
      description: 'Set up Firestore database for storing your data.'
    },
    {
      number: 4,
      title: 'Get Configuration',
      description: 'Copy your Firebase configuration values.'
    },
    {
      number: 5,
      title: 'Test Configuration',
      description: 'Verify your configuration works correctly.'
    }
  ];

  const validateConfig = (): boolean => {
    const newErrors: Partial<FirebaseConfig> = {};
    
    if (!config.apiKey.trim()) newErrors.apiKey = 'API Key is required';
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
    if (currentStep === 4) {
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
              <h3>Step 2: Enable Authentication</h3>
              <ol>
                <li>In your Firebase project, go to "Authentication" in the left sidebar</li>
                <li>Click "Get started"</li>
                <li>Go to the "Sign-in method" tab</li>
                <li>Click on "Google" provider</li>
                <li>Enable it and click "Save"</li>
              </ol>
              <div className="step-note">
                <i className="fas fa-info-circle"></i>
                <span>This enables Google sign-in for your extension.</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="step-instructions">
              <h3>Step 3: Create Firestore Database</h3>
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
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <div className="step-instructions">
              <h3>Step 4: Get Configuration Values</h3>
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

      case 5:
        return (
          <div className="step-content">
            <div className="step-instructions">
              <h3>Step 5: Test Configuration</h3>
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
          <h3>Setup Complete</h3>
          <p>Your Firebase configuration has been saved.</p>
          <button
            className="check-connection-btn"
            onClick={async () => {
              setIsLoading(true);
              setConnectionStatus(null);
              try {
                // Try to initialize Firebase with the provided config
                // (Assume firebaseConfig is set globally or via context)
                // Try a simple Firestore read
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
          {connectionStatus === 'success' && (
            <>
              <button
                className="upload-to-firebase-btn"
                onClick={async () => {
                  setIsMigrating(true);
                  setMigrationMessage('Uploading your notes and history to Firebase...');
                  try {
                    const { migrateToFirebase } = await import('../services/storage');
                    const result = await migrateToFirebase();
                    if (result) {
                      setMigrationMessage('✅ Upload complete! Your local data is kept as a backup. Please verify your data in Firebase.');
                    } else {
                      setMigrationMessage('❌ Upload failed. Your local data is unchanged.');
                    }
                  } catch (error) {
                    setMigrationMessage('❌ Upload failed. Your local data is unchanged.');
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
            </>
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