# Handover — External API First Refactor Prep

## Context & Decisions
- Product direction: external API is the **single source of truth** for verification data, tasks, usage, and API keys.
- Supabase should remain **only** for data the external API does not provide: profiles, credits ledger, billing plans/events/purchases.
- UI must **keep existing fields** (file name, export detail columns) and show **“data unavailable”** if the external API does not yet return them.
- Credit flow direction: external API writes spend/usage into Supabase; backend should not track or reserve credits locally once refactor starts.
- Usage/credits labels remain as-is; map external metrics to the existing UI expectations.

## Work Completed This Session
- Read external API docs under `ext-api-docs/` and inspected backend/frontend usage patterns.
- Produced a detailed, phased refactor plan in `refactor.md` (tasks/subtasks, what/why/how, target end state).
- Updated `PLAN.md` to track and complete the refactor plan doc task.

## Key Files Added/Updated
- `refactor.md` — external-API-first transition plan with dependencies and UI fallback rules.
- `PLAN.md` — added and completed the refactor plan task; added a new handover task (now to be completed).

## External API Dependencies (Must Be Confirmed/Implemented)
These are required for full parity without reintroducing local caches:
- Task list/detail returns `file_name` (or equivalent) for uploads.
- Manual verification export detail fields are available to user-scoped requests (currently admin-only `/emails`).
- External API writes credit usage/spend into Supabase.
- External metrics align with UI expectations for “credits used”/usage totals.

If any dependency is missing, keep the UI fields and show “data unavailable” until the external API ships them.

## Current Repo State Notes
- Repo is **dirty** with many existing changes (not made in this session). Do **not** revert unless explicitly asked.
- A previous `handover.md` was deleted in the working tree; this new file replaces it.

## Next Steps (For the Next Session)
1) **Confirm external API dependencies** listed above (Phase 0 in `refactor.md`).
2) **Begin Phase 1** from `refactor.md`: remove task caching and proxy tasks directly to the external API.
3) After each step, **update `PLAN.md`** and **ask for user confirmation** before proceeding (per AGENTS.md).
4) Ensure UI shows “data unavailable” where external API doesn’t return fields yet.
5) Run backend tests with the Python venv activated if tests are required.

## Required Process Rules (From AGENTS.md)
- For code changes: state the plan first, update root plan/progress markdown **after each completion**, and ask for confirmation before starting the next task.
- Avoid hardcoding and prefer external API capabilities.
- Activate Python venv before running tests.

## Pending Clarifications
- External API developer confirmation on API-key usage association to user for metrics.
- Exact field mapping for usage/credits totals in external metrics.

