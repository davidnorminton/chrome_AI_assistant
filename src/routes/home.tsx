// src/routes/home.tsx
import { useEffect, useContext, useState } from "react";
import Welcome from "../welcome/welcome";
import Prompt from "../prompt/prompt";
import ContentDisplay from "../components/ContentDisplay";
import PageHeader from "../components/PageHeader";
import LinkList from "../components/LinkList";

import { useHomeLogic } from "../hooks/useHomeLogic";
import { AppActionsContext } from "../App";

export default function Home() {
  const actions = useContext(AppActionsContext);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingFileName, setProcessingFileName] = useState<string | null>(null);
  const [processingFileType, setProcessingFileType] = useState<string | null>(null);
  
  const {
    // State
    outputHtml,
    tags,
    suggested,
    links,
    loading,
    searchQuery,
    pageInfo,
    savedPageInfo,
    usePageContext,
    setUsePageContext,
    useWebSearch,
    setUseWebSearch,

    screenshotData,
    restoredScreenshotData,
    currentHistoryItemType,
    currentHistoryItemFileName,
    showWelcome,
    
    // Handlers
    handleSummarize,
    handleSend,
    handleTagClick,
    handleSuggestedClick,
    handleScreenshotCapture,
    handleClearContent,
    
    // Helpers
    shouldShowPageHeader,
    shouldShowLinkList,

    sendNewsQuery,
  } = useHomeLogic();

  // Set the context functions
  useEffect(() => {
    if (actions?.setSendNewsQuery) {
      actions.setSendNewsQuery(sendNewsQuery);
    }
    if (actions?.setClearContent) {
      actions.setClearContent(handleClearContent);
    }
  }, [actions, sendNewsQuery, handleClearContent]);

  // Handle file processing state changes
  const handleFileProcessingChange = (isProcessing: boolean, fileName: string | null, fileType: string | null) => {
    setIsProcessingFile(isProcessing);
    setProcessingFileName(fileName);
    setProcessingFileType(fileType);
  };

  // Calculate display states
  const showPageHeader = Boolean(outputHtml) && Boolean(shouldShowPageHeader()) && !loading;
  const showLinkList = Boolean(shouldShowLinkList()) && !loading;


  return (
    <div id="tabContent">
      <div id="currentTab" className="tab-panel active">
        {/* Page Header */}
        <PageHeader
          savedPageInfo={savedPageInfo}
          pageInfo={pageInfo}
          shouldShow={showPageHeader}
          currentHistoryItemType={currentHistoryItemType}
          currentHistoryItemFileName={currentHistoryItemFileName}
        />

        {/* Link List */}
        <LinkList
          links={links}
          searchQuery={searchQuery}
          shouldShow={showLinkList}
        />



        {/* Content Display */}
        <ContentDisplay
          outputHtml={outputHtml}
          tags={tags}
          suggested={suggested}
          onTagClick={handleTagClick}
          onSuggestedClick={handleSuggestedClick}
          showWelcome={showWelcome}
          screenshotData={restoredScreenshotData || undefined}
          isProcessingFile={isProcessingFile}
          processingFileName={processingFileName}
          processingFileType={processingFileType}
          currentHistoryItemType={currentHistoryItemType}
          currentHistoryItemFileName={currentHistoryItemFileName}
          loading={loading}
        >
          <Welcome 
            onSummarize={() => handleSummarize()} 
            onGeneralQuestion={() => {
              // Focus the textarea and set placeholder for general question
              const textarea = document.getElementById('cmdInput') as HTMLTextAreaElement;
              if (textarea) {
                textarea.focus();
                textarea.placeholder = "Ask anything";
              }
            }}
          />
        </ContentDisplay>

        {/* Prompt */}
        <Prompt
          onSend={handleSend}
          onSummarize={() => handleSummarize()}
          loading={loading}
          useContext={usePageContext}
          setUseContext={setUsePageContext}
          useWebSearch={useWebSearch}
          setUseWebSearch={setUseWebSearch}
          onScreenshotCapture={handleScreenshotCapture}
          onFileProcessingChange={handleFileProcessingChange}
        />
      </div>
    </div>
  );
}