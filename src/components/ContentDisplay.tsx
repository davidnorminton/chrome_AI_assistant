import React, { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AILoadingAnimation from './AILoadingAnimation';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useStreaming } from '../context/StreamingContext';

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
  loading?: boolean; // Add loading prop
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
  currentHistoryItemFileName,
  loading
}: ContentDisplayProps) {
  const { isStreaming, streamContent } = useStreaming();
  
  // Debug screenshot data
  console.log('ContentDisplay - screenshotData:', screenshotData ? 'present' : 'not present');
  console.log('ContentDisplay - tags:', tags, 'suggested:', suggested, 'isStreaming:', isStreaming);

  // Clear loading state when streaming starts
  useEffect(() => {
    if (isStreaming && loading) {
      // This will trigger the parent component to clear loading
      // We can't directly set loading here, but we can signal it
      console.log('Streaming started, should clear loading');
    }
  }, [isStreaming, loading]);

  // Determine if we should show the file name in the content area
  const fileNameToShow =
    currentHistoryItemFileName ||
    (isProcessingFile && processingFileName) ||
    null;

  // Determine content to display - prioritize streaming content
  const displayContent = isStreaming ? streamContent : (outputHtml || streamContent);
  const isStreamingOrLoading = isStreaming || loading;

  return (
    <div id="responseBox">
      <div id="output">
        {/* Loading Animation - Show when loading OR streaming but hide when content starts */}
        {loading && !showWelcome && (
          <div className="loading-container">
            <AILoadingAnimation />
          </div>
        )}

        {/* Screenshot Display - Only show when not loading */}
        {!loading && screenshotData && (
          <div className="screenshot-display">
            <img
              src={screenshotData}
              alt="Screenshot"
              style={{ maxHeight: '250px', maxWidth: '100%', borderRadius: '8px' }}
            />
          </div>
        )}

        {/* File Processing Notice - Only show when not loading */}
        {!loading && isProcessingFile && processingFileName && (
          <div className="file-processing-notice">
            <div className="processing-spinner"></div>
            <p>Processing {processingFileType || 'file'}: {processingFileName}</p>
          </div>
        )}

        {/* File Name Display - Only show when not loading */}
        {!loading && fileNameToShow && (
          <div className="file-name-display">
            <i className="fas fa-file"></i>
            {fileNameToShow}
          </div>
        )}

        {/* Welcome Component - Only show when not loading */}
        {!loading && showWelcome && children}

        {/* Content Display - Show when not welcome and has content or is streaming */}
        {!showWelcome && (displayContent || isStreaming || streamContent) && (
          <div className="content-display">
            {isStreaming ? (
              <MarkdownRenderer content={displayContent} className="streaming" isStreaming={true} />
            ) : (
              <MarkdownRenderer content={displayContent} className="" isStreaming={false} />
            )}
          </div>
        )}

        {/* Tags - Show when content is available and not actively streaming */}
        {!isStreaming && tags.length > 0 && (
          <div className="tags-container">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="tag"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Suggested Questions - Show when content is available and not actively streaming */}
        {!isStreaming && suggested.length > 0 && (
          <div className="suggested-questions-container">
            <ul>
              {suggested.map((question, index) => (
                <li key={index} onClick={() => onSuggestedClick(question)}>
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 