"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type EvalRun } from "@/lib/api";
import { Play, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import BackendError from "../components/BackendError";

function RingChart({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ height: 100, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: pct, fill: color }]} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "var(--surface-elevated)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 16, fontWeight: 700, color }}>{pct}%</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function EvalRunCard({ run }: { run: EvalRun }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ border: "1px solid var(--surface-border)", borderRadius: 9, overflow: "hidden", marginBottom: 10 }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: "100%", padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: 10, background: "var(--surface-elevated)", border: "none", cursor: "pointer" }}>
        {expanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(run.created_at).toLocaleString()}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textAlign: "left" }}>{run.total_samples} samples — {Math.round(run.overall_accuracy * 100)}% accuracy</span>
        <span style={{ fontSize: 12, color: "#10b981" }}>{run.passed} passed</span>
        <span style={{ fontSize: 12, color: "#ef4444", marginLeft: 8 }}>{run.failed} failed</span>
        {run.avg_processing_time_ms && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{run.avg_processing_time_ms.toFixed(0)}ms avg</span>}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ padding: "1rem", overflow: "hidden" }}>
            {run.results.map((r) => (
              <div key={r.sample_id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {r.passed ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{r.description}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.passed ? "#10b981" : "#f59e0b" }}>{Math.round(r.field_accuracy * 100)}%</span>
              </div>
            ))}
            {run.edge_cases.length > 0 && (
              <div style={{ marginTop: "0.875rem" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Edge Cases</div>
                {run.edge_cases.map((ec, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#f59e0b", padding: "0.25rem 0.6rem", background: "rgba(245,158,11,0.07)", borderRadius: 5, marginBottom: 3 }}>→ {ec}</div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      console.error(e);
      setError(e instanceof Error ? e.message : "Eval failed");
    } finally {
      setRunning(false);
    }
  };

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: "1.5rem" }}>Evaluation Harness</h1>
        <div className="card"><BackendError onRetry={load} /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Evaluation Harness</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Compare extraction results against ground truth samples</p>
        </div>
        <button className="btn btn-primary" onClick={triggerRun} disabled={running}>
          {running ? <Clock size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />}
          {running ? "Running…" : "Run Evaluation"}
        </button>
      </motion.div>

      {latestRun && (
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 600 }}>Latest Run Metrics</h2>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(latestRun.created_at).toLocaleString()}</p>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span>{latestRun.total_samples} samples</span>
              <span style={{ color: "#10b981" }}>{latestRun.passed} passed</span>
              <span style={{ color: "#ef4444" }}>{latestRun.failed} failed</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <RingChart value={latestRun.overall_accuracy} label="Field Accuracy" color="var(--accent-indigo)" />
            <RingChart value={latestRun.validation_pass_rate} label="Pass Rate" color="var(--accent-teal)" />
            <RingChart value={latestRun.total_samples > 0 ? latestRun.passed / latestRun.total_samples : 0} label="Sample Pass" color="#f59e0b" />
          </div>
        </motion.div>
      )}

      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: "1rem" }}>Run History</h2>
        {loading && <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>}
        {!loading && runs.length === 0 && (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No eval runs yet. Run <code style={{ fontSize: 11, color: "var(--accent-teal)" }}>python seed.py</code> to add ground truth samples, then click <strong style={{ color: "var(--text-primary)" }}>Run Evaluation</strong>.
          </div>
        )}
        {runs.map((run) => <EvalRunCard key={run.run_id} run={run} />)}
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
