// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const sidebarNavSource = readFileSync(
  resolve(__dirname, "./sidebar-nav.tsx"),
  "utf-8"
);

describe("SidebarNav", () => {
  it("uses usePathname for active link detection", () => {
    expect(sidebarNavSource).toContain("usePathname");
    expect(sidebarNavSource).toContain('"use client"');
  });

  it("has exact match flag for /dashboard root to prevent over-matching", () => {
    expect(sidebarNavSource).toContain("exact: true");
    expect(sidebarNavSource).toContain('pathname === item.href');
    expect(sidebarNavSource).toContain('pathname.startsWith(item.href)');
  });

  it("includes all required navigation routes", () => {
    expect(sidebarNavSource).toContain('href: "/dashboard"');
    expect(sidebarNavSource).toContain('href: "/dashboard/history"');
    expect(sidebarNavSource).toContain('href: "/dashboard/favorites"');
    expect(sidebarNavSource).toContain('href: "/dashboard/collections"');
    expect(sidebarNavSource).toContain('href: "/settings"');
  });

  it("uses token-based active state classes (no hardcoded colors)", () => {
    expect(sidebarNavSource).toContain("bg-primary/10");
    expect(sidebarNavSource).toContain("text-primary");
    expect(sidebarNavSource).not.toContain("hsl(");
    expect(sidebarNavSource).not.toContain("#");
  });

  it("includes Japanese navigation labels", () => {
    expect(sidebarNavSource).toContain("ダッシュボード");
    expect(sidebarNavSource).toContain("解答履歴");
    expect(sidebarNavSource).toContain("お気に入り");
    expect(sidebarNavSource).toContain("コレクション");
    expect(sidebarNavSource).toContain("設定");
  });
});

describe("DashboardSidebar", () => {
  const sidebarSource = readFileSync(
    resolve(__dirname, "./sidebar.tsx"),
    "utf-8"
  );

  it("is a Server Component (no use client directive)", () => {
    expect(sidebarSource).not.toContain('"use client"');
  });

  it("renders fixed 240px sidebar (w-60)", () => {
    expect(sidebarSource).toContain("w-60");
    expect(sidebarSource).toContain("fixed");
  });

  it("uses bg-card for sidebar background (light theme)", () => {
    expect(sidebarSource).toContain("bg-card");
  });

  it("composes SidebarNav client component", () => {
    expect(sidebarSource).toContain("SidebarNav");
    expect(sidebarSource).toContain("./sidebar-nav");
  });

  it("delegates user identity to AppNavbar (no auth code in sidebar)", () => {
    expect(sidebarSource).not.toContain("createClient");
    expect(sidebarSource).not.toContain("getUser");
  });

  it("positions below navbar with top-14 offset", () => {
    expect(sidebarSource).toContain("top-14");
  });
});
