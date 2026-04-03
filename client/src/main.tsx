import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        className: "!rounded-2xl !text-sm !font-semibold !bg-white !text-slate-800 !shadow-[0_14px_34px_rgba(15,23,42,0.18)] !border !border-slate-100",
        duration: 2600,
        success: {
          iconTheme: { primary: "#059669", secondary: "#fff" },
        },
        error: {
          iconTheme: { primary: "#e11d48", secondary: "#fff" },
        },
      }}
    />
  </React.StrictMode>
);
