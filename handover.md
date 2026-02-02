# Handover: Demo User + Marketing Mock Data (Email Verification Dashboard)

## What was done
- **Created a dedicated demo user** in Supabase for screenshots:
  - Email: `boltroute@gmail.com`
  - User ID: `ceb24fa7-d8e6-4833-be9c-e148c6e2ecf8`
  - Password: stored by user (`TZK-hvd5ptz@qzu6vzc`)
- **Seeded ext API Postgres** with realistic demo data for this user:
  - 17 tasks total, **15 completed file-backed tasks** (downloadable in History)
  - 2 manual tasks (1 failed, 1 processing) to show status variety
  - 17,700 completed email jobs with realistic status breakdown
  - API usage data (3 API keys, 30-day usage series, per-purpose totals)
- **Aligned credits balance** in the ext API **ledger** (not DB) using the admin endpoint so `/credits/balance` returns **22,400**.
- **Fixed Overview mapping** so the UI reads ext API `valid/invalid` fields and includes invalid sub-statuses (invalid_syntax/unknown/disposable_domain) in the invalid total.
- **Deployed to main** so the mapping fix is live on `app.boltroute.ai`.

## Why it was done
- Marketing screenshots needed **realistic, consistent data** on `/overview`, `/history`, and `/api`.
- The ext API metrics response uses **`valid/invalid` keys**, while the UI previously expected `exists/not_exists`, which caused **zeros** in the Overview cards.
- Credits were **not driven by direct DB inserts**; the API balance comes from the credits ledger, so a **grant via admin endpoint** was required.

## How it was done (key steps)
### 1) Supabase demo user
- Created via Supabase Admin API.
- User ID: `ceb24fa7-d8e6-4833-be9c-e148c6e2ecf8`.

### 2) Demo dataset and seed script
- **Dataset file:** `backend/scripts/demo_seed_dataset.json`
- **Seed script:** `backend/scripts/seed_demo_user_data.py`
  - Insert-only, scoped to the demo user UUID
  - Populates: `tasks`, `batch_uploads`, `task_email_jobs`, `emails`, `api_keys`, `api_key_usage_daily`, `credit_transactions`

### 3) Credits ledger sync
- Credits must be granted via ext API admin endpoint, not by DB inserts.
- Admin grant used:
  - `POST https://email-verification.islamsaka.com/api/v1/credits/grant?user_id=ceb24fa7-d8e6-4833-be9c-e148c6e2ecf8`
  - Amount: **22,000**
  - Resulting balance: **22,400**

### 4) Overview metrics mapping fix
- File updated: `app/overview/utils.ts`
  - Reads `valid/invalid` keys
  - Sums invalid sub-statuses into invalid total
  - Includes `disposable_domain` in disposable totals
- Test added/updated: `tests/overview-mapping.test.ts`
- Deploy fix after TS build error with explicit `reduce<number>(...)`.

## Current expected UI values (for screenshots)
**Overview cards**
- Credits Remaining: **22,400**
- Total Verifications: **17,700**
- Total Valid: **13,400**
- Total Invalid: **3,000** (1,940 + 350 + 450 + 260)
- Total Catch-all: **1,300**

**History / Overview tables**
- 15 completed file-backed tasks (download buttons present)
- Recent tasks include a processing and failed entry

**API usage page**
- 3 keys: Zapier, N8N, Custom
- Total usage: **9,480** over 30 days

## Deploy status
- Deploy run that failed: `21593228396` (TS error in reducer)
- Deploy run that succeeded: `21593379994` (after fix)
- Current production should include the mapping fix.

## Where to look
- Dataset: `backend/scripts/demo_seed_dataset.json`
- Seed script: `backend/scripts/seed_demo_user_data.py`
- Mapping fix: `app/overview/utils.ts`
- Tests: `tests/overview-mapping.test.ts`
- Progress log: `ui-progress.md`
- Deployment log: `deployment.md`

## Next steps for future session
1. **Verify live values** on `https://app.boltroute.ai/overview` (hard refresh) and take screenshots.
2. If values still show zero:
   - Confirm deploy run status and cache bust.
   - Check metrics payload via API to ensure `valid/invalid` keys still present.
3. Keep demo data isolated to this user; do not edit production rows unless requested.

## Notes
- `.env.ext-api` includes DB access for seeding (already used).
- `key-value-pair.txt` updated by user with demo credentials; left untouched.
- All inserts were scoped to the demo user UUID; no deletes or updates to existing data.
