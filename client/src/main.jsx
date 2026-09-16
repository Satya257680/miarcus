import React from "react";
import ReactDOM from "react-dom/client";

// Imported first, before anything else, purely for its side
// effect: it attaches the "beforeinstallprompt" listener as early
// as this script starts running. The browser can fire that event
// at any point after load, and it only ever fires once per page
// load — so whichever page/component the user is on when they
// click "Install", the native one-click prompt is already
// captured and ready to go instead of falling back to manual
// "open your browser menu" instructions. See
// hooks/useInstallPrompt.js and utils/installPromptStore.js.
import "./utils/installPromptStore";

import "./axiosConfig";
import App from "./App";
import "./index.css";
import registerServiceWorker from "./registerServiceWorker";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Enables the "Install App" option (below the sidebar and on the
// login page) by letting the browser register the PWA service
// worker. Installing is entirely optional for every user.
registerServiceWorker();