# ORLA - Chrome AI Assistant

A modern Chrome extension that adds an AI assistant to any webpage. Built with React, TypeScript, and Vite.

## Features

- **AI-powered assistance** - Ask questions about any webpage
- **Page summarization** - Get quick summaries of web content
- **Context-aware responses** - AI understands the current page content
- **History management** - Save and revisit previous conversations
- **Modern UI** - Clean, responsive interface with dark/light themes
- **File upload support** - Upload images and documents for analysis

## Technology Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Chrome Extension APIs** - Browser integration
- **Perplexity AI** - Advanced AI capabilities

## Development

This project uses a modern development setup with:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) for Fast Refresh
- TypeScript ESLint configuration for type-aware linting
- Chrome Extension Manifest V3

## Building

```bash
npm install
npm run build
```

The built extension will be in the `dist/` directory, ready to load into Chrome.

## Installation

1. Clone this repository
2. Run `npm install && npm run build`
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `dist/` folder
6. The extension will appear in your browser toolbar

## Usage

- Click the extension icon to open the AI assistant
- Ask questions about the current webpage
- Use the "Summarize" button for quick page summaries
- Toggle "Page Context" to include/exclude page content in your questions
- Upload files for AI analysis
- View your conversation history in the history tab
