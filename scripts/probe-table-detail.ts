/**
 * Sonde DEBUG : que contient le payload RSC de la page détail officielle
 * `/tables/:id` ? (pseudos des inscrits — cf. annuaire KnownUser)
 *
 * Usage :
 *   RPGERS_PSEUDO=... RPGERS_PASSWORD=... npx tsx scripts/probe-table-detail.ts <tableId>
 *
 * Lecture seule. Écrit le payload brut dans /tmp/rsc_table_detail.txt pour analyse.
 */
import { writeFileSync } from "node:fs";
import {
  getTables,
  loginOfficial,
  OFFICIAL_COOKIE_NAME,
  searchUsers,
} from "../src/server/rpgers-client";
import {
  extractDetailPlayerPseudos,
  extractUserSummaries,
} from "../src/server/rsc-parser";

const API = process.env.RPGERS_API_URL ?? "https://rpgers.gobelin-tech.online";

async function main() {
  const pseudo = process.env.RPGERS_PSEUDO;
  const password = process.env.RPGERS_PASSWORD;
  const arg = process.argv[2];
  if (!pseudo || !password || !arg) {
    console.error(
      "❌ RPGERS_PSEUDO, RPGERS_PASSWORD et <tableId|titre> requis (ex: npx tsx scripts/probe-table-detail.ts 6038)",
    );
    process.exit(1);
  }

  const { jwt } = await loginOfficial(pseudo, password);
  console.log("✅ login OK");

  let tableId = arg;
  if (!/^\d+$/.test(arg)) {
    const tables = await getTables(jwt);
    const hit = tables.find((t) =>
      t.titre.toLowerCase().includes(arg.toLowerCase()),
    );
    if (!hit) {
      console.error(`❌ aucune tablée dont le titre contient « ${arg} »`);
      process.exit(1);
    }
    tableId = String(hit.id);
    console.log(`→ « ${hit.titre} » = tablée #${tableId}`);
  }

  const res = await fetch(`${API}/tables/${tableId}`, {
    headers: { Cookie: `${OFFICIAL_COOKIE_NAME}=${jwt}`, RSC: "1" },
    redirect: "manual",
  });
  console.log(`→ GET /tables/${tableId} (RSC) : HTTP ${res.status}`);
  console.log(`   content-type: ${res.headers.get("content-type")}`);
  if (res.status >= 300 && res.status < 400) {
    console.log(`   ⚠️ redirection vers: ${res.headers.get("location")}`);
  }

  const text = await res.text();
  writeFileSync("/tmp/rsc_table_detail.txt", text);
  console.log(`   payload: ${text.length} octets → /tmp/rsc_table_detail.txt`);

  const users = extractUserSummaries(text);
  console.log(`→ extractUserSummaries : ${users.length} paire(s)`);
  for (const u of users) console.log(`   · #${u.id} ${u.pseudo}`);

  // flux réel de la fiche : pseudos extraits puis appariés via la recherche
  const pseudos = extractDetailPlayerPseudos(text);
  console.log(`→ extractDetailPlayerPseudos : ${pseudos.length} pseudo(s)`);
  for (const p of pseudos) {
    const results = await searchUsers(jwt, p).catch(() => []);
    const hit =
      results.find((u) => u.pseudo === p) ??
      results.find((u) => u.pseudo.toLowerCase() === p.toLowerCase());
    console.log(
      hit
        ? `   · ${p} → apparié #${hit.id}`
        : `   · ${p} → ❌ introuvable via /api/users/search`,
    );
  }

  // indices bruts : toutes les occurrences de "pseudo" avec un peu de contexte
  const occurrences = [...text.matchAll(/.{60}"pseudo".{60}/g)].map((m) =>
    m[0].replaceAll("\n", "⏎"),
  );
  console.log(`→ ${occurrences.length} occurrence(s) brutes de "pseudo" :`);
  for (const line of occurrences.slice(0, 20)) console.log(`   ${line}`);
}

main().catch((error) => {
  console.error("❌", error);
  process.exit(1);
});
