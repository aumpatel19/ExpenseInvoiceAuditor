"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type DocumentListItem } from "@/lib/api";
import StatusBadge from "../components/StatusBadge";
import BackendError from "../components/BackendError";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight, TrendingUp } from "lucide-react";

const PAGE_SIZE = 20;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: "", vendor: "", type: "" });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = (pageNum = 0) => {
    setLoading(true);
    setError(null);
    api.listDocuments({
      status: filter.status || undefined,
      vendor: filter.vendor || undefined,
      document_type: filter.type || undefined,
      limit: PAGE_SIZE + 1,
      skip: pageNum * PAGE_SIZE,
    })
      .then((data) => {
        setHasMore(data.length > PAGE_SIZE);
        setDocuments(data.slice(0, PAGE_SIZE));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(0); load(0); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ padding: "2.5rem" }}>
        <div className="card"><BackendError onRetry={load} /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2.5rem 2.5rem 4rem" }}>
      {/* Heading */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "2.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Records</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Documents</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 6 }}>All processed invoices and receipts</p>
        </div>
        <Link href="/upload">
          <button className="btn btn-primary" style={{ padding: "0.6rem 1.25rem" }}>+ Upload Document</button>
        </Link>
      </motion.div>

      {/* Filters bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.4rem 0.6rem 0.4rem 0.875rem", borderRadius: "var(--radius-md)", background: "var(--bg-panel)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)", flex: 1, maxWidth: 220 }}>
          <Search size={13} color="var(--text-muted)" />
          <input
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text-primary)", width: "100%", fontFamily: "inherit" }}
            placeholder="Search vendor…"
            value={filter.vendor}
            onChange={(e) => setFilter((f) => ({ ...f, vendor: e.target.value }))}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SlidersHorizontal size={13} color="var(--text-muted)" />
        </div>
        <select className="input" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} style={{ width: 160, fontSize: 12 }}>
          <option value="">All Statuses</option>
          {["uploaded","processing","extracted","validation_failed","audited","needs_review","error"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g," ")}</option>
          ))}
        </select>
        <select className="input" value={filter.type} onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))} style={{ width: 132, fontSize: 12 }}>
          <option value="">All Types</option>
          <option value="invoice">Invoice</option>
          <option value="receipt">Receipt</option>
        </select>
        {(filter.status || filter.vendor || filter.type) && (
          <button className="btn btn-ghost" onClick={() => setFilter({ status: "", vendor: "", type: "" })} style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </span>
      </motion.div>

      {/* Table card */}
      <motion.div className="card-elevated" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <table className="audit-table">
            <thead>
              <tr><th>File</th><th>Type</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Uploaded</th><th>Status</th><th style={{ width: 60 }}></th></tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>Loading…</td></tr>
              )}
              {!loading && documents.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3.5rem" }}>
                    <TrendingUp size={30} color="var(--text-muted)" style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No documents found</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Try adjusting your filters or upload a new file.</div>
                  </td>
                </tr>
              )}
              {documents.map((doc, i) => (
                <motion.tr key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}>
                  <td>
                    <span title={doc.filename} style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>
                      {doc.filename.length > 24 ? doc.filename.slice(0, 21) + "…" : doc.filename}
                    </span>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{doc.document_type ?? "—"}</td>
                  <td>{doc.vendor_name ?? <span style={{ color: "var(--text-muted)" }}>Unknown</span>}</td>
                  <td style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>
                    {doc.total_amount != null ? `${doc.currency ?? ""} ${doc.total_amount.toFixed(2)}` : "—"}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{doc.invoice_date ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12 }}>{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td><StatusBadge status={doc.status} /></td>
                  <td>
                    <Link href={`/documents/${doc.id}`}>
                      <button className="btn btn-ghost" style={{ padding: "0.3rem 0.625rem", fontSize: 12, gap: 4 }}>
                        View <ArrowRight size={11} />
                      </button>
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: "1.25rem" }}>
          <button
            className="btn btn-ghost"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Page {page + 1}</span>
          <button
            className="btn btn-ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            style={{ fontSize: 12, opacity: !hasMore ? 0.4 : 1 }}
          >
            Next →
          </button>
        </motion.div>
      )}
    </div>
  );
}
