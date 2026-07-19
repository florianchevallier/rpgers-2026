/**
 * Script de validation Phase 1 — DoD : « depuis un script, on se logue et on
 * liste les tablées validées par Zod ».
 *
 * Usage :
 *   RPGERS_PSEUDO=... RPGERS_PASSWORD=... npx tsx scripts/smoke-api.ts
 *
 * Ne modifie AUCUNE donnée (lecture seule).
 */
import {
  getNotificationCount,
  getSalles,
  getTables,
  getUrgentPlaces,
  loginOfficial,
} from "../src/server/rpgers-client";

async function main() {
  const pseudo = process.env.RPGERS_PSEUDO;
  const password = process.env.RPGERS_PASSWORD;
  if (!pseudo || !password) {
    console.error("❌ RPGERS_PSEUDO et RPGERS_PASSWORD requis");
    process.exit(1);
  }

  console.log(`→ Login officiel (${pseudo})…`);
  const { jwt, result } = await loginOfficial(pseudo, password);
  console.log(
    `✅ JWT obtenu (mustChangePassword=${result.mustChangePassword})`,
  );

  console.log("→ GET /api/tables…");
  const tables = await getTables(jwt);
  console.log(`✅ ${tables.length} tablées validées par Zod`);
  for (const t of tables.slice(0, 3)) {
    console.log(
      `   · #${t.id} « ${t.titre} » — ${t.startDatetime.toISOString()} — ${t.placesLibresPubliques}/${t.maxPlayers} places`,
    );
  }

  console.log("→ GET /api/salles…");
  const salles = await getSalles(jwt);
  console.log(`✅ ${salles.length} salles`);

  console.log("→ GET /api/notifications/count…");
  const count = await getNotificationCount(jwt);
  console.log(`✅ ${count.unread} notification(s) non lue(s)`);

  console.log("→ GET /api/urgent…");
  const urgent = await getUrgentPlaces(jwt);
  console.log(`✅ ${urgent.length} place(s) urgente(s)`);

  console.log(
    "\n🎉 Smoke API OK — la couche BFF parle correctement à l'officiel.",
  );
}

main().catch((error) => {
  console.error("❌", error);
  process.exit(1);
});
