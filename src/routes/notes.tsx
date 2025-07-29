import React, { useState, useEffect, useRef } from 'react';
import '../css/notes.css';

interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'todo';
  createdAt: string;
  updatedAt: string;
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [showAIPromptForm, setShowAIPromptForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiThinkingMessage, setAiThinkingMessage] = useState('');
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'note' as 'note' | 'todo'
  });

  // Load notes from storage
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const result = await chrome.storage.local.get(['notes']);
      const savedNotes = result.notes || [];
      setNotes(savedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async (updatedNotes: Note[]) => {
    try {
      await chrome.storage.local.set({ notes: updatedNotes });
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const createNewNote = () => {
    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title || 'Untitled Note',
      content: newNote.content,
      type: newNote.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNotes = [note, ...notes];
    saveNotes(updatedNotes);
    setSelectedNote(note);
    setIsEditing(true);
    setShowNewNoteForm(false);
    setNewNote({ title: '', content: '', type: 'note' });
  };

  const updateNote = (updatedNote: Note) => {
    const updatedNotes = notes.map(note => 
      note.id === updatedNote.id ? { ...updatedNote, updatedAt: new Date().toISOString() } : note
    );
    saveNotes(updatedNotes);
    setSelectedNote(updatedNote);
  };

  const deleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    saveNotes(updatedNotes);
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setIsEditing(false);
    }
  };

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
  };

  const handleContentChange = (content: string) => {
    if (selectedNote) {
      // Auto-save with debouncing
      const updatedNote = { ...selectedNote, content };
      updateNote(updatedNote);
    }
  };

  const handleTitleChange = (title: string) => {
    if (selectedNote) {
      updateNote({ ...selectedNote, title });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // AI-powered list generation
  const generateListWithAI = async (userPrompt: string) => {
    if (!selectedNote || selectedNote.type !== 'todo') {
      alert('Please select a todo list note first');
      return;
    }

    setIsGeneratingList(true);
    setShowAIPromptForm(false);
    setAiThinkingMessage('🤖 AI is thinking...');
    setAiSuccessMessage('');
    
    try {
      // Get API key first
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('API key not found. Please set your Perplexity API key in settings.');
      }

      // Get model from storage
      const modelResult = await chrome.storage.local.get(['model']);
      const model = modelResult.model || 'sonar';

      // Get current page info for context
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const pageInfo = {
        title: tab?.title || '',
        url: tab?.url || '',
        text: '' // We'll get this from the content script if needed
      };

      // Build the AI query
      const aiQuery = `Generate a comprehensive checklist for: ${userPrompt}

Please format the response as a markdown checklist with each item on a new line starting with "- [ ] ".

Example format:
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

Make the list practical and actionable.`;

      console.log('Sending AI request:', { userPrompt, apiKeyLength: apiKey.length, model });

      // Send to AI service
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant that creates practical and actionable checklists. Always format your responses as markdown checklists with each item starting with "- [ ] ".'
            },
            {
              role: 'user',
              content: aiQuery
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      console.log('AI response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('AI response data:', data);

      const generatedList = data.choices[0]?.message?.content || '';

      // Convert markdown checklist to our format
      const checklistItems = generatedList
        .split('\n')
        .filter((line: string) => line.trim().startsWith('- [ ]'))
        .map((line: string) => line.replace('- [ ]', '[ ]').trim());

      console.log('Generated checklist items:', checklistItems);

      if (checklistItems.length > 0) {
        const newContent = checklistItems.join('\n');
        const updatedNote = { ...selectedNote, content: newContent };
        updateNote(updatedNote);
        setAiSuccessMessage(`✅ Generated ${checklistItems.length} checklist items!`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setAiSuccessMessage('');
        }, 3000);
      } else {
        alert('No checklist items were generated. Please try a different prompt.');
      }
    } catch (error) {
      console.error('Error generating list:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to generate list: ${errorMessage}`);
    } finally {
      setIsGeneratingList(false);
      setAiThinkingMessage('');
      setAiPrompt('');
    }
  };

  const getApiKey = async (): Promise<string> => {
    const result = await chrome.storage.local.get(['apiKey']);
    if (result.apiKey) {
      try {
        return atob(result.apiKey); // Decode the API key
      } catch {
        return result.apiKey; // Use as-is if decoding fails
      }
    }
    throw new Error('API key not found. Please set your Perplexity API key in settings.');
  };

  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiPrompt.trim()) {
      generateListWithAI(aiPrompt.trim());
    }
  };

  return (
    <div className="notes-container">
      <div className="notes-header">
        <h1>📝 Notes</h1>
        <button 
          className="new-note-btn"
          onClick={() => setShowNewNoteForm(true)}
        >
          <i className="fas fa-plus"></i>
          New Note
        </button>
      </div>

      <div className="notes-content">
        {/* Notes List */}
        <div className="notes-sidebar">
          <div className="notes-list">
            {notes.map(note => (
              <div
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                onClick={() => handleNoteSelect(note)}
              >
                <div className="note-item-header">
                  <div className="note-title-section">
                    <h3>{note.title}</h3>
                    <div className="note-type-indicator">
                      <i className={`fas fa-${note.type === 'todo' ? 'check-square' : 'sticky-note'}`}></i>
                    </div>
                  </div>
                  <button
                    className="delete-note-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    title="Delete note"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                <div 
                  className="note-preview"
                  dangerouslySetInnerHTML={{ 
                    __html: note.content.replace(/<[^>]*>/g, '').substring(0, 100) + 
                    (note.content.replace(/<[^>]*>/g, '').length > 100 ? '...' : '')
                  }}
                ></div>
                <div className="note-meta">
                  <span className="note-date">{formatDate(note.updatedAt)}</span>
                  <span className="note-type">{note.type === 'todo' ? 'Todo List' : 'Note'}</span>
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="loading-notes">
                <div className="loading-spinner"></div>
                <p>Loading your notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="empty-notes">
                <div className="empty-notes-icon">
                  <i className="fas fa-sticky-note"></i>
                </div>
                <h3>No notes yet</h3>
                <p>Create your first note to get started</p>
                <button 
                  className="create-first-note-btn"
                  onClick={() => setShowNewNoteForm(true)}
                >
                  <i className="fas fa-plus"></i>
                  Create Your First Note
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Note Editor */}
        <div className="note-editor">
          {selectedNote ? (
            <div className="note-editor-content">
              <div className="note-editor-header">
                <div className="note-title-section">
                  <input
                    type="text"
                    className="note-title-input"
                    value={selectedNote.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Note title..."
                  />
                  <div className="note-actions">
                    <button
                      className="edit-btn"
                      onClick={() => setIsEditing(!isEditing)}
                      title={isEditing ? 'View mode' : 'Edit mode'}
                    >
                      <i className={`fas fa-${isEditing ? 'eye' : 'edit'}`}></i>
                    </button>
                    {selectedNote.type === 'todo' && (
                      <button
                        className="ai-generate-btn"
                        onClick={() => setShowAIPromptForm(true)}
                        disabled={isGeneratingList}
                        title="Generate checklist with AI"
                      >
                        <i className={`fas fa-${isGeneratingList ? 'spinner fa-spin' : 'magic'}`}></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="note-meta-info">
                  <span>Created: {formatDate(selectedNote.createdAt)}</span>
                  <span>Updated: {formatDate(selectedNote.updatedAt)}</span>
                </div>
              </div>

              <div className="note-content-area">
                {isEditing ? (
                  selectedNote.type === 'todo' ? (
                    <InteractiveCheckboxEditor
                      content={selectedNote.content}
                      onChange={handleContentChange}
                      aiThinkingMessage={aiThinkingMessage}
                      aiSuccessMessage={aiSuccessMessage}
                    />
                  ) : (
                    <SimpleTextEditor
                      content={selectedNote.content}
                      onChange={handleContentChange}
                    />
                  )
                ) : (
                  selectedNote.type === 'todo' ? (
                    <ChecklistDisplay
                      content={selectedNote.content}
                      onChange={handleContentChange}
                    />
                  ) : (
                    <div 
                      className="note-content-display"
                      dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                    ></div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="no-note-selected">
              <div className="no-note-selected-icon">
                <i className="fas fa-sticky-note"></i>
              </div>
              <h2>Select a note to edit</h2>
              <p>Choose a note from the sidebar or create a new one</p>
              <button 
                className="create-note-btn"
                onClick={() => setShowNewNoteForm(true)}
              >
                <i className="fas fa-plus"></i>
                Create New Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Note Modal */}
      {showNewNoteForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Note</h2>
              <button 
                className="close-modal-btn"
                onClick={() => setShowNewNoteForm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder="Enter note title..."
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <div className="type-selector">
                  <button
                    className={`type-option ${newNote.type === 'note' ? 'selected' : ''}`}
                    onClick={() => setNewNote({ ...newNote, type: 'note' })}
                  >
                    <i className="fas fa-sticky-note"></i>
                    <span>Note</span>
                  </button>
                  <button
                    className={`type-option ${newNote.type === 'todo' ? 'selected' : ''}`}
                    onClick={() => setNewNote({ ...newNote, type: 'todo' })}
                  >
                    <i className="fas fa-check-square"></i>
                    <span>Todo List</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowNewNoteForm(false)}
              >
                Cancel
              </button>
              <button 
                className="create-btn"
                onClick={createNewNote}
              >
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Prompt Modal */}
      {showAIPromptForm && (
        <div className="modal-overlay">
          <div className="modal-content ai-prompt-modal">
            <div className="modal-header">
              <h2>Generate AI Checklist</h2>
              <button 
                className="close-modal-btn"
                onClick={() => {
                  setShowAIPromptForm(false);
                  setAiPrompt('');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>What would you like to create a checklist for?</label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., ingredients to make a chocolate cake, packing list for vacation..."
                  autoFocus
                />
                <div className="prompt-examples">
                  <p>Examples:</p>
                  <ul>
                    <li>ingredients to make a chocolate cake</li>
                    <li>packing list for vacation</li>
                    <li>steps to start a business</li>
                    <li>daily morning routine</li>
                    <li>grocery shopping list</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowAIPromptForm(false);
                  setAiPrompt('');
                }}
              >
                Cancel
              </button>
              <button 
                className="create-btn"
                onClick={handleAISubmit}
                disabled={!aiPrompt.trim()}
              >
                <i className="fas fa-magic"></i>
                Generate Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Interactive Checkbox Editor Component
interface InteractiveCheckboxEditorProps {
  content: string;
  onChange: (content: string) => void;
  aiThinkingMessage?: string;
  aiSuccessMessage?: string;
}

const InteractiveCheckboxEditor: React.FC<InteractiveCheckboxEditorProps> = ({ 
  content, 
  onChange, 
  aiThinkingMessage, 
  aiSuccessMessage 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleCheckboxChange = (index: number, isChecked: boolean) => {
    const lines = content.split('\n');
    const line = lines[index];
    
    if (line.includes('[ ]')) {
      lines[index] = line.replace('[ ]', '[x]');
    } else if (line.includes('[x]')) {
      lines[index] = line.replace('[x]', '[ ]');
    }
    
    onChange(lines.join('\n'));
  };

  const handleTextChange = (index: number, newText: string) => {
    const lines = content.split('\n');
    const line = lines[index];
    
    if (line.includes('[ ]') || line.includes('[x]')) {
      const checkbox = line.includes('[x]') ? '[x]' : '[ ]';
      lines[index] = checkbox + ' ' + newText;
    } else {
      lines[index] = newText;
    }
    
    onChange(lines.join('\n'));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const lines = content.split('\n');
      const currentLine = lines[index];
      
      // If current line starts with checkbox, new line should also have checkbox
      if (currentLine.includes('[ ]') || currentLine.includes('[x]')) {
        const checkbox = currentLine.includes('[x]') ? '[x]' : '[ ]';
        lines.splice(index + 1, 0, checkbox + ' ');
      } else {
        lines.splice(index + 1, 0, '');
      }
      
      onChange(lines.join('\n'));
      
      // Focus the new line after a short delay
      setTimeout(() => {
        const newInput = editorRef.current?.querySelector(`[data-line="${index + 1}"]`) as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      }, 10);
    } else if (e.key === 'Backspace') {
      const lines = content.split('\n');
      const currentLine = lines[index];
      
      // If line is empty and not the last line, delete it
      if (currentLine.trim() === '' && lines.length > 1) {
        e.preventDefault();
        lines.splice(index, 1);
        onChange(lines.join('\n'));
        
        // Focus the previous line
        if (index > 0) {
          setTimeout(() => {
            const prevInput = editorRef.current?.querySelector(`[data-line="${index - 1}"]`) as HTMLInputElement;
            if (prevInput) {
              prevInput.focus();
              prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length);
            }
          }, 10);
        }
      }
    }
  };

  const deleteLine = (index: number) => {
    const lines = content.split('\n');
    if (lines.length > 1) {
      lines.splice(index, 1);
      onChange(lines.join('\n'));
    }
  };

  const renderLine = (line: string, index: number) => {
    if (line.includes('[ ]') || line.includes('[x]')) {
      const isChecked = line.includes('[x]');
      const taskText = line.replace(/\[ \]|\[x\]/, '').trim();
      
      return (
        <div key={index} className="checkbox-line">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => handleCheckboxChange(index, isChecked)}
            className="checkbox-input"
          />
          <textarea
            value={taskText}
            onChange={(e) => handleTextChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="checkbox-text-input"
            data-line={index}
            placeholder="Task description..."
            rows={1}
            onInput={(e) => {
              // Auto-resize textarea
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            className="delete-line-btn"
            onClick={() => deleteLine(index)}
            title="Delete line"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      );
    }
    
    return null; // Don't render empty text lines for todo lists
  };

  return (
    <div className="interactive-checkbox-editor">
      <div className="add-item-section">
        <button
          className="add-item-btn"
          onClick={() => {
            const lines = content.split('\n');
            lines.push('[ ] ');
            onChange(lines.join('\n'));
          }}
        >
          <i className="fas fa-plus"></i>
          Add Item
        </button>
      </div>
      
      {/* AI Thinking Indicator */}
      {aiThinkingMessage && (
        <div className="ai-thinking">
          <div className="ai-thinking-spinner"></div>
          <div className="ai-thinking-text">
            {aiThinkingMessage}
            <span className="ai-thinking-dots"></span>
          </div>
        </div>
      )}
      
      {/* AI Success Indicator */}
      {aiSuccessMessage && (
        <div className="ai-success">
          <i className="fas fa-check-circle"></i>
          <span>{aiSuccessMessage}</span>
        </div>
      )}
      
      <div ref={editorRef} className="editor-content">
        {content.split('\n').map((line, index) => renderLine(line, index))}
      </div>
    </div>
  );
};

// Checklist Display Component
interface ChecklistDisplayProps {
  content: string;
  onChange: (content: string) => void;
}

const ChecklistDisplay: React.FC<ChecklistDisplayProps> = ({ content, onChange }) => {
  const handleCheckboxClick = (index: number, isChecked: boolean) => {
    const lines = content.split('\n');
    const line = lines[index];
    
    if (line.includes('[ ]')) {
      lines[index] = line.replace('[ ]', '[x]');
    } else if (line.includes('[x]')) {
      lines[index] = line.replace('[x]', '[ ]');
    }
    
    onChange(lines.join('\n'));
  };

  const renderLine = (line: string, index: number) => {
    if (line.includes('[ ]') || line.includes('[x]')) {
      const isChecked = line.includes('[x]');
      const taskText = line.replace(/\[ \]|\[x\]/, '').trim();
      
      return (
        <div key={index} className="checklist-item">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => handleCheckboxClick(index, isChecked)}
            className="checklist-checkbox"
          />
          <span className={`checklist-text ${isChecked ? 'completed' : ''}`}>
            {taskText}
          </span>
        </div>
      );
    }
    
    return <div key={index} className="text-line">{line}</div>;
  };

  return (
    <div className="checklist-display">
      {content.split('\n').map((line, index) => renderLine(line, index))}
    </div>
  );
};

// Simple Text Editor for regular notes
interface SimpleTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const SimpleTextEditor: React.FC<SimpleTextEditorProps> = ({ content, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = target.value.substring(0, start) + '  ' + target.value.substring(end);
      target.value = newValue;
      target.selectionStart = target.selectionEnd = start + 2;
      onChange(newValue);
    }
  };

  return (
    <div className="simple-text-editor">
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Start writing your note..."
        style={{
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'normal',
          writingMode: 'horizontal-tb',
          textOrientation: 'mixed'
        }}
        spellCheck="false"
      />
    </div>
  );
};

export default Notes; 