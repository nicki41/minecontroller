import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          theme="dark"
          position="bottom-center"
          richColors
          closeButton
          gap={8}
          offset={{ bottom: "1.5rem" }}
          mobileOffset={{ bottom: "1rem" }}
          toastOptions={{ className: "!max-w-[calc(100vw-2rem)]" }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

// Fade out and remove the static splash overlay (see index.html) now that
// React has taken over the page. rAF twice: one to let the just-rendered
// tree actually paint before we start the fade, one more to be safe on
// browsers that batch the first frame with layout.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 220);
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
