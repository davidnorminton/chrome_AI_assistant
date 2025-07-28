// YouTube video detection and transcription utilities

export interface YouTubeVideoInfo {
  isYouTubeVideo: boolean;
  videoId?: string;
  title?: string;
  transcription?: string;
}

export async function detectYouTubeVideo(): Promise<YouTubeVideoInfo> {
  try {
    // Check if we're on a YouTube video page
    const url = window.location.href;
    const isYouTubeVideo = url.includes('youtube.com/watch') || url.includes('youtu.be/');
    
    if (!isYouTubeVideo) {
      return { isYouTubeVideo: false };
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return { isYouTubeVideo: true };
    }

    // Get video title
    const title = document.title.replace(' - YouTube', '');

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
    // Look for the transcript button
    const transcriptButton = document.querySelector('button[aria-label*="transcript"], button[aria-label*="Transcript"], button[title*="transcript"], button[title*="Transcript"]');
    if (!transcriptButton) {
      return null;
    }

    // Click the transcript button
    (transcriptButton as HTMLButtonElement).click();

    // Wait for transcript panel to appear
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find the transcript panel
    const transcriptPanel = document.querySelector('[role="dialog"], .ytd-transcript-renderer, [aria-label*="transcript"], [aria-label*="Transcript"]');
    if (!transcriptPanel) {
      return null;
    }

    // Find all transcript segments
    const segments = transcriptPanel.querySelectorAll('[role="button"], .ytd-transcript-segment-renderer, [data-timestamp]');
    if (!segments || segments.length === 0) {
      return null;
    }

    const transcription = Array.from(segments)
      .map(segment => (segment as HTMLElement).textContent?.trim())
      .filter(text => text && text.length > 0)
      .join(' ');

    return transcription || null;
  } catch (error) {
    console.error('Error extracting YouTube transcription:', error);
    return null;
  }
}

export async function getYouTubeVideoInfo(): Promise<YouTubeVideoInfo> {
  const videoInfo = await detectYouTubeVideo();
  
  if (videoInfo.isYouTubeVideo) {
    const transcription = await extractYouTubeTranscription();
    return {
      ...videoInfo,
      transcription: transcription || undefined
    };
  }

  return videoInfo;
} 