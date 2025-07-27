import React, { useState, useEffect, useRef } from 'react';
import '../css/notes.css';

interface Note {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  type: 'note' | 'todo';
  createdAt: string;
  updatedAt: string;
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    backgroundColor: '#ffffff',
    type: 'note' as 'note' | 'todo'
  });

  const backgroundColors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Red', value: '#f28b82' },
    { name: 'Orange', value: '#fbbc04' },
    { name: 'Yellow', value: '#fff475' },
    { name: 'Green', value: '#ccff90' },
    { name: 'Teal', value: '#a7ffeb' },
    { name: 'Blue', value: '#aecbfa' },
    { name: 'Purple', value: '#d7aefb' },
    { name: 'Pink', value: '#fbb4ae' },
    { name: 'Brown', value: '#e6c9a8' },
    { name: 'Gray', value: '#e8eaed' }
  ];

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
      backgroundColor: newNote.backgroundColor,
      type: newNote.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNotes = [note, ...notes];
    saveNotes(updatedNotes);
    setSelectedNote(note);
    setIsEditing(true);
    setShowNewNoteForm(false);
    setNewNote({ title: '', content: '', backgroundColor: '#ffffff', type: 'note' });
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

  const handleBackgroundColorChange = (backgroundColor: string) => {
    if (selectedNote) {
      updateNote({ ...selectedNote, backgroundColor });
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
                style={{ backgroundColor: note.backgroundColor }}
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
                    <div className="color-picker">
                      <button className="color-picker-btn" title="Change background color">
                        <i className="fas fa-palette"></i>
                      </button>
                      <div className="color-options">
                        {backgroundColors.map(color => (
                          <button
                            key={color.value}
                            className="color-option"
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleBackgroundColorChange(color.value)}
                            title={color.name}
                          ></button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="note-meta-info">
                  <span>Created: {formatDate(selectedNote.createdAt)}</span>
                  <span>Updated: {formatDate(selectedNote.updatedAt)}</span>
                </div>
              </div>

              <div 
                className="note-content-area"
                style={{ backgroundColor: selectedNote.backgroundColor }}
              >
                {isEditing ? (
                  selectedNote.type === 'todo' ? (
                    <InteractiveCheckboxEditor
                      content={selectedNote.content}
                      onChange={handleContentChange}
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
              <div className="form-group">
                <label>Background Color</label>
                <div className="color-grid">
                  {backgroundColors.map(color => (
                    <button
                      key={color.value}
                      className={`color-option ${newNote.backgroundColor === color.value ? 'selected' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewNote({ ...newNote, backgroundColor: color.value })}
                      title={color.name}
                    ></button>
                  ))}
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
    </div>
  );
};

// Interactive Checkbox Editor Component
interface InteractiveCheckboxEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const InteractiveCheckboxEditor: React.FC<InteractiveCheckboxEditorProps> = ({ content, onChange }) => {
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
          <input
            type="text"
            value={taskText}
            onChange={(e) => handleTextChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="checkbox-text-input"
            data-line={index}
            placeholder="Task description..."
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