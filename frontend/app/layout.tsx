import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import TopNav from "./components/TopNav";

export const metadata: Metadata = {
  title: "AuditFlow — Expense & Invoice Auditor",
  description: "OCR-powered audit pipeline for invoices and expense receipts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        padding: "1.5rem",
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
      }}>
        <div
          className="app-shell"
          style={{ flex: 1, height: "calc(100vh - 3rem)", overflow: "hidden" }}
        >
          <TopNav />
          <div className="app-body">
            <Sidebar />
            <main style={{ flex: 1, overflowY: "auto", background: "var(--bg-panel)" }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
