import type { Metadata } from "next";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import { LegalNav } from "./legal-nav";

export const metadata: Metadata = {
  title: {
    template: "%s - 問の間",
    default: "法的情報 - 問の間",
  },
};

export default async function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-16">
        {/* Mobile horizontal nav */}
        <div className="border-b border-border lg:hidden">
          <div className="mx-auto max-w-5xl overflow-x-auto px-4">
            <LegalNav variant="horizontal" />
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          {/* Sidebar — desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h2 className="mb-3 text-sm font-semibold text-foreground/60">
                法的情報
              </h2>
              <LegalNav variant="sidebar" />
            </div>
          </aside>
          {/* Content */}
          <main className="prose prose-sm prose-gray dark:prose-invert max-w-none">
            {children}
          </main>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
