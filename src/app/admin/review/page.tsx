import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClasses, LogoImage } from "@/components";
import { Panel } from "@/features/account/AccountShell";
import { findSubmissionLogo, reviewSubmission } from "@/features/account/actions";
import { getPendingSubmissions } from "@/features/account/data";
import { LinkPersonForm } from "@/features/account/SmallForms";
import { Notice, SubmitButton, inputClass } from "@/features/account/ui";
import { AdminLoading, AdminShell } from "@/features/admin/AdminShell";
import { requireAdmin } from "@/features/admin/guard";
import { cityLabel } from "@/lib/regions";
import { adminSignInPath } from "@/lib/routes";
import { toParagraphs } from "@/lib/text";

export const metadata: Metadata = { title: "Review new listings" };

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  published: { tone: "success", text: "Published. The agency has been emailed, and the listing is on the site." },
  rejected: { tone: "info", text: "Turned down. The agency has been emailed with your reason." },
  "already-listed": { tone: "error", text: "That website already has a published listing, so this one was not published." },
  "not-found": { tone: "error", text: "That listing is no longer waiting. It may already have been reviewed." },
  "region-required": {
    tone: "error",
    text: "This city is not in the directory yet and the listing has no state, province or territory, so it was not published. Ask the agency to send it in again with one.",
  },
  "city-invalid": { tone: "error", text: "The city name cannot be used, so this listing was not published." },
  "logo-found": { tone: "success", text: "Logo found. It is shown on the listing below." },
  "logo-none": {
    tone: "info",
    text: "No usable logo was found on their website or on logo.dev. The agency can add one once the listing is published.",
  },
  failed: { tone: "error", text: "That did not work. Please try again." },
};

const LOGO_SOURCE = { website: "From their website", "logo.dev": "From logo.dev" } as const;

async function Review({ searchParams }: { searchParams: PageProps<"/admin/review">["searchParams"] }) {
  const [account, params] = await Promise.all([requireAdmin(), searchParams]);
  // Null unless the database agrees this person runs the site.
  const submissions = await getPendingSubmissions();
  if (!submissions) redirect(adminSignInPath);
  const notice = typeof params.notice === "string" ? NOTICES[params.notice] : undefined;

  return (
    <AdminShell
      section="review"
      title="Review new listings"
      email={account.email}
      intro="New listings sent in by agencies. Each sender has confirmed an email address on the same domain as the website shown, so you are checking that it is a real recruitment agency and that the wording is fit to publish."
    >
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {submissions.length === 0 ? (
        <Panel title="Nothing is waiting">
          <p className="text-[17px] text-muted">
            New listings appear here, and you get an email each time one arrives.
          </p>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-8">
          {submissions.map((submission) => (
            <li key={submission.id} className="rounded-panel border-[1.5px] border-line-mid bg-white p-5 sm:p-9">
              <div className="mb-6 flex flex-wrap items-center gap-5">
                <LogoImage name={submission.name} file={submission.logo_path} size={96} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h2 className="font-heading text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-extrabold tracking-[-0.03em] break-words">
                    {submission.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-muted">
                    <span>
                      {submission.logo_path
                        ? `Logo: ${LOGO_SOURCE[submission.logo_source ?? "website"]}`
                        : submission.logo_checked_at
                          ? "No logo found"
                          : "Looking for a logo…"}
                    </span>
                    <form action={findSubmissionLogo}>
                      <input type="hidden" name="submission_id" value={submission.id} />
                      <SubmitButton pendingLabel="Looking…" variant="outline">
                        Look for a logo again
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
              <dl className="mb-6 grid gap-x-10 gap-y-4 text-[17px] sm:grid-cols-2">
                <div>
                  <dt className="text-[15px] text-muted">Website</dt>
                  <dd>
                    <a
                      href={submission.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-semibold break-all text-indigo underline underline-offset-4"
                    >
                      {submission.website}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[15px] text-muted">Sent by</dt>
                  <dd className="font-semibold break-all">{submission.email}</dd>
                </div>
                <div>
                  <dt className="text-[15px] text-muted">Location</dt>
                  <dd className="font-semibold">
                    {submission.city_name}
                    {submission.region && !submission.city_name.includes(",") ? `, ${submission.region}` : null}, {submission.country}
                    {submission.matched_city ? (
                      <span className="mt-1 block text-[15px] font-normal text-muted">
                        Joins {cityLabel(submission.matched_city)}, which has{" "}
                        {submission.matched_city.agency_count === 1
                          ? "1 agency"
                          : `${submission.matched_city.agency_count.toLocaleString("en")} agencies`}
                        .
                      </span>
                    ) : (
                      <span className="mt-1 block text-[15px] font-normal text-pink-text">
                        New city: publishing adds “{submission.city_name}
                        {submission.region_code && !submission.city_name.includes(",")
                          ? `, ${submission.region_code}`
                          : ""}” to the
                        directory. Check the spelling.
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[15px] text-muted">Specialisms</dt>
                  <dd className="font-semibold">{(submission.specialisms ?? []).join(", ")}</dd>
                </div>
              </dl>
              {submission.introduction ? (
                <p className="mb-4 text-[17px] font-semibold">{submission.introduction}</p>
              ) : null}
              <div className="mb-7 flex flex-col gap-3 rounded-card bg-pale p-5 text-[17px] text-muted">
                {toParagraphs(submission.description).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <form action={reviewSubmission} className="flex flex-col gap-4">
                <input type="hidden" name="submission_id" value={submission.id} />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`note-${submission.id}`} className="text-base font-bold">
                    Reason, if you turn it down
                  </label>
                  <p className="text-[15px] text-muted">Sent to the agency. Leave empty when publishing.</p>
                  <textarea id={`note-${submission.id}`} name="note" rows={2} maxLength={500} className={inputClass} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <SubmitButton pendingLabel="Working…" name="decision" value="approve">
                    Publish this listing
                  </SubmitButton>
                  <button
                    type="submit"
                    name="decision"
                    value="reject"
                    className={buttonClasses("outline", "cursor-pointer")}
                  >
                    Turn it down
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Panel
        title="Link a person to a listing by hand"
        description="For someone who could only sign in with a personal address such as Gmail, once you have checked they really work at the agency."
      >
        <div className="max-w-[620px]">
          <LinkPersonForm />
        </div>
      </Panel>
    </AdminShell>
  );
}

export default function ReviewPage({ searchParams }: PageProps<"/admin/review">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Review searchParams={searchParams} />
    </Suspense>
  );
}
