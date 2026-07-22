import { RecommendationWizard } from "@/components/recommendations/recommendation-wizard";

export default function ChooseGamesPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">
          Ton week-end sur mesure
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Qu’est-ce qu’on joue ?
        </h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          Trouve une table qui correspond à une envie précise, ou laisse-nous
          composer un programme cohérent pour les trois jours.
        </p>
      </header>

      <RecommendationWizard />
    </div>
  );
}
