
import icon from "./../icon.png";
import { getPageInfoFromTab } from "../utils/tabs";
import { useState, useEffect } from "react";

interface WelcomeProps {
  onSummarize?: () => void;
}

export default function Welcome({ onSummarize }: WelcomeProps) {
  const [pageTitle, setPageTitle] = useState<string>("");

  console.log('=== WELCOME COMPONENT RENDERED ===');
  console.log('onSummarize available:', !!onSummarize);
  console.log('pageTitle:', pageTitle);

  // Get page title on mount
  useEffect(() => {
    const getTitle = async () => {
      try {
        const info = await getPageInfoFromTab();
        if (info.title) {
          setPageTitle(info.title);
          console.log('Set page title to:', info.title);
        }
      } catch (error) {
        console.log('Could not get page title:', error);
      }
    };
    getTitle();
  }, []);

  const handleSummarizeClick = () => {
    console.log('=== SUMMARIZE BUTTON CLICKED ===');
    if (onSummarize) {
      console.log('Calling onSummarize function');
      onSummarize();
    } else {
      console.log('onSummarize function not available');
    }
  };

  return (
    <div className="intro orla">
        <h1>ORLA</h1>
        <p>Your personal A.I. browser assistant</p>
        <img src={ icon } width="250" height="250" />
        {pageTitle && onSummarize && (
          <button 
            className="summarize-page-btn"
            onClick={handleSummarizeClick}
          >
            Summarize "{pageTitle}"
          </button>
        )}
    </div>
  );
}
