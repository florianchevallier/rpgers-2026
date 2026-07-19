import { notFound } from "next/navigation";
import { SeatSeal } from "@/components/tables/seat-seal";
import { TableCard } from "@/components/tables/table-card";
import { type RpgersTable, tableSchema } from "@/server/rpgers-schemas";
import fixture from "../../../../tests/fixtures/table.json";

/** Page de preview design — dev uniquement (validation visuelle sans compte). */
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const base = tableSchema.parse(fixture);
  const variants: { label: string; table: RpgersTable }[] = [
    {
      label: "open (≥ 2 places)",
      table: { ...base, placesLibresPubliques: 3, confirmed: 3 },
    },
    {
      label: "last (1 place)",
      table: { ...base, id: 2, placesLibresPubliques: 1, confirmed: 5 },
    },
    {
      label: "full (complet)",
      table: {
        ...base,
        id: 3,
        placesLibresPubliques: 0,
        confirmed: 6,
        estComplete: true,
      },
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="day-heading">Jour I — Vendredi 14 août</h1>
      <div className="mt-1 border-t border-primary/30" aria-hidden />

      <div className="mt-6 grid gap-6">
        {variants.map(({ label, table }) => (
          <section key={label}>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TableCard table={table} />
              <div className="flex items-center justify-center gap-6 rounded-xl border border-dashed border-border p-4">
                <SeatSeal table={table} />
                <SeatSeal table={table} size="sm" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
