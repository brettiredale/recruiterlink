# RecruiterLink

The global directory of recruitment agencies: [recruiterlink.com](https://recruiterlink.com).

This is the ground-up rebuild. It replaces the earlier Lovable-built site
(repository `RecruiterLink-Live`), which stays live until this one is ready.

## How it runs

| Part | Where |
| --- | --- |
| Code | This repository. `main` is the live branch. |
| Hosting | Vercel project `recruiterlink`. Every push is published automatically. |
| Database | Supabase project `RecruiterLink` (London, `ipfjjrngsjixgbmkezzg`). |
| Framework | Next.js (App Router), TypeScript, Tailwind CSS. |

## Working on it

```bash
npm install
```

```bash
npm run dev
```

Before saving any change, all three of these must pass:

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npm run build
```

## Settings and keys

Real values live in Vercel, never in this repository. `.env.example` lists
what is needed. For local work, copy it to `.env.local` and fill it in.

## Search engines are blocked until launch

Every deployment tells search engines and AI crawlers to stay out unless
`SITE_INDEXABLE=true` is set. That setting belongs on the Vercel Production
environment only, and only once the site is ready to replace the old one.
See `src/lib/site.ts`.
