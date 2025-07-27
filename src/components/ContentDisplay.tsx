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
  isProcessingFile?: boolean;
  processingFileName?: string | null;
  processingFileType?: string | null;
  currentHistoryItemType?: string | null;
  currentHistoryItemFileName?: string | null;
}

export default function ContentDisplay({
  outputHtml,
  tags,
  suggested,
  onTagClick,
  onSuggestedClick,
  showWelcome,
  screenshotData,
  children,
  isProcessingFile,
  processingFileName,
  processingFileType,
  currentHistoryItemType,
  currentHistoryItemFileName
}: ContentDisplayProps) {
  // Debug screenshot data
  console.log('ContentDisplay - screenshotData:', screenshotData ? 'present' : 'not present');
  // Determine if we should show the file name in the content area
  const fileNameToShow =
    (currentHistoryItemType === 'file_analysis' && currentHistoryItemFileName) ? currentHistoryItemFileName :
    (isProcessingFile && processingFileName && processingFileType && processingFileType !== 'screenshot') ? processingFileName :
    undefined;
  const showFileNameInContent =
    (currentHistoryItemType === 'file_analysis' && currentHistoryItemFileName) ||
    (isProcessingFile && processingFileName && processingFileType && processingFileType !== 'screenshot');

  return (
    <div id="responseBox">
      <div id="output">
        {showWelcome ? (
          <div key="welcome-container">
            {children}
          </div>
        ) : isProcessingFile ? (
          <div key="processing-container" className="file-processing-notice">
            <div className="processing-spinner"></div>
            <div className="processing-text">
              <p>Processing file...</p>
              <p className="file-info">
                <strong>{processingFileName}</strong>
                <span className="file-type">({processingFileType})</span>
              </p>
              <p className="processing-note">This may take a moment for large files</p>
            </div>
          </div>
        ) : outputHtml ? (
          <div key="content-container">
            {/* Show file name above AI response for file analysis */}
            {showFileNameInContent && fileNameToShow && (
              <div className="file-name-display" style={{ marginBottom: 12 }}>
                {fileNameToShow}
              </div>
            )}
            {screenshotData && !isProcessingFile && currentHistoryItemType !== 'file_analysis' && (
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
            {/* Hide tags and suggested questions during AI loading */}
            {!outputHtml.includes('loading-status-message') && tags.length > 0 && (
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
            {!outputHtml.includes('loading-status-message') && suggested.length > 0 && (
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