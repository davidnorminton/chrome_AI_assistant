import React from 'react';

interface ContentDisplayProps {
  outputHtml: string;
  tags: string[];
  suggested: string[];
  onTagClick: (tag: string) => void;
  onSuggestedClick: (question: string) => void;
  onClearContent: () => void;
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
  onClearContent,
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
            <div className="content-header">
              <button 
                className="clear-content-button"
                onClick={onClearContent}
                title="Clear content"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            {screenshotData && (
              <div className="screenshot-display">
                <img 
                  src={screenshotData} 
                  alt="Screenshot" 
                  className="screenshot-image"
                />
              </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
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