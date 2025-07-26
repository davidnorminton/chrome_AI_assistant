// src/routes/home.tsx
import { useEffect, useContext } from "react";
import Welcome from "../welcome/welcome";
import Prompt from "../prompt/prompt";
import ContentDisplay from "../components/ContentDisplay";
import PageHeader from "../components/PageHeader";
import LinkList from "../components/LinkList";

import { useHomeLogic } from "../hooks/useHomeLogic";
import { AppActionsContext } from "../App";

export default function Home() {
  const actions = useContext(AppActionsContext);
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
  }, [actions, sendNewsQuery]);

  // Calculate display states
  const showPageHeader = Boolean(outputHtml) && shouldShowPageHeader();
  const showLinkList = shouldShowLinkList();


  return (
    <div id="tabContent">
      <div id="currentTab" className="tab-panel active">
        {/* Page Header */}
        <PageHeader
          savedPageInfo={savedPageInfo}
          pageInfo={pageInfo}
          shouldShow={showPageHeader}
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
          onClearContent={handleClearContent}
          showWelcome={showWelcome}
          screenshotData={restoredScreenshotData || undefined}
        >
          <Welcome onSummarize={() => handleSummarize()} />
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
        />
      </div>
    </div>
  );
}