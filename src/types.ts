export interface HistoryItem {
  id: string;
  timestamp: string;
  title: string;              // history entry title (summary title or AI-suggested title)
  type: 'summary' | 'search' | 'question' | 'file_analysis'; // type of response
  response: string;           // HTML string of the AI response
  tags?: string[];            // saved tags for summary or direct question (optional for backward compatibility)
  suggestedQuestions?: string[]; // saved suggested follow-up questions (optional for backward compatibility)
  links?: { title: string; url: string; description: string }[]; // saved links for search results (optional)
  screenshotData?: string;    // saved screenshot data for image analysis (optional)
  fileName?: string;          // saved file name for file analysis (optional)
  pageInfo?: {               // saved page info for summaries (optional)
    title: string;
    url: string;
    favicon: string;
  };
}

// AI Context Configuration
export interface AIContextConfig {
  usePageContext: boolean;
  useWebSearch: boolean;
  contextLevel: 'minimal' | 'standard' | 'comprehensive';
  includeMetadata: boolean;
  includeLinks: boolean;
  includeImages: boolean;
  maxContextLength: number;
  customInstructions?: string;
}

// AI Model Configuration
export interface AIModelConfig {
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// Page Information
export interface PageInfo {
  text: string;
  url: string;
  title: string;
  favicon: string;
  error?: string;
}

// AI Response Types
export interface AIResponse {
  text: string;
  model: string;
  tags: string[];
  suggestedQuestions?: string[];
  links?: { title: string; url: string; description: string }[];
  images?: { title: string; url: string; description: string; imageUrl: string }[];
}

// AI Action Types
export type AIAction = 'direct_question' | 'summarize_page' | 'get_links' | 'get_images' | 'summarize_file';

// Link Item
export interface LinkItem {
  title: string;
  url: string;
  description: string;
}

// YouTube Video Information
export interface YouTubeVideoInfo {
  title: string | null;
  videoId: string | null;
  transcription: string | null;
}

// File Processing Information
export interface FileProcessingInfo {
  fileName: string;
  fileType: string;
  fileSize: number;
  isProcessing: boolean;
}