import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "./context/ToastContext";
import "./index.css";
import App from "./App.jsx";

if (import.meta.env.DEV) {
  const originalInfo = console.info.bind(console);
  console.info = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Download the React DevTools for a better development experience")
    ) {
      return;
    }

    originalInfo(...args);
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
