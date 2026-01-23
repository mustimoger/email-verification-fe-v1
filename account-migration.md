# Account migration plan (local → external API)

## Goal (what/where/why/how)
- What: Migrate `/account` page data flows to the external API wherever possible, while keeping profile/auth and other non-external flows local.
- Where: `/account` UI (`app/account/*`), dashboard header (`app/components/dashboard-shell.tsx`), API client (`app/lib/api-client.ts`), and remaining local account routes (`backend/app/api/account.py`).
- Why: The external API is the source of truth for billing and credit data; minimizing local proxies reduces drift.
- How: Audit each `/account` feature, switch to external endpoints when available, keep Supabase-backed features only when no external endpoint exists, and document blockers.

## Step-by-step plan

### Step 1 — Audit `/account` data sources and external replacements
- What: Map each `/account` feature to its current local endpoint and any external replacement.
- Where: `app/account/account-client.tsx`, `app/components/dashboard-shell.tsx`, `app/lib/api-client.ts`, `backend/app/api/account.py`.
- Why: Establish the migration scope and identify blockers.
- How: Inspect the current API client usage and cross-reference ext API docs.
- Status: Completed.
- Done:
  - Profile read/update: local `/api/account/profile` (Supabase profiles); no external endpoint documented.
  - Avatar upload: local `/api/account/avatar` (Supabase storage); no external endpoint documented.
  - Credits overview: local `/api/account/credits` (proxy) → external `/api/v1/credits/balance`.
  - Purchase history: local `/api/account/purchases` (Supabase credit_grants) → no 1:1 external purchase endpoint; closest is `/api/v1/credits/transactions` (missing invoice/checkout fields).
  - Header profile (DashboardShell): local `/api/account/profile`.
  - Header credits (DashboardShell): external `/api/v1/credits/balance` already used.

### Step 2 — Switch credits overview to external API
- What: Load credits on `/account` directly from the external API.
- Where: `app/account/account-client.tsx`, `app/lib/api-client.ts`.
- Why: Remove the local proxy for credit balance.
- How: Replace `apiClient.getCredits()` with `externalApiClient.getCreditBalance()` and map `balance` to the UI `credits_remaining`.
- Status: Completed.
- Done:
  - Switched the `/account` credits load to `externalApiClient.getCreditBalance()` and mapped `balance` to the existing UI shape, so the card no longer calls the local `/account/credits` proxy.

### Step 2a — Prevent checkout email overflow in purchase history
- What: Truncate long checkout emails in the purchase history table to avoid column overflow.
- Where: `app/account/account-client.tsx`.
- Why: Long emails overflow the fixed table layout and break the visual alignment.
- How: Apply a fixed width and `truncate` styling to the checkout email cell in both desktop and mobile layouts.
- Status: Completed.
- Done:
  - Added fixed-width `truncate` styling for the checkout email column on desktop and mobile to prevent overflow, while preserving the full value in a `title` tooltip.

### Step 2b — Ensure checkout email truncation renders ellipsis
- What: Make sure truncation renders `…` reliably for long emails.
- Where: `app/account/account-client.tsx`.
- Why: `truncate` does not apply on inline elements, so long emails can still overflow.
- How: Use block-level elements for the checkout email cell and keep the fixed width + `truncate` styling.
- Status: Completed.
- Done:
  - Converted the checkout email value to a block-level element so `truncate` renders ellipses consistently.

### Step 2c — Allow checkout email truncation to shrink in tight layouts
- What: Ensure the checkout email cell can shrink below its fixed width when space is tight.
- Where: `app/account/account-client.tsx`.
- Why: Flex/grid items can retain their content width unless `min-w-0`/`max-w-full` is applied, causing overflow.
- How: Add `min-w-0` and `max-w-full` to the truncated checkout email span in both desktop and mobile layouts.
- Status: Completed.
- Done:
  - Added `min-w-0` and `max-w-full` to the checkout email cells so truncation can shrink without overflow.

### Step 2d — Add invoice download link for purchase history
- What: Provide an on-demand invoice PDF link for each purchase in the Invoice column.
- Where: `app/account/account-client.tsx`, `backend/app/api/account.py`, API client.
- Why: Users need a direct way to download invoices from the purchase history table.
- How: Add a backend endpoint that calls Paddle’s invoice PDF API using the transaction ID and returns a short-lived signed URL; wire the UI to fetch the URL on click and open/download it.
- Status: Pending.

### Step 3 — Evaluate purchase history migration
- What: Move purchase history to the external API if it can supply the required fields.
- Where: `app/account/account-client.tsx`, `app/lib/api-client.ts`.
- Why: Reduce local dependency on Supabase reads when external data is sufficient.
- How: Compare `/api/v1/credits/transactions` fields with the purchase table requirements (invoice, checkout email, price IDs). If fields are missing, keep the Supabase-backed flow and document the gap.
- Status: Pending (blocked until external credits metadata supports purchase fields).

### Step 4 — Profile data source decision
- What: Determine if profile read/update can move off local `/account/profile`.
- Where: `app/account/account-client.tsx`, `app/components/dashboard-shell.tsx`.
- Why: Minimize local data pulls where external endpoints exist.
- How: If an external profile endpoint is documented, migrate; otherwise keep local and document the blocker.
- Status: Blocked (no external profile endpoint documented).

### Step 5 — Avatar upload decision
- What: Determine if avatar uploads can move off local `/account/avatar`.
- Where: `app/account/account-client.tsx`, `backend/app/api/account.py`.
- Why: Prefer external ownership of user assets when available.
- How: If an external avatar upload endpoint is documented, migrate; otherwise keep Supabase storage flow.
- Status: Blocked (no external avatar endpoint documented).

### Step 6 — Validation and regression checks
- What: Ensure `/account` still loads profile, credits, and purchases correctly after migrations.
- Where: `/account` UI, API client tests.
- Why: Prevent regressions on account settings and billing history.
- How: Run existing unit tests (if any) and do a Playwright smoke check on `/account`.
- Status: Pending.

### Step 7 — Remove unused local account routes (only if fully migrated)
- What: Retire local `/api/account/*` routes that are no longer used.
- Where: `backend/app/api/account.py`, `backend/app/main.py`, related tests.
- Why: Reduce local API surface area and drift.
- How: Confirm all callers are migrated, then remove routes and update tests.
- Status: Pending.

## STAYED-LOCAL
- Supabase Auth reauthentication and updates for email/password (`supabase.auth.signInWithPassword`, `supabase.auth.updateUser`).
- Profile read/update via `/api/account/profile` (Supabase profiles) until an external profile endpoint exists.
- Avatar upload via `/api/account/avatar` (Supabase storage) until an external avatar endpoint exists.
- Purchase history via `/api/account/purchases` (Supabase credit_grants written by external events) until external transactions include invoice/checkout details.
- Supabase session state for gating account access.

## Progress updates
- Created this plan to track `/account` migration steps and capture the local → external mappings for future sessions.
- Completed Step 1 by auditing `/account` dependencies and documenting external replacements and blockers.
