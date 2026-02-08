# Landing Page Clone Runbook (Post-Pilot)

This is the exact runbook for migrating remaining conversion LPs from WordPress (`https://boltroute.ai`) into this Next.js project.

This document is updated after the first successful pilot migration:  
`/verify-email-addresses-list/`.

---

## 1) Current Foundation (Already Implemented)

These are already built and should be reused as-is:

- Dedicated LP collection in Velite:
  - `velite.config.ts`
  - collection name: `landings`
  - pattern: `content/landing/*.mdx`
- Route support for LPs:
  - `src/app/[slug]/page.tsx`
  - resolver order: `page -> landing -> post`
- Reusable CTA component:
  - `src/components/landing/CTACard.tsx`
  - variants: `hero`, `inline`, `end`
- MDX registration for CTA blocks:
  - `src/components/mdx/MDXComponents.tsx`
  - supports `<CTACard ... />` inside LP body
- LP starter file:
  - `content/landing/landing-template.mdx` (draft template)

Header/footer are globally inherited from `src/app/layout.tsx`.  
Never duplicate header/footer in LP MDX content.

---

## 2) Pilot Reference (Golden Example)

Use this migrated LP as the copy pattern for remaining pages:

- MDX: `content/landing/verify-email-addresses-list.mdx`
- Featured image: `public/post-lp/verify-email-addresses-list/featured.jpg`
- Live slug path: `/verify-email-addresses-list`

When uncertain about formatting/CTA placement/frontmatter shape, mirror this file.

---

## 3) Remaining LP Queue

`verify-email-addresses-list` is done.  
Migrate these remaining 10 slugs:

1. `email-sequence-verification`
2. `data-enrichment-tools`
3. `email-consulting`
4. `email-deliverability`
5. `reverse-email-lookup-free`
6. `email-list-cleaning-service`
7. `email-validation-api`
8. `email-verification-tools`
9. `warmup-inbox-email-verification`
10. `email-regex`

---

## 4) Source Inventory (WP IDs + Featured Images)

| Slug | WP Page ID | Featured Media URL |
| --- | ---: | --- |
| `verify-email-addresses-list` | 426 | `https://boltroute.ai/wp-content/uploads/2026/01/b2b-email-database.jpg` |
| `email-sequence-verification` | 400 | `https://boltroute.ai/wp-content/uploads/2026/01/cold-email-sequence.jpg` |
| `data-enrichment-tools` | 410 | `https://boltroute.ai/wp-content/uploads/2026/01/data-enrichment-tool.jpg` |
| `email-consulting` | 520 | `https://boltroute.ai/wp-content/uploads/2026/01/email-consulting.jpg` |
| `email-deliverability` | 358 | `https://boltroute.ai/wp-content/uploads/2026/01/email-deliverability-expert.jpg` |
| `reverse-email-lookup-free` | 453 | `https://boltroute.ai/wp-content/uploads/2026/01/email-finder.jpg` |
| `email-list-cleaning-service` | 464 | `https://boltroute.ai/wp-content/uploads/2026/01/email-list-cleaning.jpg` |
| `email-validation-api` | 507 | `https://boltroute.ai/wp-content/uploads/2026/01/email-validation-api.jpg` |
| `email-verification-tools` | 441 | `https://boltroute.ai/wp-content/uploads/2026/01/email-verification-tool.jpg` |
| `warmup-inbox-email-verification` | 493 | `https://boltroute.ai/wp-content/uploads/2026/01/warmup-inbox.jpg` |
| `email-regex` | 478 | `https://boltroute.ai/wp-content/uploads/2026/01/email-regex.jpg` |

---

## 5) Required Output Per LP

For each slug `<slug>`, always produce:

1. MDX file:
  - `content/landing/<slug>.mdx`
2. Featured image:
  - `public/post-lp/<slug>/featured.<ext>`
3. Route:
  - `/<slug>`

No exceptions.

---

## 6) Frontmatter Contract (Exact)

Every LP MDX must use this shape:

```md
---
title: "..."
slug: "..."
description: "..."
metaTitle: "..."
metaDescription: "..."
canonical: "https://boltroute.ai/<slug>"
featuredImage: "/post-lp/<slug>/featured.jpg"
heroCta:
  title: "..."
  description: "..."
  primaryLabel: "..."
  primaryHref: "..."
endCta:
  title: "..."
  description: "..."
  primaryLabel: "..."
  primaryHref: "..."
faq:
  - question: "..."
    answer: "..."
draft: false
---
```

Notes:

- `heroCta` and `endCta` are rendered by page template (`src/app/[slug]/page.tsx`).
- Inline CTAs belong inside MDX body as `<CTACard variant="inline" ... />`.
- `faq` frontmatter drives both visible FAQ section and JSON-LD FAQ schema.

---

## 7) WordPress -> MDX Mapping Rules

Source endpoint:

- `https://boltroute.ai/wp-json/wp/v2/pages?slug=<slug>`

Mapping rules used in pilot:

1. Use WP `<h1>` as frontmatter `title`.
2. Use first explanatory intro paragraph as frontmatter `description`.
3. Keep semantic structure in body:
  - `h2`, `h3`, `p`, `ul/ol`, table content.
4. Remove WP wrappers/classes:
  - `wp-block-essential-blocks-*`
  - decorative container divs.
5. CTA mapping:
  - first CTA block -> `heroCta`
  - middle CTA blocks -> inline `<CTACard variant="inline" ... />`
  - final CTA block -> `endCta`
6. FAQ mapping:
  - parse RankMath questions/answers into `faq` frontmatter.
  - do not copy RankMath HTML block directly.
7. Table mapping:
  - keep all rows/cells text.
  - use MDX table HTML exactly as pilot when needed:
    - `<table className="has-fixed-layout">...</table>`
8. Entity cleanup:
  - decode `&#8217;`, `&#8211;`, `&amp;` into normal text.
  - use ASCII punctuation where possible (`'`, `-`).
9. Link policy:
  - preserve original CTA hrefs from source unless explicitly instructed otherwise.

---

## 8) Per-LP Execution Checklist (Strict)

For each remaining slug:

1. Fetch WP page JSON and save local temp copy.
2. Extract:
  - title
  - featured media URL
  - CTA titles/descriptions/buttons/links
  - FAQ pairs
  - content sections/tables/lists
3. Download featured image to:
  - `public/post-lp/<slug>/featured.<ext>`
4. Write `content/landing/<slug>.mdx` using the frontmatter contract.
5. Include inline `<CTACard variant="inline" ... />` blocks where source has middle CTAs.
6. Keep section order aligned with source page.
7. Run `npm run build`.
8. Confirm route is generated in build output (`/<slug>` appears).
9. Spot-check rendered page for:
  - hero image
  - table formatting
  - inline CTA rendering
  - FAQ section rendering
  - no layout overflow

---

## 9) Quality Gates (Must Pass)

Per migrated LP, all must be true:

- Exact slug preserved.
- Content file exists in `content/landing/`.
- Featured image exists in `public/post-lp/<slug>/`.
- Hero CTA renders from frontmatter.
- Inline CTA(s) render in body.
- End CTA renders from frontmatter.
- FAQ schema script is present (handled by route).
- Build succeeds.

---

## 10) Final Completion Criteria

Migration work is complete when:

1. All 11 LP slugs are in `content/landing/` (including pilot).
2. All 11 featured images are local under `public/post-lp/`.
3. Every LP route builds successfully.
4. LPs preserve conversion intent and CTA placement from source.
5. WordPress LP pages can be safely retired without SEO/conversion loss.
