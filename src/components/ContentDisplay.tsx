import React from 'react';
import AILoadingAnimation from './AILoadingAnimation';

interface ContentDisplayProps {
  outputHtml: string;
  tags: string[];
  suggested: string[];
  onTagClick: (tag: string) => void;
  onSuggestedClick: (question: string) => void;
  showWelcome: boolean;
  screenshotData?: string; // Screenshot data to display
  children?: React.ReactNode; // For Welcome component
}

export default function ContentDisplay({
  outputHtml,
  tags,
  suggested,
  onTagClick,
  onSuggestedClick,
  showWelcome,
  screenshotData,
  children
}: ContentDisplayProps) {
  // Debug screenshot data
  console.log('ContentDisplay - screenshotData:', screenshotData ? 'present' : 'not present');
  return (
    <div id="responseBox">
      <div id="output">
        {showWelcome ? (
          <div key="welcome-container">
            {children}
          </div>
        ) : outputHtml ? (
          <div key="content-container">
            {screenshotData && (
              <div className="screenshot-display">
                <img 
                  src={screenshotData} 
                  alt="Screenshot" 
                  className="screenshot-image"
                />
              </div>
            )}
            {!outputHtml.includes('loading-status-message') && (
              <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
            )}
            {outputHtml.includes('loading-status-message') && (
              <div className="ai-loading-container">
                <AILoadingAnimation message={outputHtml.replace(/<[^>]*>/g, '')} />
              </div>
            )}
            {tags.length > 0 && (
              <div className="tags-container">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="tag-item"
                    onClick={() => onTagClick(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {suggested.length > 0 && (
              <div className="suggested-questions-container">
                <ul>
                  {suggested.map((q) => (
                    <li key={q} onClick={() => onSuggestedClick(q)}>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div key="empty-container"></div>
        )}
      </div>
    </div>
  );
} 