import React, { useEffect, useState, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, className = '', isStreaming = false }: MarkdownRendererProps) {
  const [html, setHtml] = useState<string>('');
  const [isInsecure, setIsInsecure] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chunksRef = useRef<string>('');

  // Check if content is pure HTML (not markdown)
  const isPureHtml = (content: string): boolean => {
    return content.trim().startsWith('<') && content.trim().endsWith('>');
  };

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value;
        } catch (__) {}
      }
      return ''; // use external default escaping
    }
  });

  useEffect(() => {
    if (isStreaming) {
      // For streaming content, accumulate chunks
      chunksRef.current = content;
      
      try {
        const rawHtml = md.render(chunksRef.current);
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
        // Check if this is pure HTML content
        if (isPureHtml(content)) {
          // For pure HTML, sanitize and render directly
          const safeHtml = DOMPurify.sanitize(content, {
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
          return;
        }
        
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
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`markdown-content prose prose-sm max-w-none break-words ${isStreaming ? 'streaming' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
} 