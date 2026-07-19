"use client";

import { Loader2, Swords } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo: form.get("pseudo"),
          password: form.get("password"),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        mustChangePassword?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "Pseudo ou mot de passe incorrect");
        return;
      }
      router.push(data.mustChangePassword ? "/change-password" : "/");
      router.refresh();
    } catch {
      setError("Erreur réseau — réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Swords className="size-8 text-primary" aria-hidden />
        <CardTitle className="font-heading text-2xl tracking-[0.12em] uppercase">
          Critiquest
        </CardTitle>
        <CardDescription>
          Le grimoire des tablées — RPGers 2026
          <span className="mt-1 block text-xs">
            v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pseudo">Pseudo</Label>
            <Input
              id="pseudo"
              name="pseudo"
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            Entrer dans la taverne
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline"
            >
              S&apos;enregistrer
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
