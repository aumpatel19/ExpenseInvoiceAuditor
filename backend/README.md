---
title: AuditFlow Backend
emoji: 🧾
colorFrom: yellow
colorTo: orange
sdk: docker
app_port: 7860
pinned: false
---

# AuditFlow Backend

FastAPI OCR-to-JSON audit pipeline for invoices and expense receipts.

> **This Space is auto-deployed from GitHub via GitHub Actions.**
> Do not push directly — push to the main GitHub repo instead.

## Environment variables

Set these in the Space **Settings → Variables and secrets** tab:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secure random string (min 32 chars) |
| `CORS_ORIGINS` | Yes | Your Vercel frontend URL |
| `APP_ENV` | Yes | `production` |
| `S3_BUCKET_NAME` | Optional | For Cloudflare R2 / S3 file storage |
| `AWS_ACCESS_KEY_ID` | Optional | R2 / S3 key |
| `AWS_SECRET_ACCESS_KEY` | Optional | R2 / S3 secret |
| `S3_ENDPOINT_URL` | Optional | R2 endpoint URL |
| `SENTRY_DSN` | Optional | Sentry error tracking DSN |
| `EMAIL_NOTIFICATIONS_ENABLED` | Optional | `true` to send audit emails |
| `RESEND_API_KEY` | Optional | Resend API key for emails |
| `EMAIL_FROM` | Optional | Sender address for notifications |
