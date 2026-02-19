import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { requireCompleteSeller } from "@/lib/auth/require-seller";

export default async function SellerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Verify complete seller capability (redirects to /sell/onboarding if not)
  await requireCompleteSeller();
  // Fetch full navbar data (parallel to seller check above for display purposes)
  const navbarData = await getNavbarData();

  return (
    <>
      <AppNavbar {...navbarData} />
      <div className="pt-14">{children}</div>
    </>
  );
}
