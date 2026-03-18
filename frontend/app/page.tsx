"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, CheckCircle, AlertTriangle, Clock, Copy, Shield, Upload, RefreshCw, ArrowRight, TrendingUp } from "lucide-react";
import { api, type MetricsSummary, type DocumentListItem } from "@/lib/api";
import StatusBadge from "./components/StatusBadge";
import BackendError from "./components/BackendError";

// ─── Wave SVG component (decorative card background) ──────────────────────
function CardWave({ color }: { color: string }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", height: "62%", pointerEvents: "none", userSelect: "none" }}
      viewBox="0 0 300 80"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M 0 55 Q 50 25 100 50 Q 150 75 200 45 Q 250 20 300 40 L 300 80 L 0 80 Z" fill={color + "22"} />
      <path d="M 0 65 Q 50 42 100 60 Q 150 78 200 58 Q 250 38 300 53 L 300 80 L 0 80 Z" fill={color + "14"} />
    </svg>
  );
}

// ─── Metric card config ────────────────────────────────────────────────────
const METRIC_CONFIG = [
  { key: "total_documents",        label: "Total Documents",    icon: FileText,      iconBg: "#e8e4f4", iconColor: "#7c6ebe", wave: "#7c6ebe" },
  { key: "approved",               label: "Approved",           icon: CheckCircle,   iconBg: "#e6f5e8", iconColor: "#52a85e", wave: "#52a85e" },
  { key: "flagged",                label: "Flagged",            icon: AlertTriangle, iconBg: "#fde8e4", iconColor: "#d95a44", wave: "#d95a44" },
  { key: "needs_manual_review",    label: "Needs Review",       icon: Clock,         iconBg: "#fdf0db", iconColor: "#c48a1a", wave: "#c48a1a" },
  { key: "duplicate_count",        label: "Duplicates",         icon: Copy,          iconBg: "#f2ede6", iconColor: "#a08060", wave: "#a08060" },
  { key: "policy_violation_count", label: "Policy Violations",  icon: Shield,        iconBg: "#edf1f3", iconColor: "#7090a0", wave: "#7090a0" },
] as const;

// ─── Counter animation ─────────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, iconBg, iconColor, wave, delay }: {
  label: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; wave: string; delay: number;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!value) { setCount(0); return; }
    let n = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const id = setInterval(() => {
      n += step;
      if (n >= value) { setCount(value); clearInterval(id); }
      else setCount(n);
    }, 35);
    return () => clearInterval(id);
  }, [value]);

  return (
    <motion.div
      className="metric-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38, ease: "easeOut" }}
    >
      <CardWave color={wave} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {count.toLocaleString()}
          </div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={19} color={iconColor} strokeWidth={1.7} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: "", vendor: "", type: "" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [m, d] = await Promise.all([
        api.getMetrics(),
        api.listDocuments({ status: filter.status || undefined, vendor: filter.vendor || undefined, document_type: filter.type || undefined, limit: 50 }),
      ]);
      setMetrics(m);
      setDocuments(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="card"><BackendError onRetry={load} /></div>
      </div>
    );
  }

  const mv: Record<string, number> = metrics ? {
    total_documents:        metrics.total_documents,
    approved:               metrics.approved,
    flagged:                metrics.flagged,
    needs_manual_review:    metrics.needs_manual_review,
    duplicate_count:        metrics.duplicate_count,
    policy_violation_count: metrics.policy_violation_count,
  } : {};

  return (
    <div style={{ padding: "2rem 2rem 3rem" }}>
      {/* Page heading */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          Audit Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          Overview of all processed invoices and expense receipts
        </p>
      </motion.div>

      {/* Metric cards — 3 × 2 grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="metric-card" style={{ minHeight: 110 }}>
              <div className="skeleton" style={{ height: 12, width: "55%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 36, width: "38%" }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {METRIC_CONFIG.map((c, i) => (
            <MetricCard key={c.key} label={c.label} value={mv[c.key] ?? 0} icon={c.icon} iconBg={c.iconBg} iconColor={c.iconColor} wave={c.wave} delay={i * 0.05} />
          ))}
        </div>
      )}

      {/* Recent documents table card */}
      <motion.div
        className="card-elevated"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
      >
        {/* Table toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Recent Documents
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="input" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} style={{ width: 140 }}>
              <option value="">All Statuses</option>
              {["uploaded","processing","extracted","validation_failed","audited","needs_review","error"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select className="input" value={filter.type} onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))} style={{ width: 130 }}>
              <option value="">All Types...</option>
              <option value="invoice">Invoice</option>
              <option value="receipt">Receipt</option>
            </select>
            <Link href="/upload">
              <button className="btn btn-primary" style={{ gap: 7, paddingLeft: "1rem", paddingRight: "1.25rem" }}>
                <Upload size={13} strokeWidth={2} /> Upload
              </button>
            </Link>
            <button className="btn btn-ghost" onClick={load} style={{ padding: "0.45rem 0.75rem", color: "var(--text-muted)" }} title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflowX: "clip", overflowY: "clip" }}>
          <table className="audit-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>Loading…</td></tr>
              )}
              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem" }}>
                    <TrendingUp size={28} color="var(--text-muted)" style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>No documents yet</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Upload a file to get started</div>
                  </td>
                </tr>
              )}
              {documents.map((doc, i) => (
                <motion.tr key={doc.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <td>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>
                      {doc.filename.length > 26 ? doc.filename.slice(0, 23) + "…" : doc.filename}
                    </span>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>
                    {doc.document_type ?? <span style={{ color: "var(--text-muted)" }}>Unknown</span>}
                  </td>
                  <td>
                    {doc.vendor_name ?? <span style={{ color: "var(--text-muted)" }}>Unknown</span>}
                  </td>
                  <td style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>
                    {doc.total_amount != null ? `${doc.currency ?? "USD"} ${doc.total_amount.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {doc.invoice_date ?? new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <StatusBadge status={doc.status} />
                      <Link href={`/documents/${doc.id}`}>
                        <button className="btn btn-ghost" style={{ padding: "0.3rem 0.5rem", fontSize: 12, gap: 3 }}>
                          View <ArrowRight size={11} />
                        </button>
                      </Link>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
