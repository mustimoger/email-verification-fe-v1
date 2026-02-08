This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Content + Email Publishing

### Local content build

Generate Velite content:

```bash
npm run content:build
```

Watch mode (run alongside `npm run dev`):

```bash
npm run content:dev
```

### Email-to-publish workflow

The automation **reads incoming email via IMAP** (SMTP settings are outbound only).
Create a `.env` in the repo root with your IMAP mailbox credentials:

```bash
IMAP_HOST=mail.boltroute.ai
IMAP_PORT=993
IMAP_USER=publish@boltroute.ai
IMAP_PASS=your_password_here
IMAP_SECURE=true
IMAP_TLS_REJECT_UNAUTHORIZED=false
IMAP_FOLDER=INBOX
PROCESSED_FOLDER=Processed
ALLOWED_SENDERS=you@boltroute.ai,editor@boltroute.ai
```

GitHub Actions uses the same values as **repository secrets**:
`IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`, `IMAP_SECURE`, `IMAP_FOLDER`,
`PROCESSED_FOLDER`, `ALLOWED_SENDERS`, `IMAP_TLS_REJECT_UNAUTHORIZED`.

#### Email format (MDX)

Send an `.mdx` file as an attachment (preferred) or paste MDX in the email body.
Frontmatter must include at least:

```md
---
type: post
title: "Post title"
slug: "post-slug"
date: "2026-01-30"
metaTitle: "SEO title"
metaDescription: "SEO description"
---
```

For pages, set `type: page` and omit `date` if desired.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
