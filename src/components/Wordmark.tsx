import { cx } from "./cx";

export type WordmarkProps = {
  /** "light" for white backgrounds, "dark" for navy backgrounds. */
  tone?: "light" | "dark";
  className?: string;
};

/** The "recruiterlink" wordmark: navy (or white) "recruiter" and pink "link". */
export function Wordmark({ tone = "light", className }: WordmarkProps) {
  return (
    <span
      className={cx(
        "font-heading text-[28px] leading-none font-extrabold tracking-[-0.04em]",
        tone === "light" ? "text-navy" : "text-white",
        className,
      )}
    >
      recruiter<span className="text-pink">link</span>
    </span>
  );
}
