import { Ban, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ChipProps = {
  nom: string;
  couleur: string;
  className?: string;
};

/** Chip de label statique — pastille de couleur + nom (carte, fiche tablée). */
export function LabelChip({ nom, couleur, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-xs text-secondary-foreground",
        className,
      )}
    >
      <span
        className="size-2 rounded-full ring-1 ring-black/20"
        style={{ backgroundColor: couleur }}
        aria-hidden
      />
      {nom}
    </span>
  );
}

export type LabelFilterState = "none" | "included" | "excluded";

type FilterChipProps = ChipProps & {
  state: LabelFilterState;
  onToggleInclude: () => void;
  onToggleExclude: () => void;
};

/**
 * Ligne de label interactive du popover de filtres — clic sur le nom =
 * inclure/exclure de la sélection, bouton ⊘ = exclure la tablée qui le porte.
 */
export function LabelFilterRow({
  nom,
  couleur,
  state,
  onToggleInclude,
  onToggleExclude,
}: FilterChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md px-1 py-0.5",
        state === "included" && "bg-primary/10",
        state === "excluded" && "bg-destructive/10",
      )}
    >
      <button
        type="button"
        onClick={onToggleInclude}
        className="flex flex-1 items-center gap-2 rounded px-1 py-1 text-left text-sm"
      >
        <span
          className="size-2.5 shrink-0 rounded-full ring-1 ring-black/20"
          style={{ backgroundColor: couleur }}
          aria-hidden
        />
        <span
          className={cn(
            "flex-1",
            state === "excluded" && "text-muted-foreground line-through",
          )}
        >
          {nom}
        </span>
        {state === "included" && (
          <Check className="size-4 shrink-0 text-primary" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExclude();
        }}
        aria-pressed={state === "excluded"}
        aria-label={`Exclure les parties portant le label ${nom}`}
        className={cn(
          "shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive",
          state === "excluded" && "text-destructive",
        )}
      >
        <Ban className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
