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
const isFirebaseConfigured = async () => {
  try {
    const result = await chrome.storage.local.get(['firebaseConfig']);
    const firebaseConfig = result.firebaseConfig;
    
    if (!firebaseConfig) {
      return false;
    }
    
    return firebaseConfig.apiKey && 
           firebaseConfig.apiKey !== "YOUR_API_KEY" && 
           firebaseConfig.projectId && 
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
  } catch (error) {
    return false;
  }
};

// Check if user is authenticated
const isUserAuthenticated = async () => {
  try {
    const user = await getCurrentUser();
    return user !== null;
  } catch (error) {
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
    if (await isFirebaseConfigured() && await isUserAuthenticated()) {
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
    if (!await isFirebaseConfigured() || !(await isUserAuthenticated())) {
      throw new Error('Firebase not configured or user not authenticated');
    }
    
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    // Migrate notes
    const chromeNotes = await getNotesFromChromeStorage();
    for (const note of chromeNotes) {
      await saveNoteToFirebase(user.uid, note);
    }
    
    // Migrate settings
    const chromeSettings = await chrome.storage.local.get([
      'apiKey',
      'model',
      'aiContextConfig',
      'aiModelConfig'
    ]);
    if (Object.keys(chromeSettings).length > 0) {
      await saveSettingsToFirebase(user.uid, chromeSettings);
    }
    
    // Migrate history
    const chromeHistory = await getHistoryFromChromeStorage();
    for (const historyItem of chromeHistory) {
      await saveHistoryToFirebase(user.uid, historyItem);
    }
    
    console.log('Migration to Firebase completed successfully');
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