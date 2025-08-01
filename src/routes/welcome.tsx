import React from 'react';
import { Link } from 'react-router-dom';

export default function WelcomePage() {
  return (
    <div className="welcome-page">
      <div className="welcome-header">
        <h1>🎯 Welcome to Orla</h1>
        <p>Your AI-powered browser assistant</p>
      </div>

      <div className="welcome-content">
        <div className="welcome-section">
          <h2>💬 Start Chatting</h2>
          <p>Ask questions about the current page or anything else</p>
          <Link to="/" className="chat-link">
            <button className="action-btn primary">
              💬 Go to Chat
            </button>
          </Link>
        </div>

        <div className="welcome-section">
          <h2>⚙️ Customize</h2>
          <div className="settings-links">
            <Link to="/settings" className="settings-link">
              <button className="action-btn secondary">
                ⚙️ Settings
              </button>
            </Link>
            <Link to="/help" className="help-link">
              <button className="action-btn secondary">
                ❓ Help
              </button>
            </Link>
          </div>
        </div>

        <div className="welcome-section">
          <h2>🎯 What can Orla do?</h2>
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <div className="feature-text">
                <strong>Summarize Pages</strong>
                <p>Get quick summaries of any webpage</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎬</span>
              <div className="feature-text">
                <strong>YouTube Analysis</strong>
                <p>Summarize YouTube videos with transcriptions</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📸</span>
              <div className="feature-text">
                <strong>Screenshot Analysis</strong>
                <p>Analyze images and screenshots</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <div className="feature-text">
                <strong>Smart Chat</strong>
                <p>Ask questions about any content</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 