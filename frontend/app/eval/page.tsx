"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type EvalRun } from "@/lib/api";
import { Play, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, BarChart2 } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import BackendError from "../components/BackendError";

function RingChart({ value, label, color, bgColor }: { value: number; label: string; color: string; bgColor: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ height: 110, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="58%" outerRadius="88%" data={[{ value: pct, fill: color }]} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: bgColor }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 18, fontWeight: 700, color }}>
          {pct}%
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
    </div>
  );
}

function EvalRunCard({ run, index }: { run: EvalRun; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(run.overall_accuracy * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 10, boxShadow: "var(--shadow-xs)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", padding: "1rem 1.125rem", display: "flex", alignItems: "center", gap: 12, background: "var(--bg-panel)", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        {expanded
          ? <ChevronDown size={14} color="var(--text-muted)" />
          : <ChevronRight size={14} color="var(--text-muted)" />}
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(run.created_at).toLocaleString()}</span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
          {run.total_samples} samples — {pct}% accuracy
        </span>
        <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 20, background: "var(--status-approved-bg)", color: "var(--status-approved-fg)", fontWeight: 600 }}>{run.passed} passed</span>
        <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 20, background: "var(--status-failed-bg)", color: "var(--status-failed-fg)", fontWeight: 600, marginLeft: 6 }}>{run.failed} failed</span>
        {run.avg_processing_time_ms && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{run.avg_processing_time_ms.toFixed(0)}ms avg</span>
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--border)" }}
          >
            <div style={{ padding: "1.125rem" }}>
              {run.results.map((r) => (
                <div key={r.sample_id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", background: r.passed ? "var(--status-approved-bg)" : "var(--status-failed-bg)" }}>
                  {r.passed ? <CheckCircle2 size={13} color="var(--status-approved-fg)" /> : <XCircle size={13} color="var(--status-failed-fg)" />}
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{r.description}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.passed ? "var(--status-approved-fg)" : "var(--status-flagged-fg)" }}>
                    {Math.round(r.field_accuracy * 100)}%
                  </span>
                </div>
              ))}
              {run.edge_cases.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Edge Cases</div>
                  {run.edge_cases.map((ec, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--status-review-fg)", padding: "0.375rem 0.875rem", background: "var(--status-review-bg)", borderRadius: "var(--radius-sm)", marginBottom: 4, border: "1px solid var(--status-review-bd)" }}>
                      → {ec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function EvalPage() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<EvalRun | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.listEvalRuns()
      .then((r) => { setRuns(r); if (r.length) setLatestRun(r[0]); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerRun = async () => {
    setRunning(true);
    try {
      const run = await api.triggerEval();
      setRuns((prev) => [run, ...prev]);
      setLatestRun(run);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eval failed");
    } finally {
      setRunning(false);
    }
  };

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
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: "2.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Quality</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Evaluation Harness</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 6 }}>Compare extraction results against ground truth samples</p>
        </div>
        <button className="btn btn-primary" onClick={triggerRun} disabled={running} style={{ gap: 8, padding: "0.65rem 1.375rem" }}>
          {running ? <Clock size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
          {running ? "Running…" : "Run Evaluation"}
        </button>
      </motion.div>

      {/* Latest run metrics */}
      {latestRun && (
        <motion.div className="card-elevated" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Latest Run</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{new Date(latestRun.created_at).toLocaleString()}</p>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
              <div style={{ padding: "0.375rem 0.875rem", borderRadius: 20, background: "var(--status-approved-bg)", color: "var(--status-approved-fg)", fontWeight: 600 }}>{latestRun.passed} passed</div>
              <div style={{ padding: "0.375rem 0.875rem", borderRadius: 20, background: "var(--status-failed-bg)", color: "var(--status-failed-fg)", fontWeight: 600 }}>{latestRun.failed} failed</div>
              <div style={{ padding: "0.375rem 0.875rem", borderRadius: 20, background: "var(--bg-subtle)", color: "var(--text-secondary)", fontWeight: 500 }}>{latestRun.total_samples} total</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
            <RingChart value={latestRun.overall_accuracy} label="Field Accuracy" color="var(--accent)" bgColor="var(--accent-light)" />
            <RingChart value={latestRun.validation_pass_rate} label="Pass Rate" color="var(--status-extracted-fg)" bgColor="var(--status-extracted-bg)" />
            <RingChart value={latestRun.total_samples > 0 ? latestRun.passed / latestRun.total_samples : 0} label="Sample Pass" color="var(--status-review-fg)" bgColor="var(--status-review-bg)" />
          </div>
        </motion.div>
      )}

      {/* Run history */}
      <motion.div className="card-elevated" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em", marginBottom: "1.25rem" }}>Run History</h2>
        {loading && <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>}
        {!loading && runs.length === 0 && (
          <div style={{ padding: "2.5rem", textAlign: "center" }}>
            <BarChart2 size={30} color="var(--text-muted)" style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No evaluation runs yet</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Run <code style={{ fontSize: 11 }}>python seed.py</code> to add ground truth samples, then click Run Evaluation.</div>
          </div>
        )}
        {runs.map((run, i) => <EvalRunCard key={run.run_id} run={run} index={i} />)}
      </motion.div>
    </div>
  );
}
