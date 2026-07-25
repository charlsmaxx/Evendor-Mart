import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const authRoutes = ["/login", "/register", "/otp"];

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

  if (user && authRoutes.some((r) => pathname.startsWith(r))) {
    const role = request.nextUrl.searchParams.get("role");
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (role === "vendor" || redirectParam?.startsWith("/list-your-business")) {
      const dest =
        redirectParam?.startsWith("/list-your-business") ? redirectParam : "/list-your-business";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
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
