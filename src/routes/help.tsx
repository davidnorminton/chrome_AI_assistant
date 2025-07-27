import React from 'react';
import '../css/help.css';

const Help: React.FC = () => {
  return (
    <div className="help-container">
      <div className="help-header">
        <h1>Help & Documentation</h1>
        <p>Learn how to use ORLA's features and configure your AI assistant</p>
      </div>

      <div className="help-content">
        {/* Getting Started Section */}
        <section className="help-section">
          <h2>🚀 Getting Started</h2>
          <div className="help-card">
            <h3>Quick Start Guide</h3>
            <ol>
              <li><strong>Install the Extension:</strong> Load the extension in Chrome and set up your Perplexity AI API key</li>
              <li><strong>Open the Assistant:</strong> Click the ORLA icon in your browser toolbar</li>
              <li><strong>Ask Questions:</strong> Type your question and press Enter or click the send button</li>
              <li><strong>Explore Features:</strong> Try the Summarize, Web Search, and File Upload buttons</li>
            </ol>
          </div>
        </section>

        {/* AI Features Section */}
        <section className="help-section">
          <h2>🤖 AI Features</h2>
          
          <div className="help-card">
            <h3>📝 Direct Questions</h3>
            <p>Ask any question about the current webpage. The AI will analyze the page content and provide detailed answers.</p>
            <div className="feature-example">
              <strong>Example:</strong> "What are the main benefits mentioned on this page?"
            </div>
          </div>

          <div className="help-card">
            <h3>📄 Page Summarization</h3>
            <p>Get a comprehensive summary of the current webpage with key points and insights.</p>
            <ul>
              <li>Click the "Summarize" button for quick page overview</li>
              <li>Includes page title, URL, and favicon in history</li>
              <li>Generates tags and suggested follow-up questions</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>🔍 Web Search</h3>
            <p>Search the web for real, clickable links related to your query.</p>
            <ul>
              <li>Click the globe icon to search the web</li>
              <li>Results include titles, URLs, and descriptions</li>
              <li>Links are saved in history for easy access</li>
              <li>Automatically disables page context for broader search</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>📸 Screenshot Analysis</h3>
            <p>Take screenshots of web pages for AI analysis.</p>
            <ul>
              <li>Click the camera icon to capture the current page</li>
              <li>AI analyzes the visual content and text</li>
              <li>Screenshots are stored in history with base64 encoding</li>
              <li>Automatically disables page context for focused analysis</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>📁 File Upload & Analysis</h3>
            <p>Upload files for AI analysis and processing.</p>
            <ul>
              <li><strong>Supported Formats:</strong> PDF, TXT, CSV, JSON, and image files</li>
              <li><strong>File Size Limit:</strong> Maximum 10MB per file</li>
              <li><strong>Processing:</strong> Text extraction with encoding detection</li>
              <li><strong>History:</strong> File names and analysis saved in history</li>
            </ul>
            <div className="feature-note">
              <strong>Note:</strong> File upload automatically disables page context for focused analysis.
            </div>
          </div>

          <div className="help-card">
            <h3>🎬 YouTube Video Analysis</h3>
            <p>Automatically analyze YouTube videos using their transcriptions.</p>
            <ul>
              <li><strong>Detection:</strong> Automatically detects YouTube video pages</li>
              <li><strong>Confirmation:</strong> Asks for permission before analyzing</li>
              <li><strong>Transcription:</strong> Uses video transcript for analysis</li>
              <li><strong>Metadata:</strong> Includes video title and description</li>
            </ul>
          </div>
        </section>

        {/* AI Configuration Section */}
        <section className="help-section">
          <h2>⚙️ AI Configuration</h2>
          
          <div className="help-card">
            <h3>🎛️ Context Levels</h3>
            <p>Control how much page content the AI considers when responding.</p>
            <div className="config-options">
              <div className="config-option">
                <h4>Minimal (1,000 chars)</h4>
                <p>Quick responses with essential page content only. Best for simple questions.</p>
              </div>
              <div className="config-option">
                <h4>Standard (5,000 chars)</h4>
                <p>Balanced approach with moderate page content. Good for most use cases.</p>
              </div>
              <div className="config-option">
                <h4>Comprehensive (10,000 chars)</h4>
                <p>Detailed analysis with extensive page content. Best for complex questions.</p>
              </div>
            </div>
          </div>

          <div className="help-card">
            <h3>📝 Custom Instructions</h3>
            <p>Add personalized instructions to guide the AI's behavior and response style.</p>
            <div className="feature-example">
              <strong>Examples:</strong>
              <ul>
                <li>"Always provide practical examples"</li>
                <li>"Focus on technical details"</li>
                <li>"Use simple, non-technical language"</li>
                <li>"Include step-by-step instructions"</li>
              </ul>
            </div>
          </div>

          <div className="help-card">
            <h3>🔧 Model Parameters</h3>
            <p>Fine-tune the AI's response characteristics.</p>
            <div className="config-options">
              <div className="config-option">
                <h4>Temperature (0.1 - 2.0)</h4>
                <p>Controls creativity: Lower = more focused, Higher = more creative</p>
              </div>
              <div className="config-option">
                <h4>Max Tokens (100 - 4000)</h4>
                <p>Maximum response length. Higher values allow longer, more detailed responses.</p>
              </div>
            </div>
          </div>

          <div className="help-card">
            <h3>📊 Metadata Control</h3>
            <p>Choose what page information to include in AI context.</p>
            <ul>
              <li><strong>Page Title:</strong> Include the webpage title in context</li>
              <li><strong>Page URL:</strong> Include the webpage URL in context</li>
              <li><strong>Favicon:</strong> Include page favicon information</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>📏 Context Length Control</h3>
            <p>Set custom character limits for page content (1,000 - 20,000 characters).</p>
            <div className="feature-note">
              <strong>Tip:</strong> Higher limits provide more context but may increase response time and token usage.
            </div>
          </div>
        </section>

        {/* History & Storage Section */}
        <section className="help-section">
          <h2>📚 History & Storage</h2>
          
          <div className="help-card">
            <h3>💾 How History Works</h3>
            <p>All your conversations and analyses are automatically saved for future reference.</p>
            <ul>
              <li><strong>Automatic Saving:</strong> Every interaction is saved immediately</li>
              <li><strong>Local Storage:</strong> Data is stored in your browser's local storage</li>
              <li><strong>No Cloud Sync:</strong> Data stays on your device for privacy</li>
              <li><strong>Persistent:</strong> History survives browser restarts</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>🔍 History Types</h3>
            <p>Different types of interactions are categorized for easy organization.</p>
            <div className="history-types">
              <div className="history-type">
                <h4>📝 Questions</h4>
                <p>Direct questions about web pages with AI responses</p>
              </div>
              <div className="history-type">
                <h4>📄 Summaries</h4>
                <p>Page summaries with key points and insights</p>
              </div>
              <div className="history-type">
                <h4>🔍 Web Searches</h4>
                <p>Web search results with clickable links</p>
              </div>
              <div className="history-type">
                <h4>📁 File Analysis</h4>
                <p>Uploaded file analyses with file names</p>
              </div>
            </div>
          </div>

          <div className="help-card">
            <h3>🏷️ Tags & Suggestions</h3>
            <p>AI-generated tags and follow-up questions help you continue conversations.</p>
            <ul>
              <li><strong>Tags:</strong> Clickable keywords for quick filtering</li>
              <li><strong>Suggested Questions:</strong> AI-generated follow-up questions</li>
              <li><strong>Smart Organization:</strong> Automatically categorized content</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>📤 Export & Backup</h3>
            <p>Export your history data for backup or analysis.</p>
            <ul>
              <li><strong>JSON Format:</strong> Structured data export</li>
              <li><strong>Complete Data:</strong> Includes all conversation details</li>
              <li><strong>Privacy First:</strong> Data never leaves your device</li>
            </ul>
          </div>
        </section>

        {/* Interface Features Section */}
        <section className="help-section">
          <h2>🖥️ Interface Features</h2>
          
          <div className="help-card">
            <h3>🎨 Loading Animations</h3>
            <p>Visual feedback during AI processing with themed animations.</p>
            <ul>
              <li><strong>AI-themed Animation:</strong> Symbolic representation of AI processing</li>
              <li><strong>Clean Interface:</strong> Hides distractions during analysis</li>
              <li><strong>Progress Indication:</strong> Shows when AI is thinking</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>💻 Code Support</h3>
            <p>Professional syntax highlighting for code blocks in AI responses.</p>
            <ul>
              <li><strong>IDE-style Coloring:</strong> Functions, variables, and syntax highlighting</li>
              <li><strong>Language Detection:</strong> Automatic language identification</li>
              <li><strong>Dark Theme:</strong> Optimized for code readability</li>
              <li><strong>Copy Support:</strong> Easy code copying functionality</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>📱 Responsive Design</h3>
            <p>Adaptive interface that works on different screen sizes.</p>
            <ul>
              <li><strong>Small Panels:</strong> Collapsible menu for limited space</li>
              <li><strong>Button Optimization:</strong> Essential buttons remain visible</li>
              <li><strong>Touch Friendly:</strong> Optimized for touch interactions</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>🎯 Clear Content</h3>
            <p>Quick way to clear the current conversation and start fresh.</p>
            <ul>
              <li><strong>Menu Integration:</strong> Located in the side menu</li>
              <li><strong>Instant Clear:</strong> Removes current content immediately</li>
              <li><strong>Fresh Start:</strong> Ready for new questions or analysis</li>
            </ul>
          </div>
        </section>

        {/* Tips & Best Practices Section */}
        <section className="help-section">
          <h2>💡 Tips & Best Practices</h2>
          
          <div className="help-card">
            <h3>🎯 Getting Better Results</h3>
            <ul>
              <li><strong>Be Specific:</strong> Ask detailed questions for better responses</li>
              <li><strong>Use Context:</strong> Enable page context for relevant answers</li>
              <li><strong>Try Different Actions:</strong> Use summarize, search, and file upload for different perspectives</li>
              <li><strong>Check History:</strong> Review previous conversations for insights</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>🔧 Configuration Tips</h3>
            <ul>
              <li><strong>Start with Standard:</strong> Use Standard context level for most use cases</li>
              <li><strong>Adjust Temperature:</strong> Lower for factual responses, higher for creative answers</li>
              <li><strong>Custom Instructions:</strong> Add your preferences for consistent responses</li>
              <li><strong>Monitor Token Usage:</strong> Higher limits may increase API costs</li>
            </ul>
          </div>

          <div className="help-card">
            <h3>🚀 Advanced Features</h3>
            <ul>
              <li><strong>YouTube Analysis:</strong> Great for learning from video content</li>
              <li><strong>File Upload:</strong> Perfect for analyzing documents and reports</li>
              <li><strong>Web Search:</strong> Use for finding current information and sources</li>
              <li><strong>Screenshot Analysis:</strong> Ideal for visual content and layouts</li>
            </ul>
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="help-section">
          <h2>🔧 Troubleshooting</h2>
          
          <div className="help-card">
            <h3>❓ Common Issues</h3>
            <div className="troubleshooting-item">
              <h4>AI Not Responding</h4>
              <p><strong>Solution:</strong> Check your Perplexity AI API key in Settings</p>
            </div>
            <div className="troubleshooting-item">
              <h4>File Upload Failing</h4>
              <p><strong>Solution:</strong> Ensure file is under 10MB and in supported format</p>
            </div>
            <div className="troubleshooting-item">
              <h4>Page Context Not Working</h4>
              <p><strong>Solution:</strong> Make sure page context is enabled and page is fully loaded</p>
            </div>
            <div className="troubleshooting-item">
              <h4>History Not Loading</h4>
              <p><strong>Solution:</strong> Check browser storage permissions and try refreshing</p>
            </div>
          </div>

          <div className="help-card">
            <h3>📞 Getting Help</h3>
            <p>If you're still experiencing issues:</p>
            <ul>
              <li>Check the browser console for error messages</li>
              <li>Ensure your API key is valid and has sufficient credits</li>
              <li>Try refreshing the extension or restarting your browser</li>
              <li>Contact support with specific error details</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Help; 