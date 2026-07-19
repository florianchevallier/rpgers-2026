"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo: form.get("pseudo"),
          email: form.get("email") || undefined,
          password: form.get("password"),
          isAdult: form.get("isAdult") === "on",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Inscription impossible");
        return;
      }
      // inscription OK → connexion directe
      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo: form.get("pseudo"),
          password: form.get("password"),
        }),
      });
      if (login.ok) {
        router.push("/");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch {
      setError("Erreur réseau — réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-3 flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm shadow-primary/25"
            aria-hidden
          >
            R
          </span>
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              RPGers
            </CardTitle>
            <CardDescription>Programme et planning 2026</CardDescription>
          </div>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          Créer un compte
        </h1>
        <CardDescription>
          Utilise les mêmes informations que sur le site officiel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pseudo">Pseudo *</Label>
            <Input
              id="pseudo"
              name="pseudo"
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">
              Email (optionnel, contact orga uniquement)
            </Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Mot de passe * (6 caractères min.)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isAdult" name="isAdult" />
            <Label htmlFor="isAdult" className="font-normal">
              J&apos;ai 18 ans ou plus (accès aux parties marquées adultes)
            </Label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            Créer mon compte
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
