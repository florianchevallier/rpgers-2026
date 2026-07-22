"use client";

import {
  CalendarDays,
  CircleUser,
  LayoutGrid,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Parties", icon: LayoutGrid },
  { href: "/choisir", label: "Choisir", icon: Sparkles },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/tables/new", label: "Proposer", icon: Plus },
  { href: "/profile", label: "Profil", icon: CircleUser },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:hidden"
      aria-label="Navigation principale"
      style={{ viewTransitionName: "app-tabbar" }}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 gap-1 px-2 py-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              transitionTypes={["nav-tab"]}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-[color,background-color,transform] active:scale-95",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground active:bg-muted",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
