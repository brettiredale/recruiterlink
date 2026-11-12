import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountShell, Panel } from "@/features/account/AccountShell";
import { getAccount } from "@/features/account/data";
import { NewListingForm } from "@/features/account/NewListingForm";
import { getCountries, getSpecialisms } from "@/lib/directory";
import { accountPath, signInPath } from "@/lib/routes";
import { isGenericSpecialism } from "@/lib/specialisms";
import AccountLoading from "../loading";

export const metadata: Metadata = { title: "Add your agency" };

async function NewListing() {
  const account = await getAccount();
  if (!account) redirect(signInPath);
  // Personal addresses and domains that already have a listing start from the account page.
  if (account.is_personal_email || account.matches.length > 0) redirect(accountPath);

  const [countries, allSpecialisms] = await Promise.all([getCountries(), getSpecialisms()]);
  const specialisms = [...allSpecialisms]
    .sort((a, b) => Number(isGenericSpecialism(a.slug)) - Number(isGenericSpecialism(b.slug)))
    .map(({ id, name }) => ({ id, name }));

  return (
    <AccountShell
      title="Add your agency"
      email={account.email}
      back
      intro="Tell us about your agency. A member of the RecruiterLink team checks every new listing before it goes on the site, usually within two working days."
    >
      <Panel title="Your agency's details">
        <NewListingForm
          domain={account.domain}
          countries={[...countries]
            .sort((a, b) => a.name.localeCompare(b.name, "en"))
            .map(({ id, name }) => ({ id, name }))}
          specialisms={specialisms}
        />
      </Panel>
    </AccountShell>
  );
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<AccountLoading />}>
      <NewListing />
    </Suspense>
  );
}
