import { createHash } from "node:crypto";
import { CompactEncrypt, compactDecrypt } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/server/env";
import type { User } from "@/server/rpgers-schemas";

/**
 * Session BFF : le JWT officiel est CHIFFRÉ (JWE A256GCM) dans notre propre
 * cookie — jamais exposé en clair au navigateur (règle 🔴 CLAUDE.md §5.4).
 */

export const SESSION_COOKIE = "critiquest_session";
const MAX_AGE_S = 7 * 24 * 3600; // aligné sur la durée du JWT officiel (7 j)

export type Session = {
  /** JWT officiel — usage serveur uniquement */
  jwt: string;
  jwtExpiresAt: string | null;
  user: User;
};

/** Dérive une clé de 256 bits exactement (A256GCM) quelle que soit la longueur du secret. */
function secretKey(): Uint8Array {
  return new Uint8Array(
    createHash("sha256").update(getEnv().SESSION_SECRET, "utf-8").digest(),
  );
}

export async function sealSession(session: Session): Promise<string> {
  return new CompactEncrypt(new TextEncoder().encode(JSON.stringify(session)))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(secretKey());
}

export async function unsealSession(token: string): Promise<Session | null> {
  try {
    const { plaintext } = await compactDecrypt(token, secretKey());
    return JSON.parse(new TextDecoder().decode(plaintext)) as Session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await sealSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await unsealSession(token);
  if (!session) return null;

  // Expiration du JWT officiel → session caduque
  if (session.jwtExpiresAt && new Date(session.jwtExpiresAt) < new Date()) {
    return null;
  }
  return session;
}
