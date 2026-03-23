"use client";

import { useEffect, useState } from "react";
import { X, User, FileText, CheckCircle, AlertTriangle, Clock, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type MetricsSummary } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: Props) {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);

  useEffect(() => {
    if (open) {
      api.getMetrics().then(setMetrics).catch(() => null);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,23,20,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 400, background: "var(--bg-panel)", borderRadius: "var(--radius-xl)", boxShadow: "0 24px 80px rgba(0,0,0,0.18)", overflow: "hidden", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 16px 0" }}>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", borderRadius: "50%", padding: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                <X size={16} />
              </button>
            </div>

            {/* Avatar + info */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 24px 24px", gap: 10 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff" }}>
                A
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Aum</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Senior Auditor · AuditFlow</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "var(--status-approved-bg)", border: "1px solid var(--status-approved-bd)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--status-approved-fg)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--status-approved-fg)" }}>Active</span>
              </div>
            </div>

            {/* Stats */}
            {metrics && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--border)" }}>
                {[
                  { icon: <FileText size={14} />, label: "Total Docs", value: metrics.total_documents },
                  { icon: <CheckCircle size={14} />, label: "Approved", value: metrics.approved },
                  { icon: <AlertTriangle size={14} />, label: "Flagged", value: metrics.flagged },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ background: "var(--bg-panel)", padding: "14px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div style={{ color: "var(--accent)" }}>{icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                <User size={14} color="var(--text-muted)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Account</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>aum@auditflow.local</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                <Clock size={14} color="var(--text-muted)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Session</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Started {new Date().toLocaleDateString()}</div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "none", border: "1px solid var(--border)", cursor: "pointer", width: "100%", marginTop: 2, transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <LogOut size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
