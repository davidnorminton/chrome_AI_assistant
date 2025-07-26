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
  console.log("[Content Script] Extracted text:", txt.length, "characters");
  console.log(document.body?.innerText)
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
    console.log('Selection started at:', selectionStart);
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
      
      // Update debug info
      if (window.debugInfo) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        window.debugInfo.textContent = `Screenshot Debug:
Viewport: ${window.innerWidth}x${window.innerHeight}
Device Pixel Ratio: ${devicePixelRatio}
Mouse: ${e.clientX},${e.clientY}
Selection: ${Math.abs(width)}x${Math.abs(height)}`;
      }
    }
  });
  
  overlay.addEventListener('mouseup', (e) => {
    if (selectionStart) {
      selectionEnd = { x: e.clientX, y: e.clientY };
      console.log('Selection ended at:', selectionEnd);
      console.log('Selection size:', Math.abs(selectionEnd.x - selectionStart.x), 'x', Math.abs(selectionEnd.y - selectionStart.y));
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

  console.log('Screenshot selection:', {
    selectionStart,
    selectionEnd,
    left,
    top,
    width,
    height
  });

  // Check if selection is too small
  if (width < 5 || height < 5) {
    console.log('Selection too small:', { width, height });
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
  
  console.log('Device and viewport info:', {
    devicePixelRatio,
    viewport: `${viewportWidth}x${viewportHeight}`,
    scroll: `${scrollX},${scrollY}`
  });

  // Calculate coordinates accounting for device pixel ratio and scrolling
  // The screenshot is captured at device pixel ratio, so we need to scale our coordinates
  const scaledLeft = Math.round(left * devicePixelRatio);
  const scaledTop = Math.round(top * devicePixelRatio);
  const scaledWidth = Math.round(width * devicePixelRatio);
  const scaledHeight = Math.round(height * devicePixelRatio);

  console.log('Scaled coordinates:', {
    original: { left, top, width, height },
    scaled: { left: scaledLeft, top: scaledTop, width: scaledWidth, height: scaledHeight },
    devicePixelRatio
  });

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

    console.log('Screenshot captured, dataUrl length:', response.imageData.length);
    console.log('Screenshot captured, processing crop with device pixel ratio scaling...');

    const img = new Image();
    img.onload = () => {
      console.log('Image loaded, dimensions:', img.width, 'x', img.height);
      console.log('Cropping to scaled coordinates:', scaledLeft, scaledTop, scaledWidth, scaledHeight);

      // Ensure coordinates are within bounds
      const cropLeft = Math.max(0, Math.min(scaledLeft, img.width - 1));
      const cropTop = Math.max(0, Math.min(scaledTop, img.height - 1));
      const cropWidth = Math.min(scaledWidth, img.width - cropLeft);
      const cropHeight = Math.min(scaledHeight, img.height - cropTop);

      console.log('Final crop coordinates:', {
        left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // Draw the cropped portion using the scaled coordinates
      ctx.drawImage(img, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      const imageData = canvas.toDataURL('image/png');
      console.log('Screenshot processed successfully, imageData length:', imageData.length);

      // Clean up
      cancelScreenshot();

      // Send the screenshot data back to the extension
      console.log('Sending screenshot data to extension...');
      chrome.runtime.sendMessage({
        action: 'screenshotCaptured',
        imageData: imageData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to send screenshot data:', chrome.runtime.lastError);
        } else {
          console.log('Screenshot data sent successfully');
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
  
  // Add visual debugging to show page layout
  const debugInfo = document.createElement('div');
  debugInfo.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000001;
    white-space: pre;
  `;
  
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  debugInfo.textContent = `Screenshot Debug:
Viewport: ${window.innerWidth}x${window.innerHeight}
Device Pixel Ratio: ${devicePixelRatio}`;
  document.body.appendChild(debugInfo);
  window.debugInfo = debugInfo;
  
  handleScreenshotMouseEvents();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content Script] Message received:", request);

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

  return false; // ignore other messages
});