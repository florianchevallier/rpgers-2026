"use client";

import { Heart, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useOnlineStatus } from "@/lib/connectivity";
import type { UserSummary } from "@/server/rpgers-schemas";

type FavoriteUser = { id: number; pseudo: string };

type Props = {
  currentUserId: number;
  initialFavorites: FavoriteUser[];
};

/** Gestion des favoris — recherche + ajout + retrait (notre DB, absent de l'officiel). */
export function FavoritesManager({ currentUserId, initialFavorites }: Props) {
  const online = useOnlineStatus();
  const [favorites, setFavorites] = useState(initialFavorites);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);

  async function search(q: string) {
    setQuery(q);
    if (!online) return setResults([]);
    if (q.trim().length < 2) return setResults([]);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return setResults([]);
    const data = (await res.json()) as { users: UserSummary[] };
    setResults(
      data.users.filter(
        (u) => u.id !== currentUserId && !favorites.some((f) => f.id === u.id),
      ),
    );
  }

  async function add(user: UserSummary) {
    if (!online) return;
    setFavorites((prev) =>
      [...prev, user].sort((a, b) => a.pseudo.localeCompare(b.pseudo)),
    );
    setQuery("");
    setResults([]);
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, pseudo: user.pseudo }),
    }).catch(() => undefined);
  }

  async function remove(userId: number) {
    if (!online) return;
    setFavorites((prev) => prev.filter((f) => f.id !== userId));
    await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => undefined);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => search(e.target.value)}
          disabled={!online}
          placeholder="Ajouter un joueur ou un MJ à tes favoris…"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            {results.slice(0, 6).map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={!online}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => add(u)}
                >
                  {u.pseudo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {favorites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun favori pour l&apos;instant — retrouve-les plus vite en les
          ajoutant ici ou depuis la fiche d&apos;une partie.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {favorites.map((f) => (
            <li
              key={f.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-sm"
            >
              <Heart
                className="size-3.5 fill-current text-primary"
                aria-hidden
              />
              {f.pseudo}
              <button
                type="button"
                disabled={!online}
                aria-label={`Retirer ${f.pseudo} des favoris`}
                onClick={() => remove(f.id)}
                className="-mr-1 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
