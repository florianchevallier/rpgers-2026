"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  userId: number;
  pseudo: string;
  initialFavorite: boolean;
  className?: string;
};

/** Cœur favori — ajoute/retire un joueur ou MJ à nos favoris (notre DB, absent de l'officiel). */
export function FavoriteToggle({
  userId,
  pseudo,
  initialFavorite,
  className,
}: Props) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !favorite;
    setFavorite(next); // optimiste
    try {
      const res = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pseudo }),
      });
      if (!res.ok) setFavorite(!next); // rollback
    } catch {
      setFavorite(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={
        favorite
          ? `Retirer ${pseudo} des favoris`
          : `Ajouter ${pseudo} aux favoris`
      }
      className={cn(
        "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:text-primary disabled:opacity-60",
        favorite && "text-primary",
        className,
      )}
    >
      <Heart className={cn("size-4", favorite && "fill-current")} aria-hidden />
    </button>
  );
}
