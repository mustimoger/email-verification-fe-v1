# External API Gap Report (UI Parity Requirements)

Purpose: list missing or unclear external API capabilities needed for full dashboard parity. This is based strictly on the current docs in `ext-api-docs/`.

## 1) Task list/detail needs `file_name` for History/Verify
**Current docs**
- `GET /api/v1/tasks` and `GET /api/v1/tasks/{id}` do **not** include a `file_name` field in the response.  
  Source: `ext-api-docs/endpoints/task_controller.md`
- `POST /api/v1/tasks/batch/upload` and `GET /api/v1/tasks/batch/uploads/{upload_id}` return `filename`.  
  Source: `ext-api-docs/endpoints/batch_file_controller.md`

**UI requirement**
- History and Verify pages display the uploaded file name for batch tasks.

**Gap**
- Task list/detail responses should include `file_name` (or `filename`) for batch tasks so the UI can show the name without calling upload status.

**Requested change**
- Add `file_name` (or `filename`) to:
  - `GET /api/v1/tasks` task summaries
  - `GET /api/v1/tasks/{id}` task detail
- If the task is not file-backed, return `null`.

---

## 2) Manual export detail fields are admin-only
**Current docs**
- `/api/v1/emails` and `/api/v1/emails/{identifier}` are admin-only.  
  Source: `ext-api-docs/endpoints/email_controller.md`

**UI requirement**
- Manual verify export includes per-email detail fields (status, domain info, MX, etc.) for the authenticated user.

**Gap**
- User-scoped endpoint to fetch per-email verification details is not documented.

**Requested change**
- Provide a user-scoped endpoint to fetch verification detail fields for the user’s own emails or for a task:
  - Option A: include the full detail fields in `GET /api/v1/tasks/{id}/jobs` (recommended).
  - Option B: add a user-scoped `/api/v1/emails/{identifier}` (non-admin) that only returns records owned by the user.

---

## 3) Credits/balance/usage endpoints are not documented
**Current docs**
- No documented endpoint for credit balance or credits used.  
  Source: `ext-api-docs/README.md`, `ext-api-docs/endpoints/metrics_controller.md`

**UI requirement**
- Overview and Account pages show credits remaining and credits used.

**Gap**
- External API needs to expose credit balance + usage derived from `credit_grants` (Supabase).

**Requested change**
- Add endpoints (or extend existing) to return:
  - `credits_remaining` (current balance)
  - `credits_used` (total used in a range, optional)
  - Optional time series for credits used in a range
- Clarify if these values are derived from `credit_grants` or another source of truth.

---

## 4) Usage totals mapping to UI labels is undefined
**Current docs**
- `GET /api/v1/metrics/verifications` returns totals/series for verifications only.  
  Source: `ext-api-docs/endpoints/metrics_controller.md`

**UI requirement**
- UI labels include “credits used” and usage totals that need a clear mapping.

**Gap**
- Verification totals do not explicitly map to “credits used,” and no credit-usage fields are documented.

**Requested change**
- Either:
  - Define that “credits used” equals `total_verifications` (document explicitly), or
  - Add explicit fields in metrics responses for credit usage.

---

## 5) Per-key time-series usage is missing
**Current docs**
- `GET /api/v1/api-keys` returns `total_requests` + `last_used_at` per key (no series).  
  Source: `ext-api-docs/endpoints/api_key_controller.md`
- `GET /api/v1/metrics/api-usage` provides purpose-level totals/series only.  
  Source: `ext-api-docs/endpoints/metrics_controller.md`

**UI requirement**
- API page can render per-key usage charts when a specific key is selected.

**Gap**
- No documented endpoint provides per-key time-series usage.

**Requested change**
- Add a per-key usage series endpoint, e.g.:
  - `GET /api/v1/api-keys/{id}/usage?from=...&to=...`
  - Response: daily date/value series + totals

---

## 6) Clarify file-backed task identity in task list
**Current docs**
- Task list/detail include metrics but no field indicating whether a task was created from upload or manual input.  
  Source: `ext-api-docs/endpoints/task_controller.md`

**UI requirement**
- History/Verify need to infer whether file download is available and label tasks correctly.

**Gap**
- No explicit field identifies file-backed tasks.

**Requested change**
- Add a boolean flag on task list/detail such as `is_file_task` (or include `file_name` as above).

---

## Summary of Required Additions
- Add `file_name` (or `filename`) to task list/detail.
- Provide user-scoped per-email detail fields (preferably in task jobs).
- Provide credits balance/usage endpoints.
- Clarify mapping for “credits used” vs verification totals.
- Add per-key usage time series endpoint.
- Indicate whether a task is file-backed (or rely on `file_name`).
