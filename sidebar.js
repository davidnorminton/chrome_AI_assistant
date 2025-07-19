// sidebar.js

// Global variables to store the current Browse page's metadata
let currentBrowsePageUrl = '';
let currentBrowsePageTitle = '';
let currentBrowsePageFavicon = '';

// A persistent element reference for the loading message within #output
let loadingMessageElement = null;

// Global variables for history management
let queryHistory = []; // Stores all history entries
let currentHistoryIndex = -1; // Index of the currently displayed item in queryHistory (0 is newest)

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
      this.style.display = 'none'; // Hide if loading fails
      console.warn("[Sidebar] Favicon failed to load. Image will be hidden.");
    };
  }

  // Listen for messages from content script (PAGE_INFO)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Ensure the message is from the content script (tab context) and is PAGE_INFO
    if (sender.tab && request.type === 'PAGE_INFO') {
      console.log("[Sidebar] Received PAGE_INFO from content script:", request.data);
      const { url, title, domain, favicon } = request.data;
      
      currentBrowsePageUrl = url;
      currentBrowsePageTitle = title;
      currentBrowsePageFavicon = favicon;

      if (pageFaviconElement) {
        pageFaviconElement.src = favicon;
        pageFaviconElement.style.display = ''; // Ensure it's visible
      }
      document.getElementById("pageDomain").textContent = domain;
      document.getElementById("pageTitle").textContent = title;
    }
  });

  // Close sidebar button now closes the panel directly
  document.getElementById("closeSidebar").onclick = () => {
    console.log("[Sidebar] Close button clicked. Closing side panel.");
    window.close(); // Closes the side panel
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
      } else if (pageResponse.error === 'no_discernible_text') {
        displayInSidebar("The current page has no discernible text content. Please try on a different page or uncheck 'Ask about this page'.", "None");
        toggleLoadingState(false);
        return;
      } else if (!pageResponse.text) { // General error or empty text
        displayInSidebar("Could not retrieve page content for context. There might be a general error. Trying without context.", "None");
        // Fallback to sending query without context if text retrieval fails
        query = input;
      } else {
        query = `Based on this page:\n${pageResponse.text}\n\nUser question: ${input}`;
      }
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
    } else if (pageResponse.error === 'no_discernible_text') {
      displayInSidebar("The current page has no discernible text content for summarization.", "None");
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

  // MODIFIED: displayInSidebar to include Copy button, clickable tags, and clickable suggested questions
  function displayInSidebar(text, modelName, url = null, favicon = null, pageTitle = null, tags = [], links = []) {
    console.log("DEBUG: displayInSidebar - Received for rendering:");
    console.log("  URL:", url);
    console.log("  Favicon:", favicon);
    console.log("  PageTitle:", pageTitle);
    console.log("  Text (snippet):", text ? text.substring(0, 50) + "..." : "No text.");
    console.log("  Tags:", tags);
    console.log("  Links:", links); // Log links received

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
          ${tags.map(tag => `<span class="tag-item" data-tag="${tag}">${tag}</span>`).join('')}
        </div>
      `;
    }

    let linksHtml = '';
    if (Array.isArray(links) && links.length > 0) {
        linksHtml = '<h3>Relevant Links:</h3><ul>';
        links.forEach(link => {
            linksHtml += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a></li>`;
        });
        linksHtml += '</ul>';
    }


    const outputElement = document.getElementById("output");
    if (outputElement) {
      outputElement.innerHTML = `
        ${headerHtml}
        ${tagsHtml}
        <div class="ai-response-content">${text}</div>
        ${linksHtml} <!-- Add links section -->
        <button class="copy-button" title="Copy to clipboard"><i class="fas fa-copy"></i></button>
        <span class="copy-feedback hidden">Copied!</span>
      `;

      // Attach event listener to the new copy button
      const copyButton = outputElement.querySelector('.copy-button');
      const copyFeedback = outputElement.querySelector('.copy-feedback');
      if (copyButton && copyFeedback) {
        copyButton.addEventListener('click', () => {
          const textToCopy = outputElement.querySelector('.ai-response-content').innerText; // Use innerText to get plain text
          copyToClipboard(textToCopy, copyFeedback);
        });
      }

      // Attach event listeners to clickable tags
      outputElement.querySelectorAll('.tag-item').forEach(tagElement => {
        tagElement.addEventListener('click', (event) => {
          const tagName = event.target.dataset.tag;
          if (tagName) {
            handleTagClick(tagName);
          }
        });
      });

      // Attach event listeners to suggested questions
      // Now targeting li elements directly within .suggested-questions-container
      outputElement.querySelectorAll('.suggested-questions-container li').forEach(questionElement => {
        questionElement.style.cursor = 'pointer'; // Make it visually clickable
        questionElement.title = 'Click to ask this question';
        questionElement.addEventListener('click', (event) => {
          const questionText = event.target.textContent.trim();
          document.getElementById('cmdInput').value = questionText;
          document.getElementById('cmdInput').focus(); // Focus the input field
        });
      });

    } else {
      console.error("[Sidebar] Output element not found for displayInSidebar.");
    }
  }

  // Function to handle tag clicks
  async function handleTagClick(tagName) {
    console.log(`[Sidebar] Tag "${tagName}" clicked.`);
    toggleLoadingState(true, `Finding links for "${tagName}"...`);

    const prompt = `Provide 5 highly relevant and diverse links (URLs with titles) related to '${tagName}'. Format the response as a JSON array of objects, where each object has 'title' and 'url' properties. Example: [{"title": "Example Link 1", "url": "https://example.com/1"}, {"title": "Example Link 2", "url": "https://example.com/2"}]`;

    const response = await sendQueryToAI({ query: prompt, action: 'get_links' });
    toggleLoadingState(false);

    let linksHtml = '';
    if (response && response.links && response.links.length > 0) {
      linksHtml = '<h3>Relevant Links:</h3><ul>';
      response.links.forEach(link => {
        linksHtml += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a></li>`;
      });
      linksHtml += '</ul>';
      // Display links, keep the tag for context, no main text content for this action
      displayInSidebar('', response.model, null, null, null, [tagName], response.links);
      // Save this interaction to history
      saveToHistory(`Relevant links for: ${tagName}`, linksHtml, false, null, null, null, [tagName], response.links);
    } else {
      const noLinksMessage = `<p>No relevant links found for "${tagName}".</p>`;
      displayInSidebar(noLinksMessage, response.model, null, null, null, [tagName]);
      saveToHistory(`Relevant links for: ${tagName}`, noLinksMessage, false, null, null, null, [tagName]);
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
    console.log("[Sidebar] Requesting page text from content script via background.");
    try {
      // Send message to background script, which will forward to content script
      const response = await chrome.runtime.sendMessage({ type: 'REQUEST_PAGE_TEXT_FROM_CONTENT_SCRIPT' });
      if (chrome.runtime.lastError) {
        console.error("[Sidebar] Error receiving response from background for page text:", chrome.runtime.lastError.message);
        return { text: '', error: 'background_messaging_error' };
      }
      console.log("[Sidebar] Received response from background (page text):", response);
      return { text: response.text || '', error: response.error || null };
    } catch (error) {
      console.error("[Sidebar] Error in getPageTextFromTab:", error.message);
      return { text: '', error: 'messaging_failure', debugInfo: error.message };
    }
  }

  async function sendQueryToAI({ query, action }) {
    console.log("[Sidebar] Sending query to AI for action:", action, " Query snippet:", query.substring(0, 100) + "...");
    const { model, apiKey } = await chrome.storage.local.get(["model", "apiKey"]);

    console.log("[Sidebar] Using API Key:", apiKey ? "Set" : "Not Set", "Model:", model);

    if (!apiKey) {
      console.error("[Sidebar] API Key not set.");
      return { text: "Error: Perplexity AI API Key is not set. Please set it in extension options.", model: "None", tags: [], links: [] };
    }
    const endpoint = "https://api.perplexity.ai/chat/completions";
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    let userMessageContent;
    let systemMessageContent;

    if (action === "summarize_page") {
      systemMessageContent = `You are an AI assistant for a web browser sidebar that specializes in summarizing web page content.
      You must format your entire response as a single JSON object with two keys: "summary" and "tags".
      The "summary" value must be an HTML formatted string (use <p>, <ul>, <li>, <strong>, <em>, etc.).
      Include relevant image URLs in <img> tags where appropriate. For example: <img src="https://placehold.co/400x200/cccccc/000000?text=Image+Placeholder" alt="Description" style="max-width: 100%; height: auto;">.
      At the end of the summary, provide 2-3 concise follow-up questions related to the summary in an unordered list, wrapped in a <div class="suggested-questions-container">. Do NOT include any heading for these questions. Each list item should be a direct question.
      The "tags" value must be an array of 3 to 5 strings, identifying keywords or content categories (e.g., 'News Article', 'Product Page', 'Tutorial').
      Do not include any text outside the JSON object.`;

      userMessageContent = `Generate a concise summary in HTML and relevant tags for this webpage content. Include suggested follow-up questions at the end of the summary.

      Page content to analyze:\n${query}`;
      
    } else if (action === "get_links") {
        systemMessageContent = `You are an AI assistant that provides lists of relevant links.
        You must format your entire response as a single JSON array of objects. Each object in the array must have two properties: "title" (string) and "url" (string).
        Provide 5 highly relevant and diverse links. Do not include any text or markdown outside the JSON array.`;
        userMessageContent = query; // The query already contains the instruction for links
    }
    else { // For 'direct_question'
      systemMessageContent = `You are an AI assistant for a web browser sidebar.
      Always format your responses using appropriate HTML tags (e.g., <p>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <a> for links).
      If relevant, embed image URLs using <img> tags where appropriate. For example: <img src="https://placehold.co/400x200/cccccc/000000?text=Image+Placeholder" alt="Description" style="max-width: 100%; height: auto;">.
      After your main answer, suggest 2-3 concise follow-up questions in an unordered list (<ul><li>...</li></ul>), wrapped in a <div class="suggested-questions-container">. Do NOT include any heading for these questions. Each list item should be a direct question.
      Be concise but informative.
      ${query.startsWith('Based on this page:') ? `The user is asking a question related to the following page content: "${query.split('\n\nUser question:')[0].replace('Based on this page:\n', '')}".` : ''}
      `;
      userMessageContent = query;
    }

    const body = {
      model: model || "sonar-small-online",
      messages: [
        { role: "system", content: systemMessageContent },
        { role: "user", content: userMessageContent }
      ],
      temperature: 0.7,
      stream: false // Ensure we get the full response at once
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (response.status === 401) {
        console.error("[Sidebar] API Key Unauthorized (401).");
        return { text: "Error: Perplexity AI API Key Unauthorized (401). Please check your API Key in extension options.", model: "None", tags: [], links: [] };
      }

      const data = await response.json();
      if (response.ok) {
        let rawContent = data.choices?.[0]?.message?.content || "No response received.";
        console.log("DEBUG: Raw AI response content:", rawContent);

        if (action === "summarize_page") {
          let cleanContent = rawContent.trim();
          // Remove markdown code block fences if present
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.substring(7);
          }
          if (cleanContent.endsWith('```')) {
            cleanContent = cleanContent.substring(0, cleanContent.length - 3);
          }
          cleanContent = cleanContent.trim(); // Trim again after removing fences

          try {
            const parsedContent = JSON.parse(cleanContent);
            if (typeof parsedContent.summary === 'string' && Array.isArray(parsedContent.tags)) {
              return {
                text: parsedContent.summary,
                model: model || "sonar-small-online",
                tags: parsedContent.tags,
                links: []
              };
            } else {
              console.warn("[Sidebar] AI returned unexpected JSON structure for tags. Falling back to plain text with empty tags.");
              return {
                text: rawContent, // Fallback to raw if JSON structure is wrong
                model: model || "sonar-small-online",
                tags: [],
                links: []
              };
            }
          } catch (e) {
            console.error("[Sidebar] Failed to parse AI response as JSON for tags (possibly not valid JSON or unexpected format):", e, "Raw content:", rawContent);
            // If parsing fails, treat the whole rawContent as the text and no tags
            return {
              text: rawContent,
              model: model || "sonar-small-online",
              tags: [],
              links: []
            };
          }
        } else if (action === "get_links") {
            let cleanContent = rawContent.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.substring(7);
            }
            if (cleanContent.endsWith('```')) {
                cleanContent = cleanContent.substring(0, cleanContent.length - 3);
            }
            cleanContent = cleanContent.trim();

            try {
                const parsedLinks = JSON.parse(cleanContent);
                if (Array.isArray(parsedLinks) && parsedLinks.every(item => typeof item.title === 'string' && typeof item.url === 'string')) {
                    return {
                        text: '', // No main text content for this action
                        model: model || "sonar-small-online",
                        tags: [],
                        links: parsedLinks
                    };
                } else {
                    console.warn("[Sidebar] AI returned unexpected JSON structure for links. Falling back to plain text.");
                    return {
                        text: rawContent,
                        model: model || "sonar-small-online",
                        tags: [],
                        links: []
                    };
                }
            } catch (e) {
                console.error("[Sidebar] Failed to parse AI response as JSON for links:", e, "Raw content:", rawContent);
                return {
                    text: rawContent,
                    model: model || "sonar-small-online",
                    tags: [],
                    links: []
                };
            }
        }
        else {
          // For direct questions, the response is expected to be direct HTML
          return {
            text: rawContent,
            model: model || "sonar-small-online",
            tags: [],
            links: []
          };
        }
      } else {
        console.error("[Sidebar] Error from API:", data.detail || data.error || response.statusText);
        return { text: `Error from Perplexity AI: ${data.detail || data.error || response.statusText}`, model: "None", tags: [], links: [] };
      }
    } catch (err) {
      console.error("[Sidebar] Network/Fetch error:", err);
      return { text: `Network Error: Could not connect to Perplexity AI. Please check your internet connection. (${err.message})`, model: "None", tags: [], links: [] };
    }
  }

  // MODIFIED: saveToHistory now manages currentHistoryIndex and prunes future history
  function saveToHistory(question, response, isSummary = false, url = null, favicon = null, pageTitle = null, tags = [], links = []) {
    console.log("DEBUG: saveToHistory - Data being saved:");
    console.log("  Query (question):", question);
    console.log("  Is Summary:", isSummary);
    console.log("  URL:", url);
    console.log("  Favicon:", favicon);
    console.log("  PageTitle:", pageTitle);
    console.log("  Tags:", tags);
    console.log("  Links:", links);

    // If we are not at the newest history entry, clear "future" entries
    if (currentHistoryIndex > 0) {
      queryHistory.splice(0, currentHistoryIndex);
    }

    queryHistory.unshift({
      query: question,
      response, // Save the full HTML response
      timestamp: new Date().toISOString(),
      isSummary,
      url: url,
      favicon: favicon,
      pageTitle: pageTitle,
      tags: tags,
      links: links // Save links if available
    });

    // Limit history to a reasonable number, e.g., 50 entries
    if (queryHistory.length > 50) {
      queryHistory.pop();
    }
    
    currentHistoryIndex = 0; // Newest item is always at index 0
    chrome.storage.local.set({ queryHistory: queryHistory }, () => {
      renderHistoryList(queryHistory); // Re-render after saving
      updateHistoryNavigationButtons(); // Update button states
    });
  }

  // New function to display a specific history entry
  function showHistoryEntry(index) {
    if (index >= 0 && index < queryHistory.length) {
      currentHistoryIndex = index;
      const entry = queryHistory[currentHistoryIndex];
      displayInSidebar(entry.response, 'Saved', entry.url, entry.favicon, entry.pageTitle, entry.tags || [], entry.links || []);
      // Switch to the "Page Pilot AI" tab when viewing history
      const currentTabBtn = document.querySelector('.tab[data-tab="current"]');
      if (currentTabBtn) {
        currentTabBtn.click();
      }
      updateHistoryNavigationButtons();
    }
  }

  // New function to update the state of back/forward buttons
  function updateHistoryNavigationButtons() {
    const historyBackBtn = document.getElementById('historyBackBtn');
    const historyForwardBtn = document.getElementById('historyForwardBtn');

    if (historyBackBtn) {
      historyBackBtn.disabled = (currentHistoryIndex >= queryHistory.length - 1);
    }
    if (historyForwardBtn) {
      historyForwardBtn.disabled = (currentHistoryIndex <= 0);
    }
  }


  function renderHistoryList(history) {
    console.log("[Sidebar] Rendering history list.");
    const list = document.getElementById("historyList");
    list.innerHTML = ''; // Clear existing list

    if (history.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #555;">No history yet. Ask a question to see it here!</p>';
      return;
    }

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
        console.log("[Sidebar] History item clicked, displaying saved response.");
        // Call showHistoryEntry to correctly update index and buttons
        showHistoryEntry(index);
      };

      const time = document.createElement("div");
      time.textContent = new Date(entry.timestamp).toLocaleString();
      time.classList.add("history-time");

      // MODIFIED: Added a small preview of the HTML response in history list
      const responsePreview = document.createElement("div");
      responsePreview.classList.add("history-response-preview");
      // Create a temporary div to get plain text from HTML for preview
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = entry.response;
      let plainTextPreview = tempDiv.innerText.substring(0, 100); // Get first 100 chars of plain text
      if (tempDiv.innerText.length > 100) {
          plainTextPreview += '...';
      }
      responsePreview.textContent = plainTextPreview;


      const del = document.createElement("button");
      del.innerHTML = "<i class='fas fa-trash'></i>";
      del.classList.add("history-delete");
      del.onclick = (event) => {
        event.stopPropagation(); // Prevent the parent <li> click event
        console.log("[Sidebar] History delete button clicked.");
        queryHistory.splice(index, 1); // Use global queryHistory
        chrome.storage.local.set({ queryHistory: queryHistory }, () => {
          renderHistoryList(queryHistory);
          // Adjust currentHistoryIndex if the deleted item was before it
          if (index < currentHistoryIndex) {
            currentHistoryIndex--;
          } else if (index === currentHistoryIndex && queryHistory.length > 0) {
            // If current item deleted, show newest or previous
            currentHistoryIndex = Math.max(0, currentHistoryIndex - 1);
            showHistoryEntry(currentHistoryIndex); // Re-display current if it shifted
          } else if (queryHistory.length === 0) {
            currentHistoryIndex = -1; // No history left
            document.getElementById("output").innerHTML = "No history yet. Ask a question to see it here!";
          }
          updateHistoryNavigationButtons();
        });
      };

      li.appendChild(question);
      li.appendChild(responsePreview); // Add the preview
      li.appendChild(time);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  // Initial load of history and button states
  chrome.storage.local.get(["queryHistory", "activeTab"], data => {
    queryHistory = data.queryHistory || []; // Initialize global queryHistory
    renderHistoryList(queryHistory);

    const tab = data.activeTab || "current";
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.remove("active");
      if (t.dataset.tab === tab) t.classList.add("active");
    });
    document.querySelectorAll(".tab-panel").forEach(p => {
      p.classList.remove("active");
      if (p.id === tab + "Tab") p.classList.add("active");
    });

    // If there's history, display the newest entry and update buttons
    if (queryHistory.length > 0) {
      currentHistoryIndex = 0; // Start at the newest entry
      showHistoryEntry(currentHistoryIndex); // Display it
    } else {
      currentHistoryIndex = -1; // No history
      updateHistoryNavigationButtons(); // Disable buttons
    }
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

  // Event listeners for new history navigation buttons
  const historyBackBtn = document.getElementById('historyBackBtn');
  const historyForwardBtn = document.getElementById('historyForwardBtn');

  if (historyBackBtn) {
    historyBackBtn.addEventListener('click', () => {
      if (currentHistoryIndex < queryHistory.length - 1) {
        showHistoryEntry(currentHistoryIndex + 1);
      }
    });
  }

  if (historyForwardBtn) {
    historyForwardBtn.addEventListener('click', () => {
      if (currentHistoryIndex > 0) {
        showHistoryEntry(currentHistoryIndex - 1);
      }
    });
  }

  // Explicitly request page info when the sidebar loads
  // This helps ensure the sidebar has the latest page data
  chrome.runtime.sendMessage({ type: "REQUEST_PAGE_INFO_FROM_CONTENT_SCRIPT_VIA_BACKGROUND" })
    .catch(error => console.warn("[Sidebar] Could not request initial PAGE_INFO from background:", error.message));

});
