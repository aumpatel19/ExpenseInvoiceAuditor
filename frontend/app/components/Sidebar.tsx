"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, FileText, FlaskConical, Shield } from "lucide-react";

const links = [
  { href: "/",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/upload",    label: "Upload",     icon: Upload },
  { href: "/documents", label: "Documents",  icon: FileText },
  { href: "/eval",      label: "Evaluation", icon: FlaskConical },
  { href: "/policies",  label: "Policies",   icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 210,
      flexShrink: 0,
      borderRight: "1px solid var(--border-light)",
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem 0.875rem",
      overflowY: "auto",
    }}>
      {/* Section label */}
      <div style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
        color: "var(--text-placeholder)", textTransform: "uppercase",
        padding: "0 0.5rem", marginBottom: "0.625rem",
      }}>
        Main
      </div>

      {/* Nav links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`}>
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user pill */}
      <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "var(--text-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#fff",
          cursor: "pointer",
        }}>
          A
        </div>
      </div>
    </aside>
  );
}
