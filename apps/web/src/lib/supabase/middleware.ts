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

/**
 * Build the Content-Security-Policy header value.
 *
 * In non-production environments (dev/test), `'unsafe-eval'` is appended to
 * `script-src` because Next.js HMR and React Refresh rely on `eval()` to load
 * modules. Without it, the browser blocks every client bundle, hydration
 * fails, and `<form onSubmit>` handlers silently fall back to native HTML
 * GET submission (visible only as a URL becoming `?` with no params).
 *
 * Production CSP intentionally omits `'unsafe-eval'` to preserve XSS hardening.
 */
export function buildCspHeader(nodeEnv: string | undefined): string {
  const isProduction = nodeEnv === "production";
  const scriptSrc = isProduction
    ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com";

  // CSP directive consumer manifest — keep this in sync with the source code
  // grep targets noted in each comment. Order is semantic (scripts → styles →
  // assets → connect → frames → meta), NOT alphabetical; if you reorder, you
  // must rebaseline the snapshot test in middleware.test.ts deliberately.
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // img-src consumers:
    //   - components/ui/avatar.tsx (Radix Avatar primitive — renders raw <img>,
    //     bypasses next/image; serves Google `*.googleusercontent.com` +
    //     Twitter `pbs.twimg.com` OAuth avatars across all avatar render sites)
    //   - Supabase Storage uploads (problem images, attachments)
    //   - Stripe-hosted assets (checkout / Connect dashboard imagery)
    "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com https://*.googleusercontent.com https://pbs.twimg.com",
    // media-src consumers:
    //   - components/solving/video-player.tsx:47 (<video> from Supabase Storage)
    //   - components/seller/video-uploader.tsx:380 (<video> preview, blob: URL
    //     before upload + Supabase Storage URL after upload)
    "media-src 'self' blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://generativelanguage.googleapis.com",
    // frame-src consumers (Supabase Storage signed-URL PDF iframes + Stripe):
    //   - components/grading/solve-client.tsx:1043 (desktop split view)
    //   - components/grading/solve-client.tsx:1100 (mobile tab view)
    //   - app/(dashboard)/dashboard/collections/[id]/solve/collection-solve-client.tsx:304
    //   - components/seller/pdf-preview.tsx:120 (FR-022 A4 preview)
    //   - components/marketplace/problem-detail-tabs.tsx:133 (purchased preview)
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

// Routes reserved for unauthenticated (guest) users — authenticated users are redirected to /dashboard
// These are the landing page and auth-flow pages that serve no purpose for logged-in users.
const GUEST_ONLY_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
];

// Auth routes that own a client-side form. If we ever see `email=` or
// `password=` query params on a GET to one of these paths, the form was
// submitted as a native HTML GET (i.e. React never hydrated) and the
// password just leaked into the URL bar / referer / browser history.
// We strip the params and log loudly so this regression cannot be silent
// the way it was before PDCA-2026-0007.
const HYDRATION_GUARDED_AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);
const SENSITIVE_QUERY_PARAMS = ["password", "email", "confirm-password"];

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

  // ── Hydration-failure guard ──
  // If a client form was submitted before React hydrated, the browser
  // performs a native HTML GET and credentials end up in the URL.
  // Detect this on inbound GETs to auth pages, scrub the params, and
  // emit a loud log so monitoring can alert on it.
  if (
    request.method === "GET" &&
    HYDRATION_GUARDED_AUTH_ROUTES.has(pathname)
  ) {
    const hasSensitiveParam = SENSITIVE_QUERY_PARAMS.some((p) =>
      request.nextUrl.searchParams.has(p)
    );
    if (hasSensitiveParam) {
      // Console.error so the message lands in Vercel logs without throwing.
      // Do NOT echo the param values — that would just relog the secret.
      console.error(
        `[hydration-failure] sensitive query params on ${pathname}; scrubbing URL.`
      );
      const url = request.nextUrl.clone();
      for (const p of SENSITIVE_QUERY_PARAMS) url.searchParams.delete(p);
      return NextResponse.redirect(url);
    }
  }

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
  // CSP: allow self, inline styles (for Tailwind/Radix), and required external origins.
  // 'unsafe-eval' is added in non-production for Next.js HMR / React Refresh.
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    buildCspHeader(process.env.NODE_ENV)
  );

  return supabaseResponse;
}
