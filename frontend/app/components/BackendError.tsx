"use client";

import { RefreshCw, Server } from "lucide-react";

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
              Cannot reach the backend API.
              <br />Please check your connection or try again shortly.
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
