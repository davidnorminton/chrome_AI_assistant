import React, { useState, useEffect } from 'react';
import { getStorageStatus, migrateToFirebase } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import FirebaseSetupWizard from './FirebaseSetupWizard';
import '../css/storageStatus.css';
import '../css/firebaseSetupWizard.css';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface StorageStatusType {
  firebaseConfigured: boolean;
  userAuthenticated: boolean;
  usingFirebase: boolean;
  usingChromeStorage: boolean;
}

const StorageStatus: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [storageStatus, setStorageStatus] = useState<StorageStatusType | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    checkStorageStatus();
  }, [isAuthenticated]);

  const checkStorageStatus = async () => {
    try {
      const status = await getStorageStatus();
      setStorageStatus(status);
    } catch (error) {
      console.error('Error checking storage status:', error);
    }
  };

  const handleMigrateToFirebase = async () => {
    if (!user) {
      setMigrationMessage('Please sign in first to migrate to Firebase.');
      return;
    }

    setIsMigrating(true);
    setMigrationMessage('');

    try {
      const success = await migrateToFirebase();
      if (success) {
        setMigrationMessage('✅ Migration completed successfully! Your data is now synced to Firebase.');
        await checkStorageStatus(); // Refresh status
      } else {
        setMigrationMessage('❌ Migration failed. Please try again.');
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationMessage('❌ Migration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsMigrating(false);
    }
  };

  const handleWizardComplete = async (config: FirebaseConfig) => {
    try {
      // Save the Firebase configuration to Chrome storage
      await chrome.storage.local.set({
        firebaseConfig: {
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId
        }
      });
      
      console.log('Firebase configuration saved successfully');
      
      // Refresh the storage status
      await checkStorageStatus();
      
      // Close the wizard
      setShowWizard(false);
      
      // Show success message
      setMigrationMessage('✅ Firebase setup completed successfully! You can now sign in with Google.');
    } catch (error) {
      console.error('Error saving Firebase configuration:', error);
      setMigrationMessage('❌ Failed to save Firebase configuration. Please try again.');
    }
  };

  const handleWizardCancel = () => {
    setShowWizard(false);
  };

  if (showWizard) {
    return (
      <div className="storage-status">
        <FirebaseSetupWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </div>
    );
  }

  if (!storageStatus) {
    return (
      <div className="storage-status">
        <div className="storage-status-loading">
          <div className="loading-spinner"></div>
          <span>Checking storage status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="storage-status">
      <div className="storage-status-header">
        <h3>Data Storage</h3>
        <div className={`storage-indicator ${storageStatus.usingFirebase ? 'firebase' : 'chrome'}`}>
          <i className={`fas ${storageStatus.usingFirebase ? 'fa-cloud' : 'fa-desktop'}`}></i>
          <span>{storageStatus.usingFirebase ? 'Firebase Cloud' : 'Chrome Storage'}</span>
        </div>
      </div>

      <div className="storage-status-details">
        <div className="status-item">
          <span className="status-label">Firebase Configured:</span>
          <span className={`status-value ${storageStatus.firebaseConfigured ? 'success' : 'warning'}`}>
            {storageStatus.firebaseConfigured ? '✅ Yes' : '⚠️ No (Optional)'}
          </span>
        </div>
        
        <div className="status-item">
          <span className="status-label">User Authenticated:</span>
          <span
            className={`status-value ${storageStatus.userAuthenticated ? 'success' : 'warning'}`}
            style={{ cursor: !storageStatus.userAuthenticated ? 'pointer' : 'default', textDecoration: !storageStatus.userAuthenticated ? 'underline' : 'none' }}
            onClick={async () => {
              if (!storageStatus.userAuthenticated) setShowSignIn(true);
            }}
          >
            {storageStatus.userAuthenticated ? '✅ Yes' : '⚠️ No (Optional)'}
          </span>
        </div>
        {/* Inline Google Sign-In Button */}
        {!storageStatus.userAuthenticated && showSignIn && (
          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            <button
              className="google-signin-btn"
              onClick={async () => {
                setSignInLoading(true);
                setSignInError(null);
                try {
                  const { signInWithGoogle } = await import('../services/firebase');
                  await signInWithGoogle();
                  await checkStorageStatus();
                  setShowSignIn(false);
                } catch (error) {
                  setSignInError('Failed to sign in. Please try again.');
                } finally {
                  setSignInLoading(false);
                }
              }}
              disabled={signInLoading}
            >
              {signInLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
            {signInError && <div className="sign-in-error">{signInError}</div>}
          </div>
        )}
        
        <div className="status-item">
          <span className="status-label">Current Storage:</span>
          <span className={`status-value ${storageStatus.usingFirebase ? 'success' : 'info'}`}>
            {storageStatus.usingFirebase ? 'Firebase Cloud' : 'Chrome Local Storage'}
          </span>
        </div>
      </div>

      {storageStatus.firebaseConfigured && storageStatus.userAuthenticated && !storageStatus.usingFirebase && (
        <div className="migration-section">
          <div className="migration-info">
            <i className="fas fa-info-circle"></i>
            <span>Your data is currently stored locally. Migrate to Firebase for cloud sync across devices.</span>
          </div>
          
          <button
            className="migrate-btn"
            onClick={handleMigrateToFirebase}
            disabled={isMigrating}
          >
            {isMigrating ? (
              <>
                <div className="btn-spinner"></div>
                <span>Migrating...</span>
              </>
            ) : (
              <>
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Migrate to Firebase</span>
              </>
            )}
          </button>
          
          {migrationMessage && (
            <div className={`migration-message ${migrationMessage.includes('✅') ? 'success' : 'error'}`}>
              {migrationMessage}
            </div>
          )}
        </div>
      )}

      {!storageStatus.firebaseConfigured && (
        <div className="setup-section">
          <div className="setup-info">
            <i className="fas fa-info-circle"></i>
            <span>Firebase is not configured. Your data is stored locally in Chrome. Configure Firebase to enable cloud storage and cross-device sync.</span>
          </div>
          
          <button
            className="setup-btn"
            onClick={() => setShowWizard(true)}
          >
            <i className="fas fa-magic"></i>
            <span>Setup Firebase Wizard</span>
          </button>
        </div>
      )}

      {storageStatus.usingFirebase && (
        <div className="firebase-info">
          <div className="firebase-success">
            <i className="fas fa-check-circle"></i>
            <span>Your data is synced to Firebase and available across all your devices.</span>
          </div>
        </div>
      )}

      {!storageStatus.firebaseConfigured && (
        <div className="local-storage-info">
          <div className="local-storage-success">
            <i className="fas fa-check-circle"></i>
            <span>Your data is stored locally in Chrome. This is perfectly fine for most users.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageStatus; 