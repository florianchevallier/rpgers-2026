"use client";

import { BookMarked, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterParams } from "@/lib/filter-params";

type Preset = { id: number; name: string; params: FilterParams };

type Props = {
  currentParams: FilterParams;
  onApply: (params: FilterParams) => void;
};

/** Sauvegarder / appliquer / supprimer des combinaisons de filtres nommées (notre DB). */
export function FilterPresetsMenu({ currentParams, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/filter-presets")
      .then((r) => r.json())
      .then((data: { presets?: Preset[] }) => setPresets(data.presets ?? []))
      .catch(() => setPresets([]));
  }, [open]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await fetch("/api/filter-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, params: currentParams }),
      });
      setName("");
      const res = await fetch("/api/filter-presets");
      const data = (await res.json()) as { presets?: Preset[] };
      setPresets(data.presets ?? []);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    await fetch("/api/filter-presets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <BookMarked className="size-3.5" aria-hidden />
          Presets
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Mes presets
            </p>
            {presets.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun preset enregistré.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {presets.map((preset) => (
                  <li key={preset.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onApply(preset.params);
                        setOpen(false);
                      }}
                      className="flex-1 truncate rounded px-2 py-1 text-left text-sm hover:bg-accent"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(preset.id)}
                      aria-label={`Supprimer le preset ${preset.name}`}
                      className="rounded p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-1.5 border-t border-border pt-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du preset…"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
            <Button size="sm" disabled={saving || !name.trim()} onClick={save}>
              Sauver
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
