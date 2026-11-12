import { cx } from "./cx";
import { Container } from "./Container";

export type PageIntroProps = {
  title: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** One or two sentences under the title. */
  intro?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/** The tinted band at the top of a page that holds its main heading. */
export function PageIntro({ title, eyebrow, intro, children, className }: PageIntroProps) {
  return (
    <section
      className={cx(
        "bg-[linear-gradient(to_bottom,rgba(76,87,230,0.18),rgba(76,87,230,0.02))] py-10 sm:py-14",
        className,
      )}
    >
      <Container className="flex flex-col gap-5">
        {eyebrow ? (
          <p className="label-mono text-[13px] text-pink-text sm:text-sm">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">
          {title}
        </h1>
        {intro ? <p className="max-w-[680px] text-lg text-muted sm:text-xl">{intro}</p> : null}
        {children}
      </Container>
    </section>
  );
}
