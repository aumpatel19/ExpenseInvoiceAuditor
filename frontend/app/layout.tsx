import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Expense & Invoice Auditor",
  description: "OCR-powered audit pipeline for invoices and expense receipts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
        <Sidebar />
        <main style={{ flex: 1, minHeight: "100vh", overflowY: "auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
