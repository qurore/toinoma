"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2x2, House, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  House,
  Grid2x2,
  LayoutDashboard,
} as const;

type IconName = keyof typeof iconMap;

interface NavItemClientProps {
  href: string;
  icon: IconName;
  label: string;
  exact?: boolean;
}

export function NavItemClient({ href, icon, label, exact }: NavItemClientProps) {
  const Icon = iconMap[icon];
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? "text-primary"
          : "text-foreground/60 hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      {isActive && (
        <span className="absolute -bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" aria-hidden="true" />
      )}
    </Link>
  );
}
