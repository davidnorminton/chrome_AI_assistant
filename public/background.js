// background.js

// 1) Icon-click flow: open side panel & inject content.js
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel
  chrome.sidePanel.open({ tabId: tab.id }).catch(console.error);

  // Inject content.js so it can handle later requests
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    })
    .then(() => {
      // content.js injected
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

  // 4) Handle screenshot capture requests from content script
  if (request.action === "captureScreenshot") {
    // Store the sendResponse function to use later
    let responseSent = false;
    const sendResponseSafe = (response) => {
      if (!responseSent) {
        responseSent = true;
        sendResponse(response);
      }
    };
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        console.error("[Background] No active tab found");
        sendResponseSafe({ error: "no_active_tab" });
        return;
      }

      // Check if the tab URL allows screenshots
      if (tab.url && /^(chrome|edge|about|view-source|file|data|blob):/.test(tab.url)) {
        console.error("[Background] Screenshot not allowed for URL:", tab.url);
        sendResponseSafe({ error: "screenshot_not_allowed_for_url" });
        return;
      }

      // Check if tab is ready for screenshot
      if (tab.status !== 'complete') {
        console.error("[Background] Tab not ready for screenshot, status:", tab.status);
        sendResponseSafe({ error: "tab_not_ready" });
        return;
      }

      // Try to capture the screenshot using the current window
      try {
        // Use null for the tabId to capture the current window
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError;
            console.error("[Background] Screenshot capture failed:", error);
            console.error("[Background] Error message:", error.message);
            // Try alternative approach if the first one fails
            chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl2) => {
              if (chrome.runtime.lastError) {
                console.error("[Background] Alternative capture also failed:", chrome.runtime.lastError);
                sendResponseSafe({ error: "screenshot_capture_failed" });
              } else if (!dataUrl2) {
                console.error("[Background] No dataUrl from alternative capture");
                sendResponseSafe({ error: "no_screenshot_data" });
              } else {
                sendResponseSafe({ imageData: dataUrl2 });
              }
            });
          } else if (!dataUrl) {
            console.error("[Background] No dataUrl received from captureVisibleTab");
            sendResponseSafe({ error: "no_screenshot_data" });
          } else {
            sendResponseSafe({ imageData: dataUrl });
          }
        });
      } catch (error) {
        console.error("[Background] Exception during screenshot capture:", error);
        sendResponseSafe({ error: error.message || "screenshot_capture_exception" });
      }
    });

    return true; // Keep the message channel open
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