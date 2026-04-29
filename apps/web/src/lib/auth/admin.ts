import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Parses ADMIN_EMAILS env var into a normalized Set on every call (no cache).
 * Each entry is trimmed and lowercased; empty entries are filtered out.
 *
 * Fail-closed: returns empty Set when env is unset, empty string, or whitespace-only.
 *
 * Direct reads of process.env.ADMIN_EMAILS outside this module are PROHIBITED.
 */
function getAdminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw || raw.trim() === "") {
    if (process.env.NODE_ENV !== "production" && !process.env.CI) {
      console.warn(
        "[admin.ts] ADMIN_EMAILS is not set — all admin checks will return false. Set it in apps/web/.env.local for local development."
      );
    }
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Pure admin allowlist check. Reads ADMIN_EMAILS env var on every call.
 * Case-insensitive + whitespace-trimmed exact-string match.
 * NO plus-addressing normalization (e.g., "a+x@b.com" is distinct from "a@b.com").
 * Returns false on null/undefined/empty input or unset env (fail-closed).
 *
 * Email mutability note: Admin grants are tied to the email-controlling identity.
 * If an admin's email is reassigned to a new person (e.g., company offboarding),
 * the new owner inherits admin privileges silently. Operators MUST rotate
 * ADMIN_EMAILS whenever a listed email changes ownership.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmailSet().has(email.trim().toLowerCase());
}

/**
 * Page-render guard. Use in RSC pages and apps/web/src/app/admin/layout.tsx.
 * Redirects to /login if unauthenticated; redirects to / if authenticated but not admin.
 * Returns { user } on success.
 *
 * Server Actions should use requireAdminAction() instead — redirecting from a Server
 * Action loses form state and breaks optimistic UX with useActionState.
 */
export async function requireAdmin(): Promise<{ user: User }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdmin(user.email)) {
    redirect("/");
  }

  return { user };
}

/**
 * Server-action guard. Use in apps/web/src/app/admin/star/actions.ts files.
 * Returns { error } object instead of redirecting; preserves form state for
 * useActionState consumers. Error messages are user-facing (Japanese).
 */
export async function requireAdminAction(): Promise<
  { adminId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };
  if (!isAdmin(user.email)) return { error: "管理者権限が必要です" };
  return { adminId: user.id };
}
