# Bulk Upload Completion Email Notifications
IMPORTANT: github .env secrets need to be updated,remind developer.
## Status
- **State:** Requirements partially confirmed; implementation not started.
- **Last updated:** 2026-01-29

## What (current progress)
- Gathered requirements for bulk/file upload completion email notifications (completed + failed).
- Collected SMTP configuration env var names and user-provided values (to be set in `backend/.env` by user).
- Reviewed all external API documentation under `ext-api-docs/` to locate webhook-related behavior.
- Determined external docs confirm `webhook_url` parameter on task/batch upload endpoints but do **not** specify webhook payload/auth.

## Why (current status)
- Implementation must be driven by the external webhook payload + signature scheme to safely map task completion and avoid duplicate emails.
- Need a deterministic idempotency strategy to prevent sending multiple emails for a single task.
- Must avoid hardcoding any email content or SMTP settings; everything should be configurable via env.

## How (analysis so far)
- Proposed to send notifications **only for bulk file uploads**, not manual tasks.
- Proposed recipient resolution order:
  1) Supabase `profiles.email` from `/account` profile
  2) JWT claim email if profile email missing
  3) If neither exists, skip and log
- Proposed email content uses env-configurable subject/body with `{file_name}` and `{email_count}` template variables.
- Proposed SMTP via STARTTLS on port 587 (per Acumbamail). Required env vars to read:
  - `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_STARTTLS_REQUIRED`
  - `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO`
  - `BULK_UPLOAD_EMAIL_SUBJECT_COMPLETED`, `BULK_UPLOAD_EMAIL_SUBJECT_FAILED`
  - `BULK_UPLOAD_EMAIL_BODY_COMPLETED`, `BULK_UPLOAD_EMAIL_BODY_FAILED`

## Confirmed decisions
- Trigger emails on both **completed** and **failed** outcomes.
- Scope: **bulk file uploads only**.
- Recipient order: profile email → JWT claim email → skip & log if missing.
- Email copy set by env values supplied by user (see `backend/.env`).

## Open questions / blockers
- **Webhook payload format**: user supplied a sample payload containing a single `job` and `email_address`, but unclear if this is per-email or per-task. Need clarity on whether webhook fires once per task or many times per task.
- **Failure event**: missing sample payload and event_type for failed outcomes.
- **Signature verification**: need confirmation of the exact algorithm for `X-Webhook-Signature` when `WEBHOOK_SECRET_KEY` is set (assumed HMAC-SHA256 over raw body, but not confirmed).
- **Public webhook base URL**: required to construct the callback `webhook_url` sent to external API.
- **Idempotency storage**: need approval to add a Supabase table to track notification send per task to avoid duplicates, plus a mapping of `task_id -> filename/email_count`.

## Proposed implementation (MVP)
- Add SMTP settings to backend config and implement a simple mailer service using Python stdlib (`smtplib`) with STARTTLS support.
- Add a webhook endpoint in backend to accept external callback.
- On webhook receipt:
  - validate signature if configured
  - determine task status (completed/failed)
  - resolve recipient email (profile → JWT)
  - load filename/email_count (likely via stored metadata or external API fetch)
  - send exactly one email per task (idempotency guard)
- Add tests (unit + integration) and verify end-to-end.

## Next steps for the next session
1) Confirm webhook payload behavior (per task vs per email) + failure payload.
2) Confirm signature algorithm.
3) Provide public backend base URL for webhook.
4) Approve Supabase idempotency table creation.
5) Implement MVP (mailer + webhook + idempotency + metadata storage), update `ui-progress.md` after each step, and run tests.
