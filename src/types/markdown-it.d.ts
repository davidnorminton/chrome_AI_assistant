declare module 'markdown-it' {
  interface MarkdownIt {
    use(plugin: any, options?: any): MarkdownIt;
    render(src: string): string;
    utils: {
      escapeHtml(str: string): string;
    };
  }
  
  interface MarkdownItConstructor {
    new (options?: any): MarkdownIt;
  }
  
  const MarkdownIt: MarkdownItConstructor;
  export default MarkdownIt;
}

declare module 'markdown-it-container' {
  const container: any;
  export default container;
}

declare module 'markdown-it-deflist' {
  const deflist: any;
  export default deflist;
}

declare module 'markdown-it-emoji' {
  export const full: any;
}

declare module 'markdown-it-footnote' {
  const footnote: any;
  export default footnote;
}

declare module 'markdown-it-highlightjs' {
  const highlightjs: any;
  export default highlightjs;
}

declare module 'markdown-it-mark' {
  const markdownItMark: any;
  export default markdownItMark;
}

declare module 'markdown-it-sub' {
  const sub: any;
  export default sub;
}

declare module 'markdown-it-sup' {
  const sup: any;
  export default sup;
}

declare module 'markdown-it-task-lists' {
  const taskLists: any;
  export default taskLists;
} 