// src/utils/tabs.ts

/**
 * Original implementation: directly send a message to get page info and resolve via callback.
 */
export function getPageTextFromTab(): Promise<{ text: string }> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: 'REQUEST_PAGE_TEXT_FROM_CONTENT_SCRIPT' },
      (resp: any) => resolve({ text: resp?.text || '' })
    );
  });
}

// src/utils/tabs.ts

export interface PageInfo {
  text: string;
  url: string;
  title: string;
  favicon: string;
  error?: string;
}

/**
 * Sends a message to the background script → content script,
 * and resolves to a PageInfo object (never undefined).
 */
export function getPageInfoFromTab(): Promise<PageInfo> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: 'REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT' },
      (resp: any) => {
        resolve({
          text:    resp?.text    ?? '',
          url:     resp?.url     ?? '',
          title:   resp?.title   ?? '',
          favicon: resp?.favicon ?? '',
          error:   resp?.error
        });
      }
    );
  });
}