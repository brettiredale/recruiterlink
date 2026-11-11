@AGENTS.md

# RecruiterLink

Global directory of recruitment agencies, for commercial use. Ground-up
rebuild replacing an earlier Lovable-built site. Goals: strong search engine
and AI-assistant visibility, and daily automated listing updates from an
external bot through a connector.

## Where things live

- Hosting: Vercel project `recruiterlink`, team `brettiredales-projects`.
  Pushes to `main` publish automatically.
- Database: Supabase project `RecruiterLink`, ref `ipfjjrngsjixgbmkezzg`,
  London (eu-west-2), organisation LOVELIO. Live database only; a separate
  test database is to be added before launch.
- Old site: repository `brettiredale/RecruiterLink-Live`, Vercel project
  `recruiterlink2`, which currently serves recruiterlink.com. Reference only.
  Do not change it, and do not copy its code across.

## How changes go live

- Until launch: test each change (lint, types, build, and a run of the
  affected pages), then put it on `main` directly. The site is private and
  blocked from search engines, so no real visitor is affected. Use a branch
  and its Vercel preview only when a change needs checking on Vercel first.
- From launch day: every change goes to a preview and waits for the owner's
  approval before it reaches `main`.
- The owner is not technical. Explain things in plain language, and give
  click-by-click steps for anything they must do in Vercel, Supabase or
  GitHub.

## Decisions already made by the owner

- Agency logos from the old export are to be copied into our own storage.
- The agencies that claimed a listing or paid on the old site carry over
  with that status. They will need new logins at launch.
- Dropped or held back from the old data: founded year (wrong), guessed
  `info@` emails (kept private, unverified, never shown or mailed),
  scraped testimonials (not republished).
- Old web addresses (`/agencies/<slug>`) must redirect to their new pages.

## Rules

- Never commit keys, `.env` files or data exports. Agency and job seeker
  data contains personal details.
- Search engines stay blocked until launch. The switch is `SITE_INDEXABLE`
  (see `src/lib/site.ts`). Do not set it, and do not move the
  recruiterlink.com address to this project, without the owner's say-so.
- Every public page must be delivered as complete HTML from the server,
  never assembled in the browser. This is the main reason for the rebuild.
- Database changes go through Supabase migrations, never ad hoc edits.
- Before committing: `npm run lint`, `npx tsc --noEmit` and `npm run build`
  must all pass.

## Working in a Claude cloud session

- Run the site with `NODE_USE_ENV_PROXY=1` (for example
  `NODE_USE_ENV_PROXY=1 npm run dev`). Without it the site cannot reach
  Supabase from inside the cloud container, although the database is fine.
- `/api/health` reports whether the deployment's Supabase settings work.
  Vercel does not let Claude read or change project settings, so this is
  how to confirm them after the owner edits them in Vercel.
