"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText, CheckCircle, AlertTriangle, Clock, Copy, Shield, Upload, RefreshCw,
} from "lucide-react";
import { api, type MetricsSummary, type DocumentListItem } from "@/lib/api";
import StatusBadge from "./components/StatusBadge";
import BackendError from "./components/BackendError";

function MetricCard({
  label, value, icon: Icon, color, delay,
}: {
  label: string; value: number; icon: React.ElementType; color: string; delay: number;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (value === 0) { setCount(0); return; }
    let start = 0;
    const timer = setInterval(() => {
      start += Math.ceil(value / 20);
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, 35);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div className="metric-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35, ease: "easeOut" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", marginTop: 6, letterSpacing: "-0.02em" }}>{count.toLocaleString()}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color="white" />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: "", vendor: "", type: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, d] = await Promise.all([
        api.getMetrics(),
        api.listDocuments({
          status: filter.status || undefined,
          vendor: filter.vendor || undefined,
          document_type: filter.type || undefined,
          limit: 50,
        }),
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

  const metricCards = metrics ? [
    { label: "Total Documents", value: metrics.total_documents, icon: FileText, color: "rgba(99,102,241,0.7)" },
    { label: "Approved", value: metrics.approved, icon: CheckCircle, color: "rgba(16,185,129,0.7)" },
    { label: "Flagged", value: metrics.flagged, icon: AlertTriangle, color: "rgba(239,68,68,0.7)" },
    { label: "Needs Review", value: metrics.needs_manual_review, icon: Clock, color: "rgba(245,158,11,0.7)" },
    { label: "Duplicates", value: metrics.duplicate_count, icon: Copy, color: "rgba(239,68,68,0.55)" },
    { label: "Policy Violations", value: metrics.policy_violation_count, icon: Shield, color: "rgba(245,158,11,0.55)" },
  ] : [];

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: "1.5rem" }}>Audit Dashboard</h1>
        <div className="card">
          <BackendError onRetry={load} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem 2rem 3rem" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Audit Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Overview of all processed invoices and expense receipts</p>
        </div>
        <button className="btn btn-ghost" onClick={load} title="Refresh" style={{ padding: "0.4rem" }}>
          <RefreshCw size={14} />
        </button>
      </motion.div>

      {/* Metrics */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="metric-card">
              <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 32, width: "40%" }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {metricCards.map((c, i) => <MetricCard key={c.label} {...c} delay={i * 0.06} />)}
        </div>
      )}

      {/* Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Recent Documents</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className="input" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} style={{ width: 140 }}>
              <option value="">All Statuses</option>
              {["uploaded","processing","extracted","validation_failed","audited","needs_review","error"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g," ")}</option>
              ))}
            </select>
            <select className="input" value={filter.type} onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))} style={{ width: 120 }}>
              <option value="">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="receipt">Receipt</option>
            </select>
            <input className="input" placeholder="Search vendor…" value={filter.vendor} onChange={(e) => setFilter((f) => ({ ...f, vendor: e.target.value }))} style={{ width: 160 }} />
            <Link href="/upload">
              <button className="btn btn-primary"><Upload size={13} />Upload</button>
            </Link>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="audit-table">
            <thead>
              <tr><th>File</th><th>Type</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</td></tr>
              )}
              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                    No documents found.{" "}
                    <code style={{ fontSize: 11, color: "var(--accent-teal)" }}>python seed.py</code>{" "}
                    to add demo data, or upload a file.
                  </td>
                </tr>
              )}
              {documents.map((doc, i) => (
                <motion.tr key={doc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <td><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{doc.filename.length > 28 ? doc.filename.slice(0, 25) + "…" : doc.filename}</span></td>
                  <td style={{ textTransform: "capitalize" }}>{doc.document_type ?? "—"}</td>
                  <td>{doc.vendor_name ?? <span style={{ color: "var(--text-muted)" }}>Unknown</span>}</td>
                  <td>{doc.total_amount != null ? `${doc.currency ?? ""} ${doc.total_amount.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td>{doc.invoice_date ?? "—"}</td>
                  <td><StatusBadge status={doc.status} /></td>
                  <td>
                    <Link href={`/documents/${doc.id}`}>
                      <button className="btn btn-ghost" style={{ padding: "0.3rem 0.6rem", fontSize: 12 }}>View →</button>
                    </Link>
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
