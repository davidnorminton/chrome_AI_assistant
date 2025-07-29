// Firebase Configuration
// Replace these values with your Firebase project configuration
// You can find these values in your Firebase Console under Project Settings

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Instructions for setting up Firebase:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select an existing one
// 3. Enable Authentication and Firestore Database
// 4. In Authentication, enable Google sign-in method
// 5. In Project Settings, copy your config values
// 6. Replace the values above with your actual Firebase config
// 7. Set up Firestore security rules to allow authenticated users to read/write their own data

// Example Firestore Security Rules:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/ 