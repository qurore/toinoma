"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkClientProps {
  href: string;
  label: string;
  exact?: boolean;
}

/**
 * Clean, text-only navigation link with active underline indicator.
 * No icons — matches Udemy/Notion minimal nav style.
 */
export function NavLinkClient({ href, label, exact }: NavLinkClientProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {isActive && (
        <span
          className="absolute inset-x-3 -bottom-[19px] h-0.5 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
