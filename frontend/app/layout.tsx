import type { Metadata } from "next";
import "./globals.css";
import AuthShell from "./components/AuthShell";

export const metadata: Metadata = {
  title: "AuditFlow — Expense & Invoice Auditor",
  description: "OCR-powered audit pipeline for invoices and expense receipts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
      }}>
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}
