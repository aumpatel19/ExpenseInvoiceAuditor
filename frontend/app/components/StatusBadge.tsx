"use client";

type Status = string;

const LABELS: Record<string, string> = {
  uploaded:          "Uploaded",
  processing:        "Processing",
  extracted:         "Extracted",
  validation_failed: "Validation Failed",
  audited:           "Audited",
  needs_review:      "Needs Review",
  error:             "Error",
  approved:          "Approved",
  flagged:           "Flagged",
  needs_manual_review: "Manual Review",
  rejected:          "Rejected",
  high:              "High",
  medium:            "Medium",
  low:               "Low",
  deterministic:     "Deterministic",
  llm_assisted:      "AI-Assisted",
};

export default function StatusBadge({ status, style }: { status: Status; style?: React.CSSProperties }) {
  const key = status?.replace(/-/g, "_") ?? "";
  return (
    <span
      className={`badge-${key}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {LABELS[key] ?? key}
    </span>
  );
}
