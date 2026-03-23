const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_username");
  window.location.reload();
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "uploaded" | "processing" | "extracted"
  | "validation_failed" | "audited" | "needs_review" | "error";

export type DocumentType = "invoice" | "receipt";

export type AuditStatus = "approved" | "flagged" | "needs_manual_review" | "rejected";

export type FindingSeverity = "low" | "medium" | "high";

export type FindingSource = "deterministic" | "llm_assisted";

export interface DocumentListItem {
  id: string;
  filename: string;
  status: DocumentStatus;
  document_type: DocumentType | null;
  vendor_name: string | null;
  total_amount: number | null;
  currency: string | null;
  invoice_date: string | null;
  created_at: string;
}

export interface AuditFinding {
  finding_id: string;
  finding_type: string;
  severity: FindingSeverity;
  source: FindingSource;
  explanation: string;
  field_ref: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditResult {
  document_id: string;
  overall_status: AuditStatus;
  confidence: number;
  findings: AuditFinding[];
  extracted_snapshot: Record<string, unknown> | null;
  validation_errors: string[];
  llm_used: boolean;
  created_at: string;
  processing_time_ms: number | null;
}

export interface ProcessingLog {
  document_id: string;
  timestamp: string;
  stage: string;
  status: string;
  message: string;
  details: Record<string, unknown>;
}

export interface DocumentDetail {
  document: Record<string, unknown>;
  extracted_payload: Record<string, unknown> | null;
  audit_result: AuditResult | null;
  processing_logs: ProcessingLog[];
}

export interface MetricsSummary {
  total_documents: number;
  by_status: Record<string, number>;
  approved: number;
  flagged: number;
  needs_manual_review: number;
  rejected: number;
  validation_failed: number;
  duplicate_count: number;
  policy_violation_count: number;
}

export interface EvalRunResult {
  sample_id: string;
  description: string;
  field_accuracy: number;
  passed: boolean;
  failure_reason: string | null;
  field_results: Array<{
    field_name: string;
    expected: unknown;
    actual: unknown;
    match: boolean;
    note: string | null;
  }>;
}

export interface EvalRun {
  run_id: string;
  created_at: string;
  total_samples: number;
  passed: number;
  failed: number;
  overall_accuracy: number;
  validation_pass_rate: number;
  avg_processing_time_ms: number | null;
  results: EvalRunResult[];
  edge_cases: string[];
  notes: string | null;
}

export interface PolicyRule {
  rule_id: string;
  name: string;
  description: string;
  rule_type: string;
  enabled: boolean;
  threshold: number | null;
  currency_whitelist: string[] | null;
  severity: string;
  created_at: string;
  updated_at: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export const api = {
  // Metrics
  getMetrics: () => apiFetch<MetricsSummary>("/metrics/summary"),

  // Documents
  listDocuments: (params?: {
    status?: string;
    vendor?: string;
    document_type?: string;
    limit?: number;
    skip?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.vendor) qs.set("vendor", params.vendor);
    if (params?.document_type) qs.set("document_type", params.document_type);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.skip) qs.set("skip", String(params.skip));
    return apiFetch<DocumentListItem[]>(`/documents?${qs}`);
  },

  getDocument: (id: string) => apiFetch<DocumentDetail>(`/documents/${id}`),

  getAuditResult: (id: string) => apiFetch<AuditResult>(`/documents/${id}/audit`),

  uploadDocument: async (file: File): Promise<{ document_id: string; status: string; message: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) { handleUnauthorized(); throw new Error("Session expired."); }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  // Eval
  triggerEval: () =>
    apiFetch<EvalRun>("/eval/run", { method: "POST", body: JSON.stringify({}) }),

  listEvalRuns: () => apiFetch<EvalRun[]>("/eval/runs"),

  // Policies
  listPolicies: () => apiFetch<PolicyRule[]>("/policies"),

  createPolicy: (body: Omit<PolicyRule, "rule_id" | "created_at" | "updated_at">) =>
    apiFetch<PolicyRule>("/policies", { method: "POST", body: JSON.stringify(body) }),

  updatePolicy: (
    id: string,
    body: Omit<PolicyRule, "rule_id" | "created_at" | "updated_at">
  ) =>
    apiFetch<PolicyRule>(`/policies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deletePolicy: (id: string) =>
    apiFetch<{ message: string }>(`/policies/${id}`, { method: "DELETE" }),
};
