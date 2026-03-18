"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type PolicyRule } from "@/lib/api";
import { Plus, Trash2, Shield, DollarSign, Globe, Calendar, AlertTriangle, X } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import BackendError from "../components/BackendError";

const RULE_ICONS: Record<string, React.ElementType> = {
  amount_threshold: DollarSign,
  currency_whitelist: Globe,
  weekend_expense: Calendar,
  future_date: AlertTriangle,
  duplicate_detection: Shield,
  missing_field: Shield,
  vendor_mismatch: Shield,
  custom: Shield,
};

const RULE_ICON_COLORS: Record<string, { bg: string; color: string }> = {
  amount_threshold: { bg: "var(--status-review-bg)",   color: "var(--status-review-fg)" },
  currency_whitelist:{ bg: "var(--status-extracted-bg)", color: "var(--status-extracted-fg)" },
  weekend_expense:  { bg: "var(--status-flagged-bg)",  color: "var(--status-flagged-fg)" },
  future_date:      { bg: "var(--status-failed-bg)",   color: "var(--status-failed-fg)" },
  duplicate_detection:{ bg: "var(--accent-light)",     color: "var(--accent)" },
  missing_field:    { bg: "var(--bg-subtle)",          color: "var(--text-muted)" },
  vendor_mismatch:  { bg: "var(--status-processing-bg)", color: "var(--status-processing-fg)" },
  custom:           { bg: "var(--bg-subtle)",          color: "var(--text-muted)" },
};

const RULE_TYPES = ["amount_threshold","currency_whitelist","weekend_expense","future_date","duplicate_detection","missing_field","vendor_mismatch","custom"];

function PolicyCard({ rule, onDelete, index }: { rule: PolicyRule; onDelete: () => void; index: number }) {
  const Icon = RULE_ICONS[rule.rule_type] ?? Shield;
  const iconStyle = RULE_ICON_COLORS[rule.rule_type] ?? { bg: "var(--bg-subtle)", color: "var(--text-muted)" };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.045 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10,
        padding: "1.125rem 1.25rem",
        background: "var(--bg-panel)", borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)",
        opacity: rule.enabled ? 1 : 0.55,
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      whileHover={{ boxShadow: "var(--shadow-sm)", y: -1 }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: iconStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(0,0,0,0.04)" }}>
        <Icon size={17} color={iconStyle.color} strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rule.name}</span>
          <StatusBadge status={rule.severity} />
          {!rule.enabled && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "2px 7px", borderRadius: 20, border: "1px solid var(--border)", fontWeight: 600 }}>Disabled</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.45 }}>{rule.description}</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
          <span style={{ background: "var(--bg-subtle)", borderRadius: 6, padding: "2px 8px", border: "1px solid var(--border)" }}>
            {rule.rule_type.replace(/_/g, " ")}
          </span>
          {rule.threshold != null && (
            <span>Threshold: <strong style={{ color: "var(--text-secondary)" }}>${rule.threshold.toLocaleString()}</strong></span>
          )}
          {rule.currency_whitelist && (
            <span>Currencies: <strong style={{ color: "var(--text-secondary)" }}>{rule.currency_whitelist.join(", ")}</strong></span>
          )}
        </div>
      </div>
      <button
        className="btn btn-ghost"
        onClick={onDelete}
        style={{ padding: "0.375rem", color: "var(--status-failed-fg)", opacity: 0.5, flexShrink: 0 }}
        title="Delete rule"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

export default function PoliciesPage() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", rule_type: "amount_threshold",
    enabled: true, threshold: "", currency_whitelist: "", severity: "medium",
  });

  const load = () => {
    setLoading(true); setError(null);
    api.listPolicies()
      .then(setRules)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    try { await api.deletePolicy(id); setRules((r) => r.filter((p) => p.rule_id !== id)); }
    catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = {
        name: form.name, description: form.description,
        rule_type: form.rule_type as PolicyRule["rule_type"],
        enabled: form.enabled, severity: form.severity,
        threshold: form.threshold ? parseFloat(form.threshold) : null,
        currency_whitelist: form.currency_whitelist ? form.currency_whitelist.split(",").map((s) => s.trim().toUpperCase()) : null,
      };
      const created = await api.createPolicy(body as Parameters<typeof api.createPolicy>[0]);
      setRules((r) => [...r, created]);
      setShowForm(false);
      setForm({ name: "", description: "", rule_type: "amount_threshold", enabled: true, threshold: "", currency_whitelist: "", severity: "medium" });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (error) {
    return (
      <div style={{ padding: "2.5rem" }}>
        <div className="card"><BackendError onRetry={load} /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2.5rem 2.5rem 4rem", maxWidth: 840 }}>
      {/* Heading */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", justifyContent: "space-between", marginBottom: "2.25rem", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Configuration</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>Policy Rules</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: 6 }}>Deterministic audit thresholds and constraints</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ gap: 7, padding: "0.65rem 1.25rem" }}>
          {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Rule</>}
        </button>
      </motion.div>

      {/* Add rule form */}
      {showForm && (
        <motion.form
          className="card-elevated"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          style={{ marginBottom: "1.75rem" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>New Policy Rule</h3>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ padding: "0.35rem" }}>
              <X size={15} color="var(--text-muted)" />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Name *</label>
              <input className="input" style={{ width: "100%" }} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Amount Threshold" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Rule Type *</label>
              <select className="input" style={{ width: "100%" }} value={form.rule_type} onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value }))}>
                {RULE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description *</label>
              <input className="input" style={{ width: "100%" }} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this rule check?" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Threshold ($)</label>
              <input className="input" style={{ width: "100%" }} type="number" value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="e.g. 1000" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Currencies</label>
              <input className="input" style={{ width: "100%" }} value={form.currency_whitelist} onChange={(e) => setForm((f) => ({ ...f, currency_whitelist: e.target.value }))} placeholder="USD,EUR,GBP" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Severity</label>
              <select className="input" style={{ width: "100%" }} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="enabled-check" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
              <label htmlFor="enabled-check" style={{ fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>Enable immediately</label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: "1.5rem", justifyContent: "flex-end", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Rule"}</button>
          </div>
        </motion.form>
      )}

      {/* Skeletons */}
      {loading && [...Array(3)].map((_, i) => (
        <div key={i} style={{ padding: "1.125rem 1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", background: "var(--bg-panel)", marginBottom: 10, display: "flex", gap: 14 }}>
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 13, width: "40%", marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 11, width: "65%" }} />
          </div>
        </div>
      ))}

      {/* Empty state */}
      {!loading && rules.length === 0 && !showForm && (
        <div style={{ padding: "3rem", textAlign: "center", background: "var(--bg-panel)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <Shield size={30} style={{ margin: "0 auto 12px", display: "block", opacity: 0.25 }} color="var(--text-muted)" />
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No policy rules yet</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Run <code style={{ fontSize: 11 }}>python seed.py</code> to load defaults, or click Add Rule.</div>
        </div>
      )}

      {/* Policy list */}
      {rules.map((rule, i) => (
        <PolicyCard key={rule.rule_id} rule={rule} onDelete={() => handleDelete(rule.rule_id)} index={i} />
      ))}
    </div>
  );
}
