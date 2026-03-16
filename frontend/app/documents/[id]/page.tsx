"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Copy, Download, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock, Zap, Bot } from "lucide-react";
import { api, type DocumentDetail, type AuditFinding, type ProcessingLog } from "@/lib/api";
import StatusBadge from "../../components/StatusBadge";

// ── JSON Viewer ────────────────────────────────────────────────────────────────
function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted_payload.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const colored = json
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "json-key" : "json-string";
      else if (/true|false/.test(match)) cls = "json-boolean";
      else if (/null/.test(match)) cls = "json-null";
      return `<span class="${cls}">${match}</span>`;
    });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "0.25rem 0.625rem" }} onClick={() => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          <Copy size={11} />{copied ? "Copied!" : "Copy"}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "0.25rem 0.625rem" }} onClick={download}>
          <Download size={11} />Download
        </button>
      </div>
      <div className="json-viewer" dangerouslySetInnerHTML={{ __html: colored }} style={{ maxHeight: 340, overflowY: "auto" }} />
    </div>
  );
}

// ── Finding Card ──────────────────────────────────────────────────────────────
function FindingCard({ finding }: { finding: AuditFinding }) {
  const [open, setOpen] = useState(false);
  const isLLM = finding.source === "llm_assisted";

  return (
    <div style={{ border: "1px solid var(--surface-border)", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: 10, background: "var(--surface-elevated)", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <StatusBadge status={finding.severity} />
        {isLLM
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", padding: "2px 6px", borderRadius: 4, background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}><Bot size={9} />AI-Assisted</span>
          : <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", padding: "2px 6px", borderRadius: 4, background: "rgba(20,184,166,0.1)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.2)" }}><Zap size={9} />Deterministic</span>
        }
        <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
          {finding.finding_type.replace(/_/g, " ")}
        </span>
        {finding.field_ref && <code style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface-border)", padding: "1px 5px", borderRadius: 3 }}>{finding.field_ref}</code>}
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ padding: "0.875rem 1rem", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, borderTop: "1px solid var(--surface-border)" }}>
          {finding.explanation}
        </div>
      )}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ logs }: { logs: ProcessingLog[] }) {
  return (
    <div style={{ padding: "0.25rem 0" }}>
      {logs.map((log, i) => {
        const dotClass =
          log.status === "success" || log.status === "done" ? "success"
          : log.status === "error" || log.status === "failed" ? "error"
          : log.status === "running" ? "running" : "warning";
        return (
          <motion.div
            key={i}
            className="timeline-item"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className={`timeline-dot ${dotClass}`}>
              {dotClass === "success" ? <CheckCircle2 size={10} />
                : dotClass === "error" ? <AlertCircle size={10} />
                : <Clock size={10} />}
            </div>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>{log.stage}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{log.message}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Verdict Banner ─────────────────────────────────────────────────────────────
function VerdictBanner({ status, confidence }: { status: string; confidence: number }) {
  const config: Record<string, { bg: string; border: string; color: string; label: string }> = {
    approved: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", color: "#10b981", label: "✓ Approved" },
    flagged: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: "#ef4444", label: "⚑ Flagged" },
    needs_manual_review: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "#f59e0b", label: "◉ Needs Manual Review" },
    rejected: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: "#ef4444", label: "✕ Rejected" },
  };
  const c = config[status] ?? config.needs_manual_review;
  return (
    <div style={{ padding: "1rem 1.25rem", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: c.color }}>{c.label}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Confidence: <strong style={{ color: c.color }}>{(confidence * 100).toFixed(0)}%</strong>
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"audit" | "json" | "logs">("audit");

  useEffect(() => {
    if (id) {
      api.getDocument(id).then(setData).catch(console.error).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        {[100, 60, 80, 40].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: i === 0 ? 28 : 16, width: `${w}%`, marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Document not found.</div>;
  }

  const doc = data.document as Record<string, unknown>;
  const audit = data.audit_result;
  const extracted = data.extracted_payload;
  const logs = data.processing_logs;

  return (
    <div style={{ padding: "2rem" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            {(doc.filename as string) ?? "Document"}
          </h1>
          <StatusBadge status={(doc.status as string) ?? ""} />
          {audit?.llm_used && (
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", fontWeight: 600 }}>
              <Bot size={9} style={{ display: "inline", marginRight: 3 }} />LLM Used
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--text-muted)" }}>
          <span>ID: <code style={{ fontSize: 11 }}>{id}</code></span>
          {Boolean(doc.vendor_name) && <span>Vendor: <strong style={{ color: "var(--text-secondary)" }}>{String(doc.vendor_name)}</strong></span>}
          {Boolean(doc.total_amount) && <span>Amount: <strong style={{ color: "var(--text-secondary)" }}>{String(doc.currency)} {(doc.total_amount as number).toFixed(2)}</strong></span>}
          {Boolean(audit?.processing_time_ms) && <span>Processed in {(audit?.processing_time_ms as number).toFixed(0)}ms</span>}
        </div>
      </motion.div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.25rem", alignItems: "start" }}>
        {/* Left: Metadata + Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <motion.div className="card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>Source Metadata</h3>
            <table style={{ width: "100%", fontSize: 12 }}>
              <tbody>
                {(
                  [
                    ["Filename", doc.filename],
                    ["Type", doc.document_type],
                    ["MIME", doc.mime_type],
                    ["Size", doc.file_size_bytes ? `${((doc.file_size_bytes as number) / 1024).toFixed(1)} KB` : "—"],
                    ["Uploaded", doc.created_at ? new Date(doc.created_at as string).toLocaleString() : "—"],
                    ["Retries", doc.retry_count],
                  ] as [string, unknown][]
                ).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color: "var(--text-muted)", paddingBottom: 7, paddingRight: 12, whiteSpace: "nowrap" }}>{k}</td>
                    <td style={{ color: "var(--text-secondary)", paddingBottom: 7 }}>{String(v ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <motion.div className="card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.875rem" }}>Processing Timeline</h3>
            {logs.length > 0 ? <Timeline logs={logs} /> : <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No logs available.</p>}
          </motion.div>
        </div>

        {/* Right: Audit Results */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
          {audit && <VerdictBanner status={audit.overall_status} confidence={audit.confidence} />}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--surface-border)", marginBottom: "1.25rem" }}>
            {(["audit", "json", "logs"] as const).map((tab) => (
              <button
                key={tab}
                className="btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  borderRadius: "7px 7px 0 0", border: "none", padding: "0.5rem 1rem",
                  background: activeTab === tab ? "var(--surface-elevated)" : "transparent",
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottom: activeTab === tab ? "2px solid var(--accent-indigo)" : "2px solid transparent",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                {tab === "audit" ? "Audit Findings" : tab === "json" ? "Extracted JSON" : "Validation"}
              </button>
            ))}
          </div>

          {activeTab === "audit" && audit && (
            <div>
              {audit.findings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: 13 }}>
                  <CheckCircle2 size={32} style={{ margin: "0 auto 0.75rem", color: "#10b981", display: "block" }} />
                  No findings — document passed all checks.
                </div>
              ) : (
                audit.findings.map((f) => <FindingCard key={f.finding_id} finding={f} />)
              )}
            </div>
          )}

          {activeTab === "json" && (
            <div>
              {extracted ? (
                <JsonViewer data={extracted} />
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No extracted payload available.</p>
              )}
              {audit?.validation_errors && audit.validation_errors.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Validation Errors</h4>
                  {audit.validation_errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#ef4444", padding: "0.3rem 0.6rem", borderRadius: 5, background: "rgba(239,68,68,0.07)", marginBottom: 4 }}>
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="card-elevated">
              <Timeline logs={logs} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
