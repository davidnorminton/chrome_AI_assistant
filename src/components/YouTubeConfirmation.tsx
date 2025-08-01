import React from 'react';

interface YouTubeConfirmationProps {
  videoTitle: string;
  hasTranscription: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const YouTubeConfirmation: React.FC<YouTubeConfirmationProps> = ({
  videoTitle,
  hasTranscription,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="youtube-confirmation">
      <div className="youtube-confirmation-header">
        <h3>🎬 YouTube Video Detected</h3>
      </div>
      
      <div className="youtube-confirmation-content">
        <p className="title">"{videoTitle}"</p>
        
        {hasTranscription ? (
          <div className="confirmation-message">
            <p>This video has a transcription available.</p>
            <p>Would you like to summarize this YouTube video using its transcription?</p>
          </div>
        ) : (
          <div className="confirmation-message">
            <p>No transcription is available for this video.</p>
            <p>Would you like to analyze the page content instead?</p>
          </div>
        )}
      </div>
      
      <div className="youtube-confirmation-actions">
        <button 
          className="confirm-btn"
          onClick={onConfirm}
        >
          {hasTranscription ? 'Summarize Video' : 'Analyze Page'}
        </button>
        <button 
          className="cancel-btn"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}; 