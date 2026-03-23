"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, User, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface Props {
  onLogin: (token: string, username: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export default function LoginForm({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Invalid username or password.");
        return;
      }
      const data = await res.json();
      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("auth_username", data.username);
      onLogin(data.access_token, data.username);
    } catch {
      setError("Cannot connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "var(--bg-page)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ width: "100%", maxWidth: 400 }}
      >
        {/* Logo + branding */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "var(--bg-panel)", border: "2px solid var(--border)", boxShadow: "var(--shadow-md)", marginBottom: 16 }}>
            <img src="/logo.png" alt="AuditFlow" style={{ width: 40, height: 40, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>AuditFlow</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Expense & Invoice Auditor</p>
        </div>

        {/* Card */}
        <div style={{ background: "var(--bg-panel)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          <div style={{ padding: "24px 28px 0" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Sign in to your account</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>Enter your credentials to access the audit dashboard</p>
          </div>

          <form onSubmit={submit} style={{ padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Username */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Username</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: "var(--radius-md)", border: `1.5px solid ${error ? "var(--status-flagged-bd)" : "var(--border)"}`, background: "var(--bg-subtle)", transition: "border-color 0.15s" }}
                onFocus={() => {}} >
                <User size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: "var(--text-primary)", padding: "10px 0", fontFamily: "inherit" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Password</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: "var(--radius-md)", border: `1.5px solid ${error ? "var(--status-flagged-bd)" : "var(--border)"}`, background: "var(--bg-subtle)" }}>
                <Lock size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: "var(--text-primary)", padding: "10px 0", fontFamily: "inherit" }}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 2 }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--status-flagged-bg)", border: "1px solid var(--status-flagged-bd)", fontSize: 12, color: "var(--status-flagged-fg)", display: "flex", alignItems: "center", gap: 7 }}>
                <ShieldCheck size={13} style={{ flexShrink: 0 }} />
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.7rem", fontSize: 14, fontWeight: 600, justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-muted)" }}>
          Protected system — authorised users only
        </p>
      </motion.div>
    </div>
  );
}
