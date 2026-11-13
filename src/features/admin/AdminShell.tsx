import Link from "next/link";
import { Container } from "@/components";
import { cx } from "@/components/cx";
import { signOutAdmin } from "@/features/account/actions";
import { accountPath, adminBlogPath, adminConnectPath, adminPath, reviewPath } from "@/lib/routes";

export type AdminSection = "overview" | "blog" | "connect" | "review";

const SECTIONS: { id: AdminSection | "account"; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: adminPath },
  { id: "blog", label: "Blog", href: adminBlogPath },
  { id: "connect", label: "Connect Grokbot", href: adminConnectPath },
  { id: "review", label: "Review new listings", href: reviewPath },
  { id: "account", label: "Your account", href: accountPath },
];

/** The frame every admin page shares: menu, heading, who is signed in. */
export function AdminShell({
  section,
  title,
  email,
  intro,
  actions,
  children,
  width = "page",
}: {
  section: AdminSection;
  title: string;
  email: string;
  intro?: React.ReactNode;
  /** Buttons beside the heading, e.g. "New post". */
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: "page" | "wide";
}) {
  return (
    <>
      <section className="bg-[linear-gradient(to_bottom,rgba(76,87,230,0.18),rgba(76,87,230,0.02))] pt-6 pb-8 sm:pb-10">
        <Container className={cx("flex flex-col gap-5", width === "wide" && "!max-w-[1500px]")}>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <nav aria-label="Admin" className="-mx-1 overflow-x-auto">
              <ul className="flex gap-1 whitespace-nowrap">
                {SECTIONS.map((item) => {
                  const current = item.id === section;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        className={cx(
                          "flex min-h-11 items-center rounded-btn-sm px-3.5 text-[15px] font-bold transition-colors",
                          current ? "bg-navy text-white" : "text-navy hover:bg-white/70",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <form action={signOutAdmin} className="flex flex-wrap items-center gap-x-3 text-[15px]">
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
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="min-w-0">
              <p className="label-mono mb-2 text-[13px] text-pink-text">Admin</p>
              <h1 className="font-heading text-[clamp(2rem,4.2vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance [overflow-wrap:anywhere]">
                {title}
              </h1>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {intro ? <p className="max-w-[760px] text-lg text-muted">{intro}</p> : null}
        </Container>
      </section>
      <Container className={cx("flex flex-col gap-10 py-8 sm:py-12", width === "wide" && "!max-w-[1500px]")}>
        {children}
      </Container>
    </>
  );
}

/** "Loading…" while the admin check runs. */
export function AdminLoading() {
  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <p role="status" className="text-lg text-muted">
        Loading…
      </p>
    </Container>
  );
}

/** "13 Nov 2026, 14:05" in UK time, for admin tables. */
export function adminDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

/** "Published" or "Draft". */
export function StatusPill({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-bold",
        status === "published" ? "bg-[#EAF7EF] text-[#12552E]" : "bg-cream text-[#6B4E00]",
      )}
    >
      {status === "published" ? "Published" : "Draft"}
    </span>
  );
}

