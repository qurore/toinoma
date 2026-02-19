import { SidebarNav } from "./sidebar-nav";

// DashboardSidebar: sub-navigation for dashboard pages.
// Logo and user identity are handled by the AppNavbar above.
export function DashboardSidebar() {
  return (
    <aside className="fixed bottom-0 left-0 top-14 z-40 flex w-60 flex-col border-r border-border bg-card">
      <SidebarNav />
    </aside>
  );
}
