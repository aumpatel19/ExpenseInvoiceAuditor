"""
Email notification service using Resend (https://resend.com).
Only sends if EMAIL_NOTIFICATIONS_ENABLED=true and RESEND_API_KEY is set.
"""
import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)

_STATUS_LABELS = {
    "audited": ("Approved", "#22c55e"),
    "needs_review": ("Needs Review", "#f59e0b"),
    "validation_failed": ("Validation Failed", "#ef4444"),
    "error": ("Processing Failed", "#ef4444"),
}


async def send_audit_complete(
    to_email: str,
    document_id: str,
    filename: str,
    status: str,
    findings_count: int = 0,
) -> None:
    if not settings.email_notifications_enabled or not settings.resend_api_key:
        return
    if not to_email:
        return

    label, color = _STATUS_LABELS.get(status, (status.replace("_", " ").title(), "#6366f1"))
    findings_row = (
        f'<tr><td style="padding:6px 0;color:#666">Findings</td>'
        f'<td style="font-weight:600">{findings_count} issue(s) detected</td></tr>'
        if findings_count > 0 else ""
    )

    html = f"""
<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <div style="border-left:4px solid {color};padding-left:16px;margin-bottom:20px">
    <h2 style="margin:0 0 4px;color:{color}">{label}</h2>
    <p style="margin:0;color:#555;font-size:14px">Document processing complete</p>
  </div>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:6px 0;color:#666;width:120px">File</td><td style="font-weight:600">{filename}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Status</td><td style="font-weight:600;color:{color}">{label}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Document ID</td><td style="font-family:monospace;font-size:11px">{document_id}</td></tr>
    {findings_row}
  </table>
  <div style="margin-top:20px">
    <a href="https://expense-invoice-auditor.vercel.app/documents/{document_id}"
       style="display:inline-block;background:{color};color:#fff;text-decoration:none;
              padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600">
      View Document →
    </a>
  </div>
  <p style="margin-top:28px;font-size:11px;color:#999">
    AuditFlow · Expense &amp; Invoice Auditor<br>
    You received this because email notifications are enabled for your account.
  </p>
</div>
"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.email_from,
                    "to": [to_email],
                    "subject": f"AuditFlow: {filename} — {label}",
                    "html": html,
                },
            )
            if resp.status_code >= 400:
                logger.warning(f"[Email] Resend returned {resp.status_code}: {resp.text}")
            else:
                logger.info(f"[Email] Notification sent to {to_email} for document {document_id}")
    except Exception as e:
        logger.warning(f"[Email] Failed to send notification: {e}")
