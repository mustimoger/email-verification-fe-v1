# Redundant Compute Reduction Plan

## Purpose
- Reduce duplicate computation in this FastAPI layer relative to the Go service.
- Preserve required business logic (credits, auth, caching, audit logs).
- Keep behavior stable and observable during the transition.

## Constraints
- MVP first, then test (unit + integration), verify, deploy to main, and only then enhance.
- No hardcoded values; use configuration and explicit error reporting.
- Favor clear logs over silent fallbacks.

## Inventory (current candidates for redundancy)
| Area | Extra compute in this repo | Why it exists today | Decision gate |
| --- | --- | --- | --- |
| `POST /api/verify` | Optional follow-up `/emails/{address}` lookup to enrich export fields. | Fills details not always present in `/verify` response. | Confirm Go `/verify` response already includes needed fields used by export/UI. |
| `POST /api/tasks` | Credit reservation + Supabase upsert + manual email tracking. | Credits and dashboard history are local responsibilities. | Keep if credits remain app-owned; revisit only if moved to Go. |
| `POST /api/tasks/upload` | Local file parsing to count emails before upload. | Needed for credit reservation and validation. | Replace with Go-provided count or a lightweight count endpoint; otherwise keep. |
| `GET /api/tasks` | Supabase-first cache, external refresh fallback, usage logging. | Ensures history works even when external API is empty/unavailable. | Keep cache; remove any redundant refresh path if not used. |
| `GET /api/tasks/{id}` | Iterate job list to compute counts for credits. | Credits need processed counts. | Use aggregated metrics from Go if reliable; avoid iterating jobs when not needed. |
| `GET /api/tasks/{id}/download` | Same count computation before download. | Credit settlement before file download. | Same as above; rely on metrics if available. |
| `GET /api/tasks/latest-manual` (`refresh_details=true`) | Per-email detail enrichment. | Export fields missing in cached results. | Remove or cap if Go returns full fields or if details are already stored. |
| `/api/overview` + `/api/usage/purpose` | Local aggregation layered on top of external metrics. | Dashboard-specific summarization. | Keep if dashboard requires different aggregation; otherwise source directly from Go. |

## Contract map (Go responses vs dashboard needs)
| Consumer/flow | Fields required by UI/export/credits | Current source in this repo | Go contract (api-docs.json) | Notes/gaps |
| --- | --- | --- | --- | --- |
| Manual verify (UI immediate results) | `status`, `message`, `validated_at`, `is_role_based` | `POST /api/verify` response | `POST /verify` returns `VerifyEmailResponse` with `status`, `message`, `validated_at`, `is_role_based` | Needs confirmation that live responses include these consistently. |
| Manual verify export fields | `catchall_domain`, `email_server`, `disposable_domain`, `registered_domain`, `mx_record` (+ `is_role_based`) | `verification_steps[].email` from `/verify` or fallback `/emails/{address}` | `VerifyEmailResponse.verification_steps[].email` uses `models.Email` which includes `domain` (`is_disposable`, `is_registered`, `dns_records`) and `host` (`is_catchall`, `server_type`) | Confirm `verification_steps[].email` is populated with `domain.host.dns_records` in production; otherwise keep `/emails/{address}` enrichment. |
| File upload credit reservation | email count per file | Local file parsing in `/api/tasks/upload` | `POST /tasks/batch/upload` response has no count | Needs Go-side count response or preflight count endpoint to remove local parsing. |
| History/overview task list | `task_id`, `status`, `email_count`, `valid_count`, `invalid_count`, `catchall_count`, `job_status`, `created_at`, `file_name` | Supabase `tasks` populated from external `/tasks` + `/tasks/{id}` | `GET /tasks` returns `TaskSummaryResponse` with `metrics` (`verification_status`, `total_email_addresses`, `job_status`) | `file_name` is app-owned; counts derived from `metrics` and not in response. Confirm metrics are reliably present. |
| Task detail (manual results + credits) | `jobs[]` (email address + status), `metrics` (`verification_status`, `total_email_addresses`, `job_status`), `finished_at` | `GET /api/tasks/{id}` pulls external detail and iterates jobs for counts | `GET /tasks/{id}` returns `TaskDetailResponse` with `metrics` + `jobs[]` (`TaskEmailJob.email`) | If `metrics.verification_status` + `total_email_addresses` are reliable, credits can avoid per-job iteration. |
| Download + credit settle | Same as task detail counts | `GET /api/tasks/{id}/download` computes counts pre-download | Same as above | Same dependency on `metrics` reliability. |
| Overview totals | `verification_status`, `total_verifications`, `total_catchall` | `/metrics/verifications` with Supabase fallback | `GET /metrics/verifications` returns `VerificationMetricsResponse` | If external totals are always available, Supabase fallback aggregation can be removed. |
| Usage by purpose | `requests_by_purpose`, `total_requests`, `series` | `/metrics/api-usage` | `GET /metrics/api-usage` returns `APIUsageMetricsResponse` | Dashboard-specific summary still needed if UI requires non-Go grouping. |

## Step 2 classification (required vs removable vs needs Go change)
| Area | Classification | Minimal change to remove redundancy | Notes |
| --- | --- | --- | --- |
| `POST /api/verify` email lookup | Needs Go change/confirmation | Ensure `/verify` returns `verification_steps[].email.domain` + `host` + `dns_records` for all responses, then drop `/emails/{address}` enrichment | Keep fallback until production responses confirm full fields. |
| `POST /api/tasks` credit reservation + Supabase upsert | Required (app-owned) | Only removable if credits + history storage move to Go | Credits and dashboard history are owned here today. |
| `POST /api/tasks/upload` local parsing for counts | Needs Go change | Add preflight count endpoint or include count in upload response | Required for credit reservation; remove only with a reliable count source. |
| `GET /api/tasks` Supabase-first cache + external refresh | Required with conditional removal | Remove external refresh only after Supabase ingestion is guaranteed (uploads/polls/manual tasks) | Cache is still needed for history and `file_name`. |
| `GET /api/tasks/{id}` per-job counts | Needs Go change/confirmation | Use `metrics.total_email_addresses` + `verification_status` for counts when reliable; avoid iterating jobs | Jobs still needed for manual results unless Go exposes detailed fields elsewhere. |
| `GET /api/tasks/{id}/download` per-job counts | Needs Go change/confirmation | Same as task detail: rely on metrics for counts when reliable | Keep current path until metrics are trusted. |
| `GET /api/tasks/latest-manual` `refresh_details` | Removable if Go returns full fields | If `/verify` returns full domain/host fields, remove refresh path | Otherwise keep with current guarded lookup. |
| `/api/overview` + `/api/usage/purpose` aggregation | Required (dashboard-specific) | Remove only if Go provides equivalent summary endpoints | Usage purpose already delegates to Go; overview still aggregates app-owned data. |

## Go change requests (to-do)
- [ ] Confirm `/verify` returns `verification_steps[].email` with `domain` + `host` + `dns_records` for export fields in production.
- [ ] Confirm `TaskDetailResponse.metrics` includes `verification_status` + `total_email_addresses` on completion so credits can avoid per-job iteration.
- [ ] Add a lightweight upload email-count response (preflight or upload response) so local parsing can be removed.

## MVP-first plan (step-by-step)
- [x] Step 1 — Build a contract map between Go responses and dashboard needs.
  Explanation: Mapped UI/export/credits field requirements to current backend usage and Go API docs so removals target only truly redundant compute and leave known gaps documented.
- [x] Step 2 — Classify each candidate: required, removable, or needs Go change.
  Explanation: Classified each redundancy candidate and recorded the minimal Go/contract changes needed before removing compute, so Step 3 can pick safe removals only.
- [x] Step 3 — Implement the smallest safe removal set (MVP).
  Explanation: Avoid per-job iteration when task metrics already provide verification counts by using metrics-first counts in `/api/tasks/{id}` and `/api/tasks/{id}/download`. Deferred removals that depend on Go-side confirmations (verify email detail lookup removal, upload count removal) remain listed in Go change requests.
- [x] Step 4 — Tests + verification for the MVP set.
  Explanation: Created a local `.venv`, installed `backend/requirements.txt`, and ran targeted pytest for the metrics-first count changes. Tests passed (with existing dependency warnings), confirming `/api/tasks/{id}` and `/api/tasks/{id}/download` use metrics counts when present.
- [x] Step 5 — Deploy to main after verification.
  Explanation: Deployment to main confirmed completed externally; no additional deploy action required in this session.
- [ ] Step 6 — Post-MVP removals and refinements.
  Explanation: Continue with higher-risk removals or Go-side changes once MVP is stable.

### Step 6 backlog (post-MVP removals pending Go confirmations)
- [ ] Remove `/emails/{address}` enrichment in `/api/verify` once `/verify` always returns `verification_steps[].email.domain` + `host` + `dns_records`.
  Explanation: This removes the extra lookup only after Go responses reliably include all export fields.
- [ ] Remove `refresh_details` work in `/api/tasks/latest-manual` once manual results already contain full export fields from `/verify`.
  Explanation: Avoid per-email enrichment after the export fields are guaranteed upstream.
- [ ] Remove local upload parsing for credit reservation after Go provides a count preflight or upload response includes counts.
  Explanation: Credits must still reserve by count; removal depends on a reliable count source.
- [ ] Drop per-job count fallback in task detail/download once `metrics.verification_status` + `total_email_addresses` are always present on completion.
  Explanation: Fully eliminate redundant job iteration only after metrics are contractually reliable.
- [ ] Remove `/api/tasks` external refresh fallback once Supabase ingestion is guaranteed for all tasks.
  Explanation: Cache stays, but external refresh becomes redundant when ingestion is complete and verified.

Status: Not implemented yet; awaiting Go confirmations listed above.

## Open questions to resolve before Step 3
- Do Go `/verify` responses include `verification_steps[].email` with `domain`/`host`/`dns_records` for export fields?
- Do Go task detail responses always provide `metrics.verification_status` + `total_email_addresses` on completion for credit settlement?
- Can Go expose a lightweight email-count response for uploads to avoid local parsing?
- Which data ownership boundaries must remain in this app (credits, caching, usage)?

## Testing checklist
- Unit tests for mapping/aggregation logic where compute changes.
- Integration tests for `/api/verify`, `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, `/api/tasks/upload`.
- Manual validation for credits, history, and downloads on real data.
