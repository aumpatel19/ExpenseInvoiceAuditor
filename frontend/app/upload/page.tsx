"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, X, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

const PIPELINE_STEPS = [
  { key: "uploaded",   label: "File Received"     },
  { key: "ocr",        label: "OCR Extraction"    },
  { key: "extracted",  label: "Field Extraction"  },
  { key: "validation", label: "Schema Validation" },
  { key: "audit",      label: "Audit Rules"       },
  { key: "done",       label: "Complete"          },
];

// Backend statuses that end polling
const TERMINAL = new Set(["audited", "needs_review", "error", "validation_failed"]);

// Map backend document status → which pipeline step index is currently active
// pipelineStep=N means steps 0..N-1 are done, step N is active
const STATUS_TO_STEP: Record<string, number> = {
  uploaded:          1,
  processing:        1,
  extracted:         3,
  audited:           6,
  needs_review:      6,
  validation_failed: -1,
  error:             -1,
};

type FileEntry = {
  id: string;
  file: File;
  docId: string | null;
  docStatus: string;
  pipelineStep: number; // 0-6; -1 = error
  uploadError: string | null;
};

export default function UploadPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Use a ref so the polling interval closure always sees the latest entries
  const entriesRef = useRef<FileEntry[]>([]);
  entriesRef.current = entries;

  // Single long-lived polling interval — checks all active docs every 2 s
  useEffect(() => {
    const interval = setInterval(async () => {
      const active = entriesRef.current.filter(
        (e) => e.docId && !TERMINAL.has(e.docStatus) && e.docStatus !== "queued"
      );
      if (active.length === 0) return;

      const results = await Promise.allSettled(
        active.map(async (e) => ({
          docId: e.docId!,
          status: (await api.getDocumentStatus(e.docId!)).status,
        }))
      );

      const updates = results
        .filter((r): r is PromiseFulfilledResult<{ docId: string; status: string }> => r.status === "fulfilled")
        .map((r) => r.value);

      if (updates.length === 0) return;

      setEntries((prev) =>
        prev.map((entry) => {
          const u = updates.find((x) => x.docId === entry.docId);
          if (!u) return entry;
          const newStep = STATUS_TO_STEP[u.status];
          return {
            ...entry,
            docStatus: u.status,
            pipelineStep:
              newStep === undefined
                ? entry.pipelineStep
                : newStep < 0
                ? -1
                : Math.max(entry.pipelineStep, newStep),
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []); // empty deps — interval lives for the life of the page

  const processFiles = useCallback(
    async (rawFiles: File[]) => {
      const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);

      const valid: File[] = [];
      const newEntries: FileEntry[] = rawFiles.map((file) => {
        const err = !allowed.has(file.type)
          ? "Unsupported type. Use PDF, PNG, or JPG."
          : file.size > 20 * 1024 * 1024
          ? "File too large. Max 20 MB."
          : null;
        if (!err) valid.push(file);
        return {
          id: crypto.randomUUID(),
          file,
          docId: null,
          docStatus: err ? "error" : "queued",
          pipelineStep: err ? -1 : 0,
          uploadError: err,
        };
      });

      setEntries((prev) => [...prev, ...newEntries]);
      if (valid.length === 0) return;

      setUploading(true);
      try {
        if (valid.length === 1) {
          const res = await api.uploadDocument(valid[0]);
          setEntries((prev) =>
            prev.map((e) =>
              e.file === valid[0]
                ? { ...e, docId: res.document_id, docStatus: "uploaded", pipelineStep: 1 }
                : e
            )
          );
        } else {
          const res = await api.uploadDocumentsBatch(valid);
          setEntries((prev) =>
            prev.map((e) => {
              const idx = valid.indexOf(e.file);
              if (idx === -1) return e;
              const r = res.documents[idx];
              if (!r || r.status === "error") {
                return { ...e, docStatus: "error", pipelineStep: -1, uploadError: r?.error ?? "Upload failed." };
              }
              return { ...e, docId: r.document_id, docStatus: "uploaded", pipelineStep: 1 };
            })
          );
        }
      } catch (err) {
        setEntries((prev) =>
          prev.map((e) =>
            valid.includes(e.file)
              ? { ...e, docStatus: "error", pipelineStep: -1, uploadError: err instanceof Error ? err.message : "Upload failed." }
              : e
          )
        );
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) processFiles(files);
    },
    [processFiles]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) {
        processFiles(files);
        e.target.value = "";
      }
    },
    [processFiles]
  );

  return (
    <div style={{ padding: "2.5rem", maxWidth: 700, margin: "0 auto" }}>
      {/* Heading */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2.25rem" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          New Document
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Upload Documents</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 6 }}>
          PDF invoices or JPG / PNG receipts — up to 20 MB · max 10 files at once
        </p>
      </motion.div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        htmlFor="file-input"
        style={{
          display: "block",
          border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-xl)",
          padding: entries.length > 0 ? "1.75rem 2rem" : "4rem 2rem",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          background: dragOver ? "var(--accent-bg)" : "var(--bg-panel)",
          boxShadow: dragOver ? "0 0 0 4px rgba(201,151,58,0.10)" : "var(--shadow-sm)",
          marginBottom: "1.25rem",
        }}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          style={{ display: "none" }}
          onChange={onInputChange}
          disabled={uploading}
        />
        <motion.div animate={{ y: dragOver ? -6 : 0 }} transition={{ type: "spring", stiffness: 320 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: dragOver ? "var(--accent-light)" : "var(--bg-subtle)", border: `1px solid ${dragOver ? "var(--border-strong)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <Upload size={22} color={dragOver ? "var(--accent)" : "var(--text-muted)"} strokeWidth={1.6} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            {dragOver ? "Release to upload" : entries.length > 0 ? "Drop more files or click to add" : "Drop files or click to browse"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            PDF · PNG · JPG · JPEG &nbsp;·&nbsp; Max 20 MB each · up to 10 files
          </div>
        </motion.div>
      </label>

      {/* File entry cards */}
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const isErr = entry.pipelineStep === -1;
          const isDone = TERMINAL.has(entry.docStatus) && !isErr;
          const isProcessing = !isErr && !isDone;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ marginBottom: "0.875rem" }}
              className="card-elevated"
            >
              {/* Row: icon + name + action */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isErr || (isDone && !entry.docId) ? 0 : "0.875rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: isErr ? "var(--status-failed-bg)" : isDone ? "var(--status-approved-bg)" : "var(--accent-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isErr
                    ? <AlertCircle size={16} color="var(--status-failed-fg)" />
                    : isDone
                    ? <CheckCircle size={16} color="var(--status-approved-fg)" />
                    : <FileText size={16} color="var(--accent)" strokeWidth={1.7} />
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.file.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    {(entry.file.size / 1024).toFixed(0)} KB
                    {!isErr && entry.docStatus !== "queued" && ` · ${entry.docStatus.replace(/_/g, " ")}`}
                  </div>
                </div>

                {isProcessing && entry.docId && (
                  <Loader2 size={15} color="var(--accent)" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                )}
                {isDone && entry.docId && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, gap: 4, padding: "0.3rem 0.625rem", flexShrink: 0 }}
                    onClick={() => router.push(`/documents/${entry.docId}`)}
                  >
                    View <ArrowRight size={11} />
                  </button>
                )}
                {isErr && (
                  <X size={14} color="var(--status-failed-fg)" style={{ flexShrink: 0 }} />
                )}
              </div>

              {/* Error message */}
              {isErr && entry.uploadError && (
                <div style={{ fontSize: 12, color: "var(--status-failed-fg)", padding: "0.5rem 0.75rem", background: "var(--status-failed-bg)", borderRadius: "var(--radius-md)", marginTop: 4 }}>
                  {entry.uploadError}
                </div>
              )}

              {/* Pipeline stepper (only when we have a docId and no fatal error) */}
              {entry.docId && !isErr && (
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                  {PIPELINE_STEPS.map((s, i) => {
                    const done = i < entry.pipelineStep;
                    const active = i === entry.pipelineStep;
                    return (
                      <div
                        key={s.key}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "0.3rem 0.625rem",
                          borderRadius: "var(--radius-sm)",
                          background: active ? "var(--accent-bg)" : done ? "var(--status-approved-bg)" : "transparent",
                          border: `1px solid ${active ? "rgba(201,151,58,0.25)" : done ? "var(--status-approved-bd)" : "var(--border)"}`,
                          opacity: !done && !active ? 0.45 : 1,
                          transition: "all 0.25s ease",
                        }}
                      >
                        {done
                          ? <CheckCircle size={10} color="var(--status-approved-fg)" />
                          : active
                          ? <Loader2 size={10} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
                          : <span style={{ width: 10, height: 10, fontSize: 9, color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                        }
                        <span style={{ fontSize: 11, fontWeight: done || active ? 600 : 400, color: done ? "var(--status-approved-fg)" : active ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Clear completed */}
      {entries.length > 0 && entries.every((e) => TERMINAL.has(e.docStatus) || e.pipelineStep === -1) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: "0.5rem" }}>
          <button className="btn btn-ghost" onClick={() => setEntries([])} style={{ fontSize: 12 }}>
            Clear all · upload more
          </button>
        </motion.div>
      )}
    </div>
  );
}
