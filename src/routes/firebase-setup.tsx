import React, { useState, useEffect } from 'react';
import FirebaseSetupWizard from '../components/FirebaseSetupWizard';
import { useNavigate } from 'react-router-dom';
import '../css/firebaseSetup.css';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export default function FirebaseSetupPage() {
  const navigate = useNavigate();
  const [isConfigured, setIsConfigured] = useState(false);
  const [showWizard, setShowWizard] = useState(true);

  // Check if Firebase is already configured
  useEffect(() => {
    const checkFirebaseConfig = async () => {
      try {
        const result = await chrome.storage.local.get(['firebaseConfig']);
        if (result.firebaseConfig && result.firebaseConfig.apiKey) {
          setIsConfigured(true);
        }
      } catch (error) {
        console.error('Error checking Firebase config:', error);
      }
    };

    checkFirebaseConfig();
  }, []);

  const handleWizardComplete = async (config: FirebaseConfig) => {
    try {
      // Save Firebase config to storage
      await chrome.storage.local.set({ firebaseConfig: config });
      setIsConfigured(true);
      setShowWizard(false);
      
      // Show success message
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } catch (error) {
      console.error('Error saving Firebase config:', error);
    }
  };

  const handleWizardCancel = () => {
    navigate('/settings');
  };

  return (
    <div className="firebase-setup-page">
      <div className="firebase-setup-header">
        <button 
          onClick={() => navigate('/settings')}
          className="back-button"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Settings
        </button>
        <h1>
          <i className="fas fa-database"></i>
          Firebase Database Setup
        </h1>
      </div>

      {isConfigured && !showWizard ? (
        <div className="firebase-setup-success">
          <div className="success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>Firebase Setup Complete!</h2>
          <p>Your Firebase database has been successfully configured.</p>
          <p>Redirecting to settings...</p>
        </div>
      ) : (
        <div className="firebase-setup-content">
          {showWizard && (
            <FirebaseSetupWizard 
              onComplete={handleWizardComplete}
              onCancel={handleWizardCancel}
            />
          )}
        </div>
      )}
    </div>
  );
} 