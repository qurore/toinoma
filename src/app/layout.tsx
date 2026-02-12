import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Toinoma — Where questions meet answers",
    template: "%s | Toinoma",
  },
  description:
    "AI-graded exam problem marketplace connecting creators with students preparing for entrance exams.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://toinoma.jp"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
