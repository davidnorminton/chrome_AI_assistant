# ORLA - Chrome AI Assistant

A modern Chrome extension that adds an AI assistant to any webpage. Built with React, TypeScript, and Vite.

## Features

### 🤖 AI Capabilities
- **AI-powered assistance** - Ask questions about any webpage
- **Page summarization** - Get quick summaries of web content
- **Context-aware responses** - AI understands the current page content
- **Web search integration** - Search the web for real, clickable links
- **Image search** - Search for images with thumbnails and descriptions
- **File upload support** - Upload images and documents for analysis

### 📱 User Interface
- **Modern UI** - Clean, responsive interface with dark theme
- **Smart navigation** - News/events dropdown with location-based content
- **Sticky controls** - Search and filter controls stay at the top
- **Loading animations** - Visual feedback during AI processing
- **Responsive design** - Works on different screen sizes

### 📚 Content Management
- **History management** - Save and revisit previous conversations
- **Search functionality** - Find specific conversations quickly
- **Export capability** - Download your history as JSON
- **Tags and suggestions** - AI-generated follow-up questions and tags
- **Link collections** - Save and organize web search results

### 🎯 Smart Features
- **Page context toggle** - Include/exclude current page content
- **Automatic mode switching** - Web search and image search disable page context
- **Screenshot capture** - Take screenshots for AI analysis
- **Location-based news** - Get local, national, and world news
- **Weather integration** - Current weather and forecasts
- **Event discovery** - Find local events and activities

## Technology Stack

### 🛠️ Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling and development server
- **CSS Modules** - Modular styling architecture

### 🔧 Backend & APIs
- **Chrome Extension APIs** - Browser integration and permissions
- **Perplexity AI** - Advanced AI capabilities for text and image analysis
- **OpenStreetMap Nominatim** - Location-based services
- **Geolocation API** - Automatic location detection

### 📦 Architecture
- **Manifest V3** - Latest Chrome extension standard
- **Context API** - Global state management
- **React Router** - Client-side navigation
- **Modular CSS** - Organized styling structure

## Development

This project uses a modern development setup with:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) for Fast Refresh
- TypeScript ESLint configuration for type-aware linting
- Chrome Extension Manifest V3
- Modular CSS architecture for maintainable styles

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
└── types.ts       # TypeScript definitions
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
   - Save the settings

3. **Test the Setup**
   - Try asking a question about any webpage
   - The AI should respond with helpful information

## Usage

### 🚀 Getting Started
- Click the extension icon to open the AI assistant
- Ask questions about the current webpage
- Use the "Summarize" button for quick page summaries

### 🔍 Search Features
- **Web Search**: Click the globe icon to search the web for real links
- **Image Search**: Click the camera icon to search for images
- **Page Context**: Toggle the book icon to include/exclude current page content

### 📁 File Management
- Upload images and documents for AI analysis
- Take screenshots directly from web pages
- View your conversation history in the history tab

### 📰 News & Events
- Access local, national, and world news
- Get current weather and forecasts
- Discover local events and activities
- Set your location for personalized content

### 💾 History & Organization
- All conversations are automatically saved
- Search through your history with filters
- Export your data as JSON
- Tags and suggested questions help you continue conversations
