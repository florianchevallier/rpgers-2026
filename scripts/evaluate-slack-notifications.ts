import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { getTables, loginOfficial } = await import("@/server/rpgers-client");
  const { getSlackConfig } = await import("@/server/slack-config");
  const { prepareTableSlackMessage } = await import(
    "@/server/slack-notifications"
  );

  const config = getSlackConfig();
  const { jwt } = await loginOfficial(
    config.RPGERS_BOT_PSEUDO,
    config.RPGERS_BOT_PASSWORD,
  );
  const tables = await getTables(jwt);

  const candidates = [
    tables.find((table) => table.labels.some(({ label }) => label.isAdult)),
    tables.find((table) =>
      table.labels.some(({ label }) => label.nom === "PEGI : Enfant"),
    ),
    tables.find((table) =>
      /création originale|jeu maison|système maison|homebrew/i.test(
        table.systemeJeu,
      ),
    ),
    tables.find((table) =>
      table.labels.some(({ label }) => label.nom === "Débutants bienvenus"),
    ),
    [...tables].sort(
      (left, right) => right.description.length - left.description.length,
    )[0],
    tables.find((table) => table.placesLibresPubliques === 1),
    tables[0],
  ].filter((table) => table !== undefined);

  const selected = [
    ...new Map(candidates.map((table) => [table.id, table])).values(),
  ].slice(0, 7);

  for (const table of selected) {
    const message = await prepareTableSlackMessage(table, config);
    const preview = message.blocks.flatMap((block) => [
      ...(block.text?.text ? [block.text.text] : []),
      ...(block.fields?.map(({ text }) => text) ?? []),
    ]);
    process.stdout.write(
      `${JSON.stringify(
        {
          tableId: table.id,
          title: `${table.systemeJeu} — ${table.titre}`,
          labels: table.labels.map(({ label }) => label.nom),
          descriptionLength: table.description.length,
          diagnostics: message.diagnostics,
          preview,
        },
        null,
        2,
      )}\n\n`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
