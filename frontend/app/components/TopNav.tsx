"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Settings } from "lucide-react";
import SearchModal from "./SearchModal";
import SettingsModal from "./SettingsModal";
import ProfileModal from "./ProfileModal";

const NAV_TABS = [
  { href: "/",          label: "Dashboard" },
  { href: "/upload",    label: "Upload" },
  { href: "/documents", label: "Documents" },
  { href: "/eval",      label: "Evaluation" },
  { href: "/policies",  label: "Policies" },
];

interface Props {
  onLogout?: () => void;
}

export default function TopNav({ onLogout }: Props) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [initial, setInitial] = useState("?");

  useEffect(() => {
    const u = localStorage.getItem("auth_username") ?? "";
    setInitial(u[0]?.toUpperCase() ?? "?");
  }, []);

  return (
    <>
      <header className="top-nav">
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="AuditFlow Logo"
            style={{ width: 44, height: 44, objectFit: "contain", flexShrink: 0 }}
          />
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
          <button
            title="Search documents (Ctrl+K)"
            onClick={() => setSearchOpen(true)}
            style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Search size={16} strokeWidth={1.7} />
          </button>
          <button
            title="Settings"
            onClick={() => setSettingsOpen(true)}
            style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Settings size={16} strokeWidth={1.7} />
          </button>
          <div
            title="Profile"
            onClick={() => setProfileOpen(true)}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "var(--text-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
              flexShrink: 0, transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            {initial}
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onLogout={onLogout} />
    </>
  );
}
