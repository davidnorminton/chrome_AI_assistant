// background.js

console.log("[Background] Background script loaded.");

chrome.action.onClicked.addListener((tab) => {
  console.log("[Background] Extension icon clicked for tab:", tab.id);
  // Check if content.js is already injected and the sidebar is open
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: checkIfSidebarExistsAndIsOpen
  }).then((results) => {
    const sidebarExistsAndIsOpen = results && results[0] && results[0].result;
    console.log("[Background] Sidebar exists and is open:", sidebarExistsAndIsOpen);
    if (sidebarExistsAndIsOpen) {
      // If sidebar is already open, send message to content script to close it
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
      console.log("[Background] Sent TOGGLE_SIDEBAR message (to close).");
    } else {
      // If sidebar is not open, inject content.js and then send message to open it
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        console.log("[Background] Injected content.js successfully.");
        // After content.js is injected, send the message to toggle the sidebar
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
        console.log("[Background] Sent TOGGLE_SIDEBAR message (to open).");
      }).catch(err => console.error("[Background] Error injecting content script:", err));
    }
  }).catch(err => console.error("[Background] Error checking sidebar state:", err));
});

// Handle messages from sidebar to reinject content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Background] Message received:", request);
  if (request.type === 'REINJECT_CONTENT_SCRIPT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }).then(() => {
          console.log("[Background] Re-injected content.js");
          sendResponse({ success: true });
        }).catch(err => {
          console.error("[Background] Error re-injecting content.js:", err);
          sendResponse({ success: false, error: err.message });
        });
      } else {
        console.error("[Background] No active tab found for reinjection.");
        sendResponse({ success: false, error: "No active tab" });
      }
    });
    return true; // Keep the message channel open for async response
  }
  return true;
});

// This function will be executed in the context of the content script
function checkIfSidebarExistsAndIsOpen() {
  const sidebarIframe = document.getElementById('ai-sidebar-iframe');
  return sidebarIframe && sidebarIframe.style.transform === 'translateX(0px)';
}