# Bulk Upload Email Notifications - Implementation Handover

Last updated: 2026-02-11 (UTC)
Owner: Dashboard backend (`apps/dashboard/backend`)
Status: `MVP implemented and verified with focused tests`

## 1. Objective

### What
Send email notifications when a **file/bulk upload verification task** reaches a final result.

### Why
Users need asynchronous completion visibility without polling dashboards.

### How
- Receive external webhook callbacks.
- Ignore per-email callbacks; process only task-completion payloads.
- Resolve user + file metadata.
- Send SMTP notification (`completed` or `failed`).
- Enforce idempotency to prevent duplicate emails.

### Where
- Core orchestration: `apps/dashboard/backend/app/services/upload_notifications.py`
- SMTP sender: `apps/dashboard/backend/app/services/smtp_mailer.py`
- Webhook route: `apps/dashboard/backend/app/api/tasks.py`

---

## 2. Current State Snapshot

### What is done
- SMTP configuration fields are wired in backend settings.
- SMTP mailer is implemented with StartTLS + login + plain text email.
- Webhook endpoint is implemented at `POST /api/tasks/webhooks/bulk-upload`.
- Upload endpoint now defaults webhook target to internal route when caller does not provide `webhook_url`.
- Notification sending handles both outcomes:
  - `completed`
  - `failed`
- Idempotency implemented using deterministic event IDs in existing `billing_events` storage.
- Focused backend tests pass.

### Why this matters
Feature is now operational in backend code path instead of being configuration-only.

### How completion was verified
Executed in venv:
- `pytest -q apps/dashboard/backend/tests/test_smtp_mailer.py apps/dashboard/backend/tests/test_bulk_upload_notifications.py apps/dashboard/backend/tests/test_tasks_upload_email_count.py`
- `pytest -q apps/dashboard/backend/tests/test_settings.py apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py`

Result: all passed.

### Where evidence lives
- Tests:
  - `apps/dashboard/backend/tests/test_smtp_mailer.py`
  - `apps/dashboard/backend/tests/test_bulk_upload_notifications.py`
  - `apps/dashboard/backend/tests/test_tasks_upload_email_count.py`

---

## 3. Design Decisions (Decision Log)

## D1. Scope is file/bulk uploads only
- What: do not send emails for manual `/api/tasks` creation.
- Why: requirement explicitly targets bulk/file upload flow.
- How: webhook processor enforces file-backed task check before send.
- Where: `apps/dashboard/backend/app/services/upload_notifications.py` (`_is_file_backed_task`).

## D2. Process only task-completion payloads
- What: ignore per-email webhook events.
- Why: avoid spamming one email per verified address.
- How: require `data.stats` + `data.jobs` payload shape.
- Where: `apps/dashboard/backend/app/services/upload_notifications.py` (`_is_task_completion_payload`).

## D3. Recipient resolution order
- What: `profiles.email` -> auth user email -> skip.
- Why: stable profile source first, reliable auth fallback second.
- How: profile lookup then auth lookup with structured logs.
- Where: `apps/dashboard/backend/app/services/upload_notifications.py` (`_resolve_recipient_email`).

## D4. Idempotency strategy
- What: dedupe by `bulk_upload_notification:{task_id}:{outcome}`.
- Why: webhook retries and duplicate deliveries are expected.
- How: reuse `record_billing_event` unique insert behavior; skip duplicates.
- Where: `apps/dashboard/backend/app/services/upload_notifications.py` + `apps/dashboard/backend/app/services/billing_events.py`.

## D5. Signature verification is optional-by-config
- What: verify `X-Webhook-Signature` only when `WEBHOOK_SECRET_KEY` is set.
- Why: supports staged rollout without breaking existing traffic.
- How: HMAC-SHA256 over raw body with `sha256=<hex>` comparison.
- Where: `apps/dashboard/backend/app/services/upload_notifications.py` (`_verify_signature`).

## D6. Default callback routing for uploads
- What: auto-route upload callbacks to backend internal webhook when request omits `webhook_url`.
- Why: makes notifications work by default.
- How: `url_for("bulk_upload_tasks_webhook")` fallback with optional env override.
- Where:
  - resolver: `apps/dashboard/backend/app/api/tasks.py` (`_resolve_bulk_upload_webhook_url`)
  - upload route: `apps/dashboard/backend/app/api/tasks.py` (`upload_task_file`)

---

## 4. Runtime Flow (Exact)

1. User uploads file via `POST /api/tasks/upload`.
2. Backend resolves webhook URL:
   - request-provided `webhook_url`, else
   - `BULK_UPLOAD_WEBHOOK_URL`, else
   - internal `POST /api/tasks/webhooks/bulk-upload` URL.
3. External API sends webhook callbacks.
4. Backend webhook route parses raw JSON and passes to processor.
5. Processor validates signature if secret configured.
6. Processor ignores non-task-completion payloads.
7. Processor fetches task detail through admin external client.
8. Processor ensures task is file-backed.
9. Processor resolves outcome (`completed`/`failed`), recipient, file name, email count.
10. Processor attempts idempotency insert:
    - if duplicate: skip
    - if new: send SMTP email
11. If SMTP delivery fails after idempotency insert, idempotency marker is deleted to allow retry.

---

## 5. Configuration Matrix (Required/Optional)

## Required for email delivery
- `SMTP_SERVER`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_STARTTLS_REQUIRED`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `SMTP_REPLY_TO`
- `BULK_UPLOAD_EMAIL_SUBJECT_COMPLETED`
- `BULK_UPLOAD_EMAIL_SUBJECT_FAILED`
- `BULK_UPLOAD_EMAIL_BODY_COMPLETED`
- `BULK_UPLOAD_EMAIL_BODY_FAILED`

## Required for task metadata lookup in webhook processing
- `EXTERNAL_API_ADMIN_KEY` (or fallback `DEV_API_KEYS`)

## Optional
- `WEBHOOK_SECRET_KEY` (enables signature verification)
- `BULK_UPLOAD_WEBHOOK_URL` (forces callback URL instead of auto-generated internal URL)

---

## 6. Files Added/Changed (Where)

## Added
- `apps/dashboard/backend/app/services/smtp_mailer.py`
- `apps/dashboard/backend/app/services/upload_notifications.py`
- `apps/dashboard/backend/tests/test_smtp_mailer.py`
- `apps/dashboard/backend/tests/test_bulk_upload_notifications.py`

## Changed
- `apps/dashboard/backend/app/core/settings.py`
- `apps/dashboard/backend/app/api/tasks.py`
- `apps/dashboard/backend/tests/test_tasks_upload_email_count.py`
- `email-notification.md`

---

## 7. Test Coverage Implemented

## What is covered
- SMTP completed email path.
- SMTP missing config path.
- Task-completion webhook success (`completed`).
- Task-completion webhook success (`failed`).
- Duplicate idempotency skip.
- SMTP delivery failure handling.
- Signature validation failure path.
- Webhook route invalid JSON.
- Upload route default internal callback URL.

## Why this level
Covers critical reliability behavior and regression-prone routing decisions for MVP.

## Where
- `apps/dashboard/backend/tests/test_smtp_mailer.py`
- `apps/dashboard/backend/tests/test_bulk_upload_notifications.py`
- `apps/dashboard/backend/tests/test_tasks_upload_email_count.py`

---

## 8. Known Risks / Follow-ups

## R1. Idempotency table reuse
- What: currently reuses `billing_events` table.
- Why: avoided new DB migration to deliver MVP quickly and safely.
- How to improve: create dedicated notification events table + service.
- Where impacted: `apps/dashboard/backend/app/services/upload_notifications.py`.

## R2. Admin token dependency
- What: webhook processing needs admin-capable external API token for task detail lookup.
- Why: webhook payload alone may not include reliable file metadata for filtering.
- How failure behaves: webhook acknowledged but email skipped with logs.
- Where impacted: `_build_admin_client` in `upload_notifications.py`.

## R3. Full-suite regression not executed in this task scope
- What: only focused tests executed.
- Why: optimized for targeted feature verification.
- How to close: run full backend suite before production release.
- Where: `apps/dashboard/backend/tests`.

---

## 9. Next Session Runbook (No Ambiguity)

## First commands to run
1. `cd /home/codex/email-verification-fe-v1`
2. `source .venv/bin/activate`
3. `pytest -q apps/dashboard/backend/tests/test_smtp_mailer.py apps/dashboard/backend/tests/test_bulk_upload_notifications.py apps/dashboard/backend/tests/test_tasks_upload_email_count.py`

## If implementing follow-up hardening
1. Add dedicated `bulk_upload_notification_events` table.
2. Replace `record_billing_event` reuse with notification-specific persistence service.
3. Add migration + tests for duplicate key behavior.
4. Re-run full backend suite:
   - `pytest -q apps/dashboard/backend/tests`

## If debugging production issue
1. Check logs for keys:
   - `bulk_upload_notification.signature_invalid`
   - `bulk_upload_notification.admin_token_missing`
   - `bulk_upload_notification.recipient_missing`
   - `bulk_upload_notification.task_metadata_missing`
   - `bulk_upload_notification.smtp_send_failed`
2. Confirm external callback reaches:
   - `POST /api/tasks/webhooks/bulk-upload`
3. Confirm env completeness from section 5.

---

## 10. Requirements Traceability (What -> Where)

- Send email on bulk/file task finish:
  - `apps/dashboard/backend/app/services/upload_notifications.py`
- Use Acumbamail SMTP relay config:
  - `apps/dashboard/backend/app/services/smtp_mailer.py`
  - `apps/dashboard/backend/app/core/settings.py`
- From/reply-to/name and completed/failed templates from env:
  - `apps/dashboard/backend/app/services/smtp_mailer.py`
- Plan/progress continuity for next Codex session:
  - this file (`email-notification.md`)

---

## 11. Current Session Task Plan (2026-02-11 UTC)

## T1. Simulate a completed file upload verification as an actual integration test
- Status: `completed`
- What:
  - Added one integration-style backend test that exercises webhook processing for a `completed` file upload event and verifies that an SMTP email is physically emitted to a local SMTP capture server.
- Why:
  - Existing focused tests validated behavior with monkeypatched SMTP and client paths; this step added a higher-confidence simulation for the full notification path requested in this session.
- How:
  - Implemented an in-test local SMTP sink server (`socketserver`) that supports `EHLO`, `AUTH LOGIN/PLAIN`, `MAIL FROM`, `RCPT TO`, `DATA`, and captures the raw message body.
  - Posted a realistic webhook payload (`event_type=email_verification_completed`, `task_id`, `data.stats`, `data.jobs`) to `POST /api/tasks/webhooks/bulk-upload` using `httpx.ASGITransport`.
  - Stubbed only non-local dependencies (external task detail lookup, Supabase profile lookup, idempotency storage), while preserving the real SMTP mailer path (`smtplib.SMTP`, template rendering, auth/login, message send).
  - Parsed captured SMTP message bytes and asserted recipient, subject, and body content for the `completed` outcome.
- Where:
  - `apps/dashboard/backend/tests/test_bulk_upload_notifications_integration.py` (new)

## Validation Evidence
- Command:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_smtp_mailer.py apps/dashboard/backend/tests/test_bulk_upload_notifications.py apps/dashboard/backend/tests/test_tasks_upload_email_count.py apps/dashboard/backend/tests/test_bulk_upload_notifications_integration.py`
- Result:
  - `14 passed` (targeted notification suite + new integration simulation)

## Not Implemented In This Session
- No production-deploy action was executed in this step.
- No dedicated notification-events table migration was implemented in this step (still tracked under `R1`).

## T2. Fix GitHub Actions failure by pushing missing backend notification implementation
- Status: `completed`
- What:
  - Resolve CI failure from commit `8d764be` by committing the missing backend implementation that the new integration test depends on.
- Why:
  - The previous commit included only the integration test and docs update, while required notification implementation files remained local-only, causing import and route failures in GitHub Actions.
- How:
  - Added SMTP + webhook notification services and backend wiring required by webhook processing and upload callback defaults.
  - Added missing external client task metadata fields used by notification processor (`is_file_backed`, `file`, and file metadata structure).
  - Added/updated backend tests for SMTP sending, webhook processing, upload webhook defaulting, and latest-upload task metadata behavior.
  - Re-ran full backend suite with the same CI command path (`pytest backend/tests`) in a clean worktree.
- Where:
  - `apps/dashboard/backend/app/services/smtp_mailer.py`
  - `apps/dashboard/backend/app/services/upload_notifications.py`
  - `apps/dashboard/backend/app/core/settings.py`
  - `apps/dashboard/backend/app/clients/external.py`
  - `apps/dashboard/backend/app/api/tasks.py`
  - `apps/dashboard/backend/tests/test_smtp_mailer.py`
  - `apps/dashboard/backend/tests/test_bulk_upload_notifications.py`
  - `apps/dashboard/backend/tests/test_tasks_upload_email_count.py`
  - `apps/dashboard/backend/tests/test_tasks_latest_upload.py`
  - `apps/dashboard/backend/tests/test_tasks_latest_uploads.py`

## T2 Validation Evidence
- Command:
  - `cd apps/dashboard && source .venv/bin/activate && pytest backend/tests`
- Result:
  - `124 passed`

## T2 Notes
- CI failure root cause was deterministic: commit `8d764be` introduced `test_bulk_upload_notifications_integration.py` but not the implementation files it imports/exercises.
- This step ships those missing backend files and wiring so GitHub Actions can collect and execute the notification integration test.
