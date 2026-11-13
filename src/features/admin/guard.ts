import "server-only";
import { redirect } from "next/navigation";
import { getAccount, type Account } from "@/features/account/data";
import { adminSignInPath } from "@/lib/routes";

/**
 * Call at the top of every /admin page. Anyone who is not the signed-in
 * site admin goes to the admin sign-in: signed-out visitors to sign in, and
 * anyone signed in with another address to be told so and offered a
 * sign-out. The database decides who is an admin (private.site_admins), and
 * every admin_* function checks again, so nothing here is the only lock.
 */
export async function requireAdmin(): Promise<Account> {
  const account = await getAccount();
  if (!account || !account.is_admin) redirect(adminSignInPath);
  return account;
}
