// content.js

console.log("[Content Script] Loaded and registering message listener.");

// Helper to extract page text and detect restricted pages
function extractPageText() {
  const url = window.location.href;
  if (/^(chrome|edge|about|view-source|file):/.test(url)) {
    return { text: "", error: "restricted_page" };
  }
  const txt = document.body?.innerText.trim() || "";
  console.log("[Content Script] Extracted text:", txt.length, "characters");
  console.log(document.body?.innerText)
  if (!txt) {
    return { text: "", error: "no_discernible_text" };
  }
  return { text: txt };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content Script] Message received:", request.type);

  // === Full page info ===
  if (request.type === "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT") {
    const page = extractPageText();
    const url = window.location.href;
    const title = document.title;
    let favicon = "";
    const link = document.querySelector('link[rel~="icon"], link[rel~="shortcut icon"]');
    if (link?.href) favicon = link.href;

    sendResponse({
      text: page.text,
      url,
      title,
      favicon,
      error: page.error,
    });
    return true; // keep channel open
  }

  // === Text-only for summarize ===
  if (request.type === "GET_PAGE_TEXT") {
    const page = extractPageText();
    sendResponse(page);
    return true;
  }

  return false; // ignore other messages
});