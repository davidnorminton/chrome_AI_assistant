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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

// Initialize Firebase with configuration from Chrome storage
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

// Reset Firebase initialization (useful when config changes)
export const resetFirebase = () => {
  app = null;
  auth = null;
  db = null;
  storage = null;
};

export const initializeFirebase = async () => {
  if (app) {
    return { app, auth, db };
  }
  
  try {
    const result = await chrome.storage.local.get(['firebaseConfig']);
    const firebaseConfig = result.firebaseConfig;
    
    // More comprehensive check for valid Firebase config
    if (!firebaseConfig || 
        !firebaseConfig.apiKey || 
        firebaseConfig.apiKey === "YOUR_API_KEY" ||
        !firebaseConfig.projectId ||
        firebaseConfig.projectId === "YOUR_PROJECT_ID") {
      return { app: null, auth: null, db: null };
    }
    
    app = initializeApp(firebaseConfig);
    
    auth = getAuth(app);
    
    db = getFirestore(app);
    
    storage = getStorage(app);
    
    return { app, auth, db, storage };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return { app: null, auth: null, db: null };
  }
};

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Function to fetch Google user profile information
const fetchGoogleUserProfile = async (accessToken: string) => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }
    
    const userInfo = await response.json();
    
    return {
      uid: userInfo.id,
      email: userInfo.email,
      displayName: userInfo.name,
      photoURL: userInfo.picture
    };
  } catch (error) {
    console.error('Error fetching Google user profile:', error);
    throw error;
  }
};

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
        
        // Fallback to Chrome identity authentication with real user profile
        try {
          // Fetch the user's actual Google profile
          const userProfile = await fetchGoogleUserProfile(token as string);
          
          await chrome.storage.local.set({ 
            googleAuthToken: token,
            userAuthenticated: true,
            authTimestamp: Date.now(),
            userProfile: userProfile
          });
          
          resolve(userProfile as any);
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
    const result = await chrome.storage.local.get(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userProfile']);
    
    if (result.userAuthenticated && result.googleAuthToken) {
      // Check if token is still valid (24 hours)
      const tokenAge = Date.now() - (result.authTimestamp || 0);
      if (tokenAge < 24 * 60 * 60 * 1000) {
        // Use stored user profile if available
        if (result.userProfile) {
          return result.userProfile as any;
        } else {
          // No user profile available
          return null;
        }
      } else {
        // Token expired, clear it
        await chrome.storage.local.remove(['userAuthenticated', 'googleAuthToken', 'authTimestamp', 'userProfile']);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
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
    
    if (!db) {
      throw new Error('Firebase Firestore database is not initialized');
    }
    
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
      timestamp: historyItem.timestamp || new Date().toISOString()
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
    
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error getting history from Firebase:', error);
    throw error;
  }
};

export const deleteHistoryFromFirebase = async (userId: string, historyId: string) => {
  try {
    const { db } = await initializeFirebase();
    if (!db) {
      throw new Error('Firebase not initialized');
    }
    
    const historyRef = doc(db, 'users', userId, 'history', historyId);
    await deleteDoc(historyRef);
  } catch (error) {
    console.error('Error deleting history from Firebase:', error);
    throw error;
  }
};

// Screenshot storage functions
export const uploadScreenshotToFirebase = async (userId: string, imageData: string, query: string): Promise<string> => {
  try {
    const { storage } = await initializeFirebase();
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }

    // Convert data URL to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `screenshots/${userId}/${timestamp}.png`;
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    // Store metadata in Firestore
    const { db } = await initializeFirebase();
    if (db) {
      const screenshotRef = doc(db, 'users', userId, 'screenshots', timestamp.toString());
      await setDoc(screenshotRef, {
        filename,
        downloadURL,
        query,
        timestamp,
        createdAt: new Date().toISOString()
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading screenshot to Firebase:', error);
    throw error;
  }
};

export const getScreenshotFromFirebase = async (downloadURL: string): Promise<string> => {
  try {
    // For now, just return the URL as the image data
    // In a more sophisticated implementation, you might want to fetch and convert to data URL
    return downloadURL;
  } catch (error) {
    console.error('Error getting screenshot from Firebase:', error);
    throw error;
  }
};

export { auth, db }; 