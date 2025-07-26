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
You are an AI assistant that returns a JSON array of exactly 10 high-quality links related to the user's query.
Each object in the array must have:
  - "title": string (clear, descriptive title)
  - "url": string (valid URL)
  - "description": string (brief description of the content)
Return exactly the JSON array with 10 items.
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
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ];
  const body: any = {
    model,
    messages,
    temperature: 0.7,
    stream: false
  };
  if (file) {
    const [meta, data] = file.split(',');
    const mimeType = meta.split(':')[1].split(';')[0];
    body.parts = [
      { text: query },
      { inlineData: { mimeType, data } }
    ];
  }

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
    const parsedLinks = JSON.parse(raw);
    const limited = Array.isArray(parsedLinks) ? parsedLinks.slice(0, 10) : []; // Limit to 10 links
    return {
      text: '',
      model,
      tags: [],
      suggestedQuestions: [],
      links: limited.map((l: any) => ({
        title: l.title,
        url: l.url,
        description: l.description
      }))
    };
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