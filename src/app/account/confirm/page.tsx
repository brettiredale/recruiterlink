import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components";
import { confirmSignInLink } from "@/features/account/actions";
import { SubmitButton } from "@/features/account/ui";
import { parseTokenHash } from "@/features/account/validate";
import { signInPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Confirm sign-in" };

/**
 * Where the button in the sign-in email lands. It asks for one more press
 * instead of signing in straight away, because company email systems open
 * links to scan them and would otherwise use the link up.
 */
async function Confirm({ searchParams }: { searchParams: PageProps<"/account/confirm">["searchParams"] }) {
  const params = await searchParams;
  const tokenHash = parseTokenHash(params.token_hash);

  if (!tokenHash) {
    return (
      <>
        <h1 className="mb-3 font-heading text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em]">
          This sign-in link is not complete
        </h1>
        <p className="mb-6 text-lg text-muted">
          Part of the link is missing, which can happen when an email program splits it across
          lines. Use the code from the same email, or ask for a new one.
        </p>
        <Link href={signInPath} className="font-bold text-indigo underline underline-offset-4 hover:text-indigo-deep">
          Go to sign-in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-3 font-heading text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-extrabold tracking-[-0.035em]">
        Finish signing in
      </h1>
      <p className="mb-7 text-lg text-muted">
        Press the button to sign in to RecruiterLink on this device.
      </p>
      <form action={confirmSignInLink}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <SubmitButton pendingLabel="Signing in…" variant="primary">
          Sign in to RecruiterLink
        </SubmitButton>
      </form>
    </>
  );
}

export default function ConfirmPage({ searchParams }: PageProps<"/account/confirm">) {
  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <div className="rounded-panel bg-pale p-6 sm:p-12">
        <Suspense fallback={<p className="text-lg text-muted">Checking your link…</p>}>
          <Confirm searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}
