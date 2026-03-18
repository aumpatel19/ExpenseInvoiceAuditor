"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, X, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

type Step = "idle" | "uploading" | "processing" | "done" | "error";

const PIPELINE_STEPS = [
  { key: "uploaded",   label: "File uploaded",         desc: "Secure upload confirmed" },
  { key: "ocr",        label: "OCR Extraction",         desc: "Converting document to text" },
  { key: "extracted",  label: "Field Extraction",       desc: "Identifying key fields" },
  { key: "validation", label: "Schema Validation",      desc: "Checking data integrity" },
  { key: "audit",      label: "Audit Rules",            desc: "Running policy checks" },
  { key: "audited",    label: "Complete",               desc: "Document ready to review" },
];

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [docId, setDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState(0);

  const simulatePipeline = useCallback((id: string) => {
    setPipelineStep(0);
    let i = 1;
    const timer = setInterval(() => {
      setPipelineStep(i);
      i++;
      if (i >= PIPELINE_STEPS.length) {
        clearInterval(timer);
        setTimeout(() => router.push(`/documents/${id}`), 900);
      }
    }, 900);
  }, [router]);

  const handleFile = useCallback(async (file: File) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) { setError("Unsupported file type. Please upload a PDF, PNG or JPG."); return; }
    if (file.size > 20 * 1024 * 1024) { setError("File too large. Maximum size is 20 MB."); return; }
    setFileName(file.name);
    setError(null);
    setStep("uploading");
    try {
      const res = await api.uploadDocument(file);
      setDocId(res.document_id);
      setStep("processing");
      simulatePipeline(res.document_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setStep("error");
    }
  }, [simulatePipeline]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div style={{ padding: "2.5rem", maxWidth: 680, margin: "0 auto" }}>
      {/* Heading */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2.25rem" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          New Document
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Upload Document</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 6 }}>
          PDF invoices or JPG / PNG expense receipts — up to 20 MB
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === "idle" || step === "error" ? (
          <motion.div key="dropzone" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
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
                padding: "4rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: dragOver ? "var(--accent-bg)" : "var(--bg-panel)",
                boxShadow: dragOver ? "0 0 0 4px rgba(201,151,58,0.10)" : "var(--shadow-sm)",
              }}
            >
              <input id="file-input" type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={onInputChange} />
              <motion.div animate={{ y: dragOver ? -8 : 0 }} transition={{ type: "spring", stiffness: 320 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: dragOver ? "var(--accent-light)" : "var(--bg-subtle)",
                  border: `1px solid ${dragOver ? "var(--border-strong)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem"
                }}>
                  <Upload size={26} color={dragOver ? "var(--accent)" : "var(--text-muted)"} strokeWidth={1.6} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                  {dragOver ? "Release to upload" : "Drop a file or click to browse"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  PDF · PNG · JPG · JPEG &nbsp;·&nbsp; Max 20 MB
                </div>
              </motion.div>
            </label>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: "1rem", padding: "0.875rem 1rem", borderRadius: "var(--radius-md)", background: "var(--status-failed-bg)", border: "1px solid var(--status-failed-bd)", display: "flex", gap: 8, alignItems: "center" }}
              >
                <X size={14} color="var(--status-failed-fg)" />
                <span style={{ fontSize: 13, color: "var(--status-failed-fg)" }}>{error}</span>
              </motion.div>
            )}

            {/* Format hints */}
            <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {[["Invoice PDF", "application/pdf"], ["Receipt PNG", "image/png"], ["Receipt JPG", "image/jpeg"]].map(([label]) => (
                <div key={label} style={{ padding: "0.875rem", borderRadius: "var(--radius-lg)", background: "var(--bg-panel)", border: "1px solid var(--border)", textAlign: "center", boxShadow: "var(--shadow-xs)" }}>
                  <FileText size={17} color="var(--text-muted)" style={{ margin: "0 auto 6px" }} strokeWidth={1.6} />
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="progress" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card-elevated">
            {/* File info row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem", padding: "1rem 1.125rem", borderRadius: "var(--radius-lg)", background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={18} color="var(--accent)" strokeWidth={1.7} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {step === "uploading" ? "Uploading to server…" : step === "processing" ? "Running audit pipeline…" : "Complete"}
                </div>
              </div>
              {step === "processing" && <Loader2 size={16} color="var(--accent)" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />}
            </div>

            {/* Pipeline steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {PIPELINE_STEPS.map((s, i) => {
                const done = i < pipelineStep;
                const active = i === pipelineStep && step === "processing";
                return (
                  <motion.div key={s.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)", background: active ? "var(--accent-bg)" : done ? "var(--status-approved-bg)" : "transparent", border: `1px solid ${active ? "rgba(201,151,58,0.25)" : done ? "var(--status-approved-bd)" : "transparent"}`, transition: "all 0.3s ease" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: done ? "var(--status-approved-bg)" : active ? "var(--accent-light)" : "var(--bg-subtle)", border: `1px solid ${done ? "var(--status-approved-bd)" : active ? "rgba(201,151,58,0.35)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {done ? <CheckCircle size={13} color="var(--status-approved-fg)" /> : active ? <Loader2 size={13} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} /> : <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{i + 1}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: done || active ? 600 : 400, color: done ? "var(--status-approved-fg)" : active ? "var(--accent)" : "var(--text-muted)" }}>{s.label}</div>
                      {active && <div style={{ fontSize: 11, color: "var(--accent)", opacity: 0.75, marginTop: 1 }}>{s.desc}</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {docId && (
              <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Document ID:</span>
                <code style={{ fontSize: 11, color: "var(--accent)", flex: 1, wordBreak: "break-all" }}>{docId}</code>
                <ArrowRight size={12} color="var(--text-muted)" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
