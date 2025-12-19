# Paddle Billing Integration Plan (New API)

Goal: add Paddle Billing (new API, not Classic) for pricing/checkout/subscriptions/credit top-ups using sandbox first. Keep MVP small, production-ready, and aligned with existing FastAPI + Next.js stack. No hardcoded fallbacks; surface failures with logs.

## Assumptions & inputs
- Env already provides sandbox Paddle Billing keys, client-side token, plan definitions JSON, seller ID, checkout script URLs, IP allowlists, and status flag (`PADDLE_STATUS`, `PADDLE_BILLING_*`). Use sandbox until prod keys are provided.
- Credits live in Supabase (`user_credits`); purchases must translate plan metadata (credits per plan) into credit grants.
- Pricing page has buy buttons we can wire to backend endpoints; FastAPI sits between frontend and Paddle.
- Use Paddle MCP for docs/actions when needed; use Context7 if MCP misses details.

## Folder/ownership
- Backend: add `backend/app/paddle/` (or `backend/app/services/paddle_*`) for Paddle client, webhook verifier, checkout/session helpers, and plan metadata loader. Keep routes under `backend/app/api/billing.py` (auth required) to create checkouts/portal links and expose price/catalog info.
- Frontend: reuse existing pricing page; add `app/lib/paddle.ts` for Paddle.js loader and hook buy buttons to backend checkout endpoint. No secrets on the client.
- Tests: `backend/tests/paddle_*` for client selection, webhook verification, and credit grant logic.

## Step-by-step plan (MVP first)
1) **Config loader (sandbox/prod switch):** centralize Paddle Billing settings (base URL, API key, client-side token, webhook secret, checkout script URL, plan definitions) with explicit env validation; select sandbox vs prod via `PADDLE_STATUS`. Fail fast when required values are missing.
2) **Paddle HTTP client + MCP alignment:** implement a lightweight Paddle Billing client (or reuse MCP read calls during dev) covering create/list products/prices and create transaction/checkout links. Attach seller metadata and user identifiers (Supabase user_id/email) in `custom_data`/`metadata` to map back on webhooks.
3) **Catalog/plan mapping:** use Supabase `billing_plans` as the source of truth (synced from Paddle). Provide an endpoint to return available plans to the frontend with price IDs, credits, amount, and currency; reject unknown price_ids at transaction time.
4) **Checkout/session endpoint:** backend route that takes a plan/price_id and quantity, creates a Paddle Billing transaction (or checkout) server-side, and returns the checkout URL/ID for Paddle.js. Include customer creation/upsert (using email + supabase user_id in metadata) before transaction creation. Log and propagate errors; no client-side secrets.
5) **Frontend wiring:** load Paddle.js from env `PADDLE_BILLING_*_CHECKOUT_SCRIPT`, initialize with `PADDLE_CLIENT_SIDE_TOKEN`, and call the backend checkout endpoint from the pricing buy buttons. Handle success/cancel redirects and show errors without silent fallbacks.
6) **Webhook ingestion:** add `/api/paddle/webhook` route verifying HMAC/signature and IP allowlists (use sandbox/prod IP lists). Store raw events with dedupe (event_id) and process relevant types: `transaction.completed`, `subscription.*`, `payment.*`. Map events to user via metadata; log and skip if mapping fails.
7) **Credit granting & subscription state:** on successful charge/renewal, increment `user_credits` per plan metadata (e.g., credits field) and store purchase history (amount, currency, transaction_id, price_id). Track subscription status/next_billing where applicable. Do not deduct credits here; only grant.
8) **Customer portal (optional after MVP):** add backend route to create a customer portal session (Paddle Billing) so users can manage payment methods/cancel. Frontend “Manage billing” button can link to this when enabled.
9) **Testing/simulation:** use Paddle sandbox + MCP simulations or Paddle Billing webhook simulator to test checkout + webhooks. Add backend tests for config selection, webhook verification, and credit grant pipeline. Manual flow: create transaction via backend, pay in sandbox, observe webhook updating credits.
10) **Observability & safety:** structured logs on every Paddle call/webhook, idempotent handlers, and retries/backoff for webhook side-effects. Capture failures in Supabase table (e.g., `billing_events`) for replay/diagnostics. No secrets in logs.

## Answer to folder question
- Yes: keep Paddle integration in a dedicated backend folder (`backend/app/paddle/` plus `api/billing.py`) and a small frontend helper (`app/lib/paddle.ts`). This isolates billing concerns, keeps secrets server-side, and lets us iterate without touching unrelated modules.

## Next implementation steps (proposed)
- Implement config + client module and add a billing API route skeleton (no business logic yet).
- Add webhook verifier + event storage/dedupe skeleton.
- Wire pricing buy buttons to call the checkout endpoint (sandbox), then test end-to-end in sandbox with MCP/webhook simulator.

## Open TODOs (prioritized)
High priority
1) **Webhook signature verification alignment**
   - Confirmed signing scheme via official Paddle SDK implementation (`Paddle-Signature` header, `ts` + `h1` values, HMAC-SHA256 of `ts:raw_body`).
   - Added verification tests and time drift checks with `PADDLE_WEBHOOK_MAX_VARIANCE_SECONDS`.
   - Status: implemented.

2) **Webhook ingress IP handling**
   - Added proxy-aware client IP resolution with configurable header format + hop count.
   - Added tests for direct and proxied allowlist resolution.
   - Status: implemented (requires env to set `PADDLE_WEBHOOK_TRUST_PROXY` and forwarding settings).

3) **Address requirement validation per country**
   - Enforce required address fields based on target country rules (postal/region, etc.).
   - Fail fast with clear logs if required defaults are missing.
   - Status: not implemented; requires target country list.

Medium priority
4) **Subscription lifecycle coverage**
   - Handle renewals, payment failures, and other subscription events consistently.
   - Ensure idempotent persistence and credit grants remain correct.
   - Status: not implemented.

5) **Plan price lookup caching**
   - Add short-lived caching for `/api/billing/plans` price fetches to reduce API load.
   - Status: not implemented.

Low priority
6) **Customer portal session**
   - Add backend endpoint to create portal sessions and UI link.
   - Status: not implemented.

7) **Frontend price preview**
   - Use Paddle price preview to show localized totals before checkout.
   - Status: not implemented.

## MVP plan catalog + credits wiring (new)
Scope: one-time credit packs (non-recurring), credits never expire.

MVP flow (confirmed)
1) **Catalog source of truth**
   - Store plan → credits mapping in Supabase (e.g., `billing_plans`).
   - Do not grant credits if a price_id is not present in Supabase; log and return safely.

2) **Checkout**
   - Backend creates Paddle transaction and injects `supabase_user_id` in `custom_data`.
   - Frontend opens checkout using `transactionId`.

3) **Webhook credit grant**
   - Verify signature, dedupe via `billing_events`.
   - Map price_id → credits from Supabase; increment `user_credits` (sum with existing).

4) **Usage deduction**
   - Atomically decrement credits when verification tasks are accepted.
   - Reject when insufficient; keep idempotency to avoid double-deduction.

Confirmed MVP plan details (sandbox)
- Currency: USD
- Billing: one-time credit packs (no recurring billing cycle); UI label “/month” is a typo and will be ignored for billing.
- Basic: $29 for 10,000 credits
- Professional: $129 for 100,000 credits
- Enterprise: $279 for 500,000 credits
- Custom: contact-only for now (no Paddle product/price yet)
- Tax: prices are tax-inclusive (set price taxMode to `internal`)
- Sandbox IDs (created)
  - Basic: product `pro_01kcvp3asd8nb0fnp5jwmrbbsn`, price `pri_01kcvp3r27t1rc4apy168x2n8e`
  - Professional: product `pro_01kcvp3brdtca0cxzyzg2mvbke`, price `pri_01kcvp3sycsr5b47kvraf10m9a`
  - Enterprise: product `pro_01kcvp3d4zrnp5dgt8gd0szdx7`, price `pri_01kcvp3wceq1d9sfw6x9b96v9q`

Plan changes (best-practice)
- Source of truth for billing catalog is Paddle. Supabase mirrors it for dashboard + credits mapping.
- Change flow: update in Paddle first, then run a sync to update `billing_plans` in Supabase.
- MVP sync: provide a manual admin script or admin API endpoint to pull Paddle products/prices and upsert `billing_plans`.
- Edit pricing: create a new Paddle price (do not mutate old price_id), upsert new row in Supabase, mark old row inactive.
- Remove plan: archive in Paddle, mark Supabase row inactive (keep historical rows for webhook mapping).

Admin sync script (MVP)
- Script: `backend/scripts/sync_paddle_plans.py`
- Requires `PADDLE_STATUS` and the matching `PADDLE_BILLING_*_API_URL` + `PADDLE_BILLING_*_API_KEY`, or pass `--environment/--api-url/--api-key`.
- Example: `PYTHONPATH=backend python backend/scripts/sync_paddle_plans.py --product-status active,archived --price-status active,archived`
- Behavior: normalizes pagination cursors, skips invalid rows with warnings, and fails only if no valid rows are produced.

1) **Create Paddle sandbox products/prices for 3 plans**
   - Basic, Professional, Enterprise (Custom is contact-only).
   - Store the resulting Paddle product_id/price_id in Supabase (not in code/env).
   - Status: implemented; sandbox products/prices created and IDs captured for Supabase sync.

2) **Supabase-backed plan catalog**
   - New table (e.g., `billing_plans`) with plan_name, paddle_product_id, paddle_price_id, credits, currency, amount, metadata.
   - `/api/billing/plans` reads from this table and returns pricing + credits to the frontend.
   - Status: implemented; `billing_plans` is now the catalog source for `/api/billing/plans`.

3) **Transaction creation uses catalog validation**
   - `/api/billing/transactions` validates incoming price_id against catalog and injects supabase_user_id into custom_data.
   - Status: implemented; transactions reject unknown price_ids and include `supabase_user_id` in custom_data.

4) **Webhook credit grants use catalog mapping**
   - On transaction completion, map price_id → credits from Supabase catalog and increment `user_credits`.
   - Keep idempotency via `billing_events`.
   - Status: implemented; webhook uses `billing_plans` mapping and logs when no credits are found.

5) **Credit deduction on usage**
   - Atomically decrement credits when tasks/verification are accepted.
   - Reject if insufficient; log and return explicit errors.
   - Status: not implemented.
