import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

// Initialize services and providers
import "./services";

import App from "./App";
import Home from "./routes/home";
import Welcome from "./routes/welcome";
import Settings from "./routes/settings";
import History from "./routes/history";
import Help from "./routes/help";
import NotesIndex from "./routes/notes";
import NoteEditor from "./routes/note-editor";
import FirebaseSetup from "./routes/firebase-setup";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "welcome", element: <Welcome /> },
      { path: "settings", element: <Settings /> },
      { path: "history", element: <History /> },
      { path: "help", element: <Help /> },
      { path: "notes", element: <NotesIndex /> },
      { path: "notes/create", element: <NoteEditor /> },
      { path: "notes/:noteId", element: <NoteEditor /> },
      { path: "firebase-setup", element: <FirebaseSetup /> },
    ],
  },
],
{
  basename: "/sidebar.html",
}
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);