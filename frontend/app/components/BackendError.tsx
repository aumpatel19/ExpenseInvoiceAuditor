"use client";

import { AlertTriangle, RefreshCw, Server } from "lucide-react";

export default function BackendError({
  onRetry,
  message,
}: {
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 2rem",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Server size={22} color="#f59e0b" />
      </div>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
          Backend Unavailable
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 340 }}>
          {message || (
            <>
              Cannot reach the API at <code style={{ fontSize: 11 }}>localhost:8000</code>.
              <br />
              Start the backend with:
              <br />
              <code
                style={{
                  display: "block",
                  marginTop: 8,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--surface-border)",
                  fontSize: 11,
                  textAlign: "left",
                  color: "var(--accent-teal)",
                }}
              >
                uvicorn main:app --reload --port 8000
              </code>
            </>
          )}
        </p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}
