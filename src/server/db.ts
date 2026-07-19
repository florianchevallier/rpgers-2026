import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/server/env";

/**
 * Singleton Prisma — évite d'ouvrir une connexion par HMR reload en dev
 * (pattern standard Next.js). Prisma 7 : plus d'`url` inline dans le schéma,
 * l'adaptateur pilote sqlite directement.
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: getEnv().DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
