# Blog CMS Publish Runbook (MDX + Email + GitHub Actions)

This is the root-level source of truth for how the website blog CMS works today in this repository.

## 1) Scope and ownership

- Website app: `apps/website`
- Content engine: Velite + MDX
- Publish automation: GitHub Actions + IMAP email ingestion
- Primary workflow file: `.github/workflows/email-publish.yml`

This runbook covers both:
- Authoring/rendering behavior (how MDX becomes live pages)
- Email-to-publish operations (how inbox messages become committed content)

## 2) CMS architecture (current implementation)

### Content sources

- Posts: `apps/website/content/posts/*.mdx`
- Pages: `apps/website/content/pages/*.mdx`
- Landing pages: `apps/website/content/landing/*.mdx`

### Schema and build pipeline

- Schema config: `apps/website/velite.config.ts`
- Velite output: `apps/website/src/lib/velite`
- MDX plugins: `remark-gfm` is enabled

Collections configured in Velite:
- `Post` via pattern `posts/*.mdx`
- `Page` via pattern `pages/*.mdx`
- `LandingPage` via pattern `landing/*.mdx`

### Runtime routing behavior

- Blog listing route: `apps/website/src/app/blog/page.tsx`
- Unified slug route: `apps/website/src/app/[slug]/page.tsx`

Slug resolution precedence in the unified route:
1. `pages`
2. `landings`
3. `posts`

Only non-draft entries are rendered in production routes.

## 3) Content model details

### Post fields (Velite schema)

Required by schema:
- `title`
- `slug`
- `date` (ISO date)
- `excerpt` (auto/derived by Velite)
- `metaTitle`
- `metaDescription`
- `body`

Optional:
- `category`
- `tags`
- `coverImage`
- `canonical`
- `author` (`name`, optional `url`)
- `faq`
- `relatedLinks`
- `draft`

### Page fields

Required by schema:
- `title`
- `slug`
- `body`

Optional:
- `description`
- `metaTitle`
- `metaDescription`
- `canonical`
- `draft`

### Landing page fields

Required by schema:
- `title`
- `slug`
- `body`

Optional:
- `description`
- `metaTitle`
- `metaDescription`
- `canonical`
- `featuredImage`
- `heroCta`
- `endCta`
- `faq`
- `draft`

## 4) Email publish pipeline (operational)

### Trigger model

- Workflow name: `Email Publish`
- Trigger: manual only (`workflow_dispatch`)
- Concurrency group: `email-publish-main`
- Required workflow permission: `contents: write` (commit/push)

### Script entrypoints

- Main runner: `apps/website/scripts/publish-from-email.js`
- Core helpers: `apps/website/scripts/publish-from-email-core.js`

### End-to-end flow

1. Connect to IMAP mailbox and lock configured folder.
2. Read unseen messages.
3. For each message:
   - Parse MIME via `mailparser`.
   - Validate sender against `ALLOWED_SENDERS` (if configured).
   - Extract MDX from `.mdx` or `.md` attachment (preferred), else from plaintext body.
   - Normalize frontmatter/body.
   - Validate metadata and write to content directory.
4. If files changed:
   - `git add`
   - commit message: `chore(content): publish <N> item(s)`
   - `git push` (unless push is explicitly skipped)
5. Mark message:
   - On success and with `PROCESSED_FOLDER` set: move message there.
   - Otherwise: mark message as `\Seen`.
6. If any message processing error occurred, job exits non-zero after batch completion.

### Type support in email pipeline

Current email parser supports:
- `type: post`
- `type: page`

`type: landing` is valid in Velite schema but is not accepted by the email publisher logic today.

### Metadata normalization rules

- `author` normalization:
  - If `author` object is missing but `name`/`url` exists, they are remapped into `author`.
- Title fallback:
  - Uses frontmatter `title`; if missing, falls back to email subject.
- Slug precedence:
  1. frontmatter `slug`
  2. attachment filename (without extension)
  3. slugified title
- For `type: post`, the email pipeline enforces:
  - `date`
  - `metaTitle`
  - `metaDescription`

## 5) Required and recommended secrets (GitHub Actions)

Add these in GitHub:
- Repository -> `Settings` -> `Secrets and variables` -> `Actions` -> `Repository secrets`

### Required

- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER`
- `IMAP_PASS`

### Recommended

- `IMAP_SECURE`
- `IMAP_TLS_REJECT_UNAUTHORIZED`
- `IMAP_FOLDER`
- `PROCESSED_FOLDER`
- `ALLOWED_SENDERS`
- `GIT_AUTHOR_NAME`
- `GIT_AUTHOR_EMAIL`

### Value notes for this setup

- `IMAP_HOST`: `mail.boltroute.ai`
- `IMAP_PORT`: `993`
- `IMAP_USER`: `publish@boltroute.ai`
- `IMAP_FOLDER`: `INBOX`
- `PROCESSED_FOLDER`: `Processed`
- `IMAP_SECURE`: `true`
- `ALLOWED_SENDERS`: comma-separated lowercase sender list

Important:
- `IMAP_TLS_REJECT_UNAUTHORIZED` must be the raw value `true` or `false`.
- Do not set secret values as `KEY=value`; only store the value itself.

### Local template

Use `apps/website/.env.publish.example` as the non-secret reference template.

## 6) Authoring format for publish emails

Preferred input:
- Attach a `.mdx` file to the email.

Accepted fallback:
- Put MDX content in plain text body.

Example minimum frontmatter for a post:

```md
---
type: post
title: "Post title"
slug: "post-slug"
date: "2026-02-12"
metaTitle: "SEO title"
metaDescription: "SEO description"
---

Post body...
```

For a page:

```md
---
type: page
title: "Page title"
slug: "page-slug"
metaTitle: "Page SEO title"
metaDescription: "Page SEO description"
---

Page body...
```

## 7) Test and verification checklist

### Functional verification

1. Send publish email from an address present in `ALLOWED_SENDERS`.
2. Trigger workflow manually:
   - GitHub -> `Actions` -> `Email Publish` -> `Run workflow`
3. Confirm workflow logs:
   - IMAP connect/select/search succeeded
   - Message processed
   - Content file written
   - Commit/push executed when content changed
4. Confirm expected file exists in:
   - `apps/website/content/posts` or `apps/website/content/pages`
5. Validate rendered route at:
   - `https://boltroute.ai/<slug>`

### Local regression checks

Run from repo root:

```bash
source .venv/bin/activate
npm --prefix apps/website run test:cms
npm --prefix apps/website run test
npm --prefix apps/website run build
```

## 8) Troubleshooting matrix

- Missing IMAP env vars:
  - Error: `Missing required env vars: ...`
  - Fix: add exact secrets in GitHub Actions.

- SMTP-only config used:
  - Error indicates SMTP is outbound-only.
  - Fix: configure `IMAP_*` values, not SMTP values.

- TLS/certificate error:
  - Fix server certificate chain/hostname alignment first.
  - Temporary fallback: set `IMAP_TLS_REJECT_UNAUTHORIZED=false`.

- Unauthorized sender:
  - Behavior: message is skipped and marked seen.
  - Fix: add sender to `ALLOWED_SENDERS`.

- Missing MDX in message:
  - Behavior: message is skipped and marked seen.
  - Fix: attach `.mdx` file or include valid plain text MDX body.

- Post missing required fields:
  - Error includes missing field names.
  - Fix frontmatter and resend.

## 9) Operational guardrails

- Keep live credentials only in GitHub Actions secrets or secure secret managers.
- Keep `apps/website/.env.publish.example` updated as the template reference.
- Prefer `IMAP_TLS_REJECT_UNAUTHORIZED=true`; use `false` only as temporary exception.
- Keep `ALLOWED_SENDERS` restricted to known publishing identities.
- Continue using manual trigger unless a reviewed scheduling policy is approved.
