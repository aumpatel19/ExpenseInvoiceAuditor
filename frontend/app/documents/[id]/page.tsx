"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Copy, Download, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock, Zap, Bot, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api, type DocumentDetail, type AuditFinding, type ProcessingLog } from "@/lib/api";
import StatusBadge from "../../components/StatusBadge";

// ── JSON Viewer ──────────────────────────────────────────────────────────────
function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "extracted_payload.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const colored = json
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
      let cls = "json-number";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "json-key" : "json-string";
      else if (/true|false/.test(match)) cls = "json-boolean";
      else if (/null/.test(match)) cls = "json-null";
      return `<span class="${cls}">${match}</span>`;
    });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 8 }}>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "0.25rem 0.75rem", gap: 5 }}
          onClick={() => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          <Copy size={11} />{copied ? "Copied!" : "Copy"}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "0.25rem 0.75rem", gap: 5 }} onClick={download}>
          <Download size={11} />Download
        </button>
      </div>
      <div className="json-viewer" dangerouslySetInnerHTML={{ __html: colored }} style={{ maxHeight: 340, overflowY: "auto" }} />
    </div>
  );
}

// ── Finding Card ─────────────────────────────────────────────────────────────
function FindingCard({ finding }: { finding: AuditFinding }) {
  const [open, setOpen] = useState(false);
  const isLLM = finding.source === "llm_assisted";

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 8, boxShadow: "var(--shadow-xs)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "0.875rem 1.125rem", display: "flex", alignItems: "center", gap: 10, background: "var(--bg-panel)", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <StatusBadge status={finding.severity} />
        {isLLM
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "var(--status-processing-bg)", color: "var(--status-processing-fg)", border: "1px solid var(--status-processing-bd)" }}><Bot size={9} />AI</span>
          : <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "var(--status-extracted-bg)", color: "var(--status-extracted-fg)", border: "1px solid var(--status-extracted-bd)" }}><Zap size={9} />Rule</span>
        }
        <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 600, textTransform: "capitalize" }}>
          {finding.finding_type.replace(/_/g, " ")}
        </span>
        {finding.field_ref && (
          <code style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: 5, border: "1px solid var(--border)" }}>
            {finding.field_ref}
          </code>
        )}
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ padding: "0.875rem 1.125rem", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
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
          <motion.div key={i} className="timeline-item" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <div className={`timeline-dot ${dotClass}`}>
              {dotClass === "success" ? <CheckCircle2 size={10} /> : dotClass === "error" ? <AlertCircle size={10} /> : <Clock size={10} />}
            </div>
            <div style={{ paddingBottom: 2 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>{log.stage}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>{log.message}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Verdict Banner ────────────────────────────────────────────────────────────
function VerdictBanner({ status, confidence }: { status: string; confidence: number }) {
  const config: Record<string, { bg: string; border: string; color: string; label: string }> = {
    approved:           { bg: "var(--status-approved-bg)",    border: "var(--status-approved-bd)",    color: "var(--status-approved-fg)",    label: "✓ Approved" },
    flagged:            { bg: "var(--status-flagged-bg)",     border: "var(--status-flagged-bd)",     color: "var(--status-flagged-fg)",     label: "⚑ Flagged" },
    needs_manual_review:{ bg: "var(--status-review-bg)",      border: "var(--status-review-bd)",      color: "var(--status-review-fg)",      label: "◉ Needs Manual Review" },
    rejected:           { bg: "var(--status-failed-bg)",      border: "var(--status-failed-bd)",      color: "var(--status-failed-fg)",      label: "✕ Rejected" },
  };
  const c = config[status] ?? config.needs_manual_review;
  return (
    <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius-lg)", background: c.bg, border: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
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
      <div style={{ padding: "2.5rem" }}>
        {[100, 55, 75, 40].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: i === 0 ? 28 : 14, width: `${w}%`, marginBottom: 16, borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "2.5rem", color: "var(--text-muted)", fontSize: 14 }}>
        Document not found.
      </div>
    );
  }

  const doc = data.document as Record<string, unknown>;
  const audit = data.audit_result;
  const extracted = data.extracted_payload;
  const logs = data.processing_logs;

  return (
    <div style={{ padding: "2.5rem 2.5rem 4rem" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem" }}>
        <Link href="/documents">
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "0.35rem 0.75rem", gap: 5, marginBottom: "1.25rem", color: "var(--text-muted)" }}>
            <ArrowLeft size={12} /> Back to Documents
          </button>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            {(doc.filename as string) ?? "Document"}
          </h1>
          <StatusBadge status={(doc.status as string) ?? ""} />
          {audit?.llm_used && (
            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "var(--status-processing-bg)", color: "var(--status-processing-fg)", border: "1px solid var(--status-processing-bd)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Bot size={9} />LLM Used
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--text-muted)", marginTop: 8, flexWrap: "wrap" }}>
          <span>ID: <code style={{ fontSize: 11, background: "var(--bg-subtle)", padding: "1px 5px", borderRadius: 4 }}>{id}</code></span>
          {Boolean(doc.vendor_name) && <span>Vendor: <strong style={{ color: "var(--text-secondary)" }}>{String(doc.vendor_name)}</strong></span>}
          {Boolean(doc.total_amount) && <span>Amount: <strong style={{ color: "var(--text-secondary)" }}>{String(doc.currency)} {(doc.total_amount as number).toFixed(2)}</strong></span>}
          {Boolean(audit?.processing_time_ms) && <span>Processed in {(audit?.processing_time_ms as number).toFixed(0)} ms</span>}
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.25rem", alignItems: "start" }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Metadata */}
          <motion.div className="card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "1rem" }}>Source Metadata</h3>
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
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
                  <tr key={k} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ color: "var(--text-muted)", padding: "0.55rem 0.875rem 0.55rem 0", whiteSpace: "nowrap", width: "40%", fontWeight: 500 }}>{k}</td>
                    <td style={{ color: "var(--text-secondary)", padding: "0.55rem 0", wordBreak: "break-all" }}>{String(v ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Timeline */}
          <motion.div className="card" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "1rem" }}>Processing Timeline</h3>
            {logs.length > 0 ? <Timeline logs={logs} /> : <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No logs available.</p>}
          </motion.div>
        </div>

        {/* Right: Audit panel */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
          {audit && <VerdictBanner status={audit.overall_status} confidence={audit.confidence} />}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
            {(["audit", "json", "logs"] as const).map((tab) => (
              <button
                key={tab}
                className="btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                  border: "none",
                  padding: "0.55rem 1.125rem",
                  background: activeTab === tab ? "var(--bg-panel)" : "transparent",
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottom: activeTab === tab ? `2px solid var(--accent)` : "2px solid transparent",
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {tab === "audit" ? "Audit Findings" : tab === "json" ? "Extracted JSON" : "Validation"}
              </button>
            ))}
          </div>

          {/* Audit findings */}
          {activeTab === "audit" && audit && (
            <div>
              {audit.findings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem", background: "var(--status-approved-bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--status-approved-bd)" }}>
                  <CheckCircle2 size={32} style={{ margin: "0 auto 10px", display: "block" }} color="var(--status-approved-fg)" />
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--status-approved-fg)" }}>No findings — document passed all checks.</div>
                </div>
              ) : (
                audit.findings.map((f) => <FindingCard key={f.finding_id} finding={f} />)
              )}
            </div>
          )}

          {/* JSON tab */}
          {activeTab === "json" && (
            <div>
              {extracted ? (
                <JsonViewer data={extracted} />
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No extracted payload available.</p>
              )}
              {audit?.validation_errors && audit.validation_errors.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.625rem" }}>Validation Errors</h4>
                  {audit.validation_errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--status-failed-fg)", padding: "0.4rem 0.875rem", borderRadius: "var(--radius-sm)", background: "var(--status-failed-bg)", border: "1px solid var(--status-failed-bd)", marginBottom: 4 }}>
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logs tab */}
          {activeTab === "logs" && (
            <div className="card-warm">
              <Timeline logs={logs} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
