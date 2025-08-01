// src/routes/home.tsx
import { useEffect, useContext, useState } from "react";
import { Welcome } from "../welcome/welcome";
import Prompt from "../prompt/prompt";
import ContentDisplay from "../components/ContentDisplay";

import { YouTubeConfirmation } from "../components/YouTubeConfirmation";

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
    usePageContext,
    setUsePageContext,
    useWebSearch,
    setUseWebSearch,

    restoredScreenshotData,
    firebaseScreenshotURL,
    currentHistoryItemType,
    currentHistoryItemFileName,
    transcription,
    videoInfo,
    userSettings, // Add user settings
    showYouTubeConfirmation,
    pendingYouTubeInfo,
    
    // Handlers
    handleSummarize,
    handleSend,
    handleTagClick,
    handleSuggestedClick,
    handleScreenshotCapture,
    handleClearContent,
    handleYouTubeConfirm,
    handleYouTubeCancel,
    

  } = useHomeLogic();

  // Set the context functions
  useEffect(() => {
    if (actions?.setClearContent) {
      actions.setClearContent(handleClearContent);
    }
  }, [actions, handleClearContent]);

  // Handle file processing state changes
  const handleFileProcessingChange = (isProcessing: boolean, fileName: string | null, fileType: string | null) => {
    setIsProcessingFile(isProcessing);
    setProcessingFileName(fileName);
    setProcessingFileType(fileType);
  };




  return (
    <div id="tabContent">
      <div id="currentTab" className="tab-panel active">
        {/* YouTube Confirmation */}
        {showYouTubeConfirmation && pendingYouTubeInfo && (
          <YouTubeConfirmation
            videoTitle={pendingYouTubeInfo.title}
            hasTranscription={!!pendingYouTubeInfo.transcription}
            onConfirm={handleYouTubeConfirm}
            onCancel={handleYouTubeCancel}
          />
        )}



        {/* Content Display */}
        <ContentDisplay
          outputHtml={outputHtml}
          tags={tags}
          suggested={suggested}
          onTagClick={handleTagClick}
          onSuggestedClick={handleSuggestedClick}

          screenshotData={restoredScreenshotData || undefined}
          firebaseScreenshotURL={firebaseScreenshotURL || undefined}
          isProcessingFile={isProcessingFile}
          processingFileName={processingFileName}
          processingFileType={processingFileType}
          currentHistoryItemType={currentHistoryItemType}
          currentHistoryItemFileName={currentHistoryItemFileName}
          loading={loading}
          transcription={transcription || undefined}
          videoInfo={videoInfo || undefined}
          userSettings={userSettings}
        />

        {/* Prompt */}
        <Prompt
          onSend={handleSend}
          onSummarize={() => handleSummarize()}
          loading={loading}
          useContext={usePageContext}
          setUseContext={setUsePageContext}
          onScreenshotCapture={handleScreenshotCapture}
          onFileProcessingChange={handleFileProcessingChange}
        />
      </div>
    </div>
  );
}