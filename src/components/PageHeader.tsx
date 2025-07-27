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
}

export default function PageHeader({ savedPageInfo, pageInfo, shouldShow, currentHistoryItemType, currentHistoryItemFileName }: PageHeaderProps) {
  if (!shouldShow) return null;

  return (
    <div className="page-link-header">
      {(savedPageInfo?.favicon || pageInfo.favicon) && (
        <img
          src={savedPageInfo?.favicon || pageInfo.favicon}
          alt="Favicon"
          className="header-favicon"
        />
      )}
      {currentHistoryItemType === 'file_analysis' && currentHistoryItemFileName ? (
        <span className="file-name-display">
          {currentHistoryItemFileName}
        </span>
      ) : (savedPageInfo?.title || pageInfo.title) ? (
        <a href={savedPageInfo?.url || pageInfo.url} target="_blank" rel="noopener noreferrer">
          {savedPageInfo?.title || pageInfo.title}
        </a>
      ) : null}
    </div>
  );
} 