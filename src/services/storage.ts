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
    console.log('Firebase config check:', { hasConfig: !!firebaseConfig, config: firebaseConfig });
    
    if (!firebaseConfig) {
      console.log('No Firebase config found');
      return false;
    }
    
    const isValid = firebaseConfig.apiKey && 
           firebaseConfig.apiKey !== "YOUR_API_KEY" && 
           firebaseConfig.projectId && 
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
    console.log('Firebase config validation:', { isValid, apiKey: !!firebaseConfig.apiKey, projectId: !!firebaseConfig.projectId });
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
    console.log('User authentication check:', { user: !!user, userDetails: user });
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
  console.log('saveHistoryItem called with:', historyItem);
  
  try {
    const firebaseConfigured = await isFirebaseConfigured();
    const userAuthenticated = await isUserAuthenticated();
    console.log('Firebase status:', { firebaseConfigured, userAuthenticated });
    
    if (firebaseConfigured && userAuthenticated) {
      const user = await getCurrentUser();
      console.log('User found:', user);
      if (user) {
        console.log('Saving to Firebase...');
        await saveHistoryToFirebase(user.uid, historyItem);
        console.log('Successfully saved to Firebase');
        return;
      }
    }
  } catch (error) {
    console.warn('Firebase history save failed, falling back to Chrome storage:', error);
  }
  
  // Fallback to Chrome storage
  console.log('Falling back to Chrome storage');
  const history = await getHistoryFromChromeStorage();
  history.unshift(historyItem);
  await chrome.storage.local.set({ extensionHistory: history });
  console.log('Saved to Chrome storage');
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
    console.log('Starting migration to Firebase...');
    
    // Check what data exists in Chrome storage
    const chromeData = await chrome.storage.local.get([
      'notes',
      'extensionHistory',
      'apiKey',
      'model',
      'aiContextConfig',
      'aiModelConfig'
    ]);
    
    console.log('Data found in Chrome storage:', {
      notesCount: chromeData.notes?.length || 0,
      historyCount: chromeData.extensionHistory?.length || 0,
      hasApiKey: !!chromeData.apiKey,
      hasModel: !!chromeData.model,
      hasAiContextConfig: !!chromeData.aiContextConfig,
      hasAiModelConfig: !!chromeData.aiModelConfig
    });
    
    // Check if Firebase is configured
    const firebaseConfigured = await isFirebaseConfigured();
    console.log('Firebase configured:', firebaseConfigured);
    if (!firebaseConfigured) {
      throw new Error('Firebase not configured');
    }
    
    // Reset Firebase to ensure we use the latest config
    const { resetFirebase } = await import('./firebase');
    if (resetFirebase) {
      resetFirebase();
      console.log('Reset Firebase initialization');
    }
    
    // Wait a moment for the config to be saved and Firebase to reset
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test Firebase initialization
    const { initializeFirebase } = await import('./firebase');
    const firebaseInstance = await initializeFirebase();
    console.log('Firebase instance after reset:', {
      hasApp: !!firebaseInstance.app,
      hasAuth: !!firebaseInstance.auth,
      hasDb: !!firebaseInstance.db
    });
    
    if (!firebaseInstance.db) {
      throw new Error('Firebase Firestore database failed to initialize');
    }
    
    // Check if user is already authenticated with Google
    const authResult = await chrome.storage.local.get(['userAuthenticated', 'googleAuthToken']);
    console.log('Auth result:', { 
      userAuthenticated: authResult.userAuthenticated, 
      hasToken: !!authResult.googleAuthToken 
    });
    
    if (!authResult.userAuthenticated || !authResult.googleAuthToken) {
      throw new Error('Please sign in with Google first before migrating data');
    }
    
    // Try to get the current user (this will use existing Google credentials)
    let user: any = null;
    try {
      console.log('Attempting to get current user...');
      user = await getCurrentUser();
      console.log('Current user:', user);
    } catch (error) {
      console.log('Error getting current user, will try to authenticate with existing token:', error);
      
      // Try to authenticate with the existing Google token
      const { signInWithGoogle } = await import('./firebase');
      try {
        console.log('Attempting to sign in with Google...');
        const authUser = await signInWithGoogle();
        user = authUser;
        console.log('Successfully authenticated user:', user);
      } catch (authError) {
        console.error('Failed to authenticate with existing token:', authError);
        throw new Error('Authentication failed. Please try signing in again.');
      }
    }
    
    if (!user || !user.uid) {
      throw new Error('No authenticated user found');
    }
    
    console.log('Using authenticated user for migration:', user.uid);
    
    // Migrate notes
    const chromeNotes = await getNotesFromChromeStorage();
    console.log(`Migrating ${chromeNotes.length} notes to Firebase`);
    if (chromeNotes.length === 0) {
      console.log('No notes found to migrate');
    } else {
      for (const note of chromeNotes) {
        try {
          await saveNoteToFirebase(user.uid, note);
          console.log('Successfully migrated note:', note.id);
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
    console.log('Settings to migrate:', hasSettings ? 'Yes' : 'No');
    if (hasSettings) {
      try {
        await saveSettingsToFirebase(user.uid, chromeSettings);
        console.log('Settings migrated to Firebase');
      } catch (error) {
        console.error('Failed to migrate settings:', error);
        throw new Error(`Failed to migrate settings: ${error}`);
      }
    }
    
    // Migrate history
    const chromeHistory = await getHistoryFromChromeStorage();
    console.log(`Migrating ${chromeHistory.length} history items to Firebase`);
    if (chromeHistory.length === 0) {
      console.log('No history found to migrate');
    } else {
      for (const historyItem of chromeHistory) {
        try {
          await saveHistoryToFirebase(user.uid, historyItem);
          console.log('Successfully migrated history item:', historyItem.id);
        } catch (error) {
          console.error('Failed to migrate history item:', historyItem.id, error);
          throw new Error(`Failed to migrate history item ${historyItem.id}: ${error}`);
        }
      }
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
    
    console.log('Test data created successfully');
    return true;
  } catch (error) {
    console.error('Failed to create test data:', error);
    return false;
  }
}; 

// Test function to check Firebase status
export const testFirebaseStatus = async () => {
  console.log('=== Firebase Status Test ===');
  
  const firebaseConfigured = await isFirebaseConfigured();
  console.log('Firebase configured:', firebaseConfigured);
  
  const userAuthenticated = await isUserAuthenticated();
  console.log('User authenticated:', userAuthenticated);
  
  if (firebaseConfigured && userAuthenticated) {
    const user = await getCurrentUser();
    console.log('Current user:', user);
  }
  
  console.log('=== End Firebase Status Test ===');
}; 