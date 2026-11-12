import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before the account pages only (see `config.matcher`), never before
 * the public directory pages. It keeps the visitor's sign-in session fresh
 * and sends anyone who is not signed in to the sign-in page.
 */
const OPEN_PATHS = new Set(["/account/sign-in", "/account/confirm"]);

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Checks the session with Supabase and renews it when it is about to expire.
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);
  const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";

  let redirectTo: string | null = null;
  if (!signedIn && !OPEN_PATHS.has(path)) redirectTo = "/account/sign-in";
  if (signedIn && path === "/account/sign-in") redirectTo = "/account";

  if (redirectTo) {
    const target = request.nextUrl.clone();
    target.pathname = redirectTo;
    target.search = "";
    const redirect = NextResponse.redirect(target);
    // Keep any renewed session cookies on the redirect.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  // Account pages are private: never store them in a shared cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/account", "/account/:path*"],
};
