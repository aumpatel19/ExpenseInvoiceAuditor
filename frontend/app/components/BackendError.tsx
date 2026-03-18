"use client";

import { AlertTriangle, RefreshCw, Server } from "lucide-react";

export default function BackendError({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", textAlign: "center", gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--status-review-bg)", border: "1px solid var(--status-review-bd)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Server size={22} color="var(--status-review-fg)" strokeWidth={1.6} />
      </div>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Backend Unavailable</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 340 }}>
          {message || (
            <>
              Cannot reach the API at <code style={{ fontSize: 11, background: "var(--bg-subtle)", padding: "1px 5px", borderRadius: 4 }}>localhost:8000</code>.
              <br />Start the backend with:
              <code style={{ display: "block", marginTop: 8, padding: "8px 12px", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", border: "1px solid var(--border)", fontSize: 11, textAlign: "left", color: "var(--status-extracted-fg)" }}>
                uvicorn main:app --reload --port 8000
              </code>
            </>
          )}
        </p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry} style={{ gap: 7 }}>
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
