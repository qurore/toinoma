import { redirect } from "next/navigation";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();
  if (!navbarData.user) redirect("/login?next=/dashboard");

  return (
    <>
      <AppNavbar {...navbarData} />
      {/* pt-14 offsets fixed top navbar (h-14). Sidebar starts at top-14. */}
      <div className="flex pt-14">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col pl-60">
          {children}
        </div>
      </div>
    </>
  );
}
