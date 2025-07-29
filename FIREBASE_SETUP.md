# Firebase Setup Guide for Orla Chrome Extension

This guide will help you set up Firebase authentication and Firestore database for the Orla Chrome extension.

## Prerequisites

- A Google account
- Basic knowledge of Firebase Console

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "orla-extension")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click on "Google" provider
5. Enable Google sign-in by toggling the switch
6. Add your authorized domain (for Chrome extensions, you can use `chrome-extension://`)
7. Click "Save"

## Step 3: Set up Firestore Database

1. In your Firebase project, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 4: Configure Security Rules

1. In Firestore Database, go to the "Rules" tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Your Firebase Configuration

1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "Orla Extension")
6. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 6: Update the Extension Configuration

1. Open `src/config/firebase.config.ts` in your project
2. Replace the placeholder values with your actual Firebase configuration:

```typescript
export const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Step 7: Build and Test

1. Run `npm run build` to build the extension
2. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder
3. Test the authentication by clicking the extension icon and signing in with Google

## Features Enabled

With Firebase integration, the extension now supports:

- **Google Authentication**: Users can sign in with their Google account
- **Cloud Data Storage**: Notes, settings, and history are stored in Firestore
- **Cross-Device Sync**: Data syncs across all devices where the user is signed in
- **User Profiles**: Display user information and sign-out functionality
- **Secure Data Access**: Users can only access their own data

## Data Structure

The Firestore database will be organized as follows:

```
users/
  {userId}/
    notes/
      {noteId}/
        - id: string
        - title: string
        - content: string
        - type: 'note' | 'todo'
        - userId: string
        - updatedAt: timestamp
    settings/
      userSettings/
        - apiKey: string
        - model: string
        - contextConfig: object
        - userId: string
        - updatedAt: timestamp
    history/
      {historyId}/
        - id: string
        - query: string
        - response: string
        - type: string
        - userId: string
        - createdAt: timestamp
```

## Troubleshooting

### Common Issues

1. **Authentication not working**: Make sure you've enabled Google sign-in in Firebase Console
2. **Database access denied**: Check that your Firestore security rules are correct
3. **Configuration errors**: Verify that your Firebase config values are correct
4. **CORS errors**: Ensure your authorized domains include `chrome-extension://`

### Security Considerations

- Never commit your Firebase API keys to version control
- Use environment variables for production deployments
- Regularly review and update your Firestore security rules
- Monitor your Firebase usage to stay within free tier limits

## Next Steps

Once Firebase is set up, you can:

1. Implement data migration from local storage to Firebase
2. Add offline support with Firebase offline persistence
3. Implement real-time data synchronization
4. Add user preferences and settings sync
5. Implement data backup and restore functionality

## Support

If you encounter any issues:

1. Check the Firebase Console for error logs
2. Verify your configuration values
3. Test with a simple Firebase app first
4. Consult the [Firebase Documentation](https://firebase.google.com/docs) 