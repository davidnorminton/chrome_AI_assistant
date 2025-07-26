// background.js

console.log("[Background] Background script loaded.");

// 1) Icon-click flow: open side panel & inject content.js
chrome.action.onClicked.addListener((tab) => {
  console.log("[Background] Icon clicked for tab:", tab.id);

  // Open the side panel
  chrome.sidePanel.open({ tabId: tab.id }).catch(console.error);

  // Inject content.js so it can handle later requests
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    })
    .then(() => {
      console.log("[Background] content.js injected into tab:", tab.id);
    })
    .catch((err) => {
      console.error("[Background] scripting.executeScript error:", err);
    });
});

// 2) Handle “page info” requests from the sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT") {
    // Always find the active tab yourself:
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ text: "", url: "", title: "", favicon: "", error: "no_active_tab" });
        return;
      }

      // Make sure content.js is present
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        })
        .then(() => {
          // Then ask the content script for full page info
          chrome.tabs.sendMessage(
            tab.id,
            { type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT" },
            (resp) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "[Background] PAGE_INFO sendMessage failed:",
                  chrome.runtime.lastError.message
                );
                sendResponse({ text: "", url: "", title: "", favicon: "", error: "content_error" });
              } else {
                sendResponse(resp);
              }
            }
          );
        })
        .catch((err) => {
          console.error("[Background] PAGE_INFO injection error:", err);
          sendResponse({ text: "", url: "", title: "", favicon: "", error: err.message });
        });
    });

    return true; // keep the channel open for sendResponse
  }

  // 3) Handle text-only requests (summarization) from the sidebar
  if (request.type === "REQUEST_PAGE_TEXT_FROM_CONTENT_SCRIPT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ text: "", error: "no_active_tab" });
        return;
      }

      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        })
        .then(() => {
          chrome.tabs.sendMessage(
            tab.id,
            { type: "GET_PAGE_TEXT" },
            (resp) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "[Background] GET_PAGE_TEXT sendMessage failed:",
                  chrome.runtime.lastError.message
                );
                sendResponse({ text: "", error: "content_error" });
              } else {
                sendResponse(resp);
              }
            }
          );
        })
        .catch((err) => {
          console.error("[Background] GET_PAGE_TEXT injection error:", err);
          sendResponse({ text: "", error: err.message });
        });
    });

    return true;
  }

  return false;
});

// 4) Enable the side panel on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: "sidebar.html",
    enabled: true,
  });
});