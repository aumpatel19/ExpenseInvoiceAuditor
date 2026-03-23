"use client";

import { useEffect, useState, useCallback } from "react";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import LoginForm from "./LoginForm";

interface Props {
  children: React.ReactNode;
}

export default function AuthShell({ children }: Props) {
  const [status, setStatus] = useState<"checking" | "authed" | "unauthed">("checking");

  const check = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    setStatus(token ? "authed" : "unauthed");
  }, []);

  useEffect(() => {
    check();
    // Re-check when tab regains focus (handles multi-tab logout)
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [check]);

  const handleLogin = useCallback((_token: string, _username: string) => {
    setStatus("authed");
  }, []);

  if (status === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
      </div>
    );
  }

  if (status === "unauthed") {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div
      className="app-shell"
      style={{ flex: 1, height: "calc(100vh - 3rem)", overflow: "hidden" }}
    >
      <TopNav onLogout={() => { localStorage.removeItem("auth_token"); localStorage.removeItem("auth_username"); setStatus("unauthed"); }} />
      <div className="app-body">
        <Sidebar />
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-panel)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
