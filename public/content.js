// content.js

console.log("[Content Script] Loaded and registering message listener.");

// Screenshot functionality
let isScreenshotMode = false;
let selectionStart = null;
let selectionEnd = null;
let overlay = null;
let selectionBox = null;

// Helper to extract page text and detect restricted pages
function extractPageText() {
  const url = window.location.href;
  if (/^(chrome|edge|about|view-source|file):/.test(url)) {
    return { text: "", error: "restricted_page" };
  }
  const txt = document.body?.innerText.trim() || "";
  if (!txt) {
    return { text: "", error: "no_discernible_text" };
  }
  return { text: txt };
}

// Create screenshot overlay
function createScreenshotOverlay() {
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999999;
    cursor: crosshair;
    user-select: none;
  `;
  
  selectionBox = document.createElement('div');
  selectionBox.style.cssText = `
    position: absolute;
    border: 2px solid #007bff;
    background: rgba(0, 123, 255, 0.1);
    display: none;
    pointer-events: none;
  `;
  
  overlay.appendChild(selectionBox);
  document.body.appendChild(overlay);
  
  // Add instructions
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1000000;
  `;
  instructions.textContent = 'Click and drag to select an area, then release to capture';
  document.body.appendChild(instructions);
  
  return { overlay, selectionBox, instructions };
}

// Handle mouse events for screenshot selection
function handleScreenshotMouseEvents() {
  overlay.addEventListener('mousedown', (e) => {
    // Use raw coordinates without any adjustments
    selectionStart = { x: e.clientX, y: e.clientY };
    selectionBox.style.display = 'block';
    selectionBox.style.left = e.clientX + 'px';
    selectionBox.style.top = e.clientY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  });
  
  overlay.addEventListener('mousemove', (e) => {
    if (selectionStart) {
      const width = e.clientX - selectionStart.x;
      const height = e.clientY - selectionStart.y;
      
      selectionBox.style.left = (width < 0 ? e.clientX : selectionStart.x) + 'px';
      selectionBox.style.top = (height < 0 ? e.clientY : selectionStart.y) + 'px';
      selectionBox.style.width = Math.abs(width) + 'px';
      selectionBox.style.height = Math.abs(height) + 'px';
      
      // Update instructions with size info
      if (window.screenshotInstructions) {
        window.screenshotInstructions.textContent = 
          `Selection: ${Math.abs(width)}x${Math.abs(height)}px - Release to capture`;
      }
    }
  });
  
  overlay.addEventListener('mouseup', (e) => {
    if (selectionStart) {
      selectionEnd = { x: e.clientX, y: e.clientY };
      captureScreenshot();
    }
  });
  
  // Handle escape key to cancel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isScreenshotMode) {
      cancelScreenshot();
    }
  });
}

// Capture screenshot of selected area
function captureScreenshot() {
  const left = Math.min(selectionStart.x, selectionEnd.x);
  const top = Math.min(selectionStart.y, selectionEnd.y);
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);

  // Check if selection is too small
  if (width < 5 || height < 5) {
    alert('Selection too small. Please select a larger area.');
    cancelScreenshot();
    return;
  }

  // Get device pixel ratio and viewport information
  const devicePixelRatio = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  
  // Calculate coordinates accounting for device pixel ratio and scrolling
  // The screenshot is captured at device pixel ratio, so we need to scale our coordinates
  const scaledLeft = Math.round(left * devicePixelRatio);
  const scaledTop = Math.round(top * devicePixelRatio);
  const scaledWidth = Math.round(width * devicePixelRatio);
  const scaledHeight = Math.round(height * devicePixelRatio);

  // Hide the overlay and selection box before capturing
  if (overlay) {
    overlay.style.display = 'none';
  }
  if (selectionBox) {
    selectionBox.style.display = 'none';
  }
  if (window.screenshotInstructions) {
    window.screenshotInstructions.style.display = 'none';
  }
  if (window.debugInfo) {
    window.debugInfo.style.display = 'none';
  }

  const screenshotTimeout = setTimeout(() => {
    console.error('Screenshot request timed out');
    alert('Screenshot request timed out. Please try again.');
    cancelScreenshot();
  }, 10000); // 10 second timeout

  console.log('Sending screenshot capture request to background script...');
  chrome.runtime.sendMessage({ action: "captureScreenshot" }, (response) => {
    clearTimeout(screenshotTimeout);
    console.log('Screenshot capture response received:', response);

    if (chrome.runtime.lastError) {
      console.error('Error in screenshot response:', chrome.runtime.lastError);
      alert('Failed to communicate with background script. Please try again.');
      cancelScreenshot();
      return;
    }

    if (!response) {
      console.error('No response received from background script');
      alert('No response from background script. Please try again.');
      cancelScreenshot();
      return;
    }

    if (response.error) {
      console.error('Screenshot capture failed:', response.error);
      let errorMessage = 'Failed to capture screenshot. Please try again.';
      if (response.error === 'screenshot_not_allowed_for_url') {
        errorMessage = 'Screenshots are not allowed on this type of page (chrome://, about://, etc.).';
      } else if (response.error === 'no_active_tab') {
        errorMessage = 'No active tab found. Please refresh the page and try again.';
      } else if (response.error === 'no_screenshot_data') {
        errorMessage = 'Screenshot capture returned no data. Please try again.';
      } else if (response.error === 'tab_not_ready') {
        errorMessage = 'Page is not fully loaded. Please wait a moment and try again.';
      }

      alert(errorMessage);
      cancelScreenshot();
      return;
    }

    if (!response.imageData) {
      console.error('No imageData received from background script');
      alert('Failed to capture screenshot. Please try again.');
      cancelScreenshot();
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Ensure coordinates are within bounds
      const cropLeft = Math.max(0, Math.min(scaledLeft, img.width - 1));
      const cropTop = Math.max(0, Math.min(scaledTop, img.height - 1));
      const cropWidth = Math.min(scaledWidth, img.width - cropLeft);
      const cropHeight = Math.min(scaledHeight, img.height - cropTop);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Draw the cropped portion using the scaled coordinates
      ctx.drawImage(img, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      const imageData = canvas.toDataURL('image/png');

      // Clean up
      cancelScreenshot();

      // Send the screenshot data back to the extension
      chrome.runtime.sendMessage({
        action: 'screenshotCaptured',
        imageData: imageData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to send screenshot data:', chrome.runtime.lastError);
        }
      });
    };

    img.onerror = (error) => {
      console.error('Failed to load screenshot image:', error);
      alert('Failed to process screenshot. Please try again.');
      cancelScreenshot();
    };

    img.src = response.imageData;
  });
}

// Cancel screenshot mode
function cancelScreenshot() {
  isScreenshotMode = false;
  if (overlay) {
    document.body.removeChild(overlay);
    overlay = null;
  }
  if (window.screenshotInstructions) {
    document.body.removeChild(window.screenshotInstructions);
    window.screenshotInstructions = null;
  }
  if (window.debugInfo) {
    document.body.removeChild(window.debugInfo);
    window.debugInfo = null;
  }
  selectionStart = null;
  selectionEnd = null;
}

// Start screenshot mode
function startScreenshot() {
  isScreenshotMode = true;
  const { overlay: newOverlay, selectionBox: newSelectionBox, instructions } = createScreenshotOverlay();
  overlay = newOverlay;
  selectionBox = newSelectionBox;
  window.screenshotInstructions = instructions;
  
  handleScreenshotMouseEvents();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle screenshot start
  if (request.action === "startScreenshot") {
    startScreenshot();
    return true;
  }

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

  // === YouTube transcription extraction ===
  if (request.action === "extractYouTubeTranscription") {
    console.log('[Content Script] Starting YouTube transcription extraction...');
    
    // Wait for page to be fully loaded
    setTimeout(async () => {
      try {
        // Method 1: Try to find and click the "..." menu button first
        const moreButton = document.querySelector('button[aria-label*="More actions"], button[aria-label*="more"], ytd-button-renderer[aria-label*="More actions"]');
        if (moreButton) {
          console.log('[Content Script] Found more actions button, clicking...');
          moreButton.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Method 2: Look for transcript button in various locations
        const transcriptButtonSelectors = [
          'button[aria-label*="transcript"]',
          'button[aria-label*="Transcript"]',
          'button[title*="transcript"]',
          'button[title*="Transcript"]',
          'ytd-button-renderer[aria-label*="transcript"]',
          'ytd-button-renderer[aria-label*="Transcript"]',
          '[role="button"][aria-label*="transcript"]',
          '[role="button"][aria-label*="Transcript"]',
          'a[href*="transcript"]',
          'span:contains("Show transcript")',
          'span:contains("Transcript")'
        ];
        
        let transcriptButton = null;
        for (const selector of transcriptButtonSelectors) {
          transcriptButton = document.querySelector(selector);
          if (transcriptButton) {
            console.log(`[Content Script] Found transcript button with selector: ${selector}`);
            break;
          }
        }
        
        if (transcriptButton) {
          console.log('[Content Script] Clicking transcript button...');
          transcriptButton.click();
          
          // Wait for transcript panel to appear
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log('[Content Script] No transcript button found');
        }
        
        // Method 3: Look for transcript content in various locations
        const transcriptSelectors = [
          '[role="dialog"] [data-timestamp]',
          '.ytd-transcript-renderer [data-timestamp]',
          '[aria-label*="transcript"] [data-timestamp]',
          '[role="dialog"] [role="button"]',
          '.ytd-transcript-segment-renderer',
          '[data-timestamp]',
          '[role="button"][data-timestamp]',
          '.ytd-transcript-renderer span',
          '[aria-label*="transcript"] span',
          '.ytd-transcript-renderer div',
          '[role="dialog"] span',
          '[role="dialog"] div'
        ];
        
        let transcription = '';
        
        for (const selector of transcriptSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`[Content Script] Found ${elements.length} elements with selector: ${selector}`);
            
            const texts = Array.from(elements)
              .map(el => el.textContent?.trim())
              .filter(text => text && text.length > 0);
            
            if (texts.length > 0) {
              transcription = texts.join(' ');
              console.log(`[Content Script] Extracted ${transcription.length} characters of transcription`);
              
              // Validate that we have meaningful content
              if (transcription.length > 50 && transcription.split(' ').length > 10) {
                console.log('[Content Script] ✅ Successfully extracted meaningful transcription');
                chrome.runtime.sendMessage({
                  action: 'transcriptionExtracted',
                  transcription: transcription
                });
                return;
              }
            }
          }
        }
        
        // Method 4: Try to find any text that looks like a transcript
        const allTextElements = document.querySelectorAll('span, div, p');
        const potentialTranscriptTexts = Array.from(allTextElements)
          .map(el => el.textContent?.trim())
          .filter(text => text !== undefined && text.length > 20 && text.split(' ').length > 5)
          .filter(text => !text.includes('Subscribe') && !text.includes('Like') && !text.includes('Share'));
        
        if (potentialTranscriptTexts.length > 0) {
          console.log(`[Content Script] Found ${potentialTranscriptTexts.length} potential transcript texts`);
          const longestText = potentialTranscriptTexts.reduce((longest, current) => 
            current.length > longest.length ? current : longest, '');
          
          if (longestText.length > 100) {
            console.log('[Content Script] ✅ Found potential transcript text');
            chrome.runtime.sendMessage({
              action: 'transcriptionExtracted',
              transcription: longestText
            });
            return;
          }
        }
        
        console.log('[Content Script] ❌ No transcript found - video may not have captions available');
        chrome.runtime.sendMessage({
          action: 'transcriptionExtracted',
          transcription: null
        });
        
      } catch (error) {
        console.error('[Content Script] ❌ Error extracting YouTube transcription:', error);
        chrome.runtime.sendMessage({
          action: 'transcriptionExtracted',
          transcription: null
        });
      }
    }, 1000);
    
    return true; // keep channel open
  }

  return false; // ignore other messages
});