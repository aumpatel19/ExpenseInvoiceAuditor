"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type DocumentListItem } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    api.listDocuments({ vendor: q, limit: 8 })
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); if (!open) onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const go = (id: string) => { router.push(`/documents/${id}`); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(26,23,20,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "10vh",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 560,
              background: "var(--bg-panel)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)",
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          >
            {/* Input row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by vendor name or filename…"
                style={{
                  flex: 1, border: "none", outline: "none",
                  background: "transparent", fontSize: 14,
                  color: "var(--text-primary)", fontFamily: "inherit",
                }}
              />
              {query && (
                <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                  <X size={14} />
                </button>
              )}
              <kbd style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "inherit" }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {loading && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Searching…</div>
              )}
              {!loading && query && results.length === 0 && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No documents found for &quot;{query}&quot;</div>
              )}
              {!loading && !query && (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Type to search documents…</div>
              )}
              {results.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => go(doc.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                    borderBottom: "1px solid var(--border-light)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={15} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {doc.vendor_name ?? "Unknown vendor"} · {doc.document_type ?? "—"} · {doc.status.replace(/_/g, " ")}
                    </div>
                  </div>
                  <ArrowRight size={13} color="var(--text-muted)" />
                </button>
              ))}
            </div>

            {results.length > 0 && (
              <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)" }}>
                {results.length} result{results.length !== 1 ? "s" : ""} — click to open
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
