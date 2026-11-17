import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Container, LogoImage, PREMIUM_MONTHLY_USD, PREMIUM_YEARLY_USD } from "@/components";
import { getAccount, getListing } from "@/features/account/data";
import { Notice, SubmitButton } from "@/features/account/ui";
import { parseUuid } from "@/features/account/validate";
import { startPremiumCheckout } from "@/features/premium/actions";
import { getTotals } from "@/lib/directory";
import { accountListingPath, signInPath } from "@/lib/routes";
import { getSupabaseSessionClient } from "@/lib/supabase/session";
import AccountLoading from "../../../loading";

export const metadata: Metadata = { title: "Go Premium" };

type Props = PageProps<"/account/listings/[id]/premium">;

type Position = { position: number; total: number; premium_count: number; per_page: number };

const number = (value: number) => value.toLocaleString("en-GB");

/** Where the listing sits on its city page today, or null without a city. */
async function getPosition(agencyId: string): Promise<Position | null> {
  const supabase = await getSupabaseSessionClient();
  const { data, error } = await supabase.rpc("listing_position", { target_agency: agencyId });
  if (error) {
    console.error("listing_position failed:", error.code, error.message);
    return null;
  }
  return data as unknown as Position | null;
}

function Tick({ tone }: { tone: "green" | "pink" }) {
  return (
    <span aria-hidden="true" className={tone === "green" ? "font-bold text-[#0B6B3A]" : "font-bold text-pink-text"}>
      ✓
    </span>
  );
}

const benefitIcons = {
  up: (
    <>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

const benefits: { icon: keyof typeof benefitIcons; tile: string; title: string; body: string }[] = [
  {
    icon: "up",
    tile: "bg-pink-tint text-pink-text",
    title: "First, everywhere",
    body: "Above every free listing on your city page, each specialism page you are in, your country page and in search results.",
  },
  {
    icon: "video",
    tile: "bg-lavender text-indigo",
    title: "A page that sells you",
    body: "A video, up to 8 photos, 12 team profiles and 6 client testimonials on your agency page.",
  },
  {
    icon: "search",
    tile: "bg-cream text-[#8A6400]",
    title: "Found by Google and AI",
    body: "Our pages are built for Google, Bing and AI assistants such as ChatGPT and Perplexity. Premium agencies lead the lists they read.",
  },
  {
    icon: "shield",
    tile: "bg-[#E3F7EC] text-[#0B6B3A]",
    title: "The Premium badge",
    body: "A verified, Premium mark on your card and page, so visitors know a real team stands behind it.",
  },
];

async function Upsell({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const agencyId = parseUuid(id);
  if (!agencyId) notFound();

  const account = await getAccount();
  if (!account) redirect(signInPath);
  const [listing, position, totals] = await Promise.all([getListing(agencyId), getPosition(agencyId), getTotals()]);
  if (!listing) notFound();

  const claimed = query.claimed === "1";
  const editorHref = claimed ? `${accountListingPath(agencyId)}?notice=claimed` : accountListingPath(agencyId);
  if (listing.plan === "premium") redirect(accountListingPath(agencyId));

  const place = listing.city ?? listing.country;
  const page = position ? Math.ceil(position.position / position.per_page) : null;
  const pages = position ? Math.max(Math.ceil(position.total / position.per_page), 1) : null;
  const premiumCount = position?.premium_count ?? 0;

  return (
    <Container className="flex flex-col gap-9 py-10 sm:py-14">
      <p className="flex justify-end">
        <Link href={editorHref} className="font-semibold text-indigo underline underline-offset-4 hover:text-indigo-deep">
          Skip to your account
        </Link>
      </p>

      <section className="mx-auto flex max-w-[780px] flex-col items-center gap-3 text-center">
        <p className="label-mono text-xs text-pink-text">{claimed ? "Listing claimed · one more step" : "RecruiterLink Premium"}</p>
        <h1 className="font-heading text-[clamp(2rem,4.2vw,2.75rem)] leading-[1.12] font-extrabold tracking-[-0.03em] text-balance">
          This is how employers will see {listing.name}
        </h1>
        <p className="max-w-[640px] text-lg text-muted">
          {listing.status === "published" ? "Your free listing is live now. " : null}
          Premium turns it into a full showcase and moves it to the top of every list you appear in.
        </p>
      </section>

      {query.notice === "checkout-failed" ? (
        <Notice tone="error">We could not open the payment page just now. Please try again in a minute.</Notice>
      ) : null}

      <section className="grid items-start gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-[18px] rounded-[32px] bg-pale p-5 sm:p-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-xl font-extrabold">Free</h2>
            <p className="text-[15px] text-muted">What you have now</p>
          </div>
          <div className="flex flex-col gap-2.5 rounded-card border border-line bg-white p-[18px]">
            <div className="flex items-center gap-3">
              <LogoImage name={listing.name} file={listing.logo_path} size={48} eager />
              <div className="min-w-0">
                <p className="font-bold break-words">{listing.name}</p>
                <p className="text-sm text-muted">{place}</p>
              </div>
            </div>
            {listing.introduction ? <p className="text-[15px] text-muted">{listing.introduction}</p> : null}
          </div>
          <ul className="flex flex-col gap-2.5 text-base">
            <li className="flex gap-2.5">
              <Tick tone="green" />
              Logo, introduction and description
            </li>
            <li className="flex gap-2.5">
              <Tick tone="green" />
              Up to 8 specialisms
            </li>
            <li className="flex gap-2.5 text-muted">
              <span aria-hidden="true" className="font-bold">
                –
              </span>
              {page && pages && listing.city
                ? `Listed alphabetically: page ${number(page)} of ${number(pages)} in ${listing.city}`
                : `Listed alphabetically, after every Premium agency`}
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-[18px] rounded-[32px] border-2 border-pink bg-white p-5 sm:p-7">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-xl font-extrabold">Premium</h2>
            <p className="text-[15px] font-semibold text-pink-text">From ${PREMIUM_MONTHLY_USD} a month</p>
          </div>
          <div aria-hidden="true" className="overflow-hidden rounded-card border border-line">
            <div className="flex h-[150px] items-center justify-center gap-2.5 bg-navy font-semibold text-white">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m10 8 6 4-6 4z" />
              </svg>
              Your agency video
            </div>
            <div className="grid grid-cols-4 gap-1 p-1">
              {["bg-lavender", "bg-pink-tint", "bg-cream", "bg-lavender"].map((tone, index) => (
                <div key={index} className={`h-14 rounded-lg ${tone}`} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex">
                {["bg-indigo", "bg-pink -ml-2.5", "bg-navy -ml-2.5"].map((tone) => (
                  <div key={tone} className={`size-8 rounded-full border-2 border-white ${tone}`} />
                ))}
              </div>
              <span className="rounded-full bg-navy px-3 py-[5px] text-[13px] font-semibold text-white">Premium</span>
            </div>
            <p className="px-4 pb-4 text-[15px] text-muted italic">&ldquo;[A client testimonial you add]&rdquo;</p>
          </div>
          <ul className="flex flex-col gap-2.5 text-base">
            <li className="flex gap-2.5">
              <Tick tone="pink" />
              <span>
                <strong>Shown first</strong> on your city, specialism and country pages and in search
              </span>
            </li>
            <li className="flex gap-2.5">
              <Tick tone="pink" />A video and up to 8 photos
            </li>
            <li className="flex gap-2.5">
              <Tick tone="pink" />
              Up to 12 team profiles and 6 testimonials
            </li>
            <li className="flex gap-2.5">
              <Tick tone="pink" />
              The Premium badge on your card and page
            </li>
          </ul>
          <form action={startPremiumCheckout} className="flex flex-col items-stretch gap-2">
            <input type="hidden" name="agency_id" value={listing.id} />
            <SubmitButton
              name="interval"
              value="month"
              pendingLabel="Opening secure payment…"
              variant="primary"
              className="min-h-14 rounded-full! text-navy!"
            >
              Go Premium · ${PREMIUM_MONTHLY_USD} a month
            </SubmitButton>
            <p className="text-center text-[15px] text-muted">
              Or{" "}
              <button
                type="submit"
                name="interval"
                value="year"
                className="min-h-11 cursor-pointer font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
              >
                ${PREMIUM_YEARLY_USD} a year
              </button>{" "}
              (2 months free). Cancel any time.
            </p>
          </form>
        </div>
      </section>

      <section aria-labelledby="premium-gives" className="flex flex-col gap-5">
        <h2 id="premium-gives" className="font-heading text-[28px] leading-tight font-extrabold tracking-[-0.02em]">
          What Premium gives {listing.name}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex flex-col gap-2.5 rounded-[24px] border border-line bg-white p-6">
              <div className={`flex size-11 items-center justify-center rounded-chip ${benefit.tile}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {benefitIcons[benefit.icon]}
                </svg>
              </div>
              <h3 className="text-lg font-bold">{benefit.title}</h3>
              <p className="text-base text-muted">{benefit.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] bg-pale p-[22px]">
          <p className="font-heading text-[32px] font-extrabold tracking-[-0.03em]">{number(totals.agencyCount)}</p>
          <p className="mt-1 text-[15px] text-muted">
            agencies listed in {number(totals.countryCount)} countries. Premium is how you stand out from them.
          </p>
        </div>
        {position && listing.city ? (
          <div className="rounded-[24px] bg-pale p-[22px]">
            <p className="font-heading text-[32px] font-extrabold tracking-[-0.03em]">
              {number(premiumCount)} of {number(position.total)}
            </p>
            <p className="mt-1 text-[15px] text-muted">
              {listing.city} agencies {premiumCount === 1 ? "is" : "are"} Premium today. The top row is wide open.
            </p>
          </div>
        ) : null}
        <div className="rounded-[24px] bg-pale p-[22px]">
          <p className="font-heading text-[32px] font-extrabold tracking-[-0.03em]">Google + AI</p>
          <p className="mt-1 text-[15px] text-muted">
            Every page is built to be read by search engines and AI assistants such as ChatGPT.
          </p>
        </div>
      </section>

      <p className="text-center">
        <Link href={editorHref} className="font-semibold text-indigo underline underline-offset-4 hover:text-indigo-deep">
          No thanks, take me to my free listing
        </Link>
      </p>
    </Container>
  );
}

export default function PremiumPage(props: Props) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <Upsell {...props} />
    </Suspense>
  );
}
