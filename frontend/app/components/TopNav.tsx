"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Settings, Activity } from "lucide-react";

const NAV_TABS = [
  { href: "/",          label: "Dashboard" },
  { href: "/upload",    label: "Upload" },
  { href: "/documents", label: "Documents" },
  { href: "/eval",      label: "Evaluation" },
  { href: "/policies",  label: "Policies" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="top-nav">
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent) 0%, #e8b84b 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(201,151,58,0.30)", flexShrink: 0,
        }}>
          <Activity size={16} color="white" strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.15, letterSpacing: "-0.01em" }}>AuditFlow</div>
          <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.09em", fontWeight: 600, textTransform: "uppercase" }}>EXPENSE AUDITOR</div>
        </div>
      </div>

      {/* Center nav tabs */}
      <nav style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, justifyContent: "center" }}>
        {NAV_TABS.map(({ href, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`top-nav-tab${active ? " active" : ""}`}>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right utility icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Search size={16} strokeWidth={1.7} />
        </button>
        <button style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Settings size={16} strokeWidth={1.7} />
        </button>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "var(--text-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
          flexShrink: 0,
        }}>
          A
        </div>
      </div>
    </header>
  );
}
