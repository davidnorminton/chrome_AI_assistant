// background.js

console.log("[Background] Background script loaded.");

chrome.action.onClicked.addListener(async (tab) => {
  console.log("[Background] Extension icon clicked for tab:", tab.id);

  // Open the side panel for the current tab
  await chrome.sidePanel.open({ tabId: tab.id });
  console.log("[Background] Side panel opened for tab:", tab.id);

  // Send a message to the content script to request page info
  // This ensures the content script is active and ready to provide data
  // and the sidebar can immediately display relevant page info.
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT" });
    console.log("[Background] Requested page info from content script.");
  } catch (error) {
    console.error("[Background] Error sending REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT:", error);
    // If the content script isn't ready, it might be due to a new tab or a restricted page.
    // The content script will eventually load and send PAGE_INFO automatically.
  }
});

// Listener for messages from sidebar.js (via chrome.runtime.sendMessage)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Background] Message received from sidebar:", request.type);

  if (request.type === 'REQUEST_PAGE_TEXT_FROM_CONTENT_SCRIPT') {
    // Forward the request to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_TEXT" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[Background] Error forwarding GET_PAGE_TEXT to content script:", chrome.runtime.lastError.message);
            sendResponse({ text: '', error: 'content_script_error' });
          } else {
            sendResponse(response); // Send content script's response back to sidebar
          }
        });
      } else {
        console.warn("[Background] No active tab found to get page text.");
        sendResponse({ text: '', error: 'no_active_tab' });
      }
    });
    return true; // Keep the message channel open for async response
  }

  if (request.type === 'REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT_VIA_BACKGROUND') {
    // This message is from sidebar.js, asking background to request page info from content.js
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT" })
          .catch(error => console.error("[Background] Error forwarding REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT to content script:", error));
      } else {
        console.warn("[Background] No active tab found to request page info.");
      }
    });
    // No direct response needed for this request, content script will send PAGE_INFO directly to sidebar
    return false;
  }

  // Handle PAGE_INFO_FROM_CONTENT_SCRIPT messages (for debugging or complex routing)
  if (request.type === 'PAGE_INFO_FROM_CONTENT_SCRIPT') {
    console.log("[Background] Received PAGE_INFO_FROM_CONTENT_SCRIPT:", request.data);
  }

  return false; // For other messages, no async response
});

// Set the side panel to be available on all hosts
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'sidebar.html',
    enabled: true
  });
});

// Optional: Listen for tab updates to ensure side panel context is fresh
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    console.log(`[Background] Tab updated (ID: ${tabId}). Requesting page info.`);
    // Send a message to the content script in the updated tab to get fresh info
    chrome.tabs.sendMessage(tabId, { type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT" })
      .catch(error => console.error(`[Background] Error sending REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT on tab update for ${tabId}:`, error));
  }
});
