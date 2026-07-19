"use client";

import { CalendarDays, Flag, HelpCircle, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Tablées", icon: LayoutGrid },
  { href: "/planning", label: "Mes Parties", icon: CalendarDays },
  { href: "/tables/new", label: "Proposer", icon: Plus },
  { href: "/signalement", label: "Signaler", icon: Flag },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
] as const;

/** Navigation principale mobile — barre de bas d'écran (usage au pouce en convention). */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur sm:hidden"
      aria-label="Navigation principale"
    >
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
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
