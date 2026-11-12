import Link from "next/link";
import { Container } from "@/components";
import { accountPath } from "@/lib/routes";
import { signOut } from "./actions";

/**
 * The frame every signed-in account page shares: a heading, who is signed
 * in, and the way out.
 */
export function AccountShell({
  title,
  email,
  back,
  intro,
  children,
}: {
  title: string;
  email: string;
  /** Show a link back to the account page. */
  back?: boolean;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="bg-[linear-gradient(to_bottom,rgba(76,87,230,0.18),rgba(76,87,230,0.02))] py-9 sm:py-12">
        <Container className="flex flex-col gap-4">
          {back ? (
            <p>
              <Link
                href={accountPath}
                className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
              >
                ← Back to your account
              </Link>
            </p>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <h1 className="font-heading text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">
              {title}
            </h1>
            <form action={signOut} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
              <span className="text-muted">
                Signed in as <strong className="break-all text-navy">{email}</strong>
              </span>
              <button
                type="submit"
                className="min-h-11 cursor-pointer font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep"
              >
                Sign out
              </button>
            </form>
          </div>
          {intro ? <p className="max-w-[720px] text-lg text-muted">{intro}</p> : null}
        </Container>
      </section>
      <Container className="flex flex-col gap-12 py-10 sm:py-14">{children}</Container>
    </>
  );
}

/** A titled white panel on the account pages. */
export function Panel({
  title,
  description,
  children,
  tone = "pale",
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  tone?: "pale" | "cream";
}) {
  return (
    <section
      className={
        tone === "cream"
          ? "rounded-panel bg-[linear-gradient(to_bottom_right,var(--color-cream),var(--color-pink-tint))] p-5 sm:p-9"
          : "rounded-panel bg-pale p-5 sm:p-9"
      }
    >
      <h2 className="mb-2 font-heading text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-extrabold tracking-[-0.03em]">
        {title}
      </h2>
      {description ? <p className="mb-6 max-w-[720px] text-[17px] text-muted">{description}</p> : <div className="mb-5" />}
      {children}
    </section>
  );
}
