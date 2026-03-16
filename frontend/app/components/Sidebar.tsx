"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  FlaskConical,
  Shield,
  Activity,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/eval", label: "Evaluation", icon: FlaskConical },
  { href: "/policies", label: "Policies", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--surface-border)",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 0.875rem",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "1.75rem", paddingLeft: "0.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #14b8a6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={15} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
              AuditFlow
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
              EXPENSE AUDITOR
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase", padding: "0 0.5rem", marginBottom: "0.375rem" }}>
          Main
        </div>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link${active ? " active" : ""}`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          padding: "0.75rem",
          borderRadius: 8,
          background: "rgba(99, 102, 241, 0.06)",
          border: "1px solid rgba(99, 102, 241, 0.12)",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
          <span style={{ color: "var(--accent-indigo)" }}>●</span> Backend on{" "}
          <code style={{ fontSize: 10 }}>:8000</code>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
          OCR + LangChain pipeline
        </div>
      </div>
    </aside>
  );
}
