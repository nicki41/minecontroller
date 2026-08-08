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
