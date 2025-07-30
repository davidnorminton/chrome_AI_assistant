import { getCurrentUser } from './firebase';
import { 
  saveNoteToFirebase, 
  getNotesFromFirebase, 
  updateNoteInFirebase, 
  deleteNoteFromFirebase,
  saveSettingsToFirebase,
  getSettingsFromFirebase,
  saveHistoryToFirebase,
  getHistoryFromFirebase,
  deleteHistoryFromFirebase
} from './firebase';

// Check if Firebase is configured
export const isFirebaseConfigured = async () => {
  try {
    const result = await chrome.storage.local.get(['firebaseConfig']);
    const firebaseConfig = result.firebaseConfig;
    
    if (!firebaseConfig) {
      return false;
    }
    
    const isValid = firebaseConfig.apiKey && 
           firebaseConfig.apiKey !== "YOUR_API_KEY" && 
           firebaseConfig.projectId && 
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
    return isValid;
  } catch (error) {
    console.error('Error checking Firebase config:', error);
    return false;
  }
};

// Check if user is authenticated
export const isUserAuthenticated = async () => {
  try {
    const user = await getCurrentUser();
    return user !== null;
  } catch (error) {
    console.error('Error checking user authentication:', error);
    return false;
  }
};

// Hybrid storage functions for notes
export const saveNote = async (note: any) => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        await saveNoteToFirebase(user.uid, note);
        return;
      }
    }
  } catch (error) {
    console.warn('Firebase save failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  const notes = await getNotesFromChromeStorage();
  const existingIndex = notes.findIndex((n: any) => n.id === note.id);
  
  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.unshift(note);
  }
  
  await chrome.storage.local.set({ notes });
};

export const getNotes = async () => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        return await getNotesFromFirebase(user.uid);
      }
    }
  } catch (error) {
    console.warn('Firebase get failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  return await getNotesFromChromeStorage();
};

export const updateNote = async (note: any) => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        await updateNoteInFirebase(user.uid, note);
        return;
      }
    }
  } catch (error) {
    console.warn('Firebase update failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  await saveNote(note);
};

export const deleteNote = async (noteId: string) => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        await deleteNoteFromFirebase(user.uid, noteId);
        return;
      }
    }
  } catch (error) {
    console.warn('Firebase delete failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  const notes = await getNotesFromChromeStorage();
  const filteredNotes = notes.filter((note: any) => note.id !== noteId);
  await chrome.storage.local.set({ notes: filteredNotes });
};

// Hybrid storage functions for settings
export const saveSettings = async (settings: any) => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        await saveSettingsToFirebase(user.uid, settings);
        return;
      }
    }
  } catch (error) {
    console.warn('Firebase settings save failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  await chrome.storage.local.set(settings);
};

export const getSettings = async () => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        return await getSettingsFromFirebase(user.uid);
      }
    }
  } catch (error) {
    console.warn('Firebase settings get failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  return await chrome.storage.local.get([
    'apiKey',
    'model',
    'aiContextConfig',
    'aiModelConfig'
  ]);
};

// Hybrid storage functions for history
export const saveHistoryItem = async (historyItem: any) => {
  
  try {
    const firebaseConfigured = await isFirebaseConfigured();
    const userAuthenticated = await isUserAuthenticated();
    
    if (firebaseConfigured && userAuthenticated) {
      const user = await getCurrentUser();
      if (user) {
        await saveHistoryToFirebase(user.uid, historyItem);
        return;
      }
    }
  } catch (error) {
    console.warn('Firebase history save failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  const history = await getHistoryFromChromeStorage();
  history.unshift(historyItem);
  await chrome.storage.local.set({ extensionHistory: history });
};

export const getHistory = async () => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        return await getHistoryFromFirebase(user.uid);
      }
    }
  } catch (error) {
    console.warn('Firebase history get failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  return await getHistoryFromChromeStorage();
};

export const deleteHistoryItem = async (historyId: string) => {
  try {
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
      const user = await getCurrentUser();
      if (user) {
        await deleteHistoryFromFirebase(user.uid, historyId);
        return;
      }
    }
  } catch (error) {
    console.warn('Firebase history delete failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  const history = await getHistoryFromChromeStorage();
  const filteredHistory = history.filter((item: any) => item.id !== historyId);
  await chrome.storage.local.set({ extensionHistory: filteredHistory });
};

// Chrome storage helper functions
const getNotesFromChromeStorage = async () => {
  const result = await chrome.storage.local.get(['notes']);
  return result.notes || [];
};

const getHistoryFromChromeStorage = async () => {
  const result = await chrome.storage.local.get(['extensionHistory']);
  return result.extensionHistory || [];
};

// Migration function to move data from Chrome storage to Firebase
export const migrateToFirebase = async () => {
  try {
    
    // Check what data exists in Chrome storage
    const chromeData = await chrome.storage.local.get([
      'notes',
      'extensionHistory',
      'apiKey',
      'model',
      'aiContextConfig',
      'aiModelConfig'
    ]);
    
    // Check if Firebase is configured
    const firebaseConfigured = await isFirebaseConfigured();
    if (!firebaseConfigured) {
      throw new Error('Firebase not configured');
    }
    
    // Reset Firebase to ensure we use the latest config
    const { resetFirebase } = await import('./firebase');
    if (resetFirebase) {
      resetFirebase();
    }
    
    // Wait a moment for the config to be saved and Firebase to reset
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test Firebase initialization
    const { initializeFirebase } = await import('./firebase');
    const firebaseInstance = await initializeFirebase();
    
    if (!firebaseInstance.db) {
      throw new Error('Firebase Firestore database failed to initialize');
    }
    
    // Check if user is already authenticated with Google
    const authResult = await chrome.storage.local.get(['userAuthenticated', 'googleAuthToken']);
    
    if (!authResult.userAuthenticated || !authResult.googleAuthToken) {
      throw new Error('Please sign in with Google first before migrating data');
    }
    
    // Try to get the current user (this will use existing Google credentials)
    let user: any = null;
    try {
      user = await getCurrentUser();
    } catch (error) {
      
      // Try to authenticate with the existing Google token
      const { signInWithGoogle } = await import('./firebase');
      try {
        const authUser = await signInWithGoogle();
        user = authUser;
      } catch (authError) {
        console.error('Failed to authenticate with existing token:', authError);
        throw new Error('Authentication failed. Please try signing in again.');
      }
    }
    
    if (!user || !user.uid) {
      throw new Error('No authenticated user found');
    }
    
    // Migrate notes
    const chromeNotes = await getNotesFromChromeStorage();
    if (chromeNotes.length === 0) {
      console.log('No notes found to migrate');
    } else {
      for (const note of chromeNotes) {
        try {
          await saveNoteToFirebase(user.uid, note);
        } catch (error) {
          console.error('Failed to migrate note:', note.id, error);
          throw new Error(`Failed to migrate note ${note.id}: ${error}`);
        }
      }
    }
    
    // Migrate settings
    const chromeSettings = await chrome.storage.local.get([
      'apiKey',
      'model',
      'aiContextConfig',
      'aiModelConfig'
    ]);
    const hasSettings = Object.keys(chromeSettings).some(key => chromeSettings[key] !== undefined);
    if (hasSettings) {
      try {
        await saveSettingsToFirebase(user.uid, chromeSettings);
      } catch (error) {
        console.error('Failed to migrate settings:', error);
        throw new Error(`Failed to migrate settings: ${error}`);
      }
    }
    
    // Migrate history
    const chromeHistory = await getHistoryFromChromeStorage();
    if (chromeHistory.length === 0) {
      console.log('No history found to migrate');
    } else {
      for (const historyItem of chromeHistory) {
        try {
          await saveHistoryToFirebase(user.uid, historyItem);
        } catch (error) {
          console.error('Failed to migrate history item:', historyItem.id, error);
          throw new Error(`Failed to migrate history item ${historyItem.id}: ${error}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Migration to Firebase failed:', error);
    return false;
  }
};

// Check storage status
export const getStorageStatus = async () => {
  const firebaseConfigured = await isFirebaseConfigured();
  const userAuthenticated = await isUserAuthenticated();
  
  return {
    firebaseConfigured,
    userAuthenticated,
    usingFirebase: firebaseConfigured && userAuthenticated,
    usingChromeStorage: !firebaseConfigured || !userAuthenticated
  };
}; 

// Function to create test data for migration testing
export const createTestData = async () => {
  try {
    // Create a test note
    const testNote = {
      id: `test-note-${Date.now()}`,
      title: 'Test Note',
      content: 'This is a test note for migration testing.',
      type: 'text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Create a test history item
    const testHistoryItem = {
      id: `test-history-${Date.now()}`,
      query: 'Test query for migration',
      response: 'This is a test response for migration testing.',
      timestamp: Date.now(),
      model: 'sonar'
    };
    
    // Save test data to Chrome storage
    const existingNotes = await getNotesFromChromeStorage();
    existingNotes.unshift(testNote);
    await chrome.storage.local.set({ notes: existingNotes });
    
    const existingHistory = await getHistoryFromChromeStorage();
    existingHistory.unshift(testHistoryItem);
    await chrome.storage.local.set({ extensionHistory: existingHistory });
    
    return true;
  } catch (error) {
    console.error('Failed to create test data:', error);
    return false;
  }
}; 

// Test function to check Firebase status
export const testFirebaseStatus = async () => {
  
  const firebaseConfigured = await isFirebaseConfigured();
  
  const userAuthenticated = await isUserAuthenticated();
  
  if (firebaseConfigured && userAuthenticated) {
    const user = await getCurrentUser();
  }
  
}; 