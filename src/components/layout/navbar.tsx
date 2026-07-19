"use client";

import { CircleUser, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
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
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 pl-2 pr-2.5"
            >
              <Link
                href="/profile"
                aria-current={pathname === "/profile" ? "page" : undefined}
              >
                <CircleUser className="size-4" aria-hidden />
                <span className="hidden max-w-32 truncate md:inline">
                  {pseudo}
                </span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
