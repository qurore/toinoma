import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileDashboardNav } from "@/components/dashboard/mobile-nav";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();
  if (!navbarData.user) {
    const headerList = await headers();
    // Attempt to extract the current path from x-url (set by middleware) or referer
    const xUrl = headerList.get("x-url");
    const referer = headerList.get("referer");
    let nextPath = "/dashboard";
    if (xUrl) {
      try {
        nextPath = new URL(xUrl).pathname;
      } catch {
        // Fallback to /dashboard
      }
    } else if (referer) {
      try {
        nextPath = new URL(referer).pathname;
      } catch {
        // Fallback to /dashboard
      }
    }
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  // Fetch grading usage count for the sidebar usage meter
  let gradingsUsed = 0;
  try {
    const supabase = await createClient();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", navbarData.user.id)
      .gte("created_at", monthStart);
    gradingsUsed = count ?? 0;
  } catch {
    // Graceful degradation — show 0 if query fails
  }

  return (
    <>
      <AppNavbar {...navbarData} />
      {/* Desktop sidebar: fixed left, below navbar, hidden on mobile */}
      <DashboardSidebar
        subscriptionTier={navbarData.subscriptionTier}
        gradingsUsed={gradingsUsed}
      />
      {/* Mobile tab bar: fixed below navbar, only on mobile (md:hidden) */}
      <MobileDashboardNav />
      {/*
        Content offset:
        - Mobile: pt-28 = navbar (h-16=64px) + mobile dashboard nav (h-10=40px) + gap = 112px
        - Desktop: pt-16 = navbar (h-16=64px) only, pl-60 = sidebar (w-60=240px)
      */}
      <main id="main-content" className="pt-28 md:pl-60 md:pt-16">
        {children}
      </main>
    </>
  );
}
