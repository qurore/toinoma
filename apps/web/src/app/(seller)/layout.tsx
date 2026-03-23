import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { requireAuth } from "@/lib/auth/require-seller";

export default async function SellerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only require authentication — ToS check is handled at page level
  await requireAuth();
  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-14">{children}</div>
    </>
  );
}
