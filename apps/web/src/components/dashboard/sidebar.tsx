import { SidebarNav } from "./sidebar-nav";
import type { SubscriptionTier } from "@/types/database";

interface DashboardSidebarProps {
  subscriptionTier?: SubscriptionTier;
  gradingsUsed?: number;
}

// DashboardSidebar: sub-navigation for dashboard pages.
// Logo and user identity are handled by the AppNavbar above.
export function DashboardSidebar({
  subscriptionTier,
  gradingsUsed,
}: DashboardSidebarProps) {
  return (
    <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-60 flex-col border-r border-border bg-card md:flex">
      <SidebarNav
        subscriptionTier={subscriptionTier}
        gradingsUsed={gradingsUsed}
      />
    </aside>
  );
}
