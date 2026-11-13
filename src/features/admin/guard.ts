import "server-only";
import { notFound, redirect } from "next/navigation";
import { getAccount, type Account } from "@/features/account/data";
import { signInPath } from "@/lib/routes";

/**
 * Call at the top of every /admin page. Not signed in: off to sign-in.
 * Signed in but not a site admin: "not found", so the admin area stays
 * invisible. The database decides who is an admin (private.site_admins).
 */
export async function requireAdmin(): Promise<Account> {
  const account = await getAccount();
  if (!account) redirect(signInPath);
  if (!account.is_admin) notFound();
  return account;
}
