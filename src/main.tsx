import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import App from "./App";
import Home from "./routes/home";
import Settings from "./routes/settings";
import History from "./routes/history";
import Help from "./routes/help";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "settings", element: <Settings /> },
      { path: "history", element: <History /> },
      { path: "help", element: <Help /> },
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