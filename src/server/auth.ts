import { redirect } from "next/navigation";
import { cache } from "react";
import { loginOfficial, logoutOfficial } from "@/server/rpgers-client";
import { type User, userSchema } from "@/server/rpgers-schemas";
import {
  clearSessionCookie,
  getSession,
  type Session,
  setSessionCookie,
} from "@/server/session";

/**
 * Auth BFF : pont entre le login officiel et notre session chiffrée.
 * Le JWT officiel ne quitte JAMAIS le serveur.
 */

/** Décode le payload du JWT officiel (HS256 — on fait confiance à l'émetteur, pas besoin de vérifier la signature ici). */
function decodeOfficialJwt(jwt: string): User {
  const payload = jwt.split(".")[1];
  if (!payload) throw new Error("JWT officiel malformé");
  const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  return userSchema.parse({
    id: json.userId,
    pseudo: json.pseudo,
    isAdmin: json.isAdmin,
    isBanned: json.isBanned,
    isAdult: json.isAdult,
  });
}

export async function login(
  pseudo: string,
  password: string,
): Promise<{ mustChangePassword: boolean }> {
  const { jwt, jwtExpiresAt, result } = await loginOfficial(pseudo, password);
  const user = decodeOfficialJwt(jwt);
  await setSessionCookie({
    jwt,
    jwtExpiresAt: jwtExpiresAt?.toISOString() ?? null,
    user,
  });
  return { mustChangePassword: result.mustChangePassword };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) await logoutOfficial(session.jwt);
  await clearSessionCookie();
}

/** Session courante, mémoïsée par requête (React cache). */
export const getCurrentSession = cache(async (): Promise<Session | null> => {
  return getSession();
});

export async function requireSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) throw new Error("Non authentifié");
  return session;
}

/** Variante pour les pages : redirige proprement au lieu de lever une 500. */
export async function requirePageSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

/** 🔴 Règle CLAUDE.md §5.1 : isAdmin se lit TOUJOURS ici, jamais depuis une donnée client. */
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.user.isAdmin ?? false;
}
