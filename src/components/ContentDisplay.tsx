import React, { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
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

// Component to render syntax highlighted code blocks
const SyntaxHighlightedContent: React.FC<{ html: string }> = ({ html }) => {
  const [processedContent, setProcessedContent] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const processContent = () => {
      const container = document.createElement('div');
      container.innerHTML = html;
      
      const codeBlocks = container.querySelectorAll('pre code');
      const contentParts: React.ReactNode[] = [];
      let lastIndex = 0;
      
      codeBlocks.forEach((codeBlock, index) => {
        const code = codeBlock.textContent || '';
        const language = codeBlock.className.match(/language-(\w+)/)?.[1] || 'javascript';
        
        // Add text before this code block
        const beforeText = html.substring(lastIndex, html.indexOf(codeBlock.outerHTML, lastIndex));
        if (beforeText) {
          contentParts.push(
            <div key={`text-${index}`} dangerouslySetInnerHTML={{ __html: beforeText }} />
          );
        }
        
        // Add syntax highlighted code block
        contentParts.push(
          <SyntaxHighlighter
            key={`code-${index}`}
            language={language}
            style={tomorrow}
            customStyle={{
              margin: '16px 0',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          >
            {code}
          </SyntaxHighlighter>
        );
        
        lastIndex = html.indexOf(codeBlock.outerHTML, lastIndex) + codeBlock.outerHTML.length;
      });
      
      // Add remaining text after the last code block
      const remainingText = html.substring(lastIndex);
      if (remainingText) {
        contentParts.push(
          <div key="text-end" dangerouslySetInnerHTML={{ __html: remainingText }} />
        );
      }
      
      setProcessedContent(contentParts);
    };
    
    processContent();
  }, [html]);

  return <>{processedContent}</>;
};

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
              <SyntaxHighlightedContent html={outputHtml} />
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