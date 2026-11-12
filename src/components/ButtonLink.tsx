import Link from "next/link";
import { cx } from "./cx";

export type ButtonVariant =
  /** Large pink button, white 19px bold text. The main call to action. */
  | "primary"
  /** Smaller pink button. Navy text, because white is too faint at this size. */
  | "primary-small"
  /** Navy button with white text. */
  | "navy"
  /** Pink outline with navy text, for light backgrounds. */
  | "outline"
  /** White outline with white text, for navy backgrounds. */
  | "outline-light";

const base =
  "inline-flex min-h-11 items-center justify-center text-center font-bold leading-tight transition-colors duration-150";

const variants: Record<ButtonVariant, string> = {
  primary:
    "rounded-btn bg-pink px-7 py-[15px] text-[19px] text-white hover:bg-pink-hover",
  "primary-small":
    "rounded-btn-sm bg-pink px-[22px] py-[13px] text-base text-navy hover:bg-[#ff63c4]",
  navy: "rounded-btn bg-navy px-[30px] py-[15px] text-lg text-white hover:bg-[#33267a]",
  outline:
    "rounded-btn-sm border-[1.5px] border-pink px-[22px] py-[11.5px] text-base text-navy hover:bg-pink-tint",
  "outline-light":
    "on-dark rounded-btn border-[1.5px] border-white px-7 py-[13.5px] text-[19px] text-white hover:bg-white hover:text-navy",
};

/** Class names for a button look, for use on real <button> elements. */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return cx(base, variants[variant], className);
}

export type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  rel?: string;
  "aria-label"?: string;
};

/** A link that looks like a button. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
