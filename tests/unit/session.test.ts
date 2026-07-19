import { describe, expect, it } from "vitest";
import { type Session, sealSession, unsealSession } from "@/server/session";

// SESSION_SECRET requis par env.ts
process.env.SESSION_SECRET ||= "test-secret-key-with-32-characters!!";

const session: Session = {
  jwt: "header.payload.signature",
  jwtExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  user: {
    id: 1,
    pseudo: "LePaladin",
    isAdmin: false,
    isBanned: false,
    isAdult: true,
  },
};

describe("session (JWE)", () => {
  it("seal/unseal fait un aller-retour fidèle", async () => {
    const token = await sealSession(session);
    expect(token).not.toContain("LePaladin"); // chiffré, pas de fuite en clair
    const back = await unsealSession(token);
    expect(back).toEqual(session);
  });

  it("rejette un token corrompu", async () => {
    expect(await unsealSession("nimporte.quoi.ici")).toBeNull();
  });
});
