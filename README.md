# ORLA - Chrome AI Assistant

A modern Chrome extension that adds an AI assistant to any webpage. Built with React, TypeScript, and Vite.

## Features

### 🤖 AI Capabilities
- **AI-powered assistance** - Ask questions about any webpage
- **Page summarization** - Get quick summaries of web content
- **Context-aware responses** - AI understands the current page content
- **Slash commands** - Quick access to search, news, weather, and events
- **File upload support** - Upload images, PDFs, and documents for analysis
- **YouTube video analysis** - Automatic transcription and summarization of YouTube videos
- **Configurable AI context** - Customize how the AI processes information

### 🎛️ Advanced AI Configuration
- **Context Levels** - Choose between Minimal, Standard, or Comprehensive context
- **Custom Instructions** - Add personalized AI behavior instructions
- **Context Length Control** - Adjustable character limits (1,000-20,000)
- **Metadata Inclusion** - Toggle page title/URL in context
- **Model Parameters** - Temperature and token limit controls
- **Page Context Toggle** - Include/exclude current page content

### 📱 User Interface
- **Modern UI** - Clean, responsive interface with dark theme
- **Slash commands** - Quick access to search, news, weather, and events
- **Sticky controls** - Search and filter controls stay at the top
- **Loading animations** - Visual feedback during AI processing
- **Responsive design** - Works on different screen sizes
- **Enhanced settings panel** - Comprehensive configuration options

### 📚 Content Management
- **History management** - Save and revisit previous conversations
- **Search functionality** - Find specific conversations quickly
- **Export capability** - Download your history as JSON
- **Tags and suggestions** - AI-generated follow-up questions and tags
- **Link collections** - Save and organize web search results
- **File analysis history** - Track uploaded files and their analyses
- **Notes system** - Create and organize notes with auto-save

### 🎯 Smart Features
- **Page context toggle** - Include/exclude current page content
- **Automatic mode switching** - File upload disables page context
- **Screenshot capture** - Take screenshots for AI analysis
- **Slash commands** - Quick access to search, news, weather, and events
- **File processing** - Support for PDFs, text files, and images
- **Syntax highlighting** - Code blocks with IDE-style coloring
- **Note organization** - Auto-save notes with Firebase storage

### 🔧 Developer Features
- **Modular architecture** - Clean, maintainable code structure
- **Type safety** - Comprehensive TypeScript interfaces
- **Context management** - Centralized AI context configuration
- **Error handling** - Robust error management and validation
- **Performance optimization** - Reduced CSS bundle size by 26.6%

## Technology Stack

### 🛠️ Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling and development server
- **CSS Modules** - Modular styling architecture
- **React Router** - Client-side navigation
- **React Syntax Highlighter** - Code block formatting

### 🔧 Backend & APIs
- **Chrome Extension APIs** - Browser integration and permissions
- **Perplexity AI** - Advanced AI capabilities for text and image analysis
- **Firebase** - Cloud storage for history and notes
- **AI Context Manager** - Centralized context configuration

### 📦 Architecture
- **Manifest V3** - Latest Chrome extension standard
- **Context API** - Global state management
- **Modular CSS** - Organized styling structure
- **Custom Hooks** - Reusable AI logic components
- **Type-safe APIs** - Comprehensive TypeScript interfaces

## Development

This project uses a modern development setup with:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) for Fast Refresh
- TypeScript ESLint configuration for type-aware linting
- Chrome Extension Manifest V3
- Modular CSS architecture for maintainable styles
- AI Context Management system for flexible configuration

### 🚀 Quick Start
```bash
npm install
npm run dev    # Development server
npm run build  # Production build
```

## Building

```bash
npm install
npm run build
```

The built extension will be in the `dist/` directory, ready to load into Chrome.

### 📁 Project Structure
```
src/
├── components/     # React components
├── css/           # Modular CSS files
├── hooks/         # Custom React hooks
├── routes/        # Page components
├── utils/         # Utility functions
├── types.ts       # TypeScript definitions
└── menu/          # Navigation components

public/            # Chrome extension files
├── manifest.json  # Extension manifest
├── background.js  # Service worker
├── content.js     # Content script
├── sidebar.html   # Sidebar template
└── icon.png       # Extension icon
```

## Installation

### 🏗️ Building the Extension

1. **Clone the repository**
   ```bash
   git clone https://github.com/davidnorminton/chrome_AI_assistant.git
   cd chrome_AI_assistant
   ```

2. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```

   This creates a `dist/` directory containing the built extension.

### 🔧 Installing in Chrome

1. **Open Chrome Extensions**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Or go to Chrome Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the **"Developer mode"** switch in the top-right corner
   - This enables advanced options for loading unpacked extensions

3. **Load the Extension**
   - Click **"Load unpacked"** button
   - Navigate to your project directory
   - Select the **`dist/`** folder (not the parent directory)
   - Click **"Select Folder"**

4. **Verify Installation**
   - The extension should appear in your extensions list
   - Look for "ORLA" or "Chrome AI Assistant"
   - The extension icon should appear in your browser toolbar

### 🚨 Troubleshooting

- **Extension not loading**: Make sure you selected the `dist/` folder, not the project root
- **Developer mode required**: The switch must be enabled to load unpacked extensions
- **Permission errors**: Chrome may ask for permissions - click "Allow"
- **Build errors**: Run `npm run build` again if the `dist/` folder is missing

### 🔄 Updating the Extension

After making changes:
1. Run `npm run build` to rebuild
2. Go to `chrome://extensions/`
3. Click the **refresh icon** on the ORLA extension
4. Or click **"Reload"** button

### 🔑 API Key Setup

The extension requires a Perplexity AI API key:

1. **Get an API Key**
   - Visit [Perplexity AI](https://www.perplexity.ai/)
   - Sign up for an account
   - Navigate to API settings
   - Generate a new API key

2. **Configure the Extension**
   - Click the ORLA extension icon
   - Go to **Settings** tab
   - Enter your Perplexity AI API key
   - Configure AI context settings (optional)
   - Save the settings

3. **Test the Setup**
   - Try asking a question about any webpage
   - The AI should respond with helpful information

## Usage

### 🚀 Getting Started
- Click the extension icon to open the AI assistant
- Ask questions about the current webpage
- Use the "Summarize" button for quick page summaries

### ⌨️ Slash Commands
- **`/search <query>`** - Search the web for real, clickable links
- **`/news <location>`** - Get news for a specific location
- **`/news`** - Get world headlines
- **`/weather <location>`** - Get weather for a specific location
- **`/weather`** - Get weather for your current location
- **`/events <location>`** - Find events in a specific location
- **`/events`** - Find world events

### 📁 File Management
- **Upload Files**: Support for PDFs, text files, images, and more
- **Screenshot Capture**: Take screenshots directly from web pages
- **File Analysis**: AI-powered analysis of uploaded content
- **History Tracking**: View your file analysis history

### 🎛️ AI Configuration
- **Context Levels**: Choose Minimal, Standard, or Comprehensive context
- **Custom Instructions**: Add personalized AI behavior
- **Model Parameters**: Adjust temperature and token limits
- **Context Length**: Set character limits (1,000-20,000)
- **Metadata Control**: Include/exclude page title and URL

### 💾 History & Organization
- All conversations are automatically saved
- Search through your history with filters
- Export your data as JSON
- Tags and suggested questions help you continue conversations
- File analysis history with uploaded content tracking
- Notes with auto-save and Firebase storage

### 📝 Notes System
- **Create Notes**: Auto-save notes with real-time synchronization
- **Firebase Storage**: Secure cloud storage for your notes
- **Cross-device Sync**: Access your notes from any device
- **Instant Updates**: Real-time synchronization across devices

### 🎬 YouTube Integration
- **Automatic Detection**: Recognizes YouTube video pages
- **Transcription Analysis**: Uses video transcripts for summarization
- **User Confirmation**: Asks before analyzing video content
- **Rich Metadata**: Includes video title and description

### 💻 Code Support
- **Syntax Highlighting**: Code blocks with IDE-style coloring
- **Language Detection**: Automatic language identification
- **Theme Support**: Dark theme optimized for code display
- **Copy Support**: Easy code copying functionality

## Recent Updates

### 🆕 Latest Features (v2.0+)
- **Slash Commands**: Quick access to search, news, weather, and events
- **Firebase Integration**: Cloud storage for history and notes
- **AI Context Management**: Configurable context levels and custom instructions
- **Enhanced File Support**: PDF, text file, and image analysis
- **YouTube Integration**: Automatic video transcription and analysis
- **Syntax Highlighting**: Code blocks with professional formatting
- **Improved Settings**: Comprehensive configuration panel
- **Performance Optimization**: 26.6% CSS reduction and faster loading
- **Modular Architecture**: Clean, maintainable code structure

### 🔧 Technical Improvements
- **Type Safety**: Enhanced TypeScript interfaces
- **Error Handling**: Robust error management
- **Context Management**: Centralized AI configuration
- **Code Organization**: Modular CSS and component structure
- **Build Optimization**: Reduced bundle sizes and faster builds
- **Firebase Storage**: Secure cloud storage for data persistence

## Contributing

This project is actively maintained and welcomes contributions. The codebase follows modern React and TypeScript best practices with a focus on maintainability and performance.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
