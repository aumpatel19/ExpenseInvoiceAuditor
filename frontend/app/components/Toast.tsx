"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let _counter = 0;
type Listener = (t: Toast) => void;
const listeners: Listener[] = [];

export function showToast(message: string, type: ToastType = "success") {
  const toast: Toast = { id: ++_counter, message, type };
  listeners.forEach((fn) => fn(toast));
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
  }, []);

  useEffect(() => {
    listeners.push(add);
    return () => {
      const i = listeners.indexOf(add);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, [add]);

  return toasts;
}

export function ToastContainer() {
  const toasts = useToasts();

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem",
      display: "flex", flexDirection: "column", gap: 8, zIndex: 9999,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-lg)",
          background: t.type === "success" ? "var(--status-approved-bg)" : "var(--status-failed-bg)",
          border: `1px solid ${t.type === "success" ? "var(--status-approved-bd)" : "var(--status-failed-bd)"}`,
          boxShadow: "var(--shadow-md)",
          fontSize: 13, fontWeight: 500,
          color: t.type === "success" ? "var(--status-approved-fg)" : "var(--status-failed-fg)",
          minWidth: 240, maxWidth: 360,
          pointerEvents: "auto",
          animation: "toast-in 0.2s ease",
        }}>
          {t.type === "success"
            ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
            : <AlertCircle size={15} style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
