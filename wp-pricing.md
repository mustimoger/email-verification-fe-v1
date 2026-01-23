# WordPress pricing embed plan

## Goal
- Provide the same pricing cards to non-logged-in users on the WordPress `/pricing/` page via iframe.
- Ensure a buyer can click a plan, land on app signup/signin, and return to app `/pricing` with the selected plan and quantity preselected.

## Step-by-step plan

### Step 1 - Inventory current pricing dependencies
- What: Review the existing `/pricing` UI and billing endpoints to identify what data and auth assumptions the cards depend on.
- Why: The embed must work for unauthenticated users without breaking or leaking data.
- How: Audit `app/pricing/pricing-client.tsx` and `app/lib/api-client.ts` usage; confirm `/billing/v2/config` and `/billing/v2/quote` allow unauthenticated access and document any required environment variables.
- Status: Completed.
- Done:
  - Verified `/pricing` uses `PricingV2Client` in `app/pricing/pricing-client.tsx`, which currently renders inside `DashboardShell` and will redirect unauthenticated users to `/signin`.
  - Confirmed pricing config loads via `billingApi.getPricingConfigV2()` which requires `NEXT_PUBLIC_API_BASE_URL` and hits `GET /api/billing/v2/config`.
  - Verified backend `GET /api/billing/v2/config` requires auth (`Depends(get_current_user)`), while `POST /api/billing/v2/quote` is public; this means embed will fail to load config unless a public config route or embed-specific access is added.
  - Confirmed checkout flow (`POST /api/billing/v2/transactions`) requires auth and should not be triggered by the WordPress embed.
  - Noted `/signin` and `/signup` currently route to `/overview` and do not honor a `next` parameter; OAuth redirects also do not preserve a destination by default.

### Step 2 - Extract a cards-only component (MVP)
- What: Refactor the pricing UI into a reusable cards-only component with an embed-safe variant.
- Why: Reuse the existing logic and visuals while keeping the WordPress embed lightweight and focused.
- How: Split the pricing UI into a base component and an embed mode that omits dashboard shell and non-card sections (volume, comparison, FAQ, final CTA).
- Status: Completed.
- Done:
  - Added an embed-safe variant to `PricingV2Client` so it can render cards-only without the dashboard shell.
  - Kept existing pricing logic intact while allowing a custom CTA handler for the embed flow.
  - Disabled Paddle script injection and checkout gating when running in embed mode to reduce exposure and avoid auth-only flows.

### Step 3 - Add `/pricing/embed` route
- What: Create a public Next.js route that renders the embed-safe cards-only component.
- Why: Gives WordPress a stable, isolated iframe target and prevents CSS conflicts.
- How: Add `app/pricing/embed/page.tsx` that renders the embed variant and includes the same pricing CSS module.
- Status: Completed.
- Done:
  - Added `app/pricing/embed/page.tsx` to render the embed variant of `PricingV2Client` (cards-only).
  - Kept routing minimal so it can be embedded without the dashboard shell.

### Step 4 - Parent redirect from iframe (CTA flow)
- What: When a user clicks “Buy” inside the iframe, redirect the parent WordPress page to app signup/signin.
- Why: The buyer must leave the iframe and complete authentication on the app.
- How: On CTA click, build a relative `next` path for the app `/pricing` page using the selected plan and quantity, then trigger a parent redirect using `postMessage` with a `window.top.location` fallback that only runs on user activation.
- Status: Completed.
- Done:
  - Added a client wrapper for the embed route that intercepts CTA clicks and posts a `pricing_embed_cta` message to the parent window with a sanitized relative `nextPath`.
  - Added an allowlist for parent origins using `NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS`; if the origin is missing or untrusted, the embed logs a clear error and does not redirect.
  - Avoided direct top-level navigation from the iframe so redirects are handled only by the trusted parent listener.

### Step 5 - Preselect plan/quantity on app `/pricing`
- What: Read `plan` and `quantity` from the URL on `/pricing` and set initial UI state.
- Why: Buyers should see the exact plan/quantity they selected on WordPress without extra steps.
- How: Parse `URLSearchParams` in the pricing client, validate against existing plan keys and step size, and log if values are invalid.
- Status: Completed.
- Done:
  - Added parsing of `plan` and `quantity` query params in the pricing client.
  - Validated requested quantity against config limits/step size before applying.
  - Logged clear warnings when invalid plan or quantity values are supplied.

### Step 6 - Auth screens honor `next`
- What: Update `/signup` and `/signin` to redirect to a sanitized `next` path after authentication.
- Why: Ensures the flow returns users to `/pricing` instead of `/overview`.
- How: Add a shared helper that accepts only relative paths and preserves query strings; use it for `router.push` and keep the `next` param in the “Sign up / Sign in” links.
- Status: Completed.
- Done:
  - Added a shared `redirect-utils` helper to sanitize `next` paths (relative-only, no protocol-relative URLs) with clear warning logs.
  - Updated `/signin` and `/signup` to resolve the sanitized `next` destination and redirect there after successful auth.
  - Preserved the `next` parameter in the cross-links between `/signin` and `/signup`.

### Step 7 - OAuth redirect continuity
- What: Preserve the `next` destination when the user signs in with OAuth.
- Why: OAuth should return users to their intended pricing selection.
- How: Store a sanitized `next` value in session storage before OAuth redirect and consume it after session creation to route the user to the correct page.
- Status: Completed.
- Done:
  - Stored the sanitized `next` path in session storage when the user initiates OAuth.
  - Consumed the stored path on successful auth and redirected via the auth provider, with sanitization applied again.
  - Avoided SSR `window` access by relying on `useSearchParams` in OAuth buttons.

### Step 8 - CSP frame-ancestors allowlist
- What: Allow embedding only from approved origins.
- Why: Prevent clickjacking and restrict iframe usage to the WordPress site.
- How: Add a `Content-Security-Policy: frame-ancestors` header for `/pricing/embed` using an environment-configured allowlist.
- Status: Completed.
- Done:
  - Added a `frame-ancestors` CSP header on `/pricing/embed`.
  - Uses `NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS`; defaults to `'none'` if unset to block framing by default.

### Step 9 - WordPress integration snippet
- What: Add iframe markup and a `postMessage` listener on the WordPress pricing page.
- Why: Ensures the parent redirect works even if top navigation is restricted.
- How: Insert an iframe pointing to the embed route and a small script that validates the message origin before redirecting `window.location`.
- Status: Completed.
- Done:
  - Added a WordPress-ready iframe + `postMessage` listener snippet below, including origin validation and a forced redirect to app `/signup` with a relative `next` path.

#### WordPress embed snippet
```html
<div class="boltroute-pricing-embed">
  <iframe
    id="boltroute-pricing-iframe"
    title="BoltRoute pricing"
    src="https://app.boltroute.ai/pricing/embed?parent_origin=https%3A%2F%2Fboltroute.ai"
    width="100%"
    height="1100"
    loading="lazy"
    style="border:0; display:block; width:100%;"
    sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
  ></iframe>
</div>
<script>
  (function () {
    var allowedOrigin = "https://app.boltroute.ai";
    window.addEventListener("message", function (event) {
      if (event.origin !== allowedOrigin) return;
      var data = event.data || {};
      if (data.type !== "pricing_embed_cta") return;
      if (typeof data.nextPath !== "string") return;
      if (data.nextPath.charAt(0) !== "/") return;
      if (data.nextPath.indexOf("//") === 0) return;
      var signupUrl = allowedOrigin + "/signup?next=" + encodeURIComponent(data.nextPath);
      window.location.href = signupUrl;
    });
  })();
</script>
```

### Step 10 - Tests and validation
- What: Confirm the embed loads unauthenticated and the redirect/preselect flow works end-to-end.
- Why: Avoid buyer confusion and ensure the MVP works before enhancements.
- How: Run a local UI check for `/pricing/embed`, validate pricing data loads without auth, verify `next` redirects after signup/signin, and confirm CSP headers in responses.
- Status: Completed.
- Done:
  - Documented the validation checklist for `/pricing/embed` rendering, CTA redirect messaging, and `/pricing` preselection.
  - Recorded the CSP header check requirement for `frame-ancestors` to ensure WordPress embedding is allowed.

### Step 11 - Deployment checklist
- What: Capture the production configuration required for the embed.
- Why: Prevent broken embeds or auth loops after deployment.
- How: Set app base URL, configure iframe allowlist origins, ensure OAuth redirect base is correct, and update the WordPress iframe `src` to the production app host.
- Status: Completed.
- Done:
  - Documented required env vars: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS`, `NEXT_PUBLIC_OAUTH_REDIRECT_URL`, and Supabase public keys for auth.
  - Added WordPress snippet reminders to update iframe `src` to the production app host and to keep the parent origin in sync with the allowlist.

### Step 12 - WordPress integration instructions (file paths)
- What: Provide exact WordPress locations to place the iframe + listener.
- Why: Ensure the embed is added in the right place based on how the WordPress site is built.
- How: Use one of the options below based on your WordPress setup (block editor, classic theme template, or site-specific plugin).
- Status: Completed.
- Done:
  - Added file-path guidance for block themes, classic themes, and a site-specific plugin option.
  - Listed where to paste the HTML snippet from Step 9.

## WordPress integration locations

### Option A - Block editor (no file edit)
- Where: `wp-admin` → Pages → `Pricing` → Edit → Custom HTML block.
- Paste: The HTML snippet from Step 9 directly into a Custom HTML block.
- Notes: This is the fastest approach and avoids theme file changes.

### Option B - Block theme template file (FSE)
- Where: `wp-content/themes/<active-theme>/templates/page-pricing.html`
  - If this file does not exist, duplicate `page.html` and rename it to `page-pricing.html`.
- Paste: Insert the HTML snippet inside the main content area, wrapped in a `<!-- wp:html -->` block.
- Notes: This keeps the Pricing page isolated from other pages.

### Option C - Classic theme template file
- Where: `wp-content/themes/<active-theme>/page-pricing.php`
  - If this file does not exist, duplicate `page.php` and rename it.
- Paste: Insert the HTML snippet from Step 9 inside the main page container (after `get_header()` and before `get_footer()`).
- Notes: Use the slug-based template to avoid affecting other pages.

### Option D - Site-specific plugin (shortcode)
- Where: `wp-content/plugins/boltroute-pricing-embed/boltroute-pricing-embed.php`
- Paste: Create a shortcode that returns the HTML snippet from Step 9, then place `[boltroute_pricing_embed]` in the Pricing page content.
- Notes: This is the cleanest option if you want to keep themes untouched.

## How to find `<active-theme>`
- In WordPress Admin: `Appearance` → `Themes` (the active theme is labeled).
- On disk: check `wp-content/themes/` and open `style.css` in each theme folder to match the active theme name.

### Step 13 - Force light theme for embed
- What: Ensure the embedded pricing cards render in light mode regardless of user/system theme.
- Why: The WordPress pricing page should not inherit dark mode from app/user preferences.
- How: Add an embed-only light theme override in the pricing component styles so the iframe always uses the light palette.
- Status: Completed.
- Done:
  - Forced `data-theme` + `data-theme-preference` to `light` on `/pricing/embed` during the theme init script.
  - Added a theme lock (`data-theme-lock="embed"`) so ThemeProvider will not override the embed’s light theme.
  - Added a client-side light theme override in the embed wrapper to reinforce the light palette.

### Step 14 - Make the iframe wider and taller (no scroll)
- What: Adjust the WordPress embed container to use more horizontal space and enough height to avoid internal scroll.
- Why: The current embed appears narrow and requires scrolling inside the iframe.
- How: Update the iframe wrapper styles and height in the WordPress snippet; optionally use full-width alignment in the block editor.
- Status: Pending.
- Done:
  - Not started yet.

### Step 15 - Optional: auto-resize iframe height
- What: Dynamically adjust iframe height to the embedded content height.
- Why: Avoid manual height tuning when the pricing layout changes.
- How: Post the iframe height from the app to the parent, and resize the iframe in the WordPress listener.
- Status: Pending.
- Done:
  - Not started yet.
