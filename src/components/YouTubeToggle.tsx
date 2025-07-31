import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface YouTubeToggleProps {
  summary: string;
  transcription: string;
  videoInfo?: {
    videoId: string;
    title: string;
    summary: string;
    transcription: string;
  };
}

export const YouTubeToggle: React.FC<YouTubeToggleProps> = ({ summary, transcription, videoInfo }) => {
  const [view, setView] = useState<'summary' | 'transcription'>('summary');

  // Use videoInfo if available, otherwise fall back to props
  const displaySummary = videoInfo?.summary || summary;
  const rawTranscription = videoInfo?.transcription || transcription;
  
  // Format transcription for display
  const displayTranscription = `## Original Transcription\n\n\`\`\`\n${rawTranscription}\n\`\`\``;

  return (
    <div className="youtube-toggle-container">
      <div className="youtube-toggle-buttons">
        <button
          className={`youtube-toggle-btn ${view === 'summary' ? 'active' : ''}`}
          onClick={() => setView('summary')}
        >
          📝 Summary
        </button>
        <button
          className={`youtube-toggle-btn ${view === 'transcription' ? 'active' : ''}`}
          onClick={() => setView('transcription')}
        >
          🎬 Transcription
        </button>
      </div>
      
      <div className="youtube-content">
        {view === 'summary' ? (
          <MarkdownRenderer content={displaySummary} />
        ) : (
          <MarkdownRenderer content={displayTranscription} />
        )}
      </div>
    </div>
  );
}; 