// YouTube video detection and transcription utilities

export interface YouTubeVideoInfo {
  isYouTubeVideo: boolean;
  videoId?: string;
  title?: string;
  transcription?: string;
}

export async function detectYouTubeVideo(): Promise<YouTubeVideoInfo> {
  try {
    // Get the URL from the active tab instead of the extension context
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    const url = activeTab?.url || '';
    
    console.log('🔍 Checking URL for YouTube video:', url);
    const isYouTubeVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/');
    console.log('🔍 Is YouTube video?', isYouTubeVideo);
    
    if (!isYouTubeVideo) {
      console.log('🔍 Not a YouTube video page');
      return { isYouTubeVideo: false };
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    console.log('🔍 Extracted video ID:', videoId);
    if (!videoId) {
      console.log('🔍 No video ID found');
      return { isYouTubeVideo: true };
    }

    // Get video title from the active tab
    const title = activeTab?.title?.replace(' - YouTube', '') || '';
    console.log('🔍 Video title:', title);

    return {
      isYouTubeVideo: true,
      videoId,
      title
    };
  } catch (error) {
    console.error('Error detecting YouTube video:', error);
    return { isYouTubeVideo: false };
  }
}

export function extractVideoId(url: string): string | null {
  // Handle youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  return null;
}

export async function extractYouTubeTranscription(): Promise<string | null> {
  try {
    console.log('🔍 Starting YouTube transcription extraction via content script...');
    
    // Send message to content script to extract transcription
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "extractYouTubeTranscription" });
          
          // Listen for response from content script
          const messageListener = (request: any, sender: any) => {
            if (request.action === 'transcriptionExtracted') {
              chrome.runtime.onMessage.removeListener(messageListener);
              console.log('🔍 Transcription extraction result:', request.transcription ? 'success' : 'failed');
              resolve(request.transcription);
            }
          };
          
          chrome.runtime.onMessage.addListener(messageListener);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            chrome.runtime.onMessage.removeListener(messageListener);
            console.log('🔍 Transcription extraction timed out');
            resolve(null);
          }, 30000);
        } else {
          console.log('🔍 No active tab found');
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('❌ Error extracting YouTube transcription:', error);
    return null;
  }
}

export async function getYouTubeVideoInfo(): Promise<YouTubeVideoInfo> {
  console.log('🎬 Starting getYouTubeVideoInfo...');
  const videoInfo = await detectYouTubeVideo();
  console.log('🎬 detectYouTubeVideo result:', videoInfo);
  
  if (videoInfo.isYouTubeVideo) {
    console.log('🎬 YouTube video detected, attempting to extract transcription...');
    const transcription = await extractYouTubeTranscription();
    
    if (transcription) {
      console.log('✅ Transcription successfully extracted');
    } else {
      console.log('❌ No transcription available for this video');
    }
    
    const result = {
      ...videoInfo,
      transcription: transcription || undefined
    };
    console.log('🎬 Final getYouTubeVideoInfo result:', result);
    return result;
  }

  console.log('🎬 Not a YouTube video, returning:', videoInfo);
  return videoInfo;
} 