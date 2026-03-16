"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <AlertTriangle size={24} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          {error.message?.includes("fetch")
            ? "Cannot connect to the backend. Make sure uvicorn is running on port 8000."
            : error.message || "An unexpected error occurred."}
        </p>
        <button className="btn btn-primary" onClick={reset}>
          <RefreshCw size={13} />
          Try Again
        </button>
      </div>
    </div>
  );
}
