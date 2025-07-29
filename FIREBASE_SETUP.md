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

## Step 5: Database Structure

Your data will be organized in the following structure:

```
users/
├── {userId}/
│   ├── notes/
│   │   ├── {noteId}/
│   │   │   ├── id: string
│   │   │   ├── title: string
│   │   │   ├── content: string
│   │   │   ├── type: "text" | "todo"
│   │   │   ├── items: array (for todo lists)
│   │   │   ├── userId: string
│   │   │   └── updatedAt: timestamp
│   ├── settings/
│   │   └── userSettings/
│   │       ├── apiKey: string
│   │       ├── model: string
│   │       ├── aiContextConfig: object
│   │       ├── aiModelConfig: object
│   │       ├── userId: string
│   │       └── updatedAt: timestamp
│   └── history/
│       ├── {historyId}/
│       │   ├── id: string
│       │   ├── query: string
│       │   ├── response: string
│       │   ├── timestamp: timestamp
│       │   ├── userId: string
│       │   └── updatedAt: timestamp
```

## Step 6: Get Your Firebase Configuration

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

## Step 7: Update the Extension Configuration

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

## Step 8: Build and Test

1. Run `npm run build` to build the extension
2. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder
3. Test the authentication by clicking the extension icon and signing in with Google

## Data Structure Details

### Notes Collection
- **Path**: `users/{userId}/notes/{noteId}`
- **Fields**:
  - `id`: Unique note identifier
  - `title`: Note title
  - `content`: Note content (text or todo items)
  - `type`: "text" or "todo"
  - `items`: Array of todo items (for todo lists)
  - `userId`: User identifier
  - `updatedAt`: Last update timestamp

### Settings Collection
- **Path**: `users/{userId}/settings/userSettings`
- **Fields**:
  - `apiKey`: Perplexity API key
  - `model`: AI model selection
  - `aiContextConfig`: Context configuration
  - `aiModelConfig`: Model parameters
  - `userId`: User identifier
  - `updatedAt`: Last update timestamp

### History Collection
- **Path**: `users/{userId}/history/{historyId}`
- **Fields**:
  - `id`: Unique history identifier
  - `query`: User's original query
  - `response`: AI response
  - `timestamp`: When the interaction occurred
  - `userId`: User identifier
  - `updatedAt`: Last update timestamp

## Security Rules Explanation

The security rules ensure that:
- Users can only access their own data
- Authentication is required for all operations
- Data is organized by user ID for proper isolation
- No unauthorized access to other users' data

## Troubleshooting

### Common Issues:
1. **Authentication Errors**: Ensure Google sign-in is enabled in Firebase
2. **Permission Denied**: Check that security rules are published
3. **Database Not Found**: Verify Firestore is created in the correct location
4. **Configuration Errors**: Double-check your Firebase config values

### Testing Your Setup:
1. Sign in with Google in the extension
2. Create a test note
3. Check your Firebase console to see the data
4. Verify the data structure matches the expected format 