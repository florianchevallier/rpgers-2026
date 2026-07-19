const FAQ = [
  {
    q: "Comment m'inscrire à une tablée ?",
    a: "Ouvre la fiche de la tablée et touche « S'inscrire ». Tu peux te désinscrire librement jusqu'à 1 h avant le début de la partie.",
  },
  {
    q: "Que signifient les couleurs du sceau de places ?",
    a: "Vert : il reste au moins 2 places. Or : dernière place ! Cramoisi : complet.",
  },
  {
    q: "C'est quoi les « places urgentes » ?",
    a: "Quand quelqu'un se désinscrit à la dernière minute, la place libérée est proposée à tout le monde en haut de l'app. Premier·ère servi·e !",
  },
  {
    q: "Puis-je inscrire un ami ?",
    a: "Oui, sur la fiche tablée si tu es le MJ, ou en le pré-inscrivant quand tu proposes ta propre tablée. L'app vérifie qu'il n'a pas de conflit d'horaire.",
  },
  {
    q: "Que font les 2 places « tente JDR » ?",
    a: "Chaque tablée garde 2 places réservées au staff de la tente JDR — elles ne comptent pas dans les places publiques.",
  },
  {
    q: "Un problème pendant la convention ?",
    a: "Utilise la page « Signaler » de l'app, ou va directement à l'accueil de l'orga.",
  },
] as const;

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-heading text-2xl font-bold tracking-wide">FAQ</h1>
      <dl className="mt-6 flex flex-col gap-5">
        {FAQ.map(({ q, a }) => (
          <div key={q} className="rounded-xl border border-border bg-card p-4">
            <dt className="font-heading font-semibold">{q}</dt>
            <dd className="mt-1.5 text-sm text-muted-foreground">{a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
