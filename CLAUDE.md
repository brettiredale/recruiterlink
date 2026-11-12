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

## Design direction (owner chose concept 5)

- Design canvas with all concepts: https://claude.ai/artifact/Sq6WkJvqxw5ygdNzzTZQWC
  (private to the owner). The owner chose concept 5 as the direction; a
  revised home page and a city page (Madrid) are on that canvas.
- Palette, taken from mention-me.com at the owner's request: navy `#21174B`,
  hot pink `#FF3EB5`, indigo `#4C57E6`, lavender `#EAEBFB`, pale `#F6F7FE`,
  cream `#FFF7D9`, pink tint `#FFE2F4`. Small text never sits white-on-pink
  or pink-on-white (too faint); use navy on pink, or `#C4127F` for small
  pink text.
- Heading font: Plus Jakarta Sans (owner's choice, 12 Nov 2026; they rejected
  Bricolage Grotesque). Body font Inter, small capital labels Space Mono.
- No "I am hiring / I am job hunting" switch: the owner removed it. Home
  headline: "Find the perfect recruitment agency for your next hire or job
  search".
- Home leads with an AI text and voice search, then many featured agencies.
- Premium listing price: $49 USD a month or $499 USD a year. Free listing is
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
  photo, all its agencies and a specialism filter.
- Only cities with three or more agencies are submitted to search engines
  (owner's decision, 12 Nov 2026). The rest carry a noindex until they reach
  three. Work this out from live agency counts, never a stored flag, so
  cities qualify by themselves as listings are added. At the time of the
  decision that was 885 of 3,191 cities, holding 89% of agencies.
- City photos are AI-generated (owner's requirement), starting with the 270
  cities that have ten or more agencies. Label each as AI-generated: EU
  rules on realistic synthetic images of real places have applied since
  2 Aug 2026. Service recommended to the owner: fal.ai (one key, several
  models), with a small side-by-side test before the full run. Not yet set
  up; needs the owner's account and key via the secure credential form.

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

## Database

Built from `legacy.recruitment_agencies` by the migrations of 12 Nov 2026.
The public (anyone with the site's key) can read published data and write
nothing; every table has row level security.

- Public tables: `countries` (31; name, slug, iso2), `cities` (3,165; slug
  unique within its country, optional `photo_path`), `specialisms` (44 fixed
  sectors; name, slug, sort_order), `agencies` (25,640: 25,497 `published`,
  143 `hidden` duplicates that point at the kept one in `duplicate_of`),
  `agency_specialisms`, `slug_redirects` (every old-site slug to the agency
  it should now reach).
- `agencies` columns that matter for pages: `slug` (new, e.g.
  `caroo-manchester`), `legacy_slug`, `website` (always `https://<host>`),
  `domain`, `description`, `introduction`, `logo_path` (file in bucket
  `agency-logos`; null means initials placeholder), `plan` (`free` or
  `premium`), `is_claimed`, `status`. Kept by the database: `is_premium`,
  `sort_name`, `quality_score` (premium 8 + claimed 4 + logo 2 +
  description 1), `search_vector` and `updated_at` (triggers).
- Schema `private` (the API cannot reach it): `agency_private` (unverified
  emails, old plan and status, Stripe ids, claim details, old user ids) and
  the audit tables for the clean-up: `legacy_specialism_map` and
  `specialism_rules` (old labels to specialisms), `legacy_city_map`,
  `legacy_agency_overrides`, `text_cleaning_rules` (removal of the false
  "established in 2020" claims). Helper functions also live there.
- Count views, all live and counting published agencies only:
  `country_stats`, `city_stats` (has `is_indexable`: true at 3 or more
  agencies, never stored), `specialism_stats`, `city_specialism_stats`,
  `country_specialism_stats`, `directory_totals`.
- Search: function `search_agencies(search_query, country_slug, city_slug,
  result_limit, result_offset)`; Postgres full-text, premium first.
- To list premium first then by name: `order by is_premium desc, sort_name`.
- Types: `src/lib/database.types.ts` (regenerate after any migration).
- Data layer for pages, `src/lib/data` (import from `@/lib/data`); plain
  async functions with no caching of their own, so call them inside
  `"use cache"` functions or components: `getDirectoryTotals`,
  `listCountries`, `getCountryBySlug`, `listCitiesForCountry`,
  `listIndexableCities`, `getCityBySlugs`, `listSpecialisms`,
  `getSpecialismBySlug`, `listSpecialismsForCity`,
  `listSpecialismsForCountry`, `listAgenciesForCity`,
  `listAgenciesForCountry`, `getAgencyBySlug`, `resolveLegacySlug`,
  `listFeaturedAgencies`, `searchAgencies`, `agencyLogoUrl`. The Supabase
  client is `getSupabaseServerClient()` in `src/lib/supabase/server.ts`.
- Known limits of the old data: "Human Resources" and "Consulting &
  Advisory" are tagged on most agencies (the old site applied them almost
  everywhere), United States cities carry no state, and 8 published
  agencies have no city.

## Site structure

The public pages, built 12 Nov 2026. Addresses are built only in
`src/lib/routes.ts`; the canonical host is `https://recruiterlink.com`
(no www, as the old site used), recorded as `siteUrl` in `src/lib/site.ts`.

- Routes: `/` home; `/countries`; `/<country>`; `/<country>/<city>`;
  `/<country>/<city>/<specialism>`; later pages of a city or city +
  specialism list at `.../page/<n>` (24 agencies a page, premium first);
  `/specialisms` and `/specialisms/<slug>`; `/agencies/<slug>`;
  `/search?q=`; `/for-agencies`; `/about`; `/contact`; `/legal`;
  `/sitemap.xml` (index) with `/sitemaps/<name>.xml`; `/robots.txt`;
  `/llms.txt`; `/opengraph-image`. There is no `/cities` page and no login.
- Country slugs sit at the top level. Fixed pages always win in the router;
  `RESERVED_TOP_LEVEL_SLUGS` in `src/lib/routes.ts` lists the words a
  country can never use, and a test fails if a new folder in `src/app` is
  not on it. Unknown addresses answer a real 404.
- Rendering: every directory page exports `ensureStatic = "navigation"`, so
  it is built once as complete HTML and stored; an address not built yet
  waits for the whole page (so 404s and redirects carry the right status).
  Paging uses `/page/<n>` rather than `?page=` for that reason. Only two
  things run per visit: `/search`, and the home page's directory section,
  which reads Vercel's `x-vercel-ip-country` header (worldwide version for
  crawlers, unknown countries and countries with fewer than 13 agencies).
- Caching: pages read data only through the cached readers in
  `src/lib/directory.ts` (lifetime one day), tagged as in
  `src/lib/cache-tags.ts`. After data changes call
  `revalidateDirectory(...)` in `src/lib/revalidate.ts`, the one helper for
  refreshing pages (agencies, cities, countries, or everything). The daily
  update connector is not built; it should call this helper.
- Indexability (`src/lib/indexability.ts`, under the `SITE_INDEXABLE`
  switch): cities need 3 agencies; city + specialism pages need an
  indexable city, 3 agencies for the pair and a non-generic specialism;
  pages 2 and up, `/search`, `/legal` and the generic specialisms' pages
  are noindex, follow, each with its own canonical. Sitemaps list only
  indexable pages; robots.txt names the sitemap only when the switch is on.
- Generic specialisms: `GENERIC_SPECIALISM_SLUGS` in
  `src/lib/specialisms.ts` ("human-resources", "consulting-advisory").
  Shown last, not used as an agency's tags when it has others, left out of
  popular searches and FAQ answers, noindex. Headings such as "IT
  recruitment agencies in Madrid" come from the helpers in the same file.
- Old-site addresses (`src/lib/legacy-redirects.ts`): fixed patterns are
  permanent redirects in `next.config.ts`; `/recruiters-in/<location>[/
  <specialization>]` is resolved against the database by route handlers;
  `/agencies/recruitment-...` is looked up in `slug_redirects` by the
  agency page. The www host redirects to the bare domain.
- Search (`src/lib/search-query.ts`): plain rules, no AI. The text after
  the last " in " is tried as a city or country; what is left is matched to
  a specialism or searched as keywords with `search_agencies`.
- Forms: `/for-agencies` and `/contact` store requests in
  `public.listing_requests` (the public can insert and nothing else; a
  trigger allows 3 an hour per email and 200 an hour in all; a hidden
  honeypot field drops bots). Nobody is notified: the owner reads the table
  in Supabase. Payments and logins do not exist.
- City photos: `CityHero` shows `cities.photo_path` from bucket
  `city-photos` with the "AI-generated image" label, else a gradient.
- Tests: `npm test` (Node's built-in runner, no extra packages) covers
  routes and reserved words, specialism wording, indexability, search
  parsing, redirect mapping, FAQ text and form validation. Files tested
  this way import each other with the `.ts` ending.
- Structured data: Organization + WebSite (home), BreadcrumbList (inner
  pages), ItemList (lists), EmploymentAgency (agency pages), FAQPage. Only
  database facts; no ratings, reviews, founding years or staff numbers.

## City photos (status 12 Nov 2026, after second run)

- Storage bucket `city-photos` (public read, JPEG/WebP, 1.5 MB limit, no public write or list) holds AI-generated photos named `<city id>.jpg` (1600x900), recorded in `cities.photo_path`.
- 249 of the 267 cities with ten or more agencies have one. The 18 without: Halifax (its request failed) and 17 cities with exactly ten agencies (Barneveld, Burnaby, Concord, Duluth, Edina, Farmington Hills, Frederiksberg, Germiston, Littleton, Marina del Rey, Parsippany-Troy Hills, Pleasanton, Roodepoort, Roseville, San Mateo, Venlo, Wayne). The owner's fal.ai balance is at zero again ($50 spent in total): do not generate more without a top-up AND an agreed budget.
- Cost lesson: the second $25 bought 149 images from `fal-ai/nano-banana-pro` ("1K", web search on, about 20 seconds each, one failure in 150), so budget about 17 cents an image, not the listed 15 (not confirmed on the billing page). Never use FLUX 3 in a Claude cloud session: the proxy cuts requests at 30 seconds and failed requests appear to be billed. The 18 missing cities plus the redos below need about $4.
- 75 photos are FLUX 3 and 174 nano-banana-pro. Worth redoing: Montreal and Allentown (weak FLUX images), Edison (dull street). Auckland, Amersfoort, Sharjah and Baltimore were cropped by hand (wrong bridge, white borders, a brand sign). Small-town and suburb images are plausible for the region, not verified views.
- Edge function `upload-city-photo` is a retired one-off (answers 410). Its working source is kept at `supabase/functions/upload-city-photo/working-source.reference.ts.txt`; a continuation needs a fresh one-time token hash deployed, then the stub put back. Scripts are in `scripts/city-photos/` (`gen2.py` is the capped nano-banana-only generator; `meta.py` holds prompts and region hints). Job lists and logs were in the session scratchpad and do not survive.
- United States cities have no state in the data, so same-named towns (Arlington, Rochester, Troy, Aurora, Columbia, Wilmington, Glendale, Wayne) are guesses when generating.
- City pages cache for a day, so new photos appear on the next deploy or within a day.

## Launch (owner's go-ahead given 12 Nov 2026)

- The owner reviewed the site and asked for it to go live on recruiterlink.com and for the remaining city photos to be finished (once they top up fal.ai).
- Claude cannot change Vercel settings (the connector refuses), so the owner does three things in Vercel: add `SITE_INDEXABLE=true` (Production only) to project `recruiterlink`, redeploy, then move `recruiterlink.com` and `www.recruiterlink.com` from project `recruiterlink2` to `recruiterlink`. After that, confirm with `/api/health`, `/robots.txt` (must allow and name the sitemap) and a legacy agency address on the real domain.
- Once live, the "from launch day" rule applies: changes go to a preview and wait for the owner's approval.
- Still owed after launch: delete 3 test rows in `public.listing_requests` (email `claude-form-test@example.com`; needs the owner's OK), a notification when the form is used, a separate test database, payments, logins, the bot connector, the AI part of search, and the Firecrawl content refresh the owner asked about.
- Form notifications (owner's instruction, 12 Nov 2026): every agency sign-up and contact request is stored in `public.listing_requests` and then emailed to `brett@recruiterlink.com` and `brettiredale@gmail.com` through Resend (`src/features/requests/notify.ts`, sender `notifications@recruiterlink.com`, domain verified in Resend). It needs `RESEND_API_KEY` in Vercel (the owner adds it; Claude cannot). Without the key the request is still stored and a warning is logged. DNS for recruiterlink.com is at Namecheap BasicDNS (moved off Cloudflare 12 Nov 2026); the mailbox runs on MXroute.
- LAUNCHED 12 Nov 2026: recruiterlink.com now serves this project (domain moved in Vercel by the owner, `www` redirects to the bare domain, `SITE_INDEXABLE=true` on Production). Verified on the real domain: robots.txt allows crawling and names the sitemap, `/api/health` is ok, an old `/agencies/recruitment-...` address lands on the new agency page with `index, follow` and the right canonical. From now on the "from launch day" rule is in force: code changes go to a branch and its Vercel preview and wait for the owner's approval before reaching `main`. Notes-only changes to this file are the one exception.
- Branded emails (owner approved 12 Nov 2026, live): every system email is built by `renderEmail` in `src/features/requests/email-template.ts` (tables, inline styles, Arial, no images, a plain-text copy alongside; header is the wordmark as text, "Recruiter" white and "Link" in the logo pink `#EE1E80` on navy). Use it for every future email. Each form now sends two emails: the notification to the owner's two addresses, and a confirmation to the person who filled in the form (replies go to `brett@recruiterlink.com`).
- Stripe (account Magic Hire Technologies, live): product `prod_VcGWJLqazg5MzC` "RecruiterLink Premium" with prices `price_1Ub1zeAuVFaJ0APtBChvitAJ` ($49 a month) and `price_1Ub22WAuVFaJ0APtUHkJeyrU` ($499 a year), created by the owner 12 Nov 2026. The yearly price is $499 (owner changed it from $490). Claude can read Stripe through the session's key but must not create or change anything there; the owner does that by hand. Payments are not built yet.
