"use client";

import { Loader2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type CatalogLabel, disabledLabelIds } from "@/domain/labels";
import { createTableSlot } from "@/domain/schedule";
import { useOnlineStatus } from "@/lib/connectivity";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/server/rpgers-schemas";

type Props = {
  labels: CatalogLabel[];
  days: { key: string; label: string }[];
  isAdult: boolean;
};

const shortDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
});

export function NewTableForm({ labels, days, isAdult }: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [guests, setGuests] = useState<UserSummary[]>([]);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestResults, setGuestResults] = useState<UserSummary[]>([]);
  const [day, setDay] = useState(days[0]?.key ?? "");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("17:00");

  const disabledLabels = useMemo(
    () => disabledLabelIds(labels, labelIds),
    [labels, labelIds],
  );
  const visibleLabels = labels.filter((l) => !l.isAdult || isAdult);

  const slot = useMemo(() => {
    if (!day) return null;
    return createTableSlot(day, startTime, endTime);
  }, [day, startTime, endTime]);

  async function searchGuest(q: string) {
    setGuestQuery(q);
    if (!online) return setGuestResults([]);
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
    if (!online) {
      setError("Connexion requise pour vérifier la disponibilité de l’invité.");
      return;
    }
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
    if (!online) {
      setError("Connexion requise pour proposer une partie.");
      return;
    }
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
      <BasicFields />
      <ScheduleFields
        days={days}
        day={day}
        startTime={startTime}
        endTime={endTime}
        slot={slot}
        onDayChange={setDay}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
      />
      <LabelsField
        labels={visibleLabels}
        selectedIds={labelIds}
        disabledIds={disabledLabels}
        onChange={setLabelIds}
      />
      <GuestsField
        online={online}
        guests={guests}
        query={guestQuery}
        results={guestResults}
        onQueryChange={searchGuest}
        onAdd={addGuest}
        onRemove={(id) => setGuests(guests.filter((guest) => guest.id !== id))}
      />

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {!online && (
        <p className="text-sm text-muted-foreground">
          Vous pouvez préparer la proposition hors ligne, puis l’envoyer une
          fois reconnecté·e.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={loading || !online}
        className="mt-2"
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        Proposer la partie
      </Button>
    </form>
  );
}

function BasicFields() {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="titre">Titre de la partie *</Label>
        <Input
          id="titre"
          name="titre"
          required
          maxLength={100}
          placeholder="Ex : La Dernière Station"
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
    </>
  );
}

function ScheduleFields({
  days,
  day,
  startTime,
  endTime,
  slot,
  onDayChange,
  onStartTimeChange,
  onEndTimeChange,
}: {
  days: Props["days"];
  day: string;
  startTime: string;
  endTime: string;
  slot: { start: Date; end: Date } | null;
  onDayChange: (day: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}) {
  const endsNextDay =
    slot !== null && slot.end.toDateString() !== slot.start.toDateString();

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="day">Jour</Label>
          <select
            id="day"
            value={day}
            onChange={(event) => onDayChange(event.target.value)}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {days.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="start">Heure de début</Label>
          <Input
            id="start"
            type="time"
            step={60}
            required
            value={startTime}
            onChange={(event) => onStartTimeChange(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="end">Heure de fin</Label>
          <Input
            id="end"
            type="time"
            step={60}
            required
            value={endTime}
            onChange={(event) => onEndTimeChange(event.target.value)}
          />
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
      {endsNextDay && slot && (
        <p className="-mt-2 text-xs font-medium text-primary">
          La partie se termine le {shortDayFormatter.format(slot.end)}.
        </p>
      )}
      <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        La salle est attribuée par l&apos;orga — elle apparaîtra sur ta partie
        une fois validée.
      </p>
    </>
  );
}

function LabelsField({
  labels,
  selectedIds,
  disabledIds,
  onChange,
}: {
  labels: CatalogLabel[];
  selectedIds: number[];
  disabledIds: ReadonlySet<number>;
  onChange: (ids: number[]) => void;
}) {
  const selectedIdSet = new Set(selectedIds);
  return (
    <fieldset>
      <legend className="text-sm font-medium">
        Labels (les incompatibles sont grisés)
      </legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {labels.map((label) => {
          const selected = selectedIdSet.has(label.id);
          const disabled = !selected && disabledIds.has(label.id);
          return (
            <button
              key={label.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected
                    ? selectedIds.filter((id) => id !== label.id)
                    : [...selectedIds, label.id],
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
  );
}

function GuestsField({
  online,
  guests,
  query,
  results,
  onQueryChange,
  onAdd,
  onRemove,
}: {
  online: boolean;
  guests: UserSummary[];
  query: string;
  results: UserSummary[];
  onQueryChange: (query: string) => void;
  onAdd: (user: UserSummary) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="guest">Pré-inscrire des amis (optionnel)</Label>
      <div className="flex flex-wrap gap-1.5">
        {guests.map((guest) => (
          <span
            key={guest.id}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
          >
            {guest.pseudo}
            <button
              type="button"
              aria-label={`Retirer ${guest.pseudo}`}
              onClick={() => onRemove(guest.id)}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <Input
        id="guest"
        value={query}
        disabled={!online}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Pseudo à inviter…"
      />
      {results.length > 0 && (
        <ul className="rounded-md border border-border bg-popover">
          {results.slice(0, 5).map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => onAdd(user)}
              >
                {user.pseudo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
