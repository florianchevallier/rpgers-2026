"use client";

import { CalendarDays, CircleUser, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Parties", icon: LayoutGrid },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/tables/new", label: "Proposer", icon: Plus },
  { href: "/profile", label: "Profil", icon: CircleUser },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      aria-label="Navigation principale"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-4 px-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:bg-muted",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
              {active && (
                <span
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
