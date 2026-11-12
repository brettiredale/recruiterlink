import { cx } from "./cx";

export type ContainerProps = {
  children: React.ReactNode;
  /** "page" is the 1210px site width; "narrow" is the 860px reading width. */
  width?: "page" | "narrow";
  className?: string;
};

/** Centres content at the site width with the standard side gutters. */
export function Container({ children, width = "page", className }: ContainerProps) {
  return (
    <div
      className={cx(
        "mx-auto w-full px-4 sm:px-6",
        // Gutters sit outside the content width, as in the designs.
        width === "page" ? "max-w-[1258px]" : "max-w-[908px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
