import React from 'react';

interface AILoadingAnimationProps {
  message?: string;
}

export default function AILoadingAnimation({ message = "AI is thinking..." }: AILoadingAnimationProps) {
  return (
    <div className="ai-loading-animation">
      <div className="ai-pulse">
        <div className="ai-neural-lines">
          <div className="ai-neural-line"></div>
          <div className="ai-neural-line"></div>
          <div className="ai-neural-line"></div>
          <div className="ai-neural-line"></div>
          <div className="ai-neural-line"></div>
          <div className="ai-neural-line"></div>
          <div className="ai-neural-line"></div>
          <div className="ai-neural-line"></div>
        </div>
        <div className="ai-core"></div>
      </div>
      {message && (
        <div className="ai-loading-message">
          {message}
        </div>
      )}
    </div>
  );
} 