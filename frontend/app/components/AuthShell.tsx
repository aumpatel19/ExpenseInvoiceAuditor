"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, FileText, FlaskConical, Shield } from "lucide-react";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import LoginForm from "./LoginForm";

const NAV_LINKS = [
  { href: "/",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/upload",    label: "Upload",     icon: Upload },
  { href: "/documents", label: "Documents",  icon: FileText },
  { href: "/eval",      label: "Eval",       icon: FlaskConical },
  { href: "/policies",  label: "Policies",   icon: Shield },
];

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav style={{
      display: "flex",
      borderTop: "1px solid var(--border-light)",
      background: "var(--bg-panel)",
      flexShrink: 0,
    }}>
      {NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link key={href} href={href} style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: "10px 0 12px",
            textDecoration: "none",
            color: active ? "var(--accent)" : "var(--text-muted)",
            fontSize: 10,
            fontWeight: active ? 600 : 500,
            transition: "color 0.15s",
          }}>
            <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

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

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_username");
    setStatus("unauthed");
  };

  return (
    <>
      {/* Desktop layout */}
      <div className="desktop-shell app-shell" style={{ flex: 1, margin: "1.5rem", height: "calc(100vh - 3rem)", overflow: "hidden" }}>
        <TopNav onLogout={handleLogout} />
        <div className="app-body">
          <Sidebar />
          <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-panel)" }}>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="mobile-shell" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg-panel)" }}>
        <TopNav onLogout={handleLogout} />
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-panel)" }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  );
}
