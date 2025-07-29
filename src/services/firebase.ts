import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

// Initialize Firebase with configuration from Chrome storage
let app: any = null;
let auth: any = null;
let db: any = null;

const initializeFirebase = async () => {
  if (app) return { app, auth, db };
  
  try {
    const result = await chrome.storage.local.get(['firebaseConfig']);
    const firebaseConfig = result.firebaseConfig;
    
    // More comprehensive check for valid Firebase config
    if (!firebaseConfig || 
        !firebaseConfig.apiKey || 
        firebaseConfig.apiKey === "YOUR_API_KEY" ||
        firebaseConfig.apiKey === "AIzaSyBPPzRXVBhXNE_lobgqSuDe2AfivaZ2_UE" || // This appears to be invalid
        !firebaseConfig.projectId ||
        firebaseConfig.projectId === "YOUR_PROJECT_ID") {
      console.log('Firebase not configured or invalid config - using local storage only');
      return { app: null, auth: null, db: null };
    }
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    return { app, auth, db };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return { app: null, auth: null, db: null };
  }
};

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Chrome Extension Google Sign-In
export const signInWithGoogle = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(chrome.runtime.lastError || new Error('Failed to get auth token'));
          return;
        }
        
        // If Firebase is configured, try to use it for authentication
        try {
          const { auth } = await initializeFirebase();
          if (auth) {
            try {
              const accessToken = token as string;
              const credential = GoogleAuthProvider.credential(null, accessToken);
              const result = await signInWithCredential(auth, credential);
              resolve(result.user);
              return;
            } catch (firebaseAuthError) {
              console.log('Firebase authentication failed, falling back to Chrome identity:', firebaseAuthError);
              // Continue to Chrome identity fallback
            }
          }
        } catch (firebaseError) {
          console.log('Firebase not configured, proceeding with Chrome identity only');
        }
        
        // Fallback to Chrome identity authentication
        try {
          await chrome.storage.local.set({ 
            googleAuthToken: token,
            userAuthenticated: true,
            authTimestamp: Date.now()
          });
          
          // Create a mock user object for consistency
          const mockUser = {
            uid: 'chrome-user',
            email: 'user@example.com', // We don't have email without Firebase
            displayName: 'Chrome User',
            photoURL: null
          };
          
          resolve(mockUser as any);
        } catch (storageError) {
          reject(new Error('Failed to store authentication token'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const signOutUser = async () => {
  try {
    const { auth } = await initializeFirebase();
    if (!auth) {
      throw new Error('Firebase not configured');
    }
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First try Firebase authentication
    const { auth } = await initializeFirebase();
    if (auth && auth.currentUser) {
      return auth.currentUser;
    }
    
    // If Firebase is not configured, check for Chrome identity authentication
    const result = await chrome.storage.local.get(['userAuthenticated', 'googleAuthToken', 'authTimestamp']);
    if (result.userAuthenticated && result.googleAuthToken) {
      // Check if token is still valid (24 hours)
      const tokenAge = Date.now() - (result.authTimestamp || 0);
      if (tokenAge < 24 * 60 * 60 * 1000) {
        const mockUser = {
          uid: 'chrome-user',
          email: 'user@example.com',
          displayName: 'Chrome User',
          photoURL: null
        };
        return mockUser as any;
      } else {
        // Token expired, clear it
        await chrome.storage.local.remove(['userAuthenticated', 'googleAuthToken', 'authTimestamp']);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

export const onAuthStateChange = async (callback: (user: User | null) => void) => {
  try {
    const { auth } = await initializeFirebase();
    if (auth) {
      return onAuthStateChanged(auth, callback);
    } else {
      // If Firebase is not configured, check Chrome identity and call callback
      const user = await getCurrentUser();
      callback(user);
      return () => {};
    }
  } catch (error) {
    console.error('Error setting up auth state change:', error);
    return () => {};
  }
};

// Firestore functions for notes
export const saveNoteToFirebase = async (userId: string, note: any) => {
  try {
    const { db } = await initializeFirebase();
    if (!db) {
      throw new Error('Firebase not configured');
    }
    const noteRef = doc(db, 'users', userId, 'notes', note.id);
    await setDoc(noteRef, {
      ...note,
      userId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving note to Firebase:', error);
    throw error;
  }
};

export const getNotesFromFirebase = async (userId: string) => {
  try {
    const { db } = await initializeFirebase();
    if (!db) {
      throw new Error('Firebase not configured');
    }
    const notesRef = collection(db, 'users', userId, 'notes');
    const querySnapshot = await getDocs(notesRef);
    const notes: any[] = [];
    
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
    });
    
    return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error('Error getting notes from Firebase:', error);
    throw error;
  }
};

export const updateNoteInFirebase = async (userId: string, note: any) => {
  try {
    const { db } = await initializeFirebase();
    const noteRef = doc(db, 'users', userId, 'notes', note.id);
    await updateDoc(noteRef, {
      ...note,
      userId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating note in Firebase:', error);
    throw error;
  }
};

export const deleteNoteFromFirebase = async (userId: string, noteId: string) => {
  try {
    const { db } = await initializeFirebase();
    const noteRef = doc(db, 'users', userId, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch (error) {
    console.error('Error deleting note from Firebase:', error);
    throw error;
  }
};

// Firestore functions for settings
export const saveSettingsToFirebase = async (userId: string, settings: any) => {
  try {
    const { db } = await initializeFirebase();
    const settingsRef = doc(db, 'users', userId, 'settings', 'userSettings');
    await setDoc(settingsRef, {
      ...settings,
      userId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving settings to Firebase:', error);
    throw error;
  }
};

export const getSettingsFromFirebase = async (userId: string) => {
  try {
    const { db } = await initializeFirebase();
    const settingsRef = doc(db, 'users', userId, 'settings', 'userSettings');
    const docSnap = await getDoc(settingsRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting settings from Firebase:', error);
    throw error;
  }
};

// Firestore functions for history
export const saveHistoryToFirebase = async (userId: string, historyItem: any) => {
  try {
    const { db } = await initializeFirebase();
    const historyRef = doc(db, 'users', userId, 'history', historyItem.id);
    await setDoc(historyRef, {
      ...historyItem,
      userId,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving history to Firebase:', error);
    throw error;
  }
};

export const getHistoryFromFirebase = async (userId: string) => {
  try {
    const { db } = await initializeFirebase();
    const historyRef = collection(db, 'users', userId, 'history');
    const querySnapshot = await getDocs(historyRef);
    const history: any[] = [];
    
    querySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() });
    });
    
    return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error getting history from Firebase:', error);
    throw error;
  }
};

export const deleteHistoryFromFirebase = async (userId: string, historyId: string) => {
  try {
    const { db } = await initializeFirebase();
    const historyRef = doc(db, 'users', userId, 'history', historyId);
    await deleteDoc(historyRef);
  } catch (error) {
    console.error('Error deleting history from Firebase:', error);
    throw error;
  }
};

export { auth, db }; 