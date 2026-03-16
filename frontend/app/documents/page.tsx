"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type DocumentListItem } from "@/lib/api";
import StatusBadge from "../components/StatusBadge";
import BackendError from "../components/BackendError";
import Link from "next/link";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: "", vendor: "", type: "" });

  const load = () => {
    setLoading(true);
    setError(null);
    api.listDocuments({
      status: filter.status || undefined,
      vendor: filter.vendor || undefined,
      document_type: filter.type || undefined,
      limit: 100,
    })
      .then(setDocuments)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: "1.5rem" }}>Documents</h1>
        <div className="card"><BackendError onRetry={load} /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Documents</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>All processed invoices and receipts</p>
      </motion.div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <select className="input" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} style={{ width: 160 }}>
          <option value="">All Statuses</option>
          {["uploaded","processing","extracted","validation_failed","audited","needs_review","error"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g," ")}</option>
          ))}
        </select>
        <select className="input" value={filter.type} onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))} style={{ width: 130 }}>
          <option value="">All Types</option>
          <option value="invoice">Invoice</option>
          <option value="receipt">Receipt</option>
        </select>
        <input className="input" placeholder="Search vendor…" value={filter.vendor} onChange={(e) => setFilter((f) => ({ ...f, vendor: e.target.value }))} style={{ width: 200 }} />
        <Link href="/upload">
          <button className="btn btn-primary" style={{ fontSize: 12 }}>+ Upload</button>
        </Link>
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="audit-table">
            <thead>
              <tr><th>File</th><th>Type</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Uploaded</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</td></tr>}
              {!loading && documents.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No documents found. Run <code style={{ fontSize: 11, color: "var(--accent-teal)" }}>python seed.py</code> or upload a file.
                </td></tr>
              )}
              {documents.map((doc, i) => (
                <motion.tr key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500, maxWidth: 200 }}>
                    <span title={doc.filename}>{doc.filename.length > 24 ? doc.filename.slice(0, 21) + "…" : doc.filename}</span>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{doc.document_type ?? "—"}</td>
                  <td>{doc.vendor_name ?? <span style={{ color: "var(--text-muted)" }}>Unknown</span>}</td>
                  <td>{doc.total_amount != null ? `${doc.currency ?? ""} ${doc.total_amount.toFixed(2)}` : "—"}</td>
                  <td>{doc.invoice_date ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(doc.created_at).toLocaleDateString()}</td>
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
