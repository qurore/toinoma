import { MobileAppTabBar } from "@/components/navigation/mobile-app-tab-bar";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <MobileAppTabBar />
    </>
  );
}
