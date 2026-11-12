import { ButtonLink } from "./ButtonLink";
import { cx } from "./cx";
import { CheckIcon } from "./icons";

export const PREMIUM_MONTHLY_USD = 49;
export const PREMIUM_YEARLY_USD = 490;

export const freeFeatures = ["Your agency's card in the directory", "A detailed agency page"];
export const premiumFeatures = [
  "Images",
  "Video",
  "Team and leadership profiles",
  "Customer testimonials",
];

export type PricingBannerProps = {
  /**
   * "plans" is the navy banner with the free and Premium plans side by side
   * (home page). "compact" is the cream-to-pink strip with one button (city
   * pages).
   */
  variant?: "plans" | "compact";
  eyebrow?: string;
  heading?: string;
  body?: string;
  /** Where "Go Premium" / "List your agency" goes. */
  premiumHref?: string;
  /** Where "Claim free listing" goes. */
  freeHref?: string;
  /** Button text for the compact variant. */
  ctaLabel?: string;
  headingLevel?: "h2" | "h3";
  className?: string;
};

function FeatureList({ items, tone }: { items: string[]; tone: "dark" | "light" }) {
  return (
    <ul className="flex flex-col gap-2 text-base">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <CheckIcon
            size={18}
            className={cx("mt-[3px] shrink-0", tone === "dark" ? "text-pink-soft" : "text-pink-text")}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Free versus Premium listing banner for agency owners. */
export function PricingBanner({
  variant = "plans",
  eyebrow = "Run a recruitment agency?",
  heading,
  body,
  premiumHref = "/for-agencies",
  freeHref = "/list-your-agency",
  ctaLabel = "List your agency",
  headingLevel: Heading = "h2",
  className,
}: PricingBannerProps) {
  if (variant === "compact") {
    return (
      <div
        className={cx(
          "flex flex-wrap items-center justify-between gap-x-14 gap-y-7 rounded-panel bg-[linear-gradient(to_right,var(--color-cream),var(--color-pink-tint))] px-6 py-10 sm:px-10 sm:py-12 lg:px-[60px]",
          className,
        )}
      >
        <div className="min-w-0 flex-[1_1_420px]">
          <Heading className="mb-2.5 font-heading text-[clamp(1.75rem,3vw,2.375rem)] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance">
            {heading ?? eyebrow}
          </Heading>
          <p className="max-w-[560px] text-lg text-muted">
            {body ??
              `Your listing is free. Premium adds images, video, team and leadership profiles and customer testimonials for $${PREMIUM_MONTHLY_USD} USD a month, or $${PREMIUM_YEARLY_USD} USD a year.`}
          </p>
        </div>
        <ButtonLink href={freeHref} variant="primary" className="max-sm:w-full">
          {ctaLabel}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "on-dark grid items-center gap-x-14 gap-y-9 rounded-panel lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] bg-navy px-5 py-10 text-white sm:px-10 sm:py-[52px] lg:px-[60px]",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="label-mono mb-3 text-sm text-pink-soft">{eyebrow}</p>
        <Heading className="mb-3.5 font-heading text-[clamp(1.875rem,3.4vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
          {heading ?? `Your listing is free. Premium is $${PREMIUM_MONTHLY_USD} a month.`}
        </Heading>
        <p className="max-w-[520px] text-lg text-on-navy">
          {body ??
            "Every agency gets a card and a detailed page at no cost. Premium adds images, video, team and leadership profiles and customer testimonials."}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <section
          aria-label="Free listing"
          className="flex flex-col gap-4 rounded-card border-[1.5px] border-white/35 p-6"
        >
          <div>
            <p className="label-mono text-[13px] text-pink-soft">Free listing</p>
            <p className="mt-1 font-heading text-[34px] leading-tight font-extrabold tracking-[-0.03em]">
              $0
            </p>
            <p className="text-[15px] text-on-navy">Free, always</p>
          </div>
          <FeatureList items={freeFeatures} tone="dark" />
          <ButtonLink
            href={freeHref}
            variant="outline-light"
            className="mt-auto w-full !px-4"
          >
            Claim free listing
          </ButtonLink>
        </section>

        <section
          aria-label="Premium listing"
          className="flex flex-col gap-4 rounded-card bg-white p-6 text-navy [--focus-ring:var(--color-indigo)]"
        >
          <div>
            <p className="label-mono text-[13px] text-pink-text">Premium</p>
            <p className="mt-1 font-heading text-[34px] leading-tight font-extrabold tracking-[-0.03em]">
              ${PREMIUM_MONTHLY_USD}{" "}
              <span className="font-sans text-base font-semibold tracking-normal text-muted">
                USD a month
              </span>
            </p>
            <p className="text-[15px] text-muted">or ${PREMIUM_YEARLY_USD} USD a year</p>
          </div>
          <div>
            <p className="mb-2 text-[15px] font-semibold">Everything in free, plus:</p>
            <FeatureList items={premiumFeatures} tone="light" />
          </div>
          <ButtonLink href={premiumHref} variant="primary" className="mt-auto w-full !px-4">
            Go Premium
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
