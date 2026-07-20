"use client";

import { ArrowLeft, CircleHelp, CircleUser, Flag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const isTableDetail = /^\/tables\/\d+$/.test(pathname);

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/70 bg-background/92 pt-[env(safe-area-inset-top)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
      style={{ viewTransitionName: "app-header" }}
    >
      <div className="grid h-14 grid-cols-[5.5rem_1fr_5.5rem] items-center px-2 sm:hidden">
        {isTableDetail ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="grid size-11 place-items-center rounded-full text-foreground transition-colors active:bg-muted"
            aria-label="Retour aux parties"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <Link
            href="/"
            transitionTypes={["nav-tab"]}
            className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20"
            aria-label="RPGers — Parties"
          >
            R
          </Link>
        )}

        <p className="truncate px-2 text-center text-[15px] font-semibold tracking-tight">
          {isTableDetail ? "Détail de la partie" : "RPGers"}
        </p>

        <div className="flex justify-end">
          <NotificationBell />
          {!isTableDetail && <ThemeToggle />}
        </div>
      </div>

      <div className="mx-auto hidden h-15 max-w-6xl items-center gap-2 px-6 sm:flex">
        <Link
          href="/"
          transitionTypes={["nav-tab"]}
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
                transitionTypes={["nav-tab"]}
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
            <Link
              href="/signalement"
              transitionTypes={["nav-tab"]}
              aria-label="Signaler un problème"
            >
              <Flag className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hidden md:flex"
          >
            <Link href="/faq" transitionTypes={["nav-tab"]} aria-label="Aide">
              <CircleHelp className="size-4" aria-hidden />
            </Link>
          </Button>
          <NotificationBell />
          <ThemeToggle />
          {pseudo && (
            <Button variant="ghost" size="sm" asChild className="gap-1.5 px-2">
              <Link
                href="/profile"
                transitionTypes={["nav-tab"]}
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
