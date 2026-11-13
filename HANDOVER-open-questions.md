# RecruiterLink: open questions carried over

These come from the cloud session "RecruiterLink cloud setup guide" (last message 12 Nov 2026),
which was archived on 13 Nov 2026 to remove the duplicate RecruiterLink folder from the sidebar.
Paste this into your first desktop session so nothing is lost.

## Holding up the next build
1. **Premium limits.** Suggested: 8 images, 1 video link (YouTube/Vimeo, not an upload),
   12 team profiles, 6 testimonials. Reply "fine" or give your numbers.

## Needed soon
2. **Firecrawl and AI service keys**, to fill in new listings automatically from an agency's website.
3. **Stripe keys in Vercel**, when Premium is built and payments are next.

## Quick yes or no
4. Delete the 3 test rows in the requests table (email `claude-form-test@example.com`)?
5. Last 18 city photos: about $4 of fal.ai credit (balance was zero). Top up, or leave them?
6. Logo pink and button pink differ slightly. Match them (which wins), or leave?
7. Social sharing image still shows the old text logo. Switch to the new logo?

## Checks for you
8. Plausible: visit recruiterlink.com and confirm the visit shows in your Plausible dashboard.
9. Sign in at recruiterlink.com/account/sign-in on the live site and report anything off.
10. Send the contact form from a personal address; did the confirmation land in inbox or junk?
11. Search Console: has Google read the 8 smaller sitemaps?

## Not urgent
12. A separate test database (testing currently touches live data). May add a Supabase cost.
13. Supabase permission was set to "always allow", which also covers your Lovelio project.

## Also still to do
- The project notes (`CLAUDE.md`) still say the old Lovable site serves recruiterlink.com and
  that the site is not launched. They need correcting: the old repository `RecruiterLink-Live`
  is archived, recruiterlink.com is served by this project, and work now happens on your computer.
