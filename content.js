// content.js

// Log to confirm content script is loaded
console.log("[Content Script] Content script loaded and registering message listener.");

// Function to extract page text
function getPageText() {
  const url = window.location.href;
  // Check for restricted pages
  if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('view-source:') || url.startsWith('file://')) {
    console.warn("[Content Script] Attempted to extract text from a restricted page:", url);
    return { text: '', error: 'restricted_page' };
  } else {
    // Attempt to get innerText, handle potential errors or empty body
    const pageText = document.body ? document.body.innerText.trim() : ''; // Trim to check for truly empty content
    if (pageText.length === 0) {
      console.warn("[Content Script] Extracted page text is empty or only whitespace.");
      return { text: '', error: 'no_discernible_text' };
    }
    console.log("[Content Script] Extracted page text (length:", pageText.length, ")");
    return { text: pageText };
  }
}

// Function to send page metadata to the sidebar
function sendPageInfoToSidebar() {
  const url = window.location.href;
  const title = document.title;
  // Attempt to find a favicon, fallback to a default if not found or restricted
  let favIconUrl = '';
  const link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (link && link.href) {
    favIconUrl = link.href;
  } else if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('view-source:') || url.startsWith('file://')) {
    favIconUrl = chrome.runtime.getURL('icons/restricted.png'); // Placeholder for restricted pages
  }

  // Send message directly to the side panel
  chrome.runtime.sendMessage({
    type: 'PAGE_INFO',
    data: {
      url: url,
      title: title || "No Title", // Provide a fallback title
      domain: new URL(url).hostname || "No Domain", // Provide a fallback domain
      favicon: favIconUrl
    }
  }).catch(error => {
    // Catch error if side panel is not open or listener is not ready
    console.warn("[Content Script] Could not send PAGE_INFO to sidebar (likely not open or listener not ready):", error.message);
  });
}


// Listen for messages from the background script or sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content Script] Message received:", request.type);

  if (request.type === 'GET_PAGE_TEXT') {
    // Request from sidebar (via background) to get the current page's text
    const pageData = getPageText();
    sendResponse(pageData);
    return true; // Indicates that you will send a response asynchronously
  }

  if (request.type === 'REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT') {
    // Request from background/sidebar to send page info
    sendPageInfoToSidebar();
    sendResponse({ success: true, message: "Page info sent." });
    return true;
  }

  // Return false for messages not handled asynchronously
  return false;
});

// On page load (or refresh), send page info to the sidebar
document.addEventListener('DOMContentLoaded', () => {
  console.log("[Content Script] DOMContentLoaded fired. Sending initial page info.");
  sendPageInfoToSidebar();
});
