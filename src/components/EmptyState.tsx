import { ButtonLink } from "./ButtonLink";
import { cx } from "./cx";
import { SearchIcon } from "./icons";

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Main way forward, e.g. "Clear filters". */
  action?: { label: string; href: string };
  /** Second option, e.g. "Browse all countries". */
  secondaryAction?: { label: string; href: string };
  headingLevel?: "h2" | "h3";
  className?: string;
};

/** Shown where a list would be when there is nothing to list. */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  headingLevel: Heading = "h2",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-3 rounded-panel border-[1.5px] border-dashed border-line-strong bg-pale px-6 py-12 text-center sm:py-16",
        className,
      )}
    >
      <span className="mb-2 flex size-16 items-center justify-center rounded-full bg-lavender text-indigo">
        <SearchIcon size={28} />
      </span>
      <Heading className="font-heading text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-balance">
        {title}
      </Heading>
      {description ? (
        <p className="max-w-[520px] text-[17px] text-muted">{description}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {action ? (
            <ButtonLink href={action.href} variant="navy">
              {action.label}
            </ButtonLink>
          ) : null}
          {secondaryAction ? (
            <ButtonLink href={secondaryAction.href} variant="outline" className="!rounded-btn !text-lg">
              {secondaryAction.label}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
