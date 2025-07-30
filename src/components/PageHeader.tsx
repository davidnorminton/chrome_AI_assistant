import React from 'react';

interface PageInfo {
  title: string;
  url: string;
  favicon: string;
}

interface PageHeaderProps {
  savedPageInfo: PageInfo | null;
  pageInfo: PageInfo;
  shouldShow: boolean;
  currentHistoryItemType?: string | null;
  currentHistoryItemFileName?: string | null;
  currentHistoryItemTitle?: string | null;
}

export default function PageHeader({ savedPageInfo, pageInfo, shouldShow, currentHistoryItemType, currentHistoryItemFileName, currentHistoryItemTitle }: PageHeaderProps) {
  if (!shouldShow) return null;

  // Determine what title to display
  let displayTitle = '';
  let displayUrl = '';
  let showFavicon = false;
  
  if (currentHistoryItemType === 'file_analysis' && currentHistoryItemFileName) {
    displayTitle = currentHistoryItemFileName;
    displayUrl = '';
    showFavicon = false;
  } else if (currentHistoryItemType === 'definition' && currentHistoryItemTitle) {
    // For definition type (tag clicks), use the title directly
    displayTitle = currentHistoryItemTitle;
    displayUrl = '';
    showFavicon = false;
  } else if (currentHistoryItemType === 'search' && currentHistoryItemTitle) {
    // For search results, use the search title
    displayTitle = currentHistoryItemTitle;
    displayUrl = '';
    showFavicon = false;
  } else if (currentHistoryItemTitle) {
    // For other types with a title, use the title
    displayTitle = currentHistoryItemTitle;
    displayUrl = '';
    showFavicon = false;
  } else {
    // For summaries and page questions, use the page title with favicon
    displayTitle = savedPageInfo?.title || pageInfo.title;
    displayUrl = savedPageInfo?.url || pageInfo.url;
    showFavicon = true;
  }

  return (
    <div className="page-link-header">
      {showFavicon && (savedPageInfo?.favicon || pageInfo.favicon) && (
        <img
          src={savedPageInfo?.favicon || pageInfo.favicon}
          alt="Favicon"
          className="header-favicon"
        />
      )}
      {displayTitle && (
        displayUrl ? (
          <a href={displayUrl} target="_blank" rel="noopener noreferrer">
            {displayTitle}
          </a>
        ) : (
          <span>{displayTitle}</span>
        )
      )}
    </div>
  );
} 