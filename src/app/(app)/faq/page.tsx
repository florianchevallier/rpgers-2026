const FAQ = [
  {
    q: "Comment m'inscrire à une partie ?",
    a: "Ouvre la fiche de la partie et touche « S'inscrire ». Tu peux te désinscrire librement jusqu'à 1 h avant le début.",
  },
  {
    q: "Comment lire la disponibilité d'une partie ?",
    a: "Chaque partie indique directement le nombre de places publiques disponibles. « Sur place » signifie que seules les places gérées par la tente JDR restent accessibles.",
  },
  {
    q: "C'est quoi les « places urgentes » ?",
    a: "Quand quelqu'un se désinscrit à la dernière minute, la place libérée est proposée à tout le monde en haut de l'app. Premier·ère servi·e !",
  },
  {
    q: "Puis-je inscrire un ami ?",
    a: "Oui, depuis la fiche si tu es le MJ, ou en le pré-inscrivant quand tu proposes ta propre partie. L'app vérifie qu'il n'a pas de conflit d'horaire.",
  },
  {
    q: "Que font les 2 places « tente JDR » ?",
    a: "Chaque partie garde 2 places réservées au staff de la tente JDR — elles ne comptent pas dans les places publiques.",
  },
  {
    q: "Un problème pendant la convention ?",
    a: "Utilise la page « Signaler » de l'app, ou va directement à l'accueil de l'orga.",
  },
] as const;

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold tracking-tight">Aide</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Les réponses essentielles pour gérer tes parties.
      </p>
      <dl className="mt-6 flex flex-col gap-5">
        {FAQ.map(({ q, a }) => (
          <div key={q} className="rounded-xl border border-border bg-card p-4">
            <dt className="font-semibold">{q}</dt>
            <dd className="mt-1.5 text-sm text-muted-foreground">{a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
