"use client";

import { CircleHelp, CircleUser, Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Parties" },
  { href: "/planning", label: "Mon planning" },
  { href: "/tables/new", label: "Proposer" },
] as const;

type Props = {
  pseudo: string | null;
  version: string;
};

export function Navbar({ pseudo, version }: Props) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-15 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20"
            aria-hidden
          >
            R
          </span>
          <span className="text-lg">RPGers</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground">
            v{version}
          </span>
        </Link>

        <nav
          className="ml-5 hidden items-center gap-1 sm:flex"
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
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden md:flex"
          >
            <Link href="/signalement" aria-label="Signaler un problème">
              <Flag className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden md:flex"
          >
            <Link href="/faq" aria-label="Aide">
              <CircleHelp className="size-4" aria-hidden />
            </Link>
          </Button>
          <NotificationBell />
          <ThemeToggle />
          {pseudo && (
            <Button variant="ghost" size="sm" asChild className="gap-1.5 px-2">
              <Link
                href="/profile"
                aria-label={`Profil de ${pseudo}`}
                aria-current={pathname === "/profile" ? "page" : undefined}
              >
                <CircleUser className="size-4" aria-hidden />
                <span className="hidden max-w-28 truncate lg:inline">
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
