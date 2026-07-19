import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { envOrFile } from "@/server/secret-env";

const originalEnv = { ...process.env };
const temporaryDirectories: string[] = [];

afterEach(() => {
  process.env = { ...originalEnv };
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true });
  }
});

describe("envOrFile", () => {
  it("privilégie la variable directe", () => {
    process.env.TEST_SECRET = "direct";
    process.env.TEST_SECRET_FILE = "/fichier/inexistant";

    expect(envOrFile("TEST_SECRET")).toBe("direct");
  });

  it("lit un secret Docker sans son saut de ligne final", () => {
    const directory = mkdtempSync(join(tmpdir(), "rpgers-secret-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "secret");
    writeFileSync(path, "depuis-fichier\n");
    delete process.env.TEST_SECRET;
    process.env.TEST_SECRET_FILE = path;

    expect(envOrFile("TEST_SECRET")).toBe("depuis-fichier");
  });
});
