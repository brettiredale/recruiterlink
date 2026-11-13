import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components";
import { signOutAdmin } from "@/features/account/actions";
import { getAccount } from "@/features/account/data";
import { SignInFlow } from "@/features/account/SignInFlow";
import { Notice, SubmitButton } from "@/features/account/ui";
import { adminPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Admin sign-in" };

const NOTICES: Record<string, string> = {
  link: "That sign-in link has already been used or has expired. Enter your email address and we will send you a new code.",
  "signed-out": "You have signed out.",
};

/**
 * The way into /admin, as on the Brainy sites: the admin is sent straight
 * on, anyone else signed in is told this is not an admin account and can
 * sign out, and everyone else gets the sign-in box.
 */
async function AdminSignIn({ searchParams }: { searchParams: PageProps<"/admin/sign-in">["searchParams"] }) {
  const [account, params] = await Promise.all([getAccount(), searchParams]);
  if (account?.is_admin) redirect(adminPath);

  if (account) {
    return (
      <div className="flex flex-col gap-5">
        <Notice tone="info">
          You are signed in as <strong className="break-all">{account.email}</strong>, which is not
          the administrator&apos;s account.
        </Notice>
        <p className="text-[17px] text-muted">
          Sign out, then sign in again with the administrator&apos;s email address.
        </p>
        <form action={signOutAdmin}>
          <SubmitButton pendingLabel="Signing out…" variant="primary">
            Sign out
          </SubmitButton>
        </form>
      </div>
    );
  }

  const key = [params.problem, params.notice].flat().find((v): v is string => typeof v === "string");
  return <SignInFlow audience="admin" notice={key ? NOTICES[key] : undefined} />;
}

export default function AdminSignInPage({ searchParams }: PageProps<"/admin/sign-in">) {
  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <p className="label-mono mb-2 text-[13px] text-pink-text">Admin</p>
      <h1 className="mb-7 font-heading text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em]">
        Sign in to RecruiterLink admin
      </h1>
      <div className="rounded-panel bg-pale p-5 sm:p-9">
        <Suspense fallback={<p className="text-lg text-muted">Loading…</p>}>
          <AdminSignIn searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}
