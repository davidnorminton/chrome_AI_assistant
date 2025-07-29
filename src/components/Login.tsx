import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../css/login.css';

const Login: React.FC = () => {
  const { signIn, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSkipLogin = () => {
    // Store a flag to indicate user chose to skip login
    chrome.storage.local.set({ 
      userAuthenticated: false,
      skipLogin: true,
      skipLoginTimestamp: Date.now()
    }).then(() => {
      // Close the login screen by updating the app state
      window.location.reload();
    });
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <i className="fas fa-robot"></i>
          </div>
          <h1>Welcome to Orla</h1>
          <p>Your AI-powered Chrome extension assistant</p>
        </div>

        <div className="login-content">
          <div className="login-features">
            <h2>Sign in with Google</h2>
            <p className="feature-description">
              Sign in with your Google account to access your profile and optionally enable cloud storage.
            </p>
            <ul>
              <li>
                <i className="fas fa-user"></i>
                <span>User profile and settings</span>
              </li>
              <li>
                <i className="fas fa-shield-alt"></i>
                <span>Secure authentication</span>
              </li>
              <li>
                <i className="fas fa-cloud"></i>
                <span>Optional cloud storage (setup later)</span>
              </li>
              <li>
                <i className="fas fa-sync"></i>
                <span>Cross-device sync (when configured)</span>
              </li>
            </ul>
          </div>

          <div className="login-actions">
            <button
              className="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
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

            {error && (
              <div className="login-error">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
              </div>
            )}

            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              className="skip-login-btn"
              onClick={handleSkipLogin}
            >
              <i className="fas fa-arrow-right"></i>
              <span>Continue without signing in</span>
            </button>

            <div className="login-info">
              <p>
                <i className="fas fa-info-circle"></i>
                You can always sign in later from the settings page to access your profile and enable cloud storage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 