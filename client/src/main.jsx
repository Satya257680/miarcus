import React from "react";
import ReactDOM from "react-dom/client";
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