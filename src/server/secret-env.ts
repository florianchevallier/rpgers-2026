import { readFileSync } from "node:fs";

/**
 * Lit une variable directement, ou depuis le fichier indiqué par NAME_FILE.
 * La forme directe reste prioritaire pour le développement et les tests.
 */
export function envOrFile(name: string): string | undefined {
  const directValue = process.env[name];
  if (directValue !== undefined) return directValue;

  const filePath = process.env[`${name}_FILE`];
  if (!filePath) return undefined;

  return readFileSync(filePath, "utf8").replace(/\r?\n$/, "");
}
