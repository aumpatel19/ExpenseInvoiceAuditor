"use client";

import { useEffect } from "react";
import { X, Settings, Server, Upload, ShieldCheck, Cpu, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTION = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: "1.5rem" }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>{title}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
  </div>
);

const ROW = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
    <div style={{ color: "var(--accent)", flexShrink: 0 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
    </div>
    <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace", background: "var(--bg-panel)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>{value}</div>
  </div>
);

export default function SettingsModal({ open, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

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
            style={{ width: "100%", maxWidth: 480, background: "var(--bg-panel)", borderRadius: "var(--radius-xl)", boxShadow: "0 24px 80px rgba(0,0,0,0.18)", overflow: "hidden", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Settings size={16} color="var(--accent)" />
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Settings</span>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", borderRadius: "50%", padding: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 20px 8px" }}>
              <SECTION title="API Configuration">
                <ROW icon={<Server size={14} />} label="API Base URL" value={apiUrl.replace("/api/v1", "")} />
                <ROW icon={<Globe size={14} />} label="Environment" value={process.env.NODE_ENV ?? "development"} />
              </SECTION>
              <SECTION title="Upload Limits">
                <ROW icon={<Upload size={14} />} label="Max File Size" value="20 MB" />
                <ROW icon={<Cpu size={14} />} label="Supported Formats" value="PDF, PNG, JPG" />
              </SECTION>
              <SECTION title="Audit Engine">
                <ROW icon={<ShieldCheck size={14} />} label="Deterministic Rules" value="8 active" />
                <ROW icon={<Cpu size={14} />} label="LLM-Assisted Checks" value="optional" />
                <ROW icon={<ShieldCheck size={14} />} label="Duplicate Detection" value="exact + fuzzy" />
              </SECTION>
            </div>

            <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border-light)" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                AuditFlow v1.0.0 — configuration is managed via <code style={{ fontFamily: "monospace", background: "var(--bg-subtle)", padding: "1px 4px", borderRadius: 3 }}>.env</code> files
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
