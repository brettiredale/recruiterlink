import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, PageIntro } from "@/components";
import { SignInFlow } from "@/features/account/SignInFlow";
import { forAgenciesPath, searchPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Sign in or list your agency",
  description: "Sign in to manage your recruitment agency's listing on RecruiterLink, or add your agency.",
};

const NOTICES: Record<string, string> = {
  link: "That sign-in link has already been used or has expired. Enter your email address and we will send you a new code.",
  "signed-out": "You have signed out.",
};

async function Flow({ searchParams }: { searchParams: PageProps<"/account/sign-in">["searchParams"] }) {
  const params = await searchParams;
  const key = [params.problem, params.notice].flat().find((v): v is string => typeof v === "string");
  return <SignInFlow notice={key ? NOTICES[key] : undefined} />;
}

export default function SignInPage({ searchParams }: PageProps<"/account/sign-in">) {
  return (
    <>
      <PageIntro
        eyebrow="For recruitment agencies"
        title="Sign in or list your agency"
        intro="One step for everyone. Enter your work email address: if your agency is already on RecruiterLink the listing becomes yours to manage, and if it is not you can add it."
      />
      <Container className="grid gap-x-14 gap-y-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0 rounded-panel bg-pale p-5 sm:p-9">
          <Suspense fallback={<SignInFlow />}>
            <Flow searchParams={searchParams} />
          </Suspense>
        </div>
        <div className="min-w-0">
          <h2 className="mb-4 font-heading text-2xl leading-tight font-extrabold tracking-[-0.03em]">
            How it works
          </h2>
          <ol className="flex flex-col gap-4 text-[17px] text-muted">
            <li className="flex gap-3">
              <span className="label-mono mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm text-white">1</span>
              <span>
                <strong className="text-navy">Enter your work email.</strong> We send a six-digit
                code to it. No password.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="label-mono mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm text-white">2</span>
              <span>
                <strong className="text-navy">Type in the code.</strong> That confirms you work at
                the agency whose website matches your email address.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="label-mono mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm text-white">3</span>
              <span>
                <strong className="text-navy">Manage your listing.</strong> Update your
                description, specialisms and logo. A listing is free.
              </span>
            </li>
          </ol>
          <p className="mt-6 text-base text-muted">
            Only have a personal address such as Gmail? You can still sign in, and we will check
            your agency by hand.{" "}
            <Link href={forAgenciesPath} className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep">
              What a listing includes
            </Link>
            {" · "}
            <Link href={searchPath} className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep">
              Find your agency
            </Link>
          </p>
        </div>
      </Container>
    </>
  );
}
