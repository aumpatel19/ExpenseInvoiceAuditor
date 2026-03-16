"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type PolicyRule } from "@/lib/api";
import { Plus, Trash2, Shield, DollarSign, Globe, Calendar, AlertTriangle } from "lucide-react";
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

const RULE_TYPES = ["amount_threshold","currency_whitelist","weekend_expense","future_date","duplicate_detection","missing_field","vendor_mismatch","custom"];

function PolicyCard({ rule, onDelete }: { rule: PolicyRule; onDelete: () => void }) {
  const Icon = RULE_ICONS[rule.rule_type] ?? Shield;
  return (
    <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: rule.enabled ? "rgba(99,102,241,0.12)" : "var(--surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--surface-border)" }}>
        <Icon size={16} color={rule.enabled ? "var(--accent-indigo)" : "var(--text-muted)"} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rule.name}</span>
          <StatusBadge status={rule.severity} />
          {!rule.enabled && <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface-elevated)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--surface-border)" }}>Disabled</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{rule.description}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>Type: <code style={{ fontSize: 11 }}>{rule.rule_type.replace(/_/g," ")}</code></span>
          {rule.threshold != null && <span>Threshold: <strong style={{ color: "var(--text-secondary)" }}>${rule.threshold.toLocaleString()}</strong></span>}
          {rule.currency_whitelist && <span>Currencies: <strong style={{ color: "var(--text-secondary)" }}>{rule.currency_whitelist.join(", ")}</strong></span>}
        </div>
      </div>
      <button className="btn btn-ghost" onClick={onDelete} style={{ padding: "0.375rem", color: "#ef4444", opacity: 0.6 }} title="Delete rule">
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
    setLoading(true);
    setError(null);
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
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        rule_type: form.rule_type as PolicyRule["rule_type"],
        enabled: form.enabled,
        severity: form.severity,
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
      <div style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: "1.5rem" }}>Policy Rules</h1>
        <div className="card"><BackendError onRetry={load} /></div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 760 }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.75rem", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Policy Rules</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Deterministic audit thresholds and constraints</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={13} />{showForm ? "Cancel" : "Add Rule"}
        </button>
      </motion.div>

      {showForm && (
        <motion.form className="card" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: "1rem" }}>New Policy Rule</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Name *</label>
              <input className="input" style={{ width: "100%" }} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Amount Threshold" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Rule Type *</label>
              <select className="input" style={{ width: "100%" }} value={form.rule_type} onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value }))}>
                {RULE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Description *</label>
              <input className="input" style={{ width: "100%" }} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does this rule check?" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Threshold ($)</label>
              <input className="input" style={{ width: "100%" }} type="number" value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} placeholder="e.g. 1000" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Currencies (comma-separated)</label>
              <input className="input" style={{ width: "100%" }} value={form.currency_whitelist} onChange={(e) => setForm((f) => ({ ...f, currency_whitelist: e.target.value }))} placeholder="USD,EUR,GBP" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Severity</label>
              <select className="input" style={{ width: "100%" }} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="enabled" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
              <label htmlFor="enabled" style={{ fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>Enabled</label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: "1.25rem", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Rule"}</button>
          </div>
        </motion.form>
      )}

      {loading && [...Array(3)].map((_, i) => (
        <div key={i} className="card" style={{ marginBottom: 10 }}>
          <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: "70%" }} />
        </div>
      ))}

      {!loading && rules.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)", fontSize: 13 }}>
          <Shield size={28} style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.3 }} />
          No policy rules yet.{" "}
          Run <code style={{ fontSize: 11, color: "var(--accent-teal)" }}>python seed.py</code> to load defaults, or click <strong style={{ color: "var(--text-primary)" }}>Add Rule</strong>.
        </div>
      )}

      {rules.map((rule) => (
        <PolicyCard key={rule.rule_id} rule={rule} onDelete={() => handleDelete(rule.rule_id)} />
      ))}
    </div>
  );
}
