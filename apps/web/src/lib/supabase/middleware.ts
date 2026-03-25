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
      // Validate redirect target to prevent open redirect attacks
      const next = request.nextUrl.searchParams.get("next");
      const isSafeNext =
        next &&
        next.startsWith("/") &&
        !next.startsWith("//") &&
        !next.includes(":") &&
        !next.includes("\\");
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

  // ── CSRF protection for state-changing API routes ──
  // Verify Origin header matches our domain for POST/PATCH/DELETE on /api/ routes
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/webhooks/") && // Webhooks use signature verification
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.method !== "OPTIONS"
  ) {
    const origin = request.headers.get("origin");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (origin && appUrl) {
      const allowedOrigin = new URL(appUrl).origin;
      if (origin !== allowedOrigin && origin !== new URL(request.url).origin) {
        return NextResponse.json(
          { error: "Cross-origin request blocked" },
          { status: 403 }
        );
      }
    }
  }

  // Forward the current URL so server components can read it via headers()
  supabaseResponse.headers.set("x-url", request.url);

  // Security headers
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()"
  );
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  // CSP: allow self, inline styles (for Tailwind/Radix), and required external origins
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://generativelanguage.googleapis.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  return supabaseResponse;
}
