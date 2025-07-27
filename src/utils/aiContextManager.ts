import type { AIContextConfig, PageInfo, AIAction } from '../types';

// Default AI Context Configuration
export const DEFAULT_AI_CONTEXT_CONFIG: AIContextConfig = {
  usePageContext: true,
  useWebSearch: false,
  contextLevel: 'standard',
  includeMetadata: true,
  includeLinks: true,
  includeImages: false,
  maxContextLength: 8000,
  customInstructions: undefined,
};

// Context Level Configurations
export const CONTEXT_LEVEL_CONFIGS = {
  minimal: {
    maxContextLength: 2000,
    includeMetadata: false,
    includeLinks: false,
    includeImages: false,
  },
  standard: {
    maxContextLength: 8000,
    includeMetadata: true,
    includeLinks: true,
    includeImages: false,
  },
  comprehensive: {
    maxContextLength: 15000,
    includeMetadata: true,
    includeLinks: true,
    includeImages: true,
  },
};

export class AIContextManager {
  private config: AIContextConfig;

  constructor(config?: Partial<AIContextConfig>) {
    this.config = { ...DEFAULT_AI_CONTEXT_CONFIG, ...config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIContextConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): AIContextConfig {
    return { ...this.config };
  }

  // Build context-aware query
  buildQuery(
    userQuery: string,
    pageInfo: PageInfo,
    action: AIAction,
    fileData?: string | null
  ): string {
    const { contextLevel, maxContextLength, customInstructions } = this.config;

    let contextQuery = userQuery;

    // Add page context if enabled and no file data
    if (this.config.usePageContext && !fileData) {
      const pageContext = this.buildPageContext(pageInfo);
      contextQuery = `Based on this page:\n${pageContext}\n\nUser question: ${userQuery}`;
    }

    // Add custom instructions if provided
    if (customInstructions) {
      contextQuery = `${customInstructions}\n\n${contextQuery}`;
    }

    // Truncate if necessary
    if (contextQuery.length > maxContextLength) {
      contextQuery = contextQuery.substring(0, maxContextLength) + '...';
    }

    return contextQuery;
  }

  // Build page context based on configuration
  private buildPageContext(pageInfo: PageInfo): string {
    const { contextLevel, includeMetadata, includeLinks } = this.config;
    const levelConfig = CONTEXT_LEVEL_CONFIGS[contextLevel];

    let context = pageInfo.text;

    // Add metadata if enabled
    if (includeMetadata && levelConfig.includeMetadata) {
      context += `\n\nPage Title: ${pageInfo.title}`;
      context += `\nPage URL: ${pageInfo.url}`;
    }

    // Add links if enabled (this would need to be implemented based on your link extraction logic)
    if (includeLinks && levelConfig.includeLinks) {
      // You could add link extraction logic here
      // context += `\n\nPage Links: ${extractedLinks}`;
    }

    return context;
  }

  // Determine AI action based on context and input
  determineAction(
    userQuery: string,
    fileData?: string | null,
    useWebSearch?: boolean
  ): AIAction {
    if (fileData) {
      return 'summarize_file';
    }
    
    if (useWebSearch || this.config.useWebSearch) {
      return 'get_links';
    }

    // Check if it's a direct question or needs summarization
    const summarizationKeywords = ['summarize', 'summary', 'overview', 'sum up', 'brief'];
    const isSummarizationRequest = summarizationKeywords.some(keyword => 
      userQuery.toLowerCase().includes(keyword)
    );

    return isSummarizationRequest ? 'summarize_page' : 'direct_question';
  }

  // Get context level configuration
  getContextLevelConfig(level: 'minimal' | 'standard' | 'comprehensive') {
    return CONTEXT_LEVEL_CONFIGS[level];
  }

  // Validate configuration
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.maxContextLength < 1000) {
      errors.push('Max context length must be at least 1000 characters');
    }

    if (this.config.maxContextLength > 20000) {
      errors.push('Max context length cannot exceed 20000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Create a context-aware system prompt
  createSystemPrompt(action: AIAction): string {
    const basePrompt = this.getBaseSystemPrompt(action);
    
    if (this.config.customInstructions) {
      return `${basePrompt}\n\nAdditional Instructions: ${this.config.customInstructions}`;
    }

    return basePrompt;
  }

  private getBaseSystemPrompt(action: AIAction): string {
    switch (action) {
      case 'summarize_page':
        return `You are an AI assistant specialized in creating comprehensive, well-structured summaries.
        
Your summarization should follow this structure:
1. **Brief Overview** (2-3 sentences): Provide a concise introduction explaining what the page/document is about and its main purpose.
2. **Key Points Summary** (bullet points): Extract and explain the most important points, concepts, or findings from the content.
3. **Content Quality**: Ensure your summary is clear, comprehensive but concise, well-organized, and focused on the most valuable information.

Format your response as a single JSON object with keys:
  "summary" (HTML string with the structured summary),
  "tags" (array of exactly 6 relevant tags),
  "suggestedQuestions" (array of exactly 3 follow-up questions).

Use only basic HTML tags (<p>, <ul>, <li>, <strong>, <em>, <h3>).
Return exactly the JSON object.`;

      case 'get_links':
        return `You are an AI assistant that searches for and returns high-quality links related to the user's query.
Return exactly a JSON array of 10 links. Each object must have:
  - "title": string (clear, descriptive title)
  - "url": string (valid URL starting with http:// or https://)
  - "description": string (brief description of the content)

Return only the JSON array, no other text.`;

      case 'summarize_file':
        return `You are an AI assistant specialized in analyzing and summarizing files.
        
Your analysis should follow this structure:
1. **File Overview** (2-3 sentences): Explain what type of file this is and its main content.
2. **Key Content Summary** (bullet points): Extract and explain the most important information from the file.
3. **File Quality**: Ensure your analysis is clear, comprehensive, and focused on the most valuable information.

Format your response as a single JSON object with keys:
  "summary" (HTML string with the structured analysis),
  "tags" (array of exactly 6 relevant tags),
  "suggestedQuestions" (array of exactly 3 follow-up questions).

Use only basic HTML tags (<p>, <ul>, <li>, <strong>, <em>, <h3>).
Return exactly the JSON object.`;

      default:
        return `You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.
Format your response as a single JSON object with keys:
  "summary" (HTML string with your response),
  "tags" (array of exactly 6 relevant tags),
  "suggestedQuestions" (array of exactly 3 follow-up questions).

Use only basic HTML tags (<p>, <ul>, <li>, <strong>, <em>, <h3>).
Return exactly the JSON object.`;
    }
  }
}

// Export a default instance
export const defaultAIContextManager = new AIContextManager(); 