import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import { MobileAppTabBar } from "@/components/navigation/mobile-app-tab-bar";

export default async function HelpLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-16">
        <main id="main-content">{children}</main>
      </div>
      <SiteFooter />
      <MobileAppTabBar />
    </>
  );
}
