import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../css/notes.css';
import { saveNote, getNotes, updateNote, deleteNote } from '../services/storage';

interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'todo';
  createdAt: string;
  updatedAt: string;
}

const NoteEditor: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false); // Start in view mode by default
  const [showAIPromptForm, setShowAIPromptForm] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiThinkingMessage, setAiThinkingMessage] = useState('');
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewNote, setIsNewNote] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load note or create new one
  useEffect(() => {
    console.log('NoteEditor useEffect - noteId:', noteId);
    
    // Check if we're on the create route by looking at the current path
    const currentPath = window.location.pathname;
    const isCreateRoute = currentPath.includes('/notes/create');
    
    if (isCreateRoute || noteId === 'create') {
      console.log('Creating new note');
      setIsNewNote(true);
      setIsEditing(true); // Enable editing for new notes
      setNote({
        id: Date.now().toString(),
        title: '',
        content: '',
        type: 'note',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsLoading(false);
      console.log('New note created, loading set to false');
    } else if (noteId && noteId !== 'create') {
      console.log('Loading existing note:', noteId);
      loadNote(noteId);
    } else {
      // If noteId is undefined and we're not on create route, redirect to notes
      console.log('No noteId provided, redirecting to notes');
      navigate('/notes');
    }
  }, [noteId, navigate]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  const loadNote = async (id: string) => {
    try {
      setIsLoading(true);
      const notes = await getNotes();
      const foundNote = notes.find((n: Note) => n.id === id);
      if (foundNote) {
        setNote(foundNote);
      } else {
        navigate('/notes');
      }
    } catch (error) {
      console.error('Error loading note:', error);
      navigate('/notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!note) return;
    
    try {
      if (isNewNote) {
        await saveNote(note);
        setIsNewNote(false);
      } else {
        await updateNote(note);
      }
      navigate('/notes');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDelete = async () => {
    if (!note || isNewNote) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(note.id);
        navigate('/notes');
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const handleContentChange = (content: string) => {
    if (note) {
      const updatedNote = { ...note, content, updatedAt: new Date().toISOString() };
      setNote(updatedNote);
      triggerAutoSave(updatedNote);
    }
  };

  const handleTitleChange = (title: string) => {
    if (note) {
      const updatedNote = { ...note, title, updatedAt: new Date().toISOString() };
      setNote(updatedNote);
      triggerAutoSave(updatedNote);
    }
  };

  const handleTypeChange = (type: 'note' | 'todo') => {
    if (note) {
      const updatedNote = { ...note, type, updatedAt: new Date().toISOString() };
      setNote(updatedNote);
      triggerAutoSave(updatedNote);
    }
  };

  // AI-powered list generation
  const generateListWithAI = async (userPrompt: string) => {
    if (!note || note.type !== 'todo') {
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

      // Build the AI query
      const aiQuery = `Generate a comprehensive checklist for: ${userPrompt}

Please format the response as a markdown checklist with each item on a new line starting with "- [ ] ".

Example format:
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

Make the list practical and actionable.`;

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const generatedList = data.choices[0]?.message?.content || '';

      // Convert markdown checklist to our format
      const checklistItems = generatedList
        .split('\n')
        .filter((line: string) => line.trim().startsWith('- [ ]'))
        .map((line: string) => line.replace('- [ ]', '[ ]').trim());

      if (checklistItems.length > 0) {
        const newContent = checklistItems.join('\n');
        setNote({ ...note, content: newContent, updatedAt: new Date().toISOString() });
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

  // Auto-save function with debouncing
  const autoSave = useCallback(async (noteToSave: Note) => {
    try {
      if (isNewNote) {
        await saveNote(noteToSave);
        setIsNewNote(false);
      } else {
        await updateNote(noteToSave);
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error auto-saving note:', error);
    }
  }, [isNewNote]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback((updatedNote: Note) => {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save (1.5 seconds delay)
    const timeout = setTimeout(() => {
      autoSave(updatedNote);
    }, 1500);

    setAutoSaveTimeout(timeout);
  }, [autoSave, autoSaveTimeout]);

  if (isLoading) {
    return (
      <div className="note-editor-loading">
        <div className="loading-spinner"></div>
        <p>Loading note...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="note-editor-error">
        <h2>Note not found</h2>
        <button onClick={() => navigate('/notes')}>Back to Notes</button>
      </div>
    );
  }

  return (
    <div className="note-editor-container">
      <div className="note-editor-header">
        <div className="note-editor-nav">
          <button 
            className="back-btn"
            onClick={() => navigate('/notes')}
            title="Back to notes"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="note-type-selector">
            <button
              className={`type-btn ${note.type === 'note' ? 'active' : ''}`}
              onClick={() => handleTypeChange('note')}
            >
              <i className="fas fa-sticky-note"></i>
              Note
            </button>
            <button
              className={`type-btn ${note.type === 'todo' ? 'active' : ''}`}
              onClick={() => handleTypeChange('todo')}
            >
              <i className="fas fa-check-square"></i>
              Todo
            </button>
          </div>
        </div>
        
        <div className="note-editor-actions">
          {note.type === 'todo' && (
            <button
              className="ai-generate-btn"
              onClick={() => setShowAIPromptForm(true)}
              disabled={isGeneratingList}
              title="Generate checklist with AI"
            >
              <i className={`fas fa-${isGeneratingList ? 'spinner fa-spin' : 'magic'}`}></i>
            </button>
          )}
          <button
            className="edit-toggle-btn"
            onClick={() => setIsEditing(!isEditing)}
            title={isEditing ? 'View mode' : 'Edit mode'}
          >
            <i className={`fas fa-${isEditing ? 'eye' : 'edit'}`}></i>
          </button>
          {!isNewNote && (
            <button
              className="delete-btn"
              onClick={handleDelete}
              title="Delete note"
            >
              <i className="fas fa-trash"></i>
            </button>
          )}
          {lastSaved && (
            <div className="auto-save-indicator">
              <i className="fas fa-check"></i>
              <span>Auto-saved</span>
            </div>
          )}
        </div>
      </div>

      <div className="note-editor-content">
        {isEditing ? (
          <input
            type="text"
            className="note-title-input"
            value={note.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Note title..."
          />
        ) : (
          <h1 className="note-title-display">{note.title}</h1>
        )}

        <div className="note-content-area">
          {isEditing ? (
            note.type === 'todo' ? (
              <InteractiveCheckboxEditor
                content={note.content}
                onChange={handleContentChange}
                aiThinkingMessage={aiThinkingMessage}
                aiSuccessMessage={aiSuccessMessage}
              />
            ) : (
              <SimpleTextEditor
                content={note.content}
                onChange={handleContentChange}
              />
            )
          ) : (
            note.type === 'todo' ? (
              <ChecklistDisplay
                content={note.content}
                onChange={handleContentChange}
              />
            ) : (
              <div 
                className="note-content-display"
                dangerouslySetInnerHTML={{ __html: note.content }}
              ></div>
            )
          )}
        </div>
      </div>

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

export default NoteEditor; 