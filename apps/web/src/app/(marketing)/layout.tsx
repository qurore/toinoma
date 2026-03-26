import { MobileAppTabBar } from "@/components/navigation/mobile-app-tab-bar";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="pb-20 md:pb-0">
        {children}
      </div>
      <MobileAppTabBar />
    </>
  );
}
