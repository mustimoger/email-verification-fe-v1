# Blog Post Template + 6 Post Migration Plan

This document defines the exact plan to:

1. Build a reusable blog post template in the new Next.js project.
2. Copy 6 posts from the current WordPress site (`https://boltroute.ai/blog/`) into this project.

Project decisions already confirmed:

- Source site: `https://boltroute.ai` (WordPress).
- Destination: this project (`/home/codex/br-website1`).
- Keep exact slugs from old site.
- Old site will be removed after migration.
- Use current project fonts (do not import WordPress fonts).
- Copy featured and in-body images into: `/home/codex/br-website1/public/post-lp`.
- Mobile responsive is required.
- Internal link cleanup is deferred until after post copy.
- Migrate only 6 blog posts.
- Article schema + FAQ schema must be present.

---

## 1) Scope And Output

### Output A: Reusable blog post template
Template must support:

- Hero (custom design from sample + your screenshot approvals).
- Author data + publish date.
- Table of contents (TOC).
- Rich content blocks:
  - headings
  - paragraphs
  - lists
  - tables
  - bold/italic/link formatting
- Featured image + inline images.
- FAQ section rendering from frontmatter.
- Schema output:
  - `Article`
  - `FAQPage` (when FAQ exists)

### Output B: 6 migrated posts
Each post must:

- Keep original slug.
- Keep title/date/author/category/tags when available.
- Keep featured image and in-body images (served from `/public/post-lp`).
- Preserve readable structure/content fidelity.
- Validate on desktop + mobile.

---

## 2) Source Extraction Strategy (Item 1 - explained)

Use a hybrid extraction approach:

1. WordPress source extraction (preferred)
- Pull post HTML + metadata from WordPress endpoints when available (`/wp-json/wp/v2/...`).
- This provides reliable structured fields: title, slug, date, author, excerpt, categories, featured media.

2. Visual parity extraction (required)
- Use Playwright MCP against the reference template and target post pages.
- Capture section-level layout, spacing, sizes, alignment, and responsive behavior.
- Implement section by section with your screenshot approvals.

3. Conversion to project format
- Convert source HTML to clean MDX content compatible with this project.
- Store final content in `content/posts/*.mdx` with required frontmatter.

Why hybrid:
- API/HTML gives complete content and metadata quickly.
- Playwright + screenshots ensures design fidelity and responsive behavior.

---

## 3) Template Build Plan (Section-by-section)

Reference template URL:
`https://saatosa.framer.website/blog/scaling-your-business-to-with-saas-guide-growth-and-flexibility`

### Phase 1: Baseline audit
1. Inspect existing rendering path in this repo:
- `src/app/[slug]/page.tsx`
- `src/components/mdx/MDXComponents.tsx`
- `src/lib/mdx.ts`
- `velite.config.ts`

2. Define what can be reused vs what needs new components.

3. Lock breakpoints for validation:
- Desktop (>= 1280)
- Tablet (~768)
- Mobile (~375-430)

### Phase 2: Section implementation loop
For each section, repeat this exact loop:

1. You provide screenshot of the target section.
2. I inspect the same section on the sample URL using Playwright MCP.
3. I capture measurements/details (spacing, typography scale, container widths, block order).
4. I implement only that section in project stack (Next.js + Tailwind + existing fonts).
5. I verify at desktop/tablet/mobile.
6. I submit for your review before moving to next section.

Planned section order:
1. Hero (special, custom discussion required)
2. Post meta row (author/date/category)
3. TOC block
4. Main content typography system (h2/h3/p/lists/links/emphasis)
5. Table styling block
6. Inline image/caption block
7. FAQ block
8. Bottom spacing + related/closing block (if needed)

### Phase 3: Template hardening
1. Ensure all sections use existing project font setup.
2. Ensure no layout shift from large images/tables.
3. Ensure mobile overflow protection (tables/images/code blocks).
4. Validate schema still emitted correctly from page render.

---

## 4) Content Model And File Conventions

### Frontmatter standard per post
Use this structure (existing schema-compatible):

```md
---
type: post
title: "..."
slug: "..."
date: "YYYY-MM-DD"
category: "..."
tags:
  - ...
coverImage: "/post-lp/<post-slug>/featured-..."
metaTitle: "..."
metaDescription: "..."
canonical: "https://boltroute.ai/<slug>"
author:
  name: "..."
  url: "..."
faq:
  - question: "..."
    answer: "..."
---
```

### Image storage convention
- Base directory: `/home/codex/br-website1/public/post-lp`
- Per-post folder:
  - `/public/post-lp/<post-slug>/`
- Suggested filenames:
  - `featured.<ext>`
  - `inline-01.<ext>`, `inline-02.<ext>`

### MDX file location
- `content/posts/<slug>.mdx`

---

## 5) 6-Post Migration Plan

### Phase 0: Post list freeze
1. Create a final list of 6 source URLs from `https://boltroute.ai/blog/`.
2. Freeze this list to avoid mid-migration scope changes.

### Phase 1: Per-post extraction
For each of the 6 posts:

1. Extract metadata:
- title
- slug (must match current)
- date
- author
- category/tags
- meta title/description if available

2. Extract content body:
- headings
- paragraphs
- lists
- tables
- emphasis (`bold`, `italic`)
- FAQs (if present in post)

3. Download assets:
- featured image
- all in-body images
- place under `/public/post-lp/<slug>/`

### Phase 2: Transform to MDX
For each post:

1. Convert HTML body to clean MDX.
2. Normalize unsupported markup.
3. Keep semantic structure (especially headings for TOC).
4. Add frontmatter fields required by `velite.config.ts`.

### Phase 3: Render + compare
For each post:

1. Build/run locally.
2. Open new post path (`/<slug>`).
3. Compare with old post for:
- content completeness
- heading order
- table rendering
- image placement
- TOC correctness
- FAQ rendering

### Phase 4: QA checklist per post
Pass criteria:

- Exact slug works.
- Hero/layout matches approved template.
- Featured image appears.
- In-body images appear and are not distorted.
- TOC anchors jump to correct headings.
- Tables are readable on mobile (scroll if needed).
- Author/date visible and correct.
- Article schema present.
- FAQ schema present if FAQ exists.
- No console errors.

---

## 6) Schema Requirements

### Article schema
Ensure final page outputs:

- `@type: Article`
- `headline`
- `description`
- `datePublished`
- `dateModified`
- `author`
- `image`
- `url`

### FAQ schema
When `faq` exists in frontmatter, output:

- `@type: FAQPage`
- `mainEntity` question/answer pairs

Note:
Current implementation already includes schema generation in `src/app/[slug]/page.tsx`; template changes must not break this.

---

## 7) Responsive Requirements

Minimum responsive checks for every section and migrated post:

1. Mobile (375x812 and 430x932)
2. Tablet (768x1024)
3. Desktop (1440 width)

Must verify:

- No horizontal overflow.
- TOC remains usable.
- Tables remain readable (stack or horizontal scroll strategy).
- Typography hierarchy remains clear.
- Spacing remains consistent with approved design.

---

## 8) Execution Sequence (Practical)

1. Build template skeleton in current blog post route/components.
2. Implement section-by-section using your screenshots + Playwright.
3. Finalize template sign-off.
4. Migrate 2 pilot posts first.
5. QA pilot posts.
6. Migrate remaining 4 posts.
7. Final QA sweep across all 6.

---

## 9) Risks And Mitigations

1. WordPress HTML contains unsupported/odd blocks.
Mitigation: define conversion rules and manual fallback for unsupported nodes.

2. Table rendering breaks on small screens.
Mitigation: enforce responsive wrapper and test every migrated post on mobile sizes.

3. Missing author/media metadata in source.
Mitigation: set fallback values, then fill manually from source post page.

4. Pixel-perfect mismatch due to font differences.
Mitigation: use current project fonts by decision; match layout/spacing tightly instead of importing old fonts.

---

## 10) Done Definition

Migration is done when:

1. Template is approved section-by-section.
2. Exactly 6 posts are migrated.
3. All 6 use original slugs.
4. All images are local under `/public/post-lp`.
5. Article schema and FAQ schema validate on migrated pages.
6. Mobile/tablet/desktop QA passes for all 6 posts.

---

## 11) Next Codex Session Handoff (Copy Runbook)

Use this section as the exact playbook for remaining posts. Follow in order.

### A) Start clean (avoid stale Next.js runtime state)

1. Confirm no old app is running on previously used ports (`3000`, `3001`, `3002`).
2. Rebuild before validation:
```bash
npm run build
```
3. Start with explicit port:
```bash
npm run dev -- -p 3002
```
or production mode:
```bash
npm run start -- -p 3101
```

Note:
- If you hit opaque runtime errors after switching branches/posts, do a clean rebuild.
- If `.next` is stale and `rm` is blocked, move it aside and rebuild:
```bash
mv .next .next_backup_$(date +%s)
npm run build
```

### B) Source extraction for one post (WordPress)

Given source URL `https://boltroute.ai/<slug>/`:

1. Fetch post metadata/content:
```bash
curl --compressed -sL "https://boltroute.ai/wp-json/wp/v2/posts?slug=<slug>"
```
2. Fetch full post by ID with terms/author:
```bash
curl --compressed -sL "https://boltroute.ai/wp-json/wp/v2/posts/<id>?_embed"
```
3. Fetch featured image metadata:
```bash
curl --compressed -sL "https://boltroute.ai/wp-json/wp/v2/media/<featured_media_id>"
```
4. Save rendered content locally and convert to MDX-safe markup.

### C) Required conversion rules (important)

1. Keep slug exactly as source.
2. Keep canonical as:
`https://boltroute.ai/<slug>`
3. Keep cover image local under:
`/public/post-lp` (or `/public/post-lp/<slug>/` if using per-post folders).
4. Convert WordPress table tags for JSX compatibility:
- Replace `<table class="...">` with `<table className="...">`.
5. Keep heading hierarchy (`h2/h3`) intact for TOC anchors.
6. Keep FAQ in frontmatter (`faq` array), not only body text.
7. Ensure HTML in MDX is JSX-safe (`className`, escaped entities where needed).

### D) Frontmatter mapping checklist

For each migrated post, ensure:

1. `title`
2. `slug`
3. `date` (`YYYY-MM-DD`)
4. `category`
5. `coverImage` (local path)
6. `metaTitle`
7. `metaDescription`
8. `canonical`
9. `author.name` and `author.url` when available
10. `faq` question/answer items if present on source post

### E) Post file path

Create:
`content/posts/<slug>.mdx`

### F) Validation steps (must run every post)

1. Content compile:
```bash
npm run content:build
```
2. Full build check:
```bash
npm run build
```
3. Open local route:
`http://localhost:<port>/<slug>`
4. Confirm:
- Page returns `200`
- No server crash
- Featured image renders
- Tables render
- TOC links work
- FAQ section present

### G) Schema validation workflow on localhost

Google Rich Results Test cannot fetch localhost directly by URL.

Use Code input mode:
1. Open local post in browser.
2. View page source and copy full HTML.
3. Paste into Rich Results Test Code input.
4. Expect valid `Article` and `FAQ` items for FAQ posts.

### H) Known project-specific pitfalls from this session

1. MDX links:
- Non-route links (`mailto:`, `tel:`, `#...`, external URLs) must render as `<a>`, not Next `Link`.
- Route links only (`/path`, `./`, `../`) should use Next `Link`.

2. Stale server confusion:
- A different process on `3001` may serve stale runtime and produce unrelated errors.
- Always verify against a clean build and known fresh port.

3. Social image metadata in local runs:
- `og:image`/`twitter:image` may show localhost URLs unless `NEXT_PUBLIC_SITE_URL` or `SITE_URL` is set.
- This does not block local content validation but should be set before production checks.

### I) Tracking progress in this document

For each of 6 posts, append a one-line status:

`<slug> | extracted: yes/no | mdx: yes/no | images: yes/no | build: pass/fail | schema: pass/fail`

---

## 12) Session Knowledge Transfer (What, Why, How)

This section captures what has already been completed in this session and how to continue without re-discovery.

### A) What has been completed

1. Blog post template hero was implemented and aligned to the approved reference look.
- Implemented in: `src/app/[slug]/page.tsx`
- Post pages now use a dedicated hero layout:
  - gradient background
  - category badge
  - centered large title
  - formatted date
  - full-width featured image under hero text
- Non-post pages still use the simpler page layout branch.

2. Post date formatting was standardized to `DD Month YYYY`.
- Implemented in: `src/app/[slug]/page.tsx`
- Helper: `formatPostDate()`.

3. Schema output remained active for posts.
- Implemented in: `src/app/[slug]/page.tsx`
- `Article` and `FAQPage` JSON-LD scripts are still emitted for post routes.

4. MDX runtime compatibility was fixed.
- Implemented in: `src/lib/mdx.ts`
- `getMDXComponent()` now supports both MDX return shapes:
  - component function
  - module object with `default`

5. MDX component typing and link behavior were hardened.
- Implemented in: `src/components/mdx/MDXComponents.tsx`
- Custom components (`Callout`, `Button`, `Card`) are accepted by MDX map typing.
- Anchor handling now distinguishes route links vs non-route links:
  - Route links use Next `Link`
  - `mailto:`, `tel:`, hash links, and non-route URLs use `<a>`

6. First migration post was copied with same slug.
- New file: `content/posts/what-is-catch-all-email.mdx`
- Slug: `what-is-catch-all-email`
- Cover image path: `/post-lp/catch-all-email.jpg`
- Includes:
  - TOC section
  - all main headings/body
  - tables
  - FAQ content in body
  - FAQ entries in frontmatter for schema generation

7. JSX-safe table markup was enforced in migrated MDX.
- In migrated post, table tags were normalized to `className` (not `class`).

8. Rich Results validation was confirmed.
- Result: `2 valid items detected` (`Article` + `FAQ`).
- Note from validation: schema is valid; social image URL may still use localhost unless site URL env is set.

### B) Why these decisions were made

1. Separate post hero branch:
- Needed to match the new approved blog visual design without disrupting existing static pages.

2. MDX runtime compatibility fix:
- Prevented runtime failures caused by differing compiled MDX module shapes.

3. Link handling split (`Link` vs `<a>`):
- Prevents routing/runtime issues on non-route schemes (`mailto`, `tel`, hash) and keeps behavior semantically correct.

4. Frontmatter `faq` retention:
- Required for `FAQPage` schema generation and rich result eligibility.

5. Local image paths:
- Ensures migration is independent from WordPress media URLs after old site removal.

### C) How to continue for each remaining post (exact flow)

1. Extract source metadata/content from WordPress API.
2. Map metadata into frontmatter fields used by Velite schema.
3. Convert rendered HTML to MDX-safe content:
- preserve heading hierarchy
- keep lists and emphasis
- keep tables, but normalize JSX attributes (`className`)
- move FAQ Q/A into frontmatter `faq` array
4. Save post as:
`content/posts/<slug>.mdx`
5. Ensure featured/inline images are local under `/public/post-lp`.
6. Validate:
```bash
npm run content:build
npm run build
```
7. Open route:
`http://localhost:<port>/<slug>`
8. Validate rich results via Code input mode in Google test.

### D) Known error patterns and fixes

1. Error pattern: `TypeError: e[o] is not a function` or random server runtime errors on one port.
- Typical cause: stale/mixed `.next` artifacts or old server process.
- Fix:
  - stop old Next processes on conflicting ports
  - rebuild fresh
  - if needed move `.next` out of the way and rebuild

2. Error pattern: odd behavior only on one port (`3001`), but not on a fresh port.
- Typical cause: old process serving stale build.
- Fix:
  - use explicit clean port after rebuild (`3002` for dev or `3101` for start)

3. Error pattern: warnings/errors from raw HTML attributes in MDX.
- Typical cause: HTML copied from WP has JSX-incompatible attributes.
- Fix:
  - normalize `class` -> `className` in raw HTML blocks

### E) Current migration status snapshot

1. Template base: complete and usable.
2. Migrated posts:
- `what-is-catch-all-email` -> completed (content + build + schema pass)
3. Remaining posts to migrate: 5

---

## 13) Latest Session Addendum (Do Not Repeat These Mistakes)

This section captures issues found after Section cloning + first migrated post validation.

### A) Reused homepage sections were added to blog post template

Requirement:
- Reuse existing `Latest Blogs` + `Get Started` sections from homepage instead of rebuilding.

Implemented:
- `src/app/[slug]/page.tsx`
  - imports:
    - `BlogSection`
    - `GetStartedSection`
  - renders both sections after post article content.

Why this matters:
- Keeps visual parity with approved homepage sections.
- Avoids duplicate component implementations.

### B) Production mode behavior: `next start` needs rebuild

Observed confusion:
- Changes were not visible on `http://localhost:3001/...` while `next start` was running.

Rule:
- `next start` serves the existing `.next` production build only.
- After any code/content change, rebuild first:

```bash
npm run build
npm run start -- -p 3001
```

If you want live updates while editing:

```bash
npm run dev -- -p 3001
```

### C) Table rendering bug root cause + fix

Observed bug:
- In migrated post tables, only link text appeared; most table text looked missing.

Root cause:
- Tables in post body were written as raw HTML (`<table>...</table>`).
- Raw HTML blocks in MDX bypass `mdxComponents.table/th/td` custom renderers.
- They inherited white text from surrounding theme context.

Fix implemented:
1. Added wrapper class on MDX content container:
- `src/app/[slug]/page.tsx`
- `<div className="blog-content ...">`

2. Added scoped CSS for raw HTML tables:
- `src/app/globals.css`
- Added rules for:
  - `.blog-content table`
  - `.blog-content table.has-fixed-layout`
  - `.blog-content th, .blog-content td`
  - `.blog-content td a, .blog-content th a`

Outcome:
- Raw HTML tables now render with borders + dark text + proper spacing.

Important note for next sessions:
- Keep `mdxComponents` table mappings (useful for markdown-table transforms) **and** keep `.blog-content` CSS (required for raw HTML tables copied from WP).

### D) TOC anchor links not scrolling: root cause + fix

Observed bug:
- TOC links had hashes (e.g. `#how-catch-all-emails-work`) but clicking did not scroll.

Root cause:
- Rendered `h2/h3` elements had no `id` attributes.

Fix implemented:
- `src/components/mdx/MDXComponents.tsx`
  - Added heading slug generation helpers:
    - `getTextContent()`
    - `toSlug()`
    - `getHeadingId()`
  - Applied generated IDs to `h2` and `h3`.
  - Added `scroll-mt-40` so anchors land correctly below sticky header.

Outcome:
- TOC hash links now update URL and scroll to the expected section.

### E) Runtime validation checklist (must run after each template/content change)

1. Build/lint:
```bash
npm run lint
npm run build
```

2. Start and verify route:
```bash
npm run start -- -p 3001
```
- Open: `http://localhost:3001/<slug>`

3. Mandatory checks:
- TOC click scrolls to correct `h2/h3`.
- Table header/cell text is visible (not white-on-white).
- Table borders are visible.
- Related sections appear after article:
  - `BlogSection`
  - `GetStartedSection`

### F) Process/port hygiene to avoid false debugging signals

Issue seen:
- Multiple Next processes on different ports caused confusion about which build was being served.

Recommended process:
1. Check listeners:
```bash
ss -ltnp | rg "3001|3002|301[0-9]"
```
2. Kill by PID (prefer this over broad `pkill -f "next"` patterns):
```bash
kill <pid>
```
3. Rebuild and restart.

Reason:
- Broad `pkill` patterns can terminate unintended processes and create misleading “it started but not updated” behavior.

### G) Migration progress update

`hard-bounce-vs-soft-bounce | extracted: yes | mdx: yes | images: yes | build: pass | schema: pending`
