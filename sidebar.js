// sidebar.js

// Global variables to store the current Browse page's metadata
let currentBrowsePageUrl = '';
let currentBrowsePageTitle = '';
let currentBrowsePageFavicon = '';

// A persistent element reference for the loading message within #output
let loadingMessageElement = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log("[Sidebar] DOMContentLoaded fired.");

  // Prevent scroll events from bubbling to the parent page
  const scrollableElements = document.querySelectorAll('#responseBox, #historyList, #historyTab, .tab-panel');
  scrollableElements.forEach(element => {
    ['wheel', 'touchmove'].forEach(eventType => {
      element.addEventListener(eventType, (event) => {
        event.stopPropagation();
        console.log(`[Sidebar] ${eventType} event stopped on:`, element.id || element.className);
      }, { passive: false });
    });
  });

  // --- Dark Mode Initialization ---
  const darkModeToggle = document.getElementById('darkModeToggle');
  const sidebarElement = document.getElementById('sidebar'); // Target #sidebar for dark mode class

  // Load dark mode preference
  chrome.storage.local.get('darkMode', (data) => {
    if (data.darkMode) {
      sidebarElement.classList.add('dark-mode'); // Apply to #sidebar
      darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon for dark mode
    } else {
      sidebarElement.classList.remove('dark-mode'); // Apply to #sidebar
      darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon for light mode
    }
  });

  // Toggle dark mode on click
  darkModeToggle.addEventListener('click', () => {
    sidebarElement.classList.toggle('dark-mode'); // Toggle on #sidebar
    const isDarkMode = sidebarElement.classList.contains('dark-mode');
    chrome.storage.local.set({ darkMode: isDarkMode });
    darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });
  // --- End Dark Mode Initialization ---

  // Favicon error handler
  const pageFaviconElement = document.getElementById("pageFavicon");
  if (pageFaviconElement) {
    pageFaviconElement.onerror = function() {
      this.style.display = 'none';
      console.warn("[Sidebar] Favicon failed to load. Image will be hidden.");
    };
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "PAGE_META") {
      const { favicon, domain, title, url } = event.data.data;
      console.log("DEBUG: PAGE_META received:", { favicon, domain, title, url });

      currentBrowsePageUrl = url;
      currentBrowsePageTitle = title;
      currentBrowsePageFavicon = favicon;

      if (pageFaviconElement) {
        pageFaviconElement.src = favicon;
        pageFaviconElement.style.display = '';
      }
      document.getElementById("pageDomain").textContent = domain;
      document.getElementById("pageTitle").textContent = title;
    }
  });

  document.getElementById("closeSidebar").onclick = async () => {
    console.log("[Sidebar] Close button clicked.");
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        console.error("[Sidebar] No active tab found.");
        return;
      }

      // Ping content script to check availability
      const pingResponse = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { type: "PING_CONTENT_SCRIPT" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      console.log("[Sidebar] Ping response:", pingResponse);

      // Send close message
      chrome.tabs.sendMessage(tab.id, { type: "CLOSE_SIDEBAR_REQUEST" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("[Sidebar] SendMessage failed:", chrome.runtime.lastError.message);
        } else {
          console.log("[Sidebar] Close response:", response);
        }
      });
    } catch (error) {
      console.error("[Sidebar] Content script not responding:", error.message);
      // Request background script to reinject content.js
      chrome.runtime.sendMessage({ type: "REINJECT_CONTENT_SCRIPT" });
      // Retry closing after a delay
      setTimeout(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "CLOSE_SIDEBAR_REQUEST" }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("[Sidebar] Retry SendMessage failed:", chrome.runtime.lastError.message);
              } else {
                console.log("[Sidebar] Retry Close response:", response);
              }
            });
          }
        });
      }, 500);
    }
  };

  function toggleLoadingState(isLoading, message = '') {
    const cmdBtn = document.getElementById("cmdBtn");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const arrowIcon = document.getElementById("arrowIcon");
    const loaderIcon = document.getElementById("loaderIcon");
    const outputElement = document.getElementById("output");

    if (isLoading) {
      cmdBtn.disabled = true;
      summarizeBtn.disabled = true;
      arrowIcon.classList.add("hidden");
      loaderIcon.classList.remove("hidden");

      if (!loadingMessageElement) {
        loadingMessageElement = document.createElement("div");
        loadingMessageElement.id = "currentLoadingMessage";
        loadingMessageElement.classList.add("loading-status-message");
        outputElement.innerHTML = ''; // Clear previous content
        outputElement.appendChild(loadingMessageElement);
      }
      loadingMessageElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    } else {
      cmdBtn.disabled = false;
      summarizeBtn.disabled = false;
      arrowIcon.classList.remove("hidden");
      loaderIcon.classList.add("hidden");

      if (loadingMessageElement && outputElement.contains(loadingMessageElement)) {
        outputElement.removeChild(loadingMessageElement);
        loadingMessageElement = null;
      }
    }
  }

  document.getElementById("cmdBtn").onclick = async () => {
    console.log("[Sidebar] Ask anything button clicked.");
    const input = document.getElementById("cmdInput").value.trim();
    if (!input) return;

    toggleLoadingState(true, 'Processing your request...');

    const usePageContext = document.getElementById("includeContext").checked;
    let query = input;

    if (usePageContext) {
      toggleLoadingState(true, 'Fetching page content...');
      const pageResponse = await getPageTextFromTab(); // Get the full response object from getPageTextFromTab

      if (pageResponse.error === 'restricted_page') {
        displayInSidebar("Unable to access page content on this type of browser page (e.g., internal browser pages, extension pages, or file system pages).", "None");
        toggleLoadingState(false);
        return;
      } else if (!pageResponse.text) { // If text is empty for other reasons (e.g., no discernible text or general error)
        displayInSidebar("Unable to access page content for context. The page might not have discernible text, or there was a general error.", "None");
        toggleLoadingState(false);
        return;
      }
      query = `Based on this page:\n${pageResponse.text}\n\nUser question: ${input}`;
    }

    toggleLoadingState(true, 'Sending to AI...');
    const response = await sendQueryToAI({ query, action: 'direct_question' });

    toggleLoadingState(false);
    document.getElementById("cmdInput").value = '';
    displayInSidebar(response.text, response.model);
    saveToHistory(input, response.text, false);
  };

  document.getElementById("summarizeBtn").onclick = async () => {
    console.log("[Sidebar] Summarize button clicked.");
    toggleLoadingState(true, 'Fetching page content...');

    const pageResponse = await getPageTextFromTab(); // Get the full response object
    const pageText = pageResponse.text; // Extract text

    if (pageResponse.error === 'restricted_page') {
      displayInSidebar("Unable to access page content on this type of browser page for summarization.", "None");
      toggleLoadingState(false);
      return;
    } else if (!pageText) {
      console.error("[Sidebar] No page text obtained for summarization.");
      displayInSidebar("Unable to access page content for summarization. The page might not have discernible text, or there was a general error.", "None");
      toggleLoadingState(false);
      return;
    }

    console.log("[Sidebar] Page text obtained, sending to AI.");
    toggleLoadingState(true, 'Analyzing content...');
    const response = await sendQueryToAI({ query: pageText, action: "summarize_page" });

    toggleLoadingState(false);

    console.log("DEBUG: summarizeBtn.onclick - Using globally stored page info and AI response:");
    console.log("  URL:", currentBrowsePageUrl);
    console.log("  Title:", currentBrowsePageTitle);
    console.log("  Favicon:", currentBrowsePageFavicon);
    console.log("  AI Summary Text (snippet):", response.text.substring(0, 50) + "...");
    console.log("  AI Tags:", response.tags);

    displayInSidebar(response.text, response.model, currentBrowsePageUrl, currentBrowsePageFavicon, currentBrowsePageTitle, response.tags);
    saveToHistory(currentBrowsePageTitle, response.text, true, currentBrowsePageUrl, currentBrowsePageFavicon, currentBrowsePageTitle, response.tags);
  };

  // MODIFIED: displayInSidebar to include Copy button
  function displayInSidebar(text, modelName, url = null, favicon = null, pageTitle = null, tags = []) {
    console.log("DEBUG: displayInSidebar - Received for rendering:");
    console.log("  URL:", url);
    console.log("  Favicon:", favicon);
    console.log("  PageTitle:", pageTitle);
    console.log("  Text (snippet):", text ? text.substring(0, 50) + "..." : "No text.");
    console.log("  Tags:", tags);

    let headerHtml = '';
    if (url && favicon && pageTitle) {
      headerHtml = `
        <div class="page-link-header">
          <img src="${favicon}" alt="Favicon" class="header-favicon">
          <a href="${url}" target="_blank" rel="noopener noreferrer" title="Go to page">${pageTitle}</a>
        </div>
      `;
    } else {
      console.warn("DEBUG: displayInSidebar - Header NOT rendered due to missing data. URL:", url, "Favicon:", favicon, "PageTitle:", pageTitle);
    }

    let tagsHtml = '';
    if (Array.isArray(tags) && tags.length > 0) {
      tagsHtml = `
        <div class="tags-container">
          ${tags.map(tag => `<span class="tag-item">${tag}</span>`).join('')}
        </div>
      `;
    }

    const outputElement = document.getElementById("output");
    if (outputElement) {
      outputElement.innerHTML = `
        ${headerHtml}
        ${tagsHtml}
        <div class="ai-response-content">${text}</div>
        <button class="copy-button" title="Copy to clipboard"><i class="fas fa-copy"></i></button>
        <span class="copy-feedback hidden">Copied!</span>
      `;

      // Attach event listener to the new copy button
      const copyButton = outputElement.querySelector('.copy-button');
      const copyFeedback = outputElement.querySelector('.copy-feedback');
      if (copyButton && copyFeedback) {
        copyButton.addEventListener('click', () => {
          const textToCopy = outputElement.querySelector('.ai-response-content').innerText;
          copyToClipboard(textToCopy, copyFeedback);
        });
      }
    } else {
      console.error("[Sidebar] Output element not found for displayInSidebar.");
    }
  }

  // Function to copy text to clipboard with feedback
  function copyToClipboard(text, feedbackElement) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Avoid scrolling to bottom
    textarea.style.left = '-9999px'; // Hide from view
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      console.log("[Sidebar] Text copied to clipboard.");
      if (feedbackElement) {
        feedbackElement.classList.remove('hidden');
        setTimeout(() => feedbackElement.classList.add('hidden'), 2000);
      }
    } catch (err) {
      console.error("[Sidebar] Failed to copy text:", err);
      if (feedbackElement) {
        feedbackElement.textContent = 'Failed to copy!';
        feedbackElement.classList.remove('hidden');
        setTimeout(() => feedbackElement.classList.add('hidden'), 3000);
      }
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async function getPageTextFromTab() {
    console.log("[Sidebar] Requesting page text from content script via chrome.runtime.sendMessage.");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        console.error("[Sidebar] No active tab found.");
        return { text: '', error: 'no_active_tab' };
      }
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_PAGE_TEXT_FROM_IFRAME' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response || {});
          }
        });
      });
      console.log("[Sidebar] Received response from content script:", response);
      return { text: response.text || '', error: response.error || null };
    } catch (error) {
      console.error("[Sidebar] Error requesting page text:", error.message);
      return { text: '', error: 'messaging_failure', debugInfo: error.message };
    }
  }

  async function sendQueryToAI({ query, action }) {
    console.log("[Sidebar] Sending query to AI for action:", action, " Query snippet:", query.substring(0, 100) + "...");
    const { model, apiKey } = await chrome.storage.local.get(["model", "apiKey"]);

    console.log("[Sidebar] Using API Key:", apiKey ? "Set" : "Not Set", "Model:", model);

    if (!apiKey) {
      console.error("[Sidebar] API Key not set.");
      return { text: "Error: Perplexity AI API Key is not set. Please set it in extension options.", model: "None", tags: [] };
    }
    const endpoint = "https://api.perplexity.ai/chat/completions";
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    let userMessageContent;
    let systemMessageContent = "You are an AI assistant for a web browser sidebar. Format your responses using HTML tags (like <p>, <strong>, <em>, <ul>, <ol>, <li>, <h3>, <h4>, <a> for links) to improve readability in a web sidebar. Do not include <html>, <head>, or <body> tags. Ensure the HTML is well-formed and directly usable within a div. Provide concise and relevant answers.";

    if (action === "summarize_page") {
      userMessageContent = `Generate a concise HTML summary of this webpage content. Additionally, identify 3 to 5 keywords or categories that best describe the content type of this page (e.g., 'News Article', 'Product Page', 'Tutorial', 'Personal Blog', 'Documentation', 'Recipe', 'Forum Discussion', 'E-commerce', 'About Us').

      Format your entire response as a single JSON object with two keys:
      1. "summary": The HTML formatted summary string.
      2. "tags": An array of strings containing the identified content type tags.

      Example JSON structure:
      {
        "summary": "<p>This is the HTML summary of the page content...</p>",
        "tags": ["News Article", "Politics", "Current Events"]
      }

      Here is the page content to analyze:\n${query}`;
      
      systemMessageContent = "You are an AI assistant for a web browser sidebar. When summarizing a page, you must output a JSON object with 'summary' (HTML string) and 'tags' (array of strings). Do not include any text outside the JSON object.";
    } else {
      userMessageContent = query;
    }

    const body = {
      model: model || "sonar-small-online",
      messages: [
        { role: "system", content: systemMessageContent },
        { role: "user", content: userMessageContent }
      ],
      temperature: 0.7
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (response.status === 401) {
        console.error("[Sidebar] API Key Unauthorized (401).");
        return { text: "Error: Perplexity AI API Key Unauthorized (401). Please check your API Key in extension options.", model: "None", tags: [] };
      }

      const data = await response.json();
      if (response.ok) {
        let rawContent = data.choices?.[0]?.message?.content || "No response received.";
        console.log("DEBUG: Raw AI response content:", rawContent);

        if (action === "summarize_page") {
          let cleanContent = rawContent.trim();
          if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
            cleanContent = cleanContent.substring(7, cleanContent.length - 3).trim();
          }

          try {
            const parsedContent = JSON.parse(cleanContent);
            if (typeof parsedContent.summary === 'string' && Array.isArray(parsedContent.tags)) {
              return {
                text: parsedContent.summary,
                model: model || "sonar-small-online",
                tags: parsedContent.tags
              };
            } else {
              console.warn("[Sidebar] AI returned unexpected JSON structure for tags. Falling back to plain text.");
              return {
                text: rawContent,
                model: model || "sonar-small-online",
                tags: []
              };
            }
          } catch (e) {
            console.error("[Sidebar] Failed to parse AI response as JSON for tags:", e);
            return {
              text: rawContent,
              model: model || "sonar-small-online",
              tags: []
            };
          }
        } else {
          return {
            text: rawContent,
            model: model || "sonar-small-online",
            tags: []
          };
        }
      } else {
        console.error("[Sidebar] Error from API:", data.detail || data.error || response.statusText);
        return { text: `Error from Perplexity AI: ${data.detail || data.error || response.statusText}`, model: "None", tags: [] };
      }
    } catch (err) {
      console.error("[Sidebar] Network/Fetch error:", err);
      return { text: `Network Error: Could not connect to Perplexity AI. Please check your internet connection. (${err.message})`, model: "None", tags: [] };
    }
  }

  function saveToHistory(question, response, isSummary = false, url = null, favicon = null, pageTitle = null, tags = []) {
    console.log("DEBUG: saveToHistory - Data being saved:");
    console.log("  Query (question):", question);
    console.log("  Is Summary:", isSummary);
    console.log("  URL:", url);
    console.log("  Favicon:", favicon);
    console.log("  PageTitle:", pageTitle);
    console.log("  Tags:", tags);

    chrome.storage.local.get(["queryHistory"], data => {
      const history = data.queryHistory || [];
      history.unshift({
        query: question,
        response,
        timestamp: new Date().toISOString(),
        isSummary,
        url: url,
        favicon: favicon,
        pageTitle: pageTitle,
        tags: tags
      });
      chrome.storage.local.set({ queryHistory: history });
      renderHistoryList(history);
    });
  }

  function renderHistoryList(history) {
    console.log("[Sidebar] Rendering history list.");
    const list = document.getElementById("historyList");
    list.innerHTML = '';
    history.forEach((entry, index) => {
      console.log(`DEBUG: renderHistoryList - Processing entry ${index}:`);
      console.log("  Entry Query:", entry.query);
      console.log("  Entry URL:", entry.url);
      console.log("  Entry Favicon:", entry.favicon);
      console.log("  Entry PageTitle:", entry.pageTitle);
      console.log("  Entry isSummary:", entry.isSummary);
      console.log("  Entry Tags:", entry.tags);

      const li = document.createElement("li");
      li.classList.add("history-item");

      const question = document.createElement("div");
      question.textContent = entry.isSummary ? `${entry.query || 'Untitled Page'} [Summary]` : entry.query;
      question.classList.add("history-question");
      question.onclick = () => {
        console.log("[Sidebar] History item clicked.");
        displayInSidebar(entry.response, 'Saved', entry.url, entry.favicon, entry.pageTitle, entry.tags || []);
        const currentTabBtn = document.querySelector('.tab[data-tab="current"]');
        if (currentTabBtn) {
          currentTabBtn.click(); // Programmatically click the 'Page Analysis' tab
        }
      };

      const time = document.createElement("div");
      time.textContent = new Date(entry.timestamp).toLocaleString();
      time.classList.add("history-time");

      const del = document.createElement("button");
      del.innerHTML = "<i class='fas fa-trash'></i>";
      del.classList.add("history-delete");
      del.onclick = () => {
        console.log("[Sidebar] History delete button clicked.");
        history.splice(index, 1);
        chrome.storage.local.set({ queryHistory: history });
        renderHistoryList(history);
      };

      li.appendChild(question);
      li.appendChild(time);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  chrome.storage.local.get(["queryHistory", "activeTab"], data => {
    const history = data.queryHistory || [];
    renderHistoryList(history);

    const tab = data.activeTab || "current";
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.remove("active");
      if (t.dataset.tab === tab) t.classList.add("active");
    });
    document.querySelectorAll(".tab-panel").forEach(p => {
      p.classList.remove("active");
      if (p.id === tab + "Tab") p.classList.add("active");
    });
  });

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      console.log("[Sidebar] Tab clicked:", tab.dataset.tab);
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(tab.dataset.tab + "Tab").classList.add("active");

      chrome.storage.local.set({ activeTab: tab.dataset.tab });
    });
  });
});