import { afterEach, describe, expect, it, vi } from "vitest";
import type { RpgersTable } from "@/server/rpgers-schemas";
import type { SlackConfig } from "@/server/slack-config";
import { postTableToSlack } from "@/server/slack-notifications";

const config: SlackConfig = {
  SLACK_BOT_TOKEN: "test-token",
  SLACK_CHANNEL_ID: "test-channel",
  SLACK_CRON_SECRET: "x".repeat(32),
  RPGERS_BOT_PSEUDO: "bot",
  RPGERS_BOT_PASSWORD: "password",
  APP_BASE_URL: "https://example.test",
  GEMINI_MODEL: "gemini-3.5-flash",
  PERPLEXITY_MODEL: "test-model",
  GAME_RESEARCH_CACHE_DAYS: 30,
};

const table = {
  id: 42,
  titre: "La table de l'auteur",
  description: "  Une aventurre écrite avec sa voix.\n",
  systemeJeu: "Jeu maison",
  ownerId: 1,
  salleId: 1,
  startDatetime: new Date("2026-08-14T12:00:00Z"),
  endDatetime: new Date("2026-08-14T16:00:00Z"),
  maxPlayers: 5,
  reservedByAdmin: 0,
  adminPlaces: 2,
  statut: "open",
  owner: { id: 1, pseudo: "Autrice" },
  salle: { id: 1, nom: "Salle une", lieu: "Convention" },
  labels: [],
  registrations: [],
  confirmed: 0,
  placesLibresTotal: 5,
  placesLibresPubliques: 3,
  estComplete: false,
  estPlacesAdminUniquement: false,
} satisfies RpgersTable;

afterEach(() => vi.unstubAllGlobals());

describe("postTableToSlack", () => {
  it("publie la description de l'auteur sans la réécrire ni la rogner", async () => {
    let slackPayload: { blocks?: Array<{ text?: { text?: string } }> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        slackPayload = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ ok: true, ts: "123.456" }));
      }),
    );

    await postTableToSlack(table, config);

    expect(
      slackPayload.blocks?.some(({ text }) =>
        text?.text?.includes(
          "*La proposition du MJ*\n  Une aventurre écrite avec sa voix.\n",
        ),
      ),
    ).toBe(true);
  });

  it("conserve une longue description entière en la répartissant entre plusieurs blocs", async () => {
    const longDescription = `Début — ${"& chronique ".repeat(350)}— Fin`;
    let slackPayload: { blocks?: Array<{ text?: { text?: string } }> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        slackPayload = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ ok: true, ts: "123.457" }));
      }),
    );

    await postTableToSlack({ ...table, description: longDescription }, config);

    const texts =
      slackPayload.blocks?.map(({ text }) => text?.text ?? "") ?? [];
    const firstDescription = texts.findIndex((text) =>
      text.startsWith("*La proposition du MJ*\n"),
    );
    const practical = texts.indexOf("*En pratique*");
    const reconstructed = texts
      .slice(firstDescription, practical)
      .map((text, index) =>
        index === 0 ? text.replace("*La proposition du MJ*\n", "") : text,
      )
      .join("");

    expect(reconstructed).toBe(longDescription.replaceAll("&", "&amp;"));
  });
});
