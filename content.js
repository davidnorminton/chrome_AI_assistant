// content.js
let sidebarIframe = null; // This variable will persistently store the iframe element

// Log to confirm content script is loaded
console.log("[Content Script] Registering message listener.");

// Periodically log to confirm script is still running
setInterval(() => {
  console.log("[Content Script] Still alive at:", new Date().toISOString());
}, 5000);

function createAndAppendSidebar() {
  if (!sidebarIframe) {
    sidebarIframe = document.createElement('iframe');
    sidebarIframe.id = 'ai-sidebar-iframe';
    sidebarIframe.src = chrome.runtime.getURL('sidebar.html');
    sidebarIframe.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 450px;
      height: 100%;
      border: none;
      z-index: 99999999999999999999999999999999;
      box-shadow: -2px 0 5px rgba(0,0,0,0.2);
      transition: transform 0.3s ease-in-out;
      transform: translateX(100%);
      display: block;
      overscroll-behavior: contain; /* Prevent scroll from affecting parent */
      overflow-y: auto; /* Allow scrolling within iframe if needed */
    `;
    if (!document.body) {
      console.error("[Content Script] document.body is null. Cannot append iframe.");
      return;
    }
    document.body.appendChild(sidebarIframe);
    console.log("[Content Script] Sidebar iframe created and appended to DOM.");

    // Disable main page scrolling when cursor is over sidebar
    let originalOverflow = document.body.style.overflow || 'auto';
    sidebarIframe.addEventListener('mouseenter', () => {
      originalOverflow = document.body.style.overflow || 'auto';
      document.body.style.overflow = 'hidden';
      console.log("[Content Script] Main page scrolling disabled (mouseenter).");
    });
    sidebarIframe.addEventListener('mouseleave', () => {
      document.body.style.overflow = originalOverflow;
      console.log("[Content Script] Main page scrolling restored (mouseleave).");
    });

    // Prevent scroll events from bubbling to the parent page
    sidebarIframe.addEventListener('wheel', (event) => {
      event.stopPropagation();
      console.log("[Content Script] Iframe wheel event stopped.");
    }, { passive: false });
    sidebarIframe.addEventListener('touchmove', (event) => {
      event.stopPropagation();
      console.log("[Content Script] Iframe touchmove event stopped.");
    }, { passive: false });

    sidebarIframe.onerror = () => {
      console.error("[Content Script] Sidebar iframe failed to load.");
    };
    sidebarIframe.onload = () => {
      console.log("[Content Script] Sidebar iframe loaded successfully.");
      sendPageMetaDataToSidebar();
    };
  }
}

// Function to send page metadata (favicon, title, URL) to the sidebar iframe
function sendPageMetaDataToSidebar() {
  if (sidebarIframe && sidebarIframe.contentWindow) {
    const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href || '';
    const domain = window.location.hostname;
    const title = document.title;
    const url = window.location.href;

    // Post message to the iframe's contentWindow
    sidebarIframe.contentWindow.postMessage({
      type: "PAGE_META",
      data: { favicon, domain, title, url }
    }, "*"); // Use "*" for targetOrigin if the iframe's URL is unknown or dynamic
    console.log("[Content Script] Sent PAGE_META to sidebar iframe.");
  }
}

// Function to show the sidebar by sliding it in
function showSidebar() {
  createAndAppendSidebar(); // Ensure the iframe exists
  sidebarIframe.style.transform = 'translateX(0)'; // Slide into view
  sidebarIframe.style.display = 'block'; // Ensure it's visible for interaction
  chrome.storage.local.set({ sidebarOpen: true }); // Store preference
  console.log("[Content Script] Sidebar shown.");
}

// Function to hide the sidebar by sliding it out
function hideSidebar() {
  if (sidebarIframe) {
    sidebarIframe.style.transform = 'translateX(100%)'; // Slide out of view
    // Set display: none AFTER the transition completes to prevent interaction with elements behind it
    setTimeout(() => {
      if (sidebarIframe) { // Check if iframe still exists before trying to hide
        sidebarIframe.style.display = 'none';
      }
    }, 300); // This delay should match the CSS transition duration
    chrome.storage.local.set({ sidebarOpen: false }); // Store preference
    console.log("[Content Script] Sidebar hidden.");
  }
}

// Listener for messages from background script or sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content Script] Message received:", request);
  if (request.type === 'TOGGLE_SIDEBAR') {
    console.log("[Content Script] Received TOGGLE_SIDEBAR message.");
    // Determine current state and toggle
    if (sidebarIframe && sidebarIframe.style.transform === 'translateX(0px)') {
      hideSidebar();
    } else {
      showSidebar();
    }
    sendResponse({ success: true });
  } else if (request.type === 'CLOSE_SIDEBAR_REQUEST') {
    console.log("[Content Script] Received CLOSE_SIDEBAR_REQUEST message.");
    hideSidebar();
    sendResponse({ success: true });
  } else if (request.type === 'PING_CONTENT_SCRIPT') {
    console.log("[Content Script] Received PING_CONTENT_SCRIPT message.");
    sendResponse({ alive: true });
  } else if (request.type === 'REQUEST_PAGE_TEXT_FROM_IFRAME') {
    // Message from sidebar iframe to get the current page's text content
    const url = window.location.href;
    // Check for restricted URLs
    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('view-source:') || url.startsWith('file://')) {
      console.warn("[Content Script] Attempted to extract text from a restricted page:", url);
      sendResponse({ text: '', error: 'restricted_page' });
    } else {
      const pageText = document.body.innerText;
      console.log("[Content Script] Extracted page text (length:", pageText.length, ")");
      sendResponse({ text: pageText });
    }
  }
  return true; // Indicates that you will send a response asynchronously
});

// On page load (or refresh), check for restricted pages and initialize
document.addEventListener('DOMContentLoaded', () => {
  const url = window.location.href;
  if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('view-source:') || url.startsWith('file://')) {
    console.warn("[Content Script] Cannot run on restricted page:", url);
    return;
  }
  console.log("[Content Script] DOMContentLoaded fired. Initializing sidebar state.");
  createAndAppendSidebar(); // Create the iframe immediately, it's initially hidden by CSS

  // Retrieve the stored sidebar preference
  chrome.storage.local.get('sidebarOpen', (data) => {
    if (data.sidebarOpen) {
      showSidebar(); // If it was previously open, show it
    } else {
      // Otherwise, ensure it's hidden and has display: none for immediate effect
      if (sidebarIframe) {
        sidebarIframe.style.transform = 'translateX(100%)';
        sidebarIframe.style.display = 'none';
      }
    }
  });
});