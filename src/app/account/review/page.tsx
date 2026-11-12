import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClasses } from "@/components";
import { AccountShell, Panel } from "@/features/account/AccountShell";
import { reviewSubmission } from "@/features/account/actions";
import { getAccount, getPendingSubmissions } from "@/features/account/data";
import { LinkPersonForm } from "@/features/account/SmallForms";
import { Notice, SubmitButton, inputClass } from "@/features/account/ui";
import { signInPath } from "@/lib/routes";
import { toParagraphs } from "@/lib/text";
import AccountLoading from "../loading";

export const metadata: Metadata = { title: "Review new listings" };

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  published: { tone: "success", text: "Published. The agency has been emailed, and the listing is on the site." },
  rejected: { tone: "info", text: "Turned down. The agency has been emailed with your reason." },
  "already-listed": { tone: "error", text: "That website already has a published listing, so this one was not published." },
  "not-found": { tone: "error", text: "That listing is no longer waiting. It may already have been reviewed." },
  failed: { tone: "error", text: "That did not work. Please try again." },
};

async function Review({ searchParams }: { searchParams: PageProps<"/account/review">["searchParams"] }) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  if (!account) redirect(signInPath);
  // The database decides who runs the site; everyone else sees "not found".
  const submissions = account.is_admin ? await getPendingSubmissions() : null;
  if (!submissions) notFound();
  const notice = typeof params.notice === "string" ? NOTICES[params.notice] : undefined;

  return (
    <AccountShell
      title="Review new listings"
      email={account.email}
      back
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
              <h2 className="mb-4 font-heading text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-extrabold tracking-[-0.03em] break-words">
                {submission.name}
              </h2>
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
                    {submission.city_name}, {submission.country}
                    {submission.city_exists ? null : (
                      <span className="mt-1 block text-[15px] font-normal text-pink-text">
                        New city: publishing adds “{submission.city_name}” to the directory. Check
                        the spelling.
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
    </AccountShell>
  );
}

export default function ReviewPage({ searchParams }: PageProps<"/account/review">) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <Review searchParams={searchParams} />
    </Suspense>
  );
}
