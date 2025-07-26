// background.js

console.log("[Background] Background script loaded.");

chrome.action.onClicked.addListener(async (tab) => {
  console.log("[Background] Extension icon clicked for tab:", tab.id);

  try {
    // Open the side panel for the current tab
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log("[Background] Side panel opened for tab:", tab.id);

    // First, ensure content.js is injected into the current tab.
    // This is crucial for tabs that were open before the extension was installed/updated.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    console.log("[Background] Ensured content.js is injected into tab:", tab.id);

    // After content.js is ensured to be injected, send a message to request page info.
    // The content script will then send PAGE_INFO back to the sidebar.
    await chrome.tabs.sendMessage(tab.id, { type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT" });
    console.log("[Background] Requested page info from content script for tab:", tab.id);

  } catch (error) {
    console.error("[Background] Error handling extension click:", error);
    if (error.message.includes("Cannot access a chrome-internal URL")) {
      // Handle cases where the user clicks on a restricted page (e.g., chrome://extensions)
      // We can send a message to the sidebar to display a specific error.
      // Note: The sidebar itself cannot directly access chrome.tabs.query for this,
      // so the background script needs to mediate.
      chrome.runtime.sendMessage({
        type: "RESTRICTED_PAGE_ERROR",
        message: "Cannot access content on this type of browser page (e.g., internal browser pages, extension pages, or file system pages).",
        url: tab.url
      }).catch(e => console.warn("[Background] Could not send RESTRICTED_PAGE_ERROR to sidebar:", e));
    }
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
        // Ensure content.js is injected before requesting info
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }).then(() => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT" })
            .catch(error => console.error("[Background] Error forwarding REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT to content script after injection:", error));
        }).catch(error => {
          console.error("[Background] Error injecting content.js for REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT_VIA_BACKGROUND:", error);
          // If injection fails (e.g., restricted page), send error to sidebar
          chrome.runtime.sendMessage({
            type: "RESTRICTED_PAGE_ERROR",
            message: "Cannot access content on this type of browser page (e.g., internal browser pages, extension pages, or file system pages).",
            url: tabs[0].url
          }).catch(e => console.warn("[Background] Could not send RESTRICTED_PAGE_ERROR from background (injection failed):", e));
        });
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
    // Ensure content.js is injected first, especially for newly loaded tabs or refreshes
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      chrome.tabs.sendMessage(tabId, { type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT" })
        .catch(error => console.error(`[Background] Error sending REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT on tab update for ${tabId}:`, error));
    }).catch(error => {
      console.error(`[Background] Error injecting content.js on tab update for ${tabId}:`, error);
      // If injection fails (e.g., restricted page), send error to sidebar
      chrome.runtime.sendMessage({
        type: "RESTRICTED_PAGE_ERROR",
        message: "Cannot access content on this type of browser page (e.g., internal browser pages, extension pages, or file system pages).",
        url: tab.url
      }).catch(e => console.warn("[Background] Could not send RESTRICTED_PAGE_ERROR from background (tab update injection failed):", e));
    });
  }
});
