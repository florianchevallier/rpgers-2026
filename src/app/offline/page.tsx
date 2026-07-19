import { RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="max-w-md text-center">
        <span
          className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"
          aria-hidden
        >
          <WifiOff className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Vous êtes hors ligne
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Les parties et le planning déjà enregistrés restent accessibles. Cette
          page n’avait pas encore été consultée sur cet appareil.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
        >
          <RefreshCw className="size-4" aria-hidden />
          Réessayer
        </a>
      </div>
    </main>
  );
}
