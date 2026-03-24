import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication — unauthenticated users are redirected to /login
const AUTH_REQUIRED_ROUTES = [
  "/dashboard",
  "/seller",
  "/settings",
  "/admin",
  "/notifications",
  "/purchase",
  "/welcome",
];

// Routes reserved for unauthenticated (guest) users — authenticated users are redirected to /dashboard
// These are the landing page and auth-flow pages that serve no purpose for logged-in users.
const GUEST_ONLY_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Unauthenticated user hitting a protected route → redirect to /login ──
  const isAuthRequired = AUTH_REQUIRED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!user && isAuthRequired) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── Authenticated user hitting a guest-only route → redirect to /dashboard ──
  if (user) {
    // Exact match for root path "/"
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Guest-only routes (login, signup, forgot-password)
    const isGuestOnly = GUEST_ONLY_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isGuestOnly) {
      const url = request.nextUrl.clone();
      // Preserve the ?next= param if present, otherwise go to /dashboard
      // Validate: must start with "/" and not contain "//" (open redirect prevention)
      const next = request.nextUrl.searchParams.get("next");
      const isSafeNext = next && next.startsWith("/") && !next.startsWith("//");
      url.pathname = isSafeNext ? next : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // /reset-password: only redirect if there's no auth code/token in the URL
    // (the user might have clicked a password reset email link while already logged in)
    if (pathname === "/reset-password") {
      const hasResetToken =
        request.nextUrl.searchParams.has("code") ||
        request.nextUrl.searchParams.has("token") ||
        request.nextUrl.searchParams.has("token_hash");
      if (!hasResetToken) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  // Forward the current URL so server components can read it via headers()
  supabaseResponse.headers.set("x-url", request.url);

  return supabaseResponse;
}
