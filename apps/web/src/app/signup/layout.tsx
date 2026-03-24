import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "新規登録 | 問の間",
};

export default function SignupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
