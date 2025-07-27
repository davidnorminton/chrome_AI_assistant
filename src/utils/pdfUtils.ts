// Browser-compatible PDF text extraction
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a Uint8Array from the ArrayBuffer
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try to extract text using a simple approach
    // This is a basic implementation that looks for text patterns in the PDF
    const text = await extractTextFromPDFBuffer(uint8Array);
    
    if (!text.trim()) {
      throw new Error('No text could be extracted from this PDF. It might be image-based or password-protected.');
    }
    
    return text.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Advanced PDF text extraction function inspired by popular Chrome extensions
async function extractTextFromPDFBuffer(buffer: Uint8Array): Promise<string> {
  try {
    // Convert buffer to string with multiple encoding attempts
    let pdfString = '';
    const encodings = ['utf-8', 'latin1', 'ascii', 'utf-16'];
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding);
        pdfString = decoder.decode(buffer);
        if (pdfString.length > 1000) break; // Good enough content
      } catch (error) {
        continue;
      }
    }
    
    if (!pdfString || pdfString.length < 100) {
      throw new Error('Could not decode PDF content with any supported encoding.');
    }
    
    // Advanced extraction methods based on popular PDF extensions
    
    // Method 1: Extract text from content streams (most reliable)
    const contentStreams = extractFromContentStreams(pdfString);
    if (contentStreams.length > 100) {
      return cleanAndValidateText(contentStreams);
    }
    
    // Method 2: Extract from text objects
    const textObjects = extractFromTextObjects(pdfString);
    if (textObjects.length > 100) {
      return cleanAndValidateText(textObjects);
    }
    
    // Method 3: Extract from page content
    const pageContent = extractFromPageContent(pdfString);
    if (pageContent.length > 100) {
      return cleanAndValidateText(pageContent);
    }
    
    // Method 4: Fallback to pattern matching
    const patternText = extractFromPatterns(pdfString);
    if (patternText.length > 100) {
      return cleanAndValidateText(patternText);
    }
    
    // Check if it's image-based
    if (isImageBasedPDF(pdfString)) {
      throw new Error('This PDF appears to be image-based (scanned document). Text extraction is not possible from image-based PDFs.');
    }
    
    throw new Error('No readable text content found in this PDF. The file may be image-based or contain only structural elements.');
  } catch (error) {
    console.error('Error in advanced PDF text extraction:', error);
    throw new Error('Could not extract readable text from PDF. The file may be image-based or password-protected.');
  }
}

// Extract text from content streams (most reliable method)
function extractFromContentStreams(pdfString: string): string {
  const streams: string[] = [];
  
  // Find content streams
  const streamPattern = /stream[\s\S]*?endstream/g;
  const matches = pdfString.match(streamPattern);
  
  if (matches) {
    for (const stream of matches) {
      // Extract text from stream content
      const textMatches = stream.match(/\(([^)]+)\)/g);
      if (textMatches) {
        const text = textMatches
          .map(match => match.slice(1, -1))
          .filter(text => isReadableText(text))
          .join(' ');
        if (text.length > 10) {
          streams.push(text);
        }
      }
    }
  }
  
  return streams.join(' ');
}

// Extract text from text objects
function extractFromTextObjects(pdfString: string): string {
  const texts: string[] = [];
  
  // Find text objects
  const textObjectPattern = /\d+\s+\d+\s+obj[\s\S]*?endobj/g;
  const matches = pdfString.match(textObjectPattern);
  
  if (matches) {
    for (const obj of matches) {
      if (obj.includes('/Type /Text') || obj.includes('/Subtype /Text')) {
        const textMatches = obj.match(/\(([^)]+)\)/g);
        if (textMatches) {
          const text = textMatches
            .map(match => match.slice(1, -1))
            .filter(text => isReadableText(text))
            .join(' ');
          if (text.length > 10) {
            texts.push(text);
          }
        }
      }
    }
  }
  
  return texts.join(' ');
}

// Extract text from page content
function extractFromPageContent(pdfString: string): string {
  const texts: string[] = [];
  
  // Find page objects
  const pagePattern = /\d+\s+\d+\s+obj[\s\S]*?\/Type\s*\/Page[\s\S]*?endobj/g;
  const matches = pdfString.match(pagePattern);
  
  if (matches) {
    for (const page of matches) {
      const textMatches = page.match(/\(([^)]+)\)/g);
      if (textMatches) {
        const text = textMatches
          .map(match => match.slice(1, -1))
          .filter(text => isReadableText(text))
          .join(' ');
        if (text.length > 10) {
          texts.push(text);
        }
      }
    }
  }
  
  return texts.join(' ');
}

// Extract text using pattern matching (fallback)
function extractFromPatterns(pdfString: string): string {
  const patterns = [
    /\(([^)]+)\)/g,           // Text in parentheses
    /\[([^\]]+)\]/g,          // Text in brackets
    /BT[\s\S]*?ET/g,          // Text blocks
    /[A-Za-z]{3,}/g           // Word patterns
  ];
  
  const texts: string[] = [];
  
  for (const pattern of patterns) {
    const matches = pdfString.match(pattern);
    if (matches) {
      const text = matches
        .map(match => {
          if (pattern.source.includes('\\(([^)]+)\\)')) {
            return match.slice(1, -1); // Remove parentheses
          }
          return match;
        })
        .filter(text => isReadableText(text))
        .join(' ');
      if (text.length > 50) {
        texts.push(text);
      }
    }
  }
  
  return texts.join(' ');
}

// Check if text is readable (not PDF structure)
function isReadableText(text: string): boolean {
  if (text.length < 3) return false;
  
  // Filter out PDF structure elements
  const structureElements = [
    'obj', 'endobj', 'stream', 'endstream', 'FlateDecode', 'Type', 'Subtype',
    'Font', 'Image', 'ProcSet', 'Resources', 'MediaBox', 'Contents', 'Length',
    'Filter', 'DecodeParms', 'Width', 'Height', 'ColorSpace', 'BitsPerComponent'
  ];
  
  for (const element of structureElements) {
    if (text.includes(element)) return false;
  }
  
  // Check for object references
  if (/^\d+\s+\d+\s+obj$/.test(text)) return false;
  
  // Check for mostly readable characters
  const readableChars = text.replace(/[^\w\s.,!?\-()]/g, '').length;
  const totalChars = text.length;
  
  return readableChars / totalChars > 0.7; // 70% readable characters
}

// Clean and validate extracted text
function cleanAndValidateText(text: string): string {
  return text
    .replace(/[^\w\s.,!?\-()]/g, ' ') // Remove special characters but keep essential punctuation
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .replace(/[^\x00-\x7F]/g, ' ')    // Remove non-ASCII characters
    .replace(/\n+/g, '\n')            // Normalize newlines
    .trim();
}

// Check if PDF is image-based
function isImageBasedPDF(pdfString: string): boolean {
  const imageIndicators = [
    'Subtype Image', 'XObject', 'FlateDecode', 'DCTDecode', 'JPXDecode',
    'ImageWidth', 'ImageHeight', 'ColorSpace', 'BitsPerComponent'
  ];
  
  return imageIndicators.some(indicator => pdfString.includes(indicator));
}

export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export async function extractTextFromFile(file: File): Promise<string> {
  try {
    // For text files, read as text
    const text = await file.text();
    return text;
  } catch (error) {
    console.error('Error reading text file:', error);
    throw new Error('Failed to read text file. The file might be corrupted.');
  }
}

export function isTextFile(file: File): boolean {
  const textTypes = [
    'text/plain', 'text/csv', 'application/json',
    'text/xml', 'text/html', 'application/javascript',
    'text/markdown', 'text/yaml', 'text/x-yaml'
  ];
  return textTypes.includes(file.type);
} 