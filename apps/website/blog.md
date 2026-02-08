# Blog Publishing (Email -> MDX -> Live)

This guide is written for juniors. It explains **what** we built, **why** it exists, **how** it works, and **exactly how to publish a post step-by-step**.

---

## What we built

We added an **email-to-publish pipeline** that:

1. Reads new emails from a dedicated inbox (`publish@boltroute.ai`).
2. Extracts an MDX post from the email body or attachment.
3. Saves it into `content/posts/*.mdx`.
4. Commits and pushes to GitHub.
5. Triggers the site build so the post is live at `https://boltroute.ai/{slug}`.

The content system is powered by:

- **Velite** (turns MDX into typed data)
- **Next.js** (renders MDX pages)
- **GitHub Actions** (automation and publishing)

---

## Why we built it

Manual publishing is slow. This system gives us:

- **Speed**: publish with a single email.
- **Consistency**: schema validation (frontmatter required).
- **Audit trail**: every post is committed in Git.
- **Collaboration**: writers can send content without touching code.

---

## How it works (high-level)

1. **Inbox poll**  
   GitHub Actions runs a job every 15 minutes to read the inbox using **IMAP**.

2. **Parsing**  
   The script `scripts/publish-from-email.js` parses the email and reads MDX.

3. **Validation**  
   Frontmatter is validated for required fields (`type`, `title`, `date`, `metaTitle`, `metaDescription`).

4. **Save**  
   The content is saved under `content/posts/{slug}.mdx`.

5. **Publish**  
   The workflow commits and pushes, which triggers the site build.

---

## Step-by-step (for juniors)

### 1) Prepare your post

Write your content in MDX. Always include **frontmatter** at the top:

```md
---
type: post
title: "Why Real-Time Analytics Changes Everything"
slug: "why-real-time-analytics-changes-everything"
date: "2026-02-01"
category: "Analytics"
tags:
  - analytics
  - real-time
  - product
metaTitle: "Real-Time Analytics: The Competitive Edge for SaaS Teams"
metaDescription: "See how real-time analytics improves decision-making."
canonical: "https://boltroute.ai/why-real-time-analytics-changes-everything"
author:
  name: "Murat Kural"
  url: "https://boltroute.ai/authors/murat-kural"
faq:
  - question: "What makes analytics real-time?"
    answer: "Data is streamed and processed continuously so dashboards update immediately after an event."
relatedLinks:
  - label: "See product demo"
    href: "https://boltroute.ai/demo"
---

Write your MDX content here…
```

### 2) Send the email

Send the MDX to:  
`publish@boltroute.ai`

**Best practice:** attach the MDX as a `.mdx` file.  
Some email clients strip formatting in the body.

### 3) Make sure your sender is allowed

Your email address must be in `ALLOWED_SENDERS` (comma-separated list).

### 4) Wait for automation

GitHub Actions runs every 15 minutes.
You can also manually trigger:  
**Actions -> Email Publish -> Run workflow**

### 5) Verify

Check if the MDX file exists in:
`content/posts/{slug}.mdx`

Then open:
`https://boltroute.ai/{slug}`

---

## Required frontmatter fields

For posts:

- `type` (must be `post`)
- `title`
- `slug`
- `date`
- `metaTitle`
- `metaDescription`

Optional but recommended:

- `category`, `tags`, `coverImage`, `canonical`
- `author` (name + url)
- `faq` (list of Q&A)
- `relatedLinks` (list of label + href)

---

## Troubleshooting

**Email wasn’t published**

1. Check GitHub Actions logs.
2. Ensure sender is in `ALLOWED_SENDERS`.
3. Make sure frontmatter is valid YAML.

**YAML errors**

Indent nested fields with 2 spaces:

```yaml
author:
  name: "Murat Kural"
  url: "https://boltroute.ai/authors/murat-kural"
```

**Certificate errors**

The mail server currently presents a mismatched TLS certificate.  
We allow this by setting:

```
IMAP_TLS_REJECT_UNAUTHORIZED=false
```

This should be **temporary** until the server cert is fixed.

---

## Files involved (for engineers)

- `scripts/publish-from-email.js` — main ingest/publish script
- `.github/workflows/email-publish.yml` — GitHub Action workflow
- `content/posts/*.mdx` — stored posts
- `velite.config.ts` — content schema
- `src/app/[slug]/page.tsx` — page rendering
