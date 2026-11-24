import { cx } from "./cx";

/** The rule every new listing must meet, shown wherever an agency asks for one. */
export function VerifiablePeopleNote({ className }: { className?: string }) {
  return (
    <p
      className={cx(
        "rounded-btn border-[1.5px] border-indigo bg-lavender px-4 py-3 text-base text-navy",
        className,
      )}
    >
      <strong>We only list agencies with real, verifiable people.</strong> We will not publish a
      listing unless we can verify the LinkedIn profiles of the agency&rsquo;s owners or recruiters.
    </p>
  );
}
