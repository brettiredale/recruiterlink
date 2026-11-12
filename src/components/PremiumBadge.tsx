import { cx } from "./cx";

export type PremiumBadgeProps = { className?: string };

/** The small pink "Premium" badge shown on paid listings. */
export function PremiumBadge({ className }: PremiumBadgeProps) {
  return (
    <span
      className={cx(
        "label-mono shrink-0 rounded-[6px] bg-pink px-2.5 py-[5px] text-xs tracking-[0.12em] text-navy",
        className,
      )}
    >
      Premium
    </span>
  );
}
