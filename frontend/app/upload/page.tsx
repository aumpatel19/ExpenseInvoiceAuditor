"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";

type Step = "idle" | "uploading" | "processing" | "done" | "error";

const PIPELINE_STEPS = [
  { key: "uploaded", label: "Uploaded" },
  { key: "ocr", label: "OCR Extraction" },
  { key: "extracted", label: "Field Extraction" },
  { key: "validation", label: "Schema Validation" },
  { key: "audit", label: "Audit Rules" },
  { key: "audited", label: "Complete" },
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
        setTimeout(() => router.push(`/documents/${id}`), 800);
      }
    }, 900);
  }, [router]);

  const handleFile = useCallback(async (file: File) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setError("Unsupported file type. Please upload a PDF, PNG or JPG.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File too large. Maximum size is 20MB.");
      return;
    }
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
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div style={{ padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Upload Document</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          PDF invoices or JPG/PNG expense receipts — up to 20MB
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === "idle" || step === "error" ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              htmlFor="file-input"
              style={{
                display: "block",
                border: `2px dashed ${dragOver ? "var(--accent-indigo)" : "var(--surface-border)"}`,
                borderRadius: 14,
                padding: "3.5rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                background: dragOver ? "rgba(99,102,241,0.06)" : "var(--surface)",
              }}
            >
              <input id="file-input" type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={onInputChange} />
              <motion.div animate={{ y: dragOver ? -6 : 0 }} transition={{ type: "spring", stiffness: 300 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                  <Upload size={24} color="var(--accent-indigo)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                  {dragOver ? "Drop to upload" : "Drop a file or click to browse"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  PDF · PNG · JPG · JPEG — max 20MB
                </div>
              </motion.div>
            </label>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", gap: 8, alignItems: "center" }}
              >
                <X size={14} color="#ef4444" />
                <span style={{ fontSize: 13, color: "#ef4444" }}>{error}</span>
              </motion.div>
            )}

            {/* File type hints */}
            <div style={{ marginTop: "1.5rem", display: "flex", gap: 10 }}>
              {[["application/pdf", "Invoice PDF"], ["image/png", "Receipt PNG"], ["image/jpeg", "Receipt JPG"]].map(([, label]) => (
                <div key={label} style={{ flex: 1, padding: "0.75rem", borderRadius: 8, background: "var(--surface-elevated)", border: "1px solid var(--surface-border)", textAlign: "center" }}>
                  <FileText size={16} color="var(--text-muted)" style={{ margin: "0 auto 4px" }} />
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
              <FileText size={18} color="var(--accent-indigo)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{fileName}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {step === "uploading" ? "Uploading…" : step === "processing" ? "Running audit pipeline…" : "Complete"}
                </div>
              </div>
            </div>

            {/* Pipeline steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PIPELINE_STEPS.map((s, i) => {
                const done = i < pipelineStep;
                const active = i === pipelineStep && step === "processing";
                return (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(99,102,241,0.15)" : "var(--surface-elevated)",
                      border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(99,102,241,0.3)" : "var(--surface-border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {done ? <CheckCircle size={13} color="#10b981" /> : active ? <Loader2 size={13} color="var(--accent-indigo)" style={{ animation: "spin 1s linear infinite" }} /> : null}
                    </div>
                    <span style={{ fontSize: 13, color: done ? "var(--text-primary)" : active ? "var(--accent-indigo)" : "var(--text-muted)", fontWeight: done || active ? 500 : 400 }}>
                      {s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {docId && (
              <div style={{ marginTop: "1.25rem", padding: "0.625rem 0.875rem", borderRadius: 7, background: "var(--surface-elevated)", border: "1px solid var(--surface-border)" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Document ID: </span>
                <code style={{ fontSize: 11, color: "var(--accent-teal)" }}>{docId}</code>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
