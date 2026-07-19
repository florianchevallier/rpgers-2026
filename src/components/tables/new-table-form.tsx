"use client";

import { Loader2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type CatalogLabel, disabledLabelIds } from "@/domain/labels";
import { roman } from "@/domain/schedule";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/server/rpgers-schemas";

type Props = {
  labels: CatalogLabel[];
  days: { key: string; dayNumber: number }[];
  isAdult: boolean;
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8h → 23h

export function NewTableForm({ labels, days, isAdult }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [guests, setGuests] = useState<UserSummary[]>([]);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestResults, setGuestResults] = useState<UserSummary[]>([]);
  const [day, setDay] = useState(days[0]?.key ?? "");
  const [startHour, setStartHour] = useState(14);
  const [duration, setDuration] = useState(3);

  const disabledLabels = useMemo(
    () => disabledLabelIds(labels, labelIds),
    [labels, labelIds],
  );
  const visibleLabels = labels.filter((l) => !l.isAdult || isAdult);

  const slot = useMemo(() => {
    if (!day) return null;
    const start = new Date(
      `${day}T${String(startHour).padStart(2, "0")}:00:00`,
    );
    const end = new Date(start.getTime() + duration * 3600_000);
    return { start, end };
  }, [day, startHour, duration]);

  async function searchGuest(q: string) {
    setGuestQuery(q);
    if (q.length < 2) return setGuestResults([]);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = (await res.json()) as { users: UserSummary[] };
      setGuestResults(
        data.users.filter((u) => !guests.some((g) => g.id === u.id)),
      );
    }
  }

  async function addGuest(user: UserSummary) {
    if (!slot) return;
    // check-overlap : avertit si l'invité a déjà un créneau qui chevauche
    const res = await fetch("/api/users/check-overlap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        startDatetime: slot.start.toISOString(),
        endDatetime: slot.end.toISOString(),
      }),
    });
    if (res.ok) {
      const { overlap } = (await res.json()) as { overlap: boolean };
      if (overlap) {
        setError(`${user.pseudo} a déjà une partie sur ce créneau.`);
        return;
      }
    }
    setGuests([...guests, user]);
    setGuestQuery("");
    setGuestResults([]);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slot) return;
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: form.get("titre"),
          description: form.get("description"),
          systemeJeu: form.get("systemeJeu"),
          startDatetime: slot.start.toISOString(),
          endDatetime: slot.end.toISOString(),
          maxPlayers: Number(form.get("maxPlayers")),
          invitedUserIds: guests.map((g) => g.id),
          labelIds,
        }),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        return;
      }
      router.push(`/tables/${data.id}`);
      router.refresh();
    } catch {
      setError("Erreur réseau — réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="titre">Titre de la partie *</Label>
        <Input
          id="titre"
          name="titre"
          required
          maxLength={100}
          placeholder="Ex : La crypte de l'enchanteur"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="systemeJeu">Système de jeu *</Label>
        <Input
          id="systemeJeu"
          name="systemeJeu"
          required
          maxLength={100}
          placeholder="Ex : D&D 5e, Call of Cthulhu, homebrew…"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={5}
          maxLength={5000}
          placeholder="Accroche, ton, prérequis éventuels…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="day">Jour</Label>
          <select
            id="day"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {days.map((d) => (
              <option key={d.key} value={d.key}>
                Jour {roman(d.dayNumber)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="start">Début</Label>
          <select
            id="start"
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}h00
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="duration">Durée</Label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d}h
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="maxPlayers">Joueurs max</Label>
          <Input
            id="maxPlayers"
            name="maxPlayers"
            type="number"
            min={1}
            max={20}
            defaultValue={5}
            required
          />
        </div>
      </div>

      <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        La salle est attribuée par l&apos;orga — elle apparaîtra sur ta tablée
        une fois validée.
      </p>

      <fieldset>
        <legend className="text-sm font-medium">
          Labels (les incompatibles sont grisés)
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleLabels.map((label) => {
            const selected = labelIds.includes(label.id);
            const disabled = !selected && disabledLabels.has(label.id);
            return (
              <button
                key={label.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() =>
                  setLabelIds(
                    selected
                      ? labelIds.filter((id) => id !== label.id)
                      : [...labelIds, label.id],
                  )
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/15 font-semibold text-primary"
                    : "border-border",
                  disabled && "cursor-not-allowed opacity-35",
                )}
              >
                <span
                  className="size-2 rounded-full ring-1 ring-black/20"
                  style={{ backgroundColor: label.couleur }}
                  aria-hidden
                />
                {label.nom}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="guest">Pré-inscrire des amis (optionnel)</Label>
        <div className="flex flex-wrap gap-1.5">
          {guests.map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
            >
              {g.pseudo}
              <button
                type="button"
                aria-label={`Retirer ${g.pseudo}`}
                onClick={() => setGuests(guests.filter((x) => x.id !== g.id))}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <Input
          id="guest"
          value={guestQuery}
          onChange={(e) => searchGuest(e.target.value)}
          placeholder="Pseudo à inviter…"
        />
        {guestResults.length > 0 && (
          <ul className="rounded-md border border-border bg-popover">
            {guestResults.slice(0, 5).map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => addGuest(u)}
                >
                  {u.pseudo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading} className="mt-2">
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        Proposer la tablée
      </Button>
    </form>
  );
}
