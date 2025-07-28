import React, { useEffect, useMemo, useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, className = '', isStreaming = false }: MarkdownRendererProps) {
  const [html, setHtml] = useState('');
  const [isInsecure, setIsInsecure] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chunksRef = useRef<string>('');

  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight(str: string, lang: string) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class="hljs"><code class="language-${lang}">${
              hljs.highlight(str, {
                language: lang,
                ignoreIllegals: true
              }).value
            }</code></pre>`;
          } catch {}
        }
        return `<pre class="hljs"><code>${instance.utils.escapeHtml(str)}</code></pre>`;
      }
    });

    // For now, use only core markdown-it functionality to avoid plugin loading issues
    // Plugins can be added later if needed
    return instance;
  }, []);

  useEffect(() => {
    if (!content) {
      setHtml('');
      chunksRef.current = '';
      setIsInsecure(false);
      return;
    }

    // For streaming, we need to accumulate chunks and process them together
    if (isStreaming) {
      chunksRef.current = content; // Use the current content directly
      const allChunks = chunksRef.current;
      
      try {
        // Sanitize all chunks received so far (Chrome's recommendation)
        const sanitizedChunks = DOMPurify.sanitize(allChunks, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'mark', 'del', 'ins',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'blockquote', 'pre', 'code', 'kbd', 'samp', 'var',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
            'a', 'img', 'hr', 'div', 'span',
            'abbr', 'acronym', 'cite', 'dfn', 'q', 'small', 'sub', 'sup',
            'details', 'summary'
          ],
          ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id', 'target',
            'rel', 'width', 'height', 'style'
          ],
          ALLOW_DATA_ATTR: false,
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
        });

        // Check if sanitization removed anything (Chrome's security check)
        if (DOMPurify.removed.length > 0) {
          console.warn('Insecure content detected and removed:', DOMPurify.removed);
          setIsInsecure(true);
          setHtml('<p class="error">⚠️ Insecure content detected. Response stopped for security.</p>');
          return;
        }

        // Parse the sanitized markdown
        const rawHtml = md.render(sanitizedChunks);
        const safeHtml = DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'mark', 'del', 'ins',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'blockquote', 'pre', 'code', 'kbd', 'samp', 'var',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
            'a', 'img', 'hr', 'div', 'span',
            'abbr', 'acronym', 'cite', 'dfn', 'q', 'small', 'sub', 'sup',
            'details', 'summary'
          ],
          ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id', 'target',
            'rel', 'width', 'height', 'style'
          ],
          ALLOW_DATA_ATTR: false,
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
        });

        setHtml(safeHtml);
        setIsInsecure(false);
      } catch (error) {
        console.error('Error rendering streaming markdown:', error);
        setHtml(`<p class="error">Error rendering content: ${error instanceof Error ? error.message : 'Unknown error'}</p>`);
      }
    } else {
      // For non-streaming content, process normally
      try {
        const rawHtml = md.render(content);
        const safeHtml = DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'mark', 'del', 'ins',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'blockquote', 'pre', 'code', 'kbd', 'samp', 'var',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
            'a', 'img', 'hr', 'div', 'span',
            'abbr', 'acronym', 'cite', 'dfn', 'q', 'small', 'sub', 'sup',
            'details', 'summary'
          ],
          ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id', 'target',
            'rel', 'width', 'height', 'style'
          ],
          ALLOW_DATA_ATTR: false,
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
        });
        setHtml(safeHtml);
        setIsInsecure(false);
      } catch (error) {
        console.error('Error rendering markdown:', error);
        setHtml(`<p class="error">Error rendering content: ${error instanceof Error ? error.message : 'Unknown error'}</p>`);
      }
    }
  }, [content, md, isStreaming]);

  // Reset chunks when streaming starts
  useEffect(() => {
    if (isStreaming && content === '') {
      chunksRef.current = '';
      setIsInsecure(false);
    }
  }, [isStreaming, content]);

  if (isInsecure) {
    return (
      <div className={`markdown-content error ${className}`}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`markdown-content prose prose-sm max-w-none break-words ${isStreaming ? 'streaming' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
} 