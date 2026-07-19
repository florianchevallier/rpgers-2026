"use client";

import { Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Tablées" },
  { href: "/planning", label: "Mes Parties" },
  { href: "/tables/new", label: "Proposer" },
  { href: "/signalement", label: "Signaler" },
  { href: "/faq", label: "FAQ" },
] as const;

type Props = {
  pseudo: string | null;
};

/** Barre supérieure — brand + navigation desktop + notifications + thème. */
export function Navbar({ pseudo }: Props) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold tracking-[0.12em] text-primary"
        >
          <Swords className="size-5" aria-hidden />
          <span className="uppercase">Critiquest</span>
        </Link>

        <nav
          className="ml-6 hidden items-center gap-1 sm:flex"
          aria-label="Navigation principale"
        >
          {LINKS.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          {pseudo && (
            <span className="ml-1 hidden max-w-32 truncate text-sm text-muted-foreground md:inline">
              {pseudo}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
