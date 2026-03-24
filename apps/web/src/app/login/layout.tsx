import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン | 問の間",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
