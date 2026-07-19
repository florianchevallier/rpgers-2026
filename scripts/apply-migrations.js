/**
 * Runner de migrations minimal pour la prod (conteneur standalone).
 *
 * Le CLI `prisma migrate deploy` est inutilisable dans l'image runner : Prisma 7
 * tire un arbre de dépendances complet (effect, @prisma/config…) incompatible
 * avec la sortie standalone de Next. better-sqlite3, lui, y est déjà tracé.
 * On applique les fichiers migration.sql des sous-dossiers datés dans
 * prisma/migrations, dans l'ordre, avec
 * suivi idempotent dans une table `_migrations` (la DB prod naît ici, jamais
 * touchée par le CLI prisma — pas de conflit de comptabilité).
 *
 * Contrat : migrations ADDITIVES uniquement (cf. docs/RUNBOOK.md).
 */
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const db = new Database(url.replace(/^file:/, ""));

db.exec(
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);
const applied = new Set(
  db
    .prepare("SELECT name FROM _migrations")
    .all()
    .map((row) => row.name),
);

const dir = path.join(__dirname, "..", "prisma", "migrations");
const pending = readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d/.test(e.name) && !applied.has(e.name))
  .map((e) => e.name)
  .sort();

for (const name of pending) {
  const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
  db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(
      name,
      new Date().toISOString(),
    );
  })();
  console.log(`[migrate] ${name} appliquée`);
}
console.log(
  pending.length === 0
    ? "[migrate] base à jour"
    : `[migrate] ${pending.length} migration(s) appliquée(s)`,
);
db.close();
