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
- Old data: schema `legacy` in the database holds an untouched, private copy
  of the old site's agency table (`legacy.recruitment_agencies`, 25,640 rows,
  loaded and verified 12 Nov 2026). Build the clean public tables from it
  with migrations. Never expose it through the API or edit it in place.
- Logos: storage bucket `agency-logos` (public read) holds 25,357 logos
  copied from the old site on 12 Nov 2026, each named
  `<agency id>.<jpg|png|gif|webp>` using the agency's id in
  `legacy.recruitment_agencies`. 283 agencies have none: 5 had no logo
  address, 272 pointed at the source's generic placeholder, 2 were SVG
  (deliberately not accepted) and 4 source files no longer exist. Show an
  initials placeholder for those.
- Edge function `copy-legacy-logos` is a retired one-off (it answers 410).
  The owner can delete it in the Supabase dashboard; do not reuse it.
- Migrations: `supabase/migrations/`, one file per migration applied to the
  database, named `<version>_<name>.sql` to match Supabase's own record.
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

## Design direction (in progress, owner choosing)

- Design canvas with all concepts: https://claude.ai/artifact/Sq6WkJvqxw5ygdNzzTZQWC
  (private to the owner). The owner chose concept 5 as the direction; a
  revised home page and a city page (Madrid) are on that canvas.
- Palette, taken from mention-me.com at the owner's request: navy `#21174B`,
  hot pink `#FF3EB5`, indigo `#4C57E6`, lavender `#EAEBFB`, pale `#F6F7FE`,
  cream `#FFF7D9`, pink tint `#FFE2F4`. Small text never sits white-on-pink
  or pink-on-white (too faint); use navy on pink, or `#C4127F` for small
  pink text.
- Heading font is still being chosen (Plus Jakarta Sans is the working
  default; the owner rejected Bricolage Grotesque). Body font Inter, small
  capital labels Space Mono.
- No "I am hiring / I am job hunting" switch: the owner removed it. Home
  headline: "Find the perfect recruitment agency for your next hire or job
  search".
- Home leads with an AI text and voice search, then many featured agencies.
- Premium listing price: $49 USD a month or $490 USD a year. Free listing is
  a card plus a detailed page. Premium adds images, video, team and
  leadership profiles, customer testimonials.

## Search engine structure (agreed approach)

- Every country, city and city-plus-specialism gets its own fixed address
  with the same content for every visitor. These are the pages that rank.
- The home page may show the visitor's country first (from their IP), but
  only as a personalised section on a page whose core is the same for
  everyone. Never redirect by IP: search engine crawlers mostly visit from
  the US and would never see the other countries.
- Every city with an agency gets a page (owner's requirement), with a city
  photo, all its agencies and a specialism filter. 1,786 of 3,191 cities
  have only one agency, so which cities are submitted to search engines is
  an open decision (thin pages can hurt the whole site).

## Rules

- Supabase and Vercel tools are pre-approved in `.claude/settings.json` so
  the owner is not asked each time. That approval cannot be limited to one
  project, and the same account holds the owner's other live businesses.
  Only ever use these tools on Supabase project `ipfjjrngsjixgbmkezzg` and
  Vercel project `recruiterlink`. Never run them against any other project
  without the owner asking for it by name.
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
