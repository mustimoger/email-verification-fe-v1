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
3) **Catalog/plan mapping:** parse `PADDLE_BILLING_PLAN_DEFINITIONS` (product_id/price_id/credits metadata). Add a small Supabase cache/table if needed for display, but primary source remains env + Paddle list verification. Provide an endpoint to return available plans to the frontend with price IDs and credit payloads.
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
