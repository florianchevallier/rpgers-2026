"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  List,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PlanningTable = {
  id: number;
  title: string;
  start: string;
  end: string;
  room: string;
  location: string;
  gameMaster: string;
  isOwner: boolean;
  hasConflict: boolean;
  seatsLeft: number;
};

export type PlanningDay = {
  key: string;
  label: string;
  shortLabel: string;
  dayNumber: string;
  tables: PlanningTable[];
};

type Props = {
  days: PlanningDay[];
  initialDayIndex: number;
};

const HOUR_HEIGHT = 72;
const START_HOUR = 0;
const END_HOUR = 24;

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatSlot(start: string, end: string) {
  return `${timeFormatter.format(new Date(start))} – ${timeFormatter.format(new Date(end))}`;
}

function isSameLocalDay(date: Date, dayKey: string) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` === dayKey;
}

export function PlanningView({ days, initialDayIndex }: Props) {
  const [view, setView] = useState<"day" | "list">("day");
  const [selectedIndex, setSelectedIndex] = useState(initialDayIndex);
  const [now, setNow] = useState<Date | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const interval = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectedDay = days[selectedIndex];
  const hours = useMemo(
    () =>
      Array.from(
        { length: END_HOUR - START_HOUR + 1 },
        (_, index) => START_HOUR + index,
      ),
    [],
  );

  useEffect(() => {
    if (!selectedDay || !timelineRef.current) return;

    const nowDate = new Date();
    const focusMinute = isSameLocalDay(nowDate, selectedDay.key)
      ? minuteOfDay(nowDate)
      : selectedDay.tables[0]
        ? minuteOfDay(new Date(selectedDay.tables[0].start))
        : 8 * 60;
    timelineRef.current.scrollTop = Math.max(
      0,
      (focusMinute / 60) * HOUR_HEIGHT - HOUR_HEIGHT,
    );
  }, [selectedDay]);

  if (!selectedDay) return null;

  const currentMinute = now ? minuteOfDay(now) : 0;
  const showNow =
    now &&
    isSameLocalDay(now, selectedDay.key) &&
    currentMinute >= START_HOUR * 60 &&
    currentMinute <= END_HOUR * 60;
  const nowTop = ((currentMinute - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <fieldset className="inline-flex w-fit rounded-lg border border-border bg-muted/50 p-1">
          <legend className="sr-only">Mode d’affichage</legend>
          <Button
            type="button"
            size="sm"
            variant={view === "day" ? "default" : "ghost"}
            aria-pressed={view === "day"}
            onClick={() => setView("day")}
          >
            <CalendarDays aria-hidden />
            Jour
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "list" ? "default" : "ghost"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List aria-hidden />
            Liste
          </Button>
        </fieldset>

        {view === "day" && (
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={selectedIndex === 0}
              onClick={() => setSelectedIndex((index) => index - 1)}
              aria-label="Jour précédent"
            >
              <ChevronLeft aria-hidden />
            </Button>
            <div
              className="min-w-44 text-center leading-tight"
              aria-live="polite"
            >
              <p className="font-heading text-sm font-bold tracking-wide text-primary">
                Jour {selectedDay.dayNumber}
              </p>
              <p className="text-sm font-semibold capitalize">
                {selectedDay.label}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={selectedIndex === days.length - 1}
              onClick={() => setSelectedIndex((index) => index + 1)}
              aria-label="Jour suivant"
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        )}
      </div>

      {view === "list" ? (
        <div className="flex flex-col gap-7">
          {days.map((day) => (
            <section key={day.key} aria-labelledby={`planning-${day.key}`}>
              <h2 id={`planning-${day.key}`} className="day-heading">
                Jour {day.dayNumber} — {day.label}
              </h2>
              <div className="mt-1 border-t border-primary/30" aria-hidden />
              {day.tables.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Aucune partie prévue ce jour-là.
                </p>
              ) : (
                <ol className="mt-4 flex flex-col gap-2.5">
                  {day.tables.map((table) => (
                    <li key={table.id}>
                      <PlanningListItem table={table} />
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      ) : (
        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={`Calendrier du ${selectedDay.label}`}
        >
          <div className="grid grid-cols-[3.75rem_1fr] border-b border-border bg-muted/35">
            <div className="border-r border-border" aria-hidden />
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {selectedDay.shortLabel}
              </p>
              <p className="mt-0.5 font-heading font-bold">
                {selectedDay.tables.length} partie
                {selectedDay.tables.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div
            ref={timelineRef}
            className="max-h-[calc(100dvh-18rem)] min-h-96 overflow-y-auto"
          >
            <div
              className="grid grid-cols-[3.75rem_1fr]"
              style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
            >
              <div className="relative border-r border-border bg-muted/15">
                {hours.slice(0, -1).map((hour, index) => (
                  <span
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                    style={{ top: index * HOUR_HEIGHT }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </span>
                ))}
              </div>

              <div className="relative min-w-0">
                {hours.map((hour, index) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-border/70"
                    style={{ top: index * HOUR_HEIGHT }}
                    aria-hidden
                  />
                ))}

                {selectedDay.tables.map((table) => {
                  const start = new Date(table.start);
                  const end = new Date(table.end);
                  const startMinute = Math.max(
                    minuteOfDay(start),
                    START_HOUR * 60,
                  );
                  const rawEndMinute = isSameLocalDay(end, selectedDay.key)
                    ? minuteOfDay(end)
                    : END_HOUR * 60;
                  const endMinute = Math.min(rawEndMinute, END_HOUR * 60);
                  const top =
                    ((startMinute - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    ((endMinute - startMinute) / 60) * HOUR_HEIGHT,
                    52,
                  );

                  return (
                    <Link
                      key={table.id}
                      href={`/tables/${table.id}`}
                      className={cn(
                        "absolute inset-x-2 z-10 overflow-hidden rounded-lg border-l-4 px-3 py-2 shadow-sm transition-[filter,transform] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        table.hasConflict
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-primary bg-primary text-primary-foreground",
                      )}
                      style={{ top: top + 3, height: height - 6 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {table.title}
                          </p>
                          <p className="text-xs font-semibold tabular-nums opacity-90">
                            {formatSlot(table.start, table.end)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {table.isOwner && (
                            <Crown
                              className="size-3.5"
                              aria-label="Tu es le MJ"
                            />
                          )}
                          {table.hasConflict && (
                            <TriangleAlert
                              className="size-3.5"
                              aria-label="Conflit d’horaire"
                            />
                          )}
                        </div>
                      </div>
                      {height >= 76 && (
                        <p className="mt-1 flex items-center gap-1 truncate text-xs opacity-90">
                          <MapPin className="size-3" aria-hidden />
                          <span className="truncate">
                            {table.room}
                            {table.location ? ` · ${table.location}` : ""}
                          </span>
                        </p>
                      )}
                      {height >= 110 && (
                        <p className="mt-0.5 truncate text-xs opacity-80">
                          MJ {table.gameMaster}
                        </p>
                      )}
                    </Link>
                  );
                })}

                {selectedDay.tables.length === 0 && (
                  <div className="absolute inset-x-5 top-16 rounded-lg border border-dashed border-border bg-background/70 p-5 text-center text-sm text-muted-foreground">
                    Aucune partie prévue ce jour-là.
                  </div>
                )}

                {showNow && (
                  <>
                    <span className="sr-only">
                      Heure actuelle : {timeFormatter.format(now)}
                    </span>
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      style={{ top: nowTop }}
                      aria-hidden
                    >
                      <span className="-ml-1 size-2.5 rounded-full bg-destructive" />
                      <span className="h-0.5 flex-1 bg-destructive" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PlanningListItem({ table }: { table: PlanningTable }) {
  return (
    <Link
      href={`/tables/${table.id}`}
      className={cn(
        "flex items-center gap-4 rounded-xl border p-3.5 transition-colors",
        table.hasConflict
          ? "border-destructive/60 bg-destructive/5"
          : "border-border bg-card hover:border-primary/50",
      )}
    >
      <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
        {formatSlot(table.start, table.end)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-heading font-semibold">
            {table.title}
          </span>
          {table.isOwner && (
            <Crown
              className="size-3.5 shrink-0 text-primary"
              aria-label="Tu es le MJ"
            />
          )}
          {table.hasConflict && (
            <TriangleAlert
              className="size-3.5 shrink-0 text-destructive"
              aria-label="Conflit d’horaire"
            />
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {table.room}
          {table.location ? ` · ${table.location}` : ""} · MJ {table.gameMaster}
        </span>
      </span>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {table.seatsLeft} place{table.seatsLeft > 1 ? "s" : ""}
      </span>
    </Link>
  );
}
