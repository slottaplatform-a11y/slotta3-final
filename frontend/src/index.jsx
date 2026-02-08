import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
// Temporarily disabled Sentry to debug white screen
// import * as Sentry from "@sentry/react";

// const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
// if (sentryDsn) {
//   Sentry.init({
//     dsn: sentryDsn,
//     environment: import.meta.env.MODE,
//     tracesSampleRate: 0.2,
//   });
// }

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found!</div>';
} else {
  console.log("Root element found, rendering app...");
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log("App rendered successfully");
  } catch (error) {
    console.error("Error rendering app:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Error: ${error.message}</div>`;
  }
}
