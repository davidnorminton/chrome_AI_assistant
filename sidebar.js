// sidebar.js

// Global variables to store the current Browse page's metadata
let currentBrowsePageUrl = '';
let currentBrowsePageTitle = '';
let currentBrowsePageFavicon = '';

// A persistent element reference for the loading message within #output
let loadingMessageElement = null;

// Global variables for history management
let queryHistory = []; // Stores all history entries
let currentHistoryIndex = -1; // Indfex of the currently displayed item in queryHistory (0 is newest)

// Global variable for file upload
let selectedFile = null; // Stores the base64 Data URL of the selected file

// Model options for the settings dropdown
const modelOptions = [
  'pplx-7b-chat',
  'pplx-70b-chat',
  'sonar-deep-research',
  'sonar-reasoning-pro',
  'sonar-reasoning',
  'sonar-pro',
  'sonar',
  'r1-1776'
];

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

  // --- Dark Mode Initialization (now within settings overlay) ---
  const sidebarElement = document.getElementById('sidebar'); // Target #sidebar for dark mode class
  const lightModeBtn = document.getElementById('lightModeBtn');
  const darkModeBtn = document.getElementById('darkModeBtn');

  function applyTheme(isDark) {
    if (isDark) {
      sidebarElement.classList.add('dark-mode');
      lightModeBtn.classList.remove('active');
      darkModeBtn.classList.add('active');
    } else {
      sidebarElement.classList.remove('dark-mode');
      lightModeBtn.classList.add('active');
      darkModeBtn.classList.remove('active');
    }
    chrome.storage.local.set({ darkMode: isDark });
  }

  // Load dark mode preference
  chrome.storage.local.get('darkMode', (data) => {
    applyTheme(data.darkMode);
  });

  // Theme button click handlers
  lightModeBtn.addEventListener('click', () => applyTheme(false));
  darkModeBtn.addEventListener('click', () => applyTheme(true));
  // --- End Dark Mode Initialization ---

  // Favicon error handler
  const pageFaviconElement = document.getElementById("pageFavicon");
  if (pageFaviconElement) {
    pageFaviconElement.onerror = function() {
      this.style.display = 'none'; // Hide if loading fails
      console.warn("[Sidebar] Favicon failed to load. Image will be hidden.");
    };
  }

  // Listen for messages from content script (PAGE_INFO) or background script (RESTRICTED_PAGE_ERROR)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      // No pageTitle element anymore
      
      // Clear any restricted page error if a valid page info is received
      hideErrorMessage();

    } else if (request.type === 'RESTRICTED_PAGE_ERROR') {
      displayError(request.message);
    }
  });

  // Helper function to display errors
  function displayError(message) {
    const errorMessageElement = document.getElementById("errorMessage");
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
      errorMessageElement.classList.remove("hidden");
    }
  }

  // Helper function to hide errors
  function hideErrorMessage() {
    const errorMessageElement = document.getElementById("errorMessage");
    if (errorMessageElement) {
      errorMessageElement.classList.add("hidden");
      errorMessageElement.textContent = ""; // Clear content
    }
  }

  function toggleLoadingState(isLoading, message = '') {
    const cmdBtn = document.getElementById("cmdBtn");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const arrowIcon = document.getElementById("arrowIcon");
    const loaderIcon = document.getElementById("loaderIcon");
    const outputElement = document.getElementById("output");
    const newChatBtn = document.getElementById("newChatBtn"); // Get new chat button
    const fileUploadBtn = document.getElementById("fileUploadBtn"); // Get file upload button
    const toggleContextBtn = document.getElementById("toggleContextBtn"); // Get context toggle button

    if (isLoading) {
      cmdBtn.disabled = true;
      summarizeBtn.disabled = true;
      newChatBtn.disabled = true; // Disable new chat button during loading
      fileUploadBtn.disabled = true; // Disable file upload button during loading
      toggleContextBtn.disabled = true; // Disable context toggle button during loading
      arrowIcon.classList.add("hidden");
      loaderIcon.classList.remove("hidden");
      hideErrorMessage(); // Hide any previous errors when starting a new action

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
      newChatBtn.disabled = false; // Re-enable new chat button
      fileUploadBtn.disabled = false; // Re-enable file upload button
      toggleContextBtn.disabled = false; // Re-enable context toggle button
      arrowIcon.classList.remove("hidden");
      loaderIcon.classList.add("hidden");

      if (loadingMessageElement && outputElement.contains(loadingMessageElement)) {
        outputElement.removeChild(loadingMessageElement);
        loadingMessageElement = null;
      }
    }
  }

  const cmdInput = document.getElementById("cmdInput");
  const newChatBtn = document.getElementById("newChatBtn");
  const toggleContextBtn = document.getElementById("toggleContextBtn"); // Reference to the new button
  const fileUploadBtn = document.getElementById("fileUploadBtn");
  const hiddenFileInput = document.getElementById("hiddenFileInput");

  // Auto-resize textarea
  cmdInput.addEventListener('input', () => {
    cmdInput.style.height = 'auto'; // Reset height
    cmdInput.style.height = cmdInput.scrollHeight + 'px'; // Set to scroll height
  });

  // Function to update placeholder text based on context button state
  function updatePlaceholder() {
    if (toggleContextBtn.classList.contains('active')) {
      cmdInput.placeholder = "Ask anything about this page...";
    } else {
      cmdInput.placeholder = "Ask anything...";
    }
  }

  // Initial placeholder set based on initial button state
  updatePlaceholder();

  // Toggle Context Button Logic
  toggleContextBtn.addEventListener('click', () => {
    toggleContextBtn.classList.toggle('active');
    updatePlaceholder(); // Update placeholder immediately after toggling
  });


  // Clear chat/output logic
  newChatBtn.addEventListener('click', () => {
    clearOutputAndInput();
  });

  function clearOutputAndInput() {
    document.getElementById("output").innerHTML = "Click 'Summarize Page' to analyze the current content.";
    cmdInput.value = ''; // Use cmdInput directly
    cmdInput.style.height = 'auto'; // Reset textarea height
    hideErrorMessage(); // Clear any error messages
    toggleLoadingState(false); // Ensure loading state is off
    selectedFile = null; // Clear any selected file
    hiddenFileInput.value = ''; // Clear file input element
    updatePlaceholder(); // Reset placeholder
    console.log("[Sidebar] Chat cleared. Selected file reset.");
  }

  // File Upload Logic
  fileUploadBtn.addEventListener('click', () => {
    hiddenFileInput.click(); // Trigger the hidden file input click
  });

  hiddenFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedFile = e.target.result; // Store the Data URL (base64)
        console.log(`[Sidebar] File selected: ${file.name} (${file.type}). Data URL length: ${selectedFile.length}. Ready to send.`);
        // Update placeholder to indicate file is ready
        cmdInput.placeholder = `File "${file.name}" ready. Add your message...`;
      };
      reader.onerror = (e) => {
        console.error("[Sidebar] Error reading file:", e);
        displayError("Error reading file. Please try again.");
        selectedFile = null;
        updatePlaceholder(); // Reset placeholder if file reading fails
      };
      reader.readAsDataURL(file); // Read file as Data URL
    } else {
      selectedFile = null;
      updatePlaceholder(); // Reset placeholder if no file selected
    }
  });


  document.getElementById("cmdBtn").onclick = async () => {
    console.log("[Sidebar] Ask anything button clicked.");
    const input = cmdInput.value.trim();
    
    if (!input && !selectedFile) {
        displayError("Please enter a message or select a file to send.");
        return;
    }

    toggleLoadingState(true, 'Processing your request...');

    // Determine if page context should be used based on the button's active class
    const usePageContext = toggleContextBtn.classList.contains('active'); 
    let query = input;
    let fileToSend = selectedFile; // Use the globally stored selected file

    if (usePageContext) {
      toggleLoadingState(true, 'Fetching page content...');
      const pageResponse = await getPageTextFromTab(); // Get the full response object from getPageTextFromTab

      if (pageResponse.error === 'restricted_page') {
        displayError("Unable to access page content on this type of browser page (e.g., internal browser pages, extension pages, or file system pages).");
        toggleLoadingState(false);
        return;
      } else if (pageResponse.error === 'no_discernible_text') {
        displayError("The current page has no discernible text content. Please try on a different page or uncheck 'Page Context'.");
        toggleLoadingState(false);
        return;
      } else if (!pageResponse.text) { // General error or empty text
        displayError("Could not retrieve page content for context. There might be a general error. Trying without context.");
        // Fallback to sending query without context if text retrieval fails
        query = input;
      } else {
        query = `Based on this page:\n${pageResponse.text}\n\nUser question: ${input}`;
      }
    }

    toggleLoadingState(true, 'Sending to AI...');
    // Pass selectedFile to sendQueryToAI
    const response = await sendQueryToAI({ query, action: 'direct_question', file: fileToSend });

    toggleLoadingState(false);
    cmdInput.value = '';
    cmdInput.style.height = 'auto'; // Reset textarea height
    selectedFile = null; // Clear selected file after sending
    hiddenFileInput.value = ''; // Clear file input element
    updatePlaceholder(); // Reset placeholder
    displayInSidebar(response.text, response.model);
    saveToHistory(input, response.text, false);
  };

  document.getElementById("summarizeBtn").onclick = async () => {
    console.log("[Sidebar] Summarize button clicked.");
    toggleLoadingState(true, 'Fetching page content...');

    const pageResponse = await getPageTextFromTab(); // Get the full response object
    const pageText = pageResponse.text; // Extract text

    if (pageResponse.error === 'restricted_page') {
      displayError("Unable to access page content on this type of browser page for summarization.");
      toggleLoadingState(false);
      return;
    } else if (pageResponse.error === 'no_discernible_text') {
      displayError("The current page has no discernible text content for summarization.");
      toggleLoadingState(false);
      return;
    } else if (!pageText) {
      console.error("[Sidebar] No page text obtained for summarization.");
      displayError("Unable to access page content for summarization. The page might not have discernible text, or there was a general error.");
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

    // Clear any existing error messages when new content is displayed
    hideErrorMessage();

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
            linksHtml += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a>`;
            // Add description if available
            if (link.description) {
                linksHtml += `<p class="relevant-link-description">${link.description}</p>`;
            }
            linksHtml += `</li>`;
        });
        linksHtml += '</ul>';
    }


    const outputElement = document.getElementById("output");
    if (outputElement) {
      outputElement.innerHTML = `
        ${headerHtml}
        ${tagsHtml}
        <div class="ai-response-content">${text}</div>
        ${linksHtml} <!-- Add links section -->`;


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
          cmdInput.value = questionText; // Use cmdInput directly
          cmdInput.style.height = 'auto'; // Reset height
          cmdInput.style.height = cmdInput.scrollHeight + 'px'; // Adjust to content
          cmdInput.focus(); // Focus the input field
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

    // MODIFIED: Request description for links and add a random number for uniqueness
    const prompt = `Provide 10 highly relevant and unique links (URLs with titles and a brief 1-2 sentence description) related to '${tagName}'. Format the response as a JSON array of objects, where each object has 'title', 'url', and 'description' properties. Ensure the links are diverse and distinct. Random ID: ${Math.random().toString(36).substring(7)}. Example: [{"title": "Example Link 1", "url": "https://example.com/1", "description": "A brief description of this example link."}, {"title": "Example Link 2", "url": "https://example.com/2", "description": "Another brief description."}]`;

    const response = await sendQueryToAI({ query: prompt, action: 'get_links' });
    toggleLoadingState(false);

    let linksHtml = '';
    if (response && response.links && response.links.length > 0) {
      linksHtml = '<h3>Relevant Links:</h3><ul>';
      response.links.forEach(link => {
        linksHtml += `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a>`;
        // Add description if available
        if (link.description) {
            linksHtml += `<p class="relevant-link-description">${link.description}</p>`;
        }
        linksHtml += `</li>`;
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

  async function sendQueryToAI({ query, action, file = null }) { // Added file parameter
    console.log("[Sidebar] Sending query to AI for action:", action, " Query snippet:", query.substring(0, 100) + "...");
    if (file) {
        console.log("[Sidebar] Including file in query. File data URL length:", file.length);
    }

    const { model, apiKey } = await chrome.storage.local.get(["model", "apiKey"]);

    console.log("[Sidebar] Using API Key:", apiKey ? "Set" : "Not Set", "Model:", model);

    if (!apiKey) {
      console.error("[Sidebar] API Key not set.");
      displayError("Error: Perplexity AI API Key is not set. Please set it in Settings.");
      return { text: "Error: Perplexity AI API Key is not set. Please set it in Settings.", model: "None", tags: [], links: [] };
    }
    const endpoint = "https://api.perplexity.ai/chat/completions";
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    let messages = [];
    let systemMessageContent;

    if (action === "summarize_page") {
      systemMessageContent = `You are an AI assistant for a web browser sidebar that specializes in summarizing web page content.
      You must format your entire response as a single JSON object with two keys: "summary" and "tags".
      The "summary" value must be an HTML formatted string (use <p>, <ul>, <li>, <strong>, <em>, etc.).
      Include relevant image URLs in <img> tags where appropriate. For example: <img src="https://placehold.co/400x200/cccccc/000000?text=Image+Placeholder" alt="Description" style="max-width: 100%; height: auto;">.
      At the end of the summary, provide 2-3 concise follow-up questions related to the summary in an unordered list, wrapped in a <div class="suggested-questions-container">. Do NOT include any heading for these questions. Each list item should be a direct question.
      The "tags" value must be an array of 3 to 5 strings, identifying keywords or content categories (e.g., 'News Article', 'Product Page', 'Tutorial').
      Do not include any text outside the JSON object.`;

      messages.push({ role: "system", content: systemMessageContent });
      messages.push({ role: "user", content: query });
      
    } else if (action === "get_links") {
        systemMessageContent = `You are an AI assistant that provides lists of highly relevant and unique links.
        You must format your entire response as a single JSON array of objects. Each object in the array must have three properties: "title" (string), "url" (string), and "description" (string, a brief 1-2 sentence summary of the link's content).
        Provide 5 highly relevant and diverse links. Do not include any text or markdown outside the JSON array.`;
        messages.push({ role: "system", content: systemMessageContent });
        messages.push({ role: "user", content: query });
    }
    else { // For 'direct_question'
      systemMessageContent = `You are an AI assistant for a web browser sidebar.
      Always format your responses using appropriate HTML tags (e.g., <p>, <h1>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <a> for links).
      If relevant, embed image URLs using <img> tags where appropriate. For example: <img src="https://placehold.co/400x200/cccccc/000000?text=Image+Placeholder" alt="Description" style="max-width: 100%; height: auto;">.
      After your main answer, suggest 2-3 concise follow-up questions in an unordered list (<ul><li>...</li></ul>), wrapped in a <div class="suggested-questions-container">. Do NOT include any heading for these questions. Each list item should be a direct question.
      Be concise but informative.
      ${query.startsWith('Based on this page:') ? `The user is asking a question related to the following page content: "${query.split('\n\nUser question:')[0].replace('Based on this page:\n', '')}".` : ''}
      `;
      messages.push({ role: "system", content: systemMessageContent });
      
      // Handle multimodal input if a file is present
      if (file) {
          // Extract mimeType and data from Data URL
          const parts = file.split(';');
          const mimeType = parts[0].split(':')[1];
          const base64Data = parts[1].split(',')[1];

          messages.push({
              role: "user",
              parts: [
                  { text: query }, // User's text message
                  { inlineData: { mimeType: mimeType, data: base64Data } } // Inline file data
              ]
          });
          console.log("[Sidebar] Sending multimodal request with text and file.");
      } else {
          messages.push({ role: "user", content: query });
      }
    }

    const body = {
      model: model || "sonar-small-online",
      messages: messages, // Use the constructed messages array
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
        displayError("Error: Perplexity AI API Key Unauthorized (401). Please check your API Key in Settings.");
        return { text: "Error: Perplexity AI API Key Unauthorized (401). Please check your API Key in Settings.", model: "None", tags: [], links: [] };
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
                model: model || "sonar",
                tags: parsedContent.tags,
                links: []
              };
            } else {
              console.warn("[Sidebar] AI returned unexpected JSON structure for tags. Falling back to plain text with empty tags.");
              displayError("AI response format unexpected. Displaying raw response. Please try again.");
              return {
                text: rawContent, // Fallback to raw if JSON structure is wrong
                model: model || "sonar",
                tags: [],
                links: []
              };
            }
          } catch (e) {
            console.error("[Sidebar] Failed to parse AI response as JSON for tags (possibly not valid JSON or unexpected format):", e, "Raw content:", rawContent);
            displayError("AI response format invalid. Displaying raw response. Please try again.");
            // If parsing fails, treat the whole rawContent as the text and no tags
            return {
              text: rawContent,
              model: model || "sonar",
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
                // Ensure each link has title, url, and description
                if (Array.isArray(parsedLinks) && parsedLinks.every(item => typeof item.title === 'string' && typeof item.url === 'string' && typeof item.description === 'string')) {
                    return {
                        text: '', // No main text content for this action
                        model: model || "sonar",
                        tags: [],
                        links: parsedLinks
                    };
                } else {
                    console.warn("[Sidebar] AI returned unexpected JSON structure for links (missing title, url, or description). Falling back to plain text.");
                    displayError("AI response format unexpected for links. Displaying raw response. Please try again.");
                    return {
                        text: rawContent,
                        model: model || "sonar",
                        tags: [],
                        links: []
                    };
                }
            } catch (e) {
                console.error("[Sidebar] Failed to parse AI response as JSON for links:", e, "Raw content:", rawContent);
                displayError("AI response format invalid for links. Displaying raw response. Please try again.");
                return {
                    text: rawContent,
                    model: model || "sonar",
                    tags: [],
                    links: []
                };
            }
        }
        else {
          // For direct questions, the response is expected to be direct HTML
          return {
            text: rawContent,
            model: model || "sonar",
            tags: [],
            links: []
          };
        }
      } else {
        console.error("[Sidebar] Error from API:", data.detail || data.error || response.statusText);
        displayError(`Error from Perplexity AI: ${data.detail || data.error || response.statusText}`);
        return { text: `Error from Perplexity AI: ${data.detail || data.error || response.statusText}`, model: "None", tags: [], links: [] };
      }
    } catch (err) {
      console.error("[Sidebar] Network/Fetch error:", err);
      displayError(`Network Error: Could not connect to Perplexity AI. Please check your internet connection. (${err.message})`);
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
      // Close history overlay after selecting an item
      document.getElementById('historyOverlay').classList.remove('active');
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


  function renderHistoryList(historyToRender) { // Renamed parameter for clarity
    console.log("[Sidebar] Rendering history list.");
    const list = document.getElementById("historyList");
    list.innerHTML = ''; // Clear existing list

    if (historyToRender.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #555;">No history yet. Ask a question to see it here!</p>';
      return;
    }

    historyToRender.forEach((entry, index) => {
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
        // Note: When searching, the index refers to the filtered list,
        // but showHistoryEntry needs the index from the *original* queryHistory.
        // For simplicity, we'll re-find the index in the original array.
        const originalIndex = queryHistory.findIndex(item => item.timestamp === entry.timestamp);
        if (originalIndex !== -1) {
            showHistoryEntry(originalIndex);
        }
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
        // Find the index in the original array to delete correctly
        const originalIndex = queryHistory.findIndex(item => item.timestamp === entry.timestamp);
        if (originalIndex !== -1) {
            queryHistory.splice(originalIndex, 1); // Use global queryHistory
            chrome.storage.local.set({ queryHistory: queryHistory }, () => {
                renderHistoryList(queryHistory); // Re-render all history
                // Adjust currentHistoryIndex if the deleted item was before it
                if (originalIndex < currentHistoryIndex) {
                    currentHistoryIndex--;
                } else if (originalIndex === currentHistoryIndex && queryHistory.length > 0) {
                    // If current item deleted, show newest or previous
                    currentHistoryIndex = Math.max(0, currentHistoryIndex - 1);
                    showHistoryEntry(currentHistoryIndex); // Re-display current if it shifted
                } else if (queryHistory.length === 0) {
                    currentHistoryIndex = -1; // No history left
                    document.getElementById("output").innerHTML = "No history yet. Ask a question to see it here!";
                }
                updateHistoryNavigationButtons();
            });
        }
      };

      li.appendChild(question);
      li.appendChild(responsePreview); // Add the preview
      li.appendChild(time);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  // Initial load of history and button states
  chrome.storage.local.get(["queryHistory"], data => { // Removed "activeTab" as tabs are gone
    queryHistory = data.queryHistory || []; // Initialize global queryHistory
    renderHistoryList(queryHistory);

    // If there's history, display the newest entry and update buttons
    if (queryHistory.length > 0) {
      currentHistoryIndex = 0; // Start at the newest entry
      showHistoryEntry(currentHistoryIndex); // Display it
    } else {
      currentHistoryIndex = -1; // No history
      updateHistoryNavigationButtons(); // Disable buttons
    }
  });

  // Removed tab event listeners as tabs are gone


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


  // --- Settings Overlay Logic ---
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('modelSelect');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const saveMsg = document.getElementById('saveMsg');

  // Populate model dropdown
  modelOptions.forEach(model => {
    const opt = document.createElement("option");
    opt.value = model;
    opt.textContent = model;
    modelSelect.appendChild(opt);
  });

  // Load saved settings
  chrome.storage.local.get(["apiKey", "model"], (data) => {
    apiKeyInput.value = data.apiKey || "";
    modelSelect.value = data.model || "sonar-small-online";
  });

  // Save settings on button click
  saveSettingsBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey) {
      saveMsg.textContent = "API key is required!";
      saveMsg.classList.remove("hidden");
      saveMsg.style.color = "red";
      setTimeout(() => saveMsg.classList.add("hidden"), 3000);
      return;
    }

    chrome.storage.local.set({ apiKey, model }, () => {
      saveMsg.textContent = "Settings saved!";
      saveMsg.classList.remove("hidden");
      saveMsg.style.color = "green";
      setTimeout(() => saveMsg.classList.add("hidden"), 2000);
    });
  });

  // Open settings overlay
  if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
      settingsOverlay.classList.add('active'); // 'active' class will control visibility
      document.getElementById('historyOverlay').classList.remove('active'); // Close history if open
    });
  }

  // Close settings overlay
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsOverlay.classList.remove('active');
    });
  }
  // --- End Settings Overlay Logic ---

  // --- History Overlay Logic ---
  const historyToggle = document.getElementById('historyToggle');
  const historyOverlay = document.getElementById('historyOverlay');
  const closeHistoryBtn = document.getElementById('closeHistory');
  const historySearchInput = document.getElementById('historySearchInput');
  const exportHistoryBtn = document.getElementById('exportHistoryBtn');


  // Open history overlay
  if (historyToggle) {
    historyToggle.addEventListener('click', () => {
      historyOverlay.classList.add('active'); // 'active' class will control visibility
      settingsOverlay.classList.remove('active'); // Close settings if open
      renderHistoryList(queryHistory); // Re-render all history when opening
      historySearchInput.value = ''; // Clear search input when opening history
    });
  }

  // Close history overlay
  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
      historyOverlay.classList.remove('active');
    });
  }

  // History Search Functionality
  if (historySearchInput) {
    historySearchInput.addEventListener('input', (event) => {
      const searchTerm = event.target.value.toLowerCase();
      const filtered = queryHistory.filter(entry =>
        entry.query.toLowerCase().includes(searchTerm) ||
        entry.response.toLowerCase().includes(searchTerm) ||
        (entry.pageTitle && entry.pageTitle.toLowerCase().includes(searchTerm)) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
      renderHistoryList(filtered);
    });
  }

  // Export History to CSV
  if (exportHistoryBtn) {
    exportHistoryBtn.addEventListener('click', () => {
      exportHistoryToCsv(queryHistory);
    });
  }

  function exportHistoryToCsv(historyData) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Type,Query/Title,Response,URL,Tags\n"; // CSV Header

    historyData.forEach(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleString();
      const type = entry.isSummary ? "Summary" : "Direct Question";
      // Sanitize CSV fields: wrap in quotes and escape internal quotes
      const query = `"${entry.query.replace(/"/g, '""')}"`;
      // Convert HTML response to plain text and sanitize
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = entry.response;
      const responseText = `"${tempDiv.innerText.replace(/"/g, '""')}"`;
      const url = `"${(entry.url || '').replace(/"/g, '""')}"`;
      const tags = `"${(entry.tags || []).join(', ').replace(/"/g, '""')}"`;

      csvContent += `${timestamp},${type},${query},${responseText},${url},${tags}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "web_pilot_ai_history.csv");
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up
    console.log("[Sidebar] History exported to CSV.");
  }

  // --- End History Overlay Logic ---


  // Copy to clipboard from right menu
  const copyToggle = document.getElementById('copyToggle');
  if (copyToggle) {
    copyToggle.addEventListener('click', () => {
      const responseEl = document.getElementById('output');
      if (responseEl) {
        const textToCopy = responseEl.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const feedback = document.createElement('span');
          feedback.className = 'copy-feedback';
          feedback.textContent = 'Copied!';
          document.getElementById('rightMenu').appendChild(feedback);
          feedback.style.opacity = '1';
          setTimeout(() => { feedback.style.opacity = '0'; feedback.remove(); }, 1500);
        }).catch(err => console.error('Copy failed:', err));
      }
    });
  }
});
