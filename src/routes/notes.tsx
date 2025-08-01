import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/notes.css';
import { getNotes, deleteNote } from '../services/storage';

interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'todo';
  createdAt: string;
  updatedAt: string;
}

const NotesIndex: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load notes from storage
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const savedNotes = await getNotes();
      setNotes(savedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleNoteClick = (noteId: string) => {
    navigate(`/notes/${noteId}`);
  };

  const handleCreateNote = () => {
    navigate('/notes/create');
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
    <div className="notes-index-container">
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
            onClick={handleCreateNote}
          >
            <i className="fas fa-plus"></i>
            Create Your First Note
          </button>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map(note => (
            <div
              key={note.id}
              className="note-card"
              onClick={() => handleNoteClick(note.id)}
            >
              <div className="note-card-header">
                <div className="title">
                  <h3>{note.title}</h3>
                  <div className="note-type-indicator">
                    <i className={`fas fa-${note.type === 'todo' ? 'check-square' : 'sticky-note'}`}></i>
                  </div>
                </div>
                <button
                  className="delete-note-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  title="Delete note"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <button 
        className="floating-add-btn"
        onClick={handleCreateNote}
        title="Create new note"
      >
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );
};

export default NotesIndex; 