
import icon from "./../icon.png";
import { getPageInfoFromTab } from "../utils/tabs";
import { useState, useEffect } from "react";

interface WelcomeProps {
  onSummarize?: () => void;
  onGeneralQuestion?: () => void;
}

export function Welcome({ onSummarize, onGeneralQuestion }: WelcomeProps) {
  const [pageTitle, setPageTitle] = useState<string>('');

  useEffect(() => {
    const getPageInfo = async () => {
      try {
        const info = await getPageInfoFromTab();
        setPageTitle(info.title);
      } catch (error) {
        // Handle error silently
      }
    };

    getPageInfo();
  }, []);

  const handleSummarize = () => {
    if (onSummarize) {
      onSummarize();
    }
  };

  const handleGeneralQuestion = () => {
    if (onGeneralQuestion) {
      onGeneralQuestion();
    }
  };

  return (
    <div className="intro orla">
        <h1>ORLA</h1>
        <p>Your personal A.I. browser assistant</p>
        <img src={ icon } width="250" height="250" />
        <div className="welcome-buttons">
          {onGeneralQuestion && (
            <button 
              className="general-question-btn"
              onClick={handleGeneralQuestion}
            >
              Ask a General Question
            </button>
          )}
          {pageTitle && onSummarize && (
            <button 
              className="summarize-page-btn"
              onClick={handleSummarize}
            >
              Summarize "{pageTitle}"
            </button>
          )}
        </div>
    </div>
  );
}
