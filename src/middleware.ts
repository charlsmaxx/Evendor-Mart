import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { LEGAL_COOKIE_NAME, isCurrentLegalCookie } from "@/lib/legal";

const authRoutes = ["/login", "/register", "/otp"];
/** Logged-in users must still be able to open these (password recovery). */
const authAllowWhenSignedIn = ["/forgot-password", "/reset-password"];

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

/** Vendor dashboard lives at /vendor/* — public profiles are /vendors/* */
function isProtectedPath(pathname: string) {
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/onboarding")
  ) {
    return true;
  }
  if (pathname === "/vendor" || pathname.startsWith("/vendor/")) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const inPasswordRecovery = request.cookies.get("evendor_pw_recovery")?.value === "1";

  // Recovery session: keep the user on the password form, never bounce to dashboard.
  if (user && inPasswordRecovery && !pathname.startsWith("/reset-password")) {
    if (
      authRoutes.some((r) => pathname.startsWith(r)) ||
      pathname.startsWith("/dashboard") ||
      pathname === "/"
    ) {
      return copyCookies(supabaseResponse, NextResponse.redirect(new URL("/reset-password", request.url)));
    }
  }

  if (
    user &&
    authRoutes.some((r) => pathname.startsWith(r)) &&
    !authAllowWhenSignedIn.some((r) => pathname.startsWith(r))
  ) {
    if (inPasswordRecovery) {
      return copyCookies(supabaseResponse, NextResponse.redirect(new URL("/reset-password", request.url)));
    }
    const role = request.nextUrl.searchParams.get("role");
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (role === "vendor" || redirectParam?.startsWith("/list-your-business")) {
      const dest =
        redirectParam?.startsWith("/list-your-business") ? redirectParam : "/list-your-business";
      return copyCookies(supabaseResponse, NextResponse.redirect(new URL(dest, request.url)));
    }
    return copyCookies(supabaseResponse, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (
    user &&
    isProtectedPath(pathname) &&
    !isCurrentLegalCookie(request.cookies.get(LEGAL_COOKIE_NAME)?.value)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/legal/accept";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  supabaseResponse.headers.set("x-pathname", pathname);
  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next internals, static assets, and the service worker so PWA install/update is never redirected.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|swe-worker-.*\\.js|manifest\\.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
