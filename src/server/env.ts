import { z } from "zod";

/**
 * Validation des variables d'environnement au démarrage (fail-fast).
 * Importé uniquement côté serveur.
 */
const envSchema = z.object({
  RPGERS_API_URL: z.url().default("https://rpgers.gobelin-tech.online"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET doit faire ≥ 32 caractères"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse({
      RPGERS_API_URL: process.env.RPGERS_API_URL,
      SESSION_SECRET: process.env.SESSION_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
    });
  }
  return cached;
}
