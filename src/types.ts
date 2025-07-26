export interface HistoryItem {
  id: string;
  timestamp: string;
  title: string;              // history entry title (summary title or AI-suggested title)
  type: 'summary' | 'search' | 'question' | 'image_search'; // type of response
  response: string;           // HTML string of the AI response
  tags?: string[];            // saved tags for summary or direct question (optional for backward compatibility)
  suggestedQuestions?: string[]; // saved suggested follow-up questions (optional for backward compatibility)
  links?: { title: string; url: string; description: string }[]; // saved links for search results (optional)
  images?: { title: string; url: string; description: string; imageUrl: string }[]; // saved images for image search results (optional)
  pageInfo?: {               // saved page info for summaries (optional)
    title: string;
    url: string;
    favicon: string;
  };
}