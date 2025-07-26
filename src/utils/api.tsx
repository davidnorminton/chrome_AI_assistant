// src/utils/api.ts

export interface AIResponse {
  text: string;
  model: string;
  tags: string[];
  suggestedQuestions?: string[];
  links?: { title: string; url: string; description: string }[];
}

export type AIAction = 'direct_question' | 'summarize_page' | 'get_links';

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
    systemPrompt = `
You are an AI assistant specialized in summarizing web page content.
Format your response as a single JSON object with keys:
  "summary" (HTML string),
  "tags" (array of exactly 6 relevant tags),
  "suggestedQuestions" (array of exactly 3 follow-up questions).
Use only basic HTML tags (<p>, <ul>, <li>, <strong>, <em>).
Return exactly the JSON object.
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
  
  // Handle image analysis
  if (file) {
    // For image analysis, use the correct Perplexity format
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: query },
        { type: 'image_url', image_url: { url: file } }
      ]
    });
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