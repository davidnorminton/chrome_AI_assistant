// src/utils/api.ts

export interface AIResponse {
  text: string;
  model: string;
  tags: string[];
  suggestedQuestions?: string[];
  links?: { title: string; url: string; description: string }[];
  images?: { title: string; url: string; description: string; imageUrl: string }[];
}

export type AIAction = 'direct_question' | 'summarize_page' | 'get_links' | 'get_images' | 'summarize_file';

// Base summarization prompt template for consistent, high-quality summaries
const BASE_SUMMARIZATION_PROMPT = `
You are an AI assistant specialized in creating comprehensive, well-structured summaries.

Your summarization should follow this structure:

1. **Brief Overview** (2-3 sentences): Provide a concise introduction explaining what the page/document is about and its main purpose.

2. **Key Points Summary** (bullet points): Extract and explain the most important points, concepts, or findings from the content. Focus on:
   - Main topics or themes
   - Important facts, data, or statistics
   - Key conclusions or insights
   - Notable features or characteristics
   - Critical information that readers should know

3. **Content Quality**: Ensure your summary is:
   - Clear and easy to understand
   - Comprehensive but concise
   - Well-organized with logical flow
   - Focused on the most valuable information

Format your response as a single JSON object with keys:
  "summary" (HTML string with the structured summary),
  "tags" (array of exactly 6 relevant tags),
  "suggestedQuestions" (array of exactly 3 follow-up questions).

Use only basic HTML tags (<p>, <ul>, <li>, <strong>, <em>, <h3>).
Return exactly the JSON object.
`.trim();

export async function sendQueryToAI({
  query,
  action,
  file = null
}: {
  query: string;
  action: AIAction;
  file?: string | null;
}): Promise<AIResponse> {
  // Load model & API key
  const { model, apiKey } = await new Promise<{ model: string; apiKey: string }>(resolve => {
    chrome.storage.local.get(['model', 'apiKey'], data =>
      resolve({
        model: data.model ?? 'sonar-small-online',
        apiKey: data.apiKey
      })
    );
  });
  if (!apiKey) {
    throw new Error('API key not set in Settings');
  }

  // Build system prompt
  let systemPrompt: string;
  if (action === 'summarize_page') {
    systemPrompt = BASE_SUMMARIZATION_PROMPT + `

SPECIFIC INSTRUCTIONS FOR WEB PAGE SUMMARIZATION:
- Focus on the main content and purpose of the web page
- Identify the page's primary topic, target audience, and key information
- Highlight any important features, services, or products mentioned
- Note any calls-to-action or important links
- Consider the page's structure and navigation elements
- Extract the most valuable information for someone who wants to understand the page quickly

Analyze the provided web page content and create a comprehensive summary following the structure above.
`.trim();
  } else if (action === 'get_links') {
    systemPrompt = `
You are an AI assistant that searches for and returns high-quality links related to the user's query.
Return exactly a JSON array of 10 links. Each object must have:
  - "title": string (clear, descriptive title)
  - "url": string (valid URL starting with http:// or https://)
  - "description": string (brief description of the content)

Example format:
[
  {
    "title": "Example Title",
    "url": "https://example.com",
    "description": "Brief description of the content"
  }
]

Return only the JSON array, no other text.
`.trim();
  } else if (action === 'get_images') {
    systemPrompt = `
You are an AI assistant that searches for and returns high-quality images related to the user's query.
Return exactly a JSON array of 10 images. Each object must have:
  - "title": string (clear, descriptive title)
  - "url": string (valid URL starting with http:// or https://)
  - "description": string (brief description of the image)
  - "imageUrl": string (direct URL to the image file, starting with http:// or https://)

Example format:
[
  {
    "title": "Example Image Title",
    "url": "https://example.com/image-page",
    "description": "Brief description of the image content",
    "imageUrl": "https://example.com/image.jpg"
  }
]

Return only the JSON array, no other text.
`.trim();
  } else if (action === 'summarize_file') {
    systemPrompt = BASE_SUMMARIZATION_PROMPT + `

SPECIFIC INSTRUCTIONS FOR FILE ANALYSIS:
- Analyze the uploaded file content thoroughly
- Identify the document type, format, and structure
- Extract key information, data, or insights from the file
- Highlight important findings, conclusions, or recommendations
- Note any technical details, specifications, or requirements
- Consider the context and purpose of the document
- Focus on actionable insights and valuable takeaways

Analyze the provided file content and create a comprehensive summary following the structure above.
`.trim();
  } else {
    systemPrompt = `
You are an AI assistant for a browser sidebar.
Format your response using HTML tags (<p>, <h1>, <ul>, <li>, etc.).
After your answer, include 2–3 follow-up questions wrapped in:
<div class="suggested-questions-container"><ul>…</ul></div>
Return only the HTML.
`.trim();
  }

  // Assemble request body
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Handle file analysis
  if (file) {
    // Check if it's an image file (starts with data:image/)
    const isImage = file.startsWith('data:image/');
    
    if (isImage) {
      // For image files, use the correct Perplexity format
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: query },
          { type: 'image_url', image_url: { url: file } }
        ]
      });
    } else {
      // For PDF text (or other text content), send as regular text
      // Limit the text length to avoid API issues
      const maxLength = 8000; // Reasonable limit for API
      const truncatedFile = file.length > maxLength 
        ? file.substring(0, maxLength) + '\n\n[Content truncated due to length]'
        : file;
      
      messages.push({
        role: 'user',
        content: `File content:\n${truncatedFile}\n\nUser question: ${query}`
      });
    }
  } else {
    messages.push({ role: 'user', content: query });
  }
  
  const body: any = {
    model,
    messages,
    temperature: 0.7,
    stream: false
  };

  // Call API
  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const dataResp = await resp.json();
  if (!resp.ok) {
    throw new Error(dataResp.error || resp.statusText);
  }

  // Clean and parse
  let raw = dataResp.choices?.[0]?.message?.content ?? '';
  raw = raw.replace(/^```json/, '').replace(/```$/, '').trim();

  if (action === 'summarize_page') {
    const parsed = JSON.parse(raw);
    return {
      text: parsed.summary,
      model,
      tags: (parsed.tags ?? []).slice(0, 6), // Limit to 6 tags
      suggestedQuestions: (parsed.suggestedQuestions ?? []).slice(0, 3), // Limit to 3 questions
      links: []
    };
  } else if (action === 'summarize_file') {
    const parsed = JSON.parse(raw);
    return {
      text: parsed.summary,
      model,
      tags: (parsed.tags ?? []).slice(0, 6), // Limit to 6 tags
      suggestedQuestions: (parsed.suggestedQuestions ?? []).slice(0, 3), // Limit to 3 questions
      links: []
    };
  } else if (action === 'get_links') {
    try {
      const parsedLinks = JSON.parse(raw);
      const limited = Array.isArray(parsedLinks) ? parsedLinks.slice(0, 10) : []; // Limit to 10 links
      return {
        text: '',
        model,
        tags: [],
        suggestedQuestions: [],
        links: limited.map((l: any) => ({
          title: l.title || 'Untitled',
          url: l.url || '#',
          description: l.description || 'No description available'
        }))
      };
    } catch (parseError) {
      console.error('Failed to parse links JSON:', raw, parseError);
      return {
        text: 'Failed to parse search results',
        model,
        tags: [],
        suggestedQuestions: [],
        links: []
      };
    }
  } else if (action === 'get_images') {
    try {
      const parsedImages = JSON.parse(raw);
      const limited = Array.isArray(parsedImages) ? parsedImages.slice(0, 10) : []; // Limit to 10 images
      return {
        text: '',
        model,
        tags: [],
        suggestedQuestions: [],
        links: [],
        images: limited.map((img: any) => ({
          title: img.title || 'Untitled',
          url: img.url || '#',
          description: img.description || 'No description available',
          imageUrl: img.imageUrl || '#'
        }))
      };
    } catch (parseError) {
      console.error('Failed to parse images JSON:', raw, parseError);
      return {
        text: 'Failed to parse image search results',
        model,
        tags: [],
        suggestedQuestions: [],
        links: [],
        images: []
      };
    }
  } else {
    // direct_question
    return {
      text: raw,
      model,
      tags: [],
      suggestedQuestions: [],
      links: []
    };
  }
}