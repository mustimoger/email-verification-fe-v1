# Email Delivery Incident Report (Acumbamail + `@boltroute.ai` Soft Bounces)

Last updated: 2026-02-12 UTC  
Owner: `email-verification-fe-v1` operations/debugging  
Status: `active investigation, partial mitigation applied`

## 1. Executive Summary

### Problem
Email submissions from this app are accepted by Acumbamail SMTP relay, but messages sent **to internal `@boltroute.ai` recipients** (`support@boltroute.ai`, `sales@boltroute.ai`) often show **Soft bounce** in Acumbamail reports.

### What works
- External recipients (`@gmail.com`, `@yahoo.com`, `@dva.com.tr`) are delivered.
- Contact form endpoint (`POST /api/contact`) returns success (`200`) and UI confirmation.

### What fails
- Delivery to some internal recipients at the same domain as the sender (`@boltroute.ai`) is unstable/soft-bouncing.

### Most likely cause
Recipient-side inbound policy/alignment checks on the `boltroute.ai` mail system (separate mailbox infrastructure), not app-side SMTP connectivity.

---

## 2. System Context (for newcomers)

## 2.1 Sending paths in this repo
- Dashboard backend notifications:
  - Python SMTP sender: `apps/dashboard/backend/app/services/smtp_mailer.py`
- Website contact form notifications:
  - API route: `apps/website/src/app/api/contact/route.ts`
  - SMTP sender: `apps/website/src/lib/contact/smtp.ts`

Both paths send through:
- `SMTP_SERVER=smtp.acumbamail.com`
- `SMTP_PORT=587`
- STARTTLS + AUTH enabled
- Sender header from `support@boltroute.ai`

## 2.2 Receiving path for `@boltroute.ai`
- DNS MX:
  - `boltroute.ai MX 10 mail.boltroute.ai`
- Current resolved mail host:
  - `mail.boltroute.ai -> 194.163.140.0`
- SMTP greeting from that host:
  - `220 vmi599668.contaboserver.net`
- EHLO identity:
  - `vmi599668.contaboserver.net`

Operational note:
- `@boltroute.ai` mailbox handling is on external mail infra (`mail.boltroute.ai`), separate from the app runtime host (`135.181.160.203`).
- Team context indicates this mailbox stack is Hestia-managed mail hosting; this repository does not contain that server config.

---

## 3. Timeline of Investigation

## 3.1 Initial observation
- Acumbamail showed many soft bounces for emails to `support@boltroute.ai`.
- New same-day tests to external addresses started showing delivered.

## 3.2 Added deterministic SMTP diagnostic tool
- Added root script: `smtp_diagnostic.py`
- Added tests: `apps/dashboard/backend/tests/test_smtp_diagnostic_script.py`
- Script logs full SMTP stage transcript (`EHLO`, `STARTTLS`, `AUTH`, `MAIL`, `RCPT`, `DATA`, `QUIT`) to `artifacts/smtp-diagnostics/*.log`.

## 3.3 Contact route E2E validated on production domain
- Playwright submitted real form on `https://boltroute.ai/contact`.
- API returned `200` with request IDs.
- Acumbamail still showed soft bounce when recipient was internal `@boltroute.ai` (before recipient override and in later direct internal tests).

## 3.4 Temporary routing mitigation
- `CONTACT_NOTIFICATION_TO_EMAIL` set to external/internal-safe recipient `murat.kural@dva.com.tr` via website env secret workflow.
- After deploy, `/contact` request with ID `2754430e-67d1-4a22-840a-d59585b71c66` was delivered.

## 3.5 DNS auth update
- SPF previously observed as:
  - `v=spf1 a mx -all`
- Updated to:
  - `v=spf1 a mx include:spf.acumbamail.com -all`
- Authoritative nameserver checks (`saanvi/alaric.ns.cloudflare.com`) confirmed update.

---

## 4. Tests Run and Results

## 4.1 Automated tests
- Command:
  - `source .venv/bin/activate && cd apps/dashboard && pytest -q backend/tests/test_smtp_diagnostic_script.py backend/tests/test_smtp_mailer.py backend/tests/test_bulk_upload_notifications_integration.py`
- Result:
  - `7 passed`

## 4.2 SMTP relay diagnostics (direct sends via app server)

All of the following reached Acumbamail with successful SMTP-stage acceptance:
- `AUTH 235`
- `MAIL FROM 250`
- `RCPT TO 250`
- `DATA 250 Delivery in progress`

Logs:
- `artifacts/smtp-diagnostics/smtp-diagnostic-gmail-20260212T125100Z.log`
- `artifacts/smtp-diagnostics/smtp-diagnostic-yahoo-20260212T125120Z.log`
- `artifacts/smtp-diagnostics/smtp-diagnostic-dva-20260212T125140Z.log`
- `artifacts/smtp-diagnostics/smtp-diagnostic-sales-20260212T141020Z.log`
- `artifacts/smtp-diagnostics/smtp-diagnostic-sales-postspf-20260212T142000Z.log`
- `artifacts/smtp-diagnostics/smtp-diagnostic-support-postspf-20260212T142000Z.log`

Observed outcomes in Acumbamail dashboard:
- Delivered examples:
  - `murat.kural@dva.com.tr` (multiple)
  - `/contact` request `2754430e-67d1-4a22-840a-d59585b71c66` after recipient override
- Soft bounce examples:
  - `support@boltroute.ai` (contact + other app notifications)
  - `sales@boltroute.ai` (direct SMTP diagnostic with subject `BoltRoute-Bulk upload completed`)

## 4.3 Production `/contact` E2E tests

Test A (pre-recipient override):
- Endpoint: `POST https://boltroute.ai/api/contact`
- API result: `200 accepted`
- Example request ID: `1e5af1cd-daf4-493c-87e1-162f8f641d52`
- Acumbamail result: soft bounce (recipient `support@boltroute.ai`)

Test B (post-recipient override + deploy):
- Endpoint: `POST https://boltroute.ai/api/contact`
- API result: `200 accepted`
- Request ID: `2754430e-67d1-4a22-840a-d59585b71c66`
- Acumbamail result: delivered (recipient `murat.kural@dva.com.tr`)

## 4.4 DNS/mail routing checks

Commands and current values:
- `dig +short MX boltroute.ai` -> `10 mail.boltroute.ai.`
- `dig +short A mail.boltroute.ai` -> `194.163.140.0`
- `dig +short TXT boltroute.ai` -> `v=spf1 a mx include:spf.acumbamail.com -all`
- `dig +short TXT _dmarc.boltroute.ai` -> `v=DMARC1; p=quarantine; ...`

Connectivity from app host to mailbox host:
- `nc -vz -w 5 mail.boltroute.ai 587` -> success
- `nc -vz -w 5 mail.boltroute.ai 25` -> timeout from this host
- `nc -vz -w 5 mail.boltroute.ai 465` -> timeout from this host

Interpretation:
- App host can submit via Acumbamail relay path.
- Mailbox host behavior/policy is independent and may still defer/bounce internal-domain messages.

---

## 5. Concrete Findings

## F1. App-side SMTP submission is healthy
Evidence: consistent `250 Delivery in progress` after `DATA` for all test recipients.

## F2. Failure is recipient-domain specific
Evidence: external domains deliver, internal `@boltroute.ai` recipients soft-bounce more often.

## F3. `/contact` route itself is not broken
Evidence: endpoint returns `200 accepted`; delivered when recipient switched to non-`@boltroute.ai`.

## F4. Sender/auth alignment risk still exists
- Current sender: `support@boltroute.ai`
- SMTP auth username: `murat.kural@dva.com.tr`
- This mismatch can trigger stricter anti-spoof checks in some receiving systems, especially same-domain routing paths.

## F5. SPF misalignment was present and has now been corrected
- Old SPF (`a mx -all`) did not authorize Acumbamail relay.
- Updated SPF now includes Acumbamail include-domain.
- Cache/propagation delays and DKIM alignment may still influence outcome.

---

## 6. Why internal `@boltroute.ai` can bounce while external deliver

Short answer:
- Acumbamail acceptance (`250`) only means relay accepted submission.
- Final inbox placement depends on receiving server policy.
- For `@boltroute.ai`, receiving infra (`mail.boltroute.ai`) may apply stricter local anti-spoof policy for mail claiming `From: support@boltroute.ai` arriving via external relay path.

Common contributors:
- Historical SPF mismatch (recently fixed, but caches may persist).
- Missing or misaligned DKIM for `boltroute.ai` in Acumbamail.
- Sender/header/envelope alignment policy on the mailbox server.

---

## 7. Current Mitigation

- For website contact notifications, route recipient to a known delivered mailbox using:
  - `CONTACT_NOTIFICATION_TO_EMAIL=murat.kural@dva.com.tr`
- Deploy website after env update.

This avoids operational loss while authentication/alignment is being finalized.

---

## 8. Remaining Work / Next Actions

## 8.1 Mail authentication hardening
1. Complete/verify DKIM setup for `boltroute.ai` in Acumbamail.
2. Confirm SPF remains single-record and includes Acumbamail.
3. Keep DMARC monitoring active (`rua`/`ruf` already configured).

## 8.2 Receiver-side verification (mail host / Hestia environment)
1. Check inbound logs on `mail.boltroute.ai` for reject/defer reason codes for:
   - `support@boltroute.ai`
   - `sales@boltroute.ai`
2. Verify anti-spoof policy behavior for same-domain sender/recipient via external relay.
3. Confirm mailbox aliases/quotas/account state for impacted recipients.

## 8.3 App-level guardrails (optional follow-up)
1. Keep a dedicated `CONTACT_NOTIFICATION_TO_EMAIL` override.
2. Add optional health-check script for SPF/DKIM/DMARC diagnostics.
3. Keep SMTP transcript artifacts for incident response.

---

## 9. Key File References

- SMTP diagnostic script: `smtp_diagnostic.py`
- SMTP diagnostic tests: `apps/dashboard/backend/tests/test_smtp_diagnostic_script.py`
- Backend SMTP sender: `apps/dashboard/backend/app/services/smtp_mailer.py`
- Contact API route: `apps/website/src/app/api/contact/route.ts`
- Contact SMTP implementation: `apps/website/src/lib/contact/smtp.ts`
- Deploy workflow env propagation: `.github/workflows/website-deploy.yml`
- Progress tracking: `ui-progress.md`, `email-notification.md`

