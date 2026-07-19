import { expect, test } from "@playwright/test";

const pseudo = process.env.RPGERS_PSEUDO;
const password = process.env.RPGERS_PASSWORD;

test("le manifeste PWA est valide", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = (await response.json()) as {
    name?: string;
    display?: string;
    start_url?: string;
    icons?: Array<{ sizes?: string }>;
  };
  expect(manifest).toMatchObject({
    name: "RPGers 2026",
    display: "standalone",
    start_url: "/",
  });
  expect(manifest.icons?.map((icon) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
});

test("le service worker fournit une page de secours sans réseau", async ({
  context,
  page,
}) => {
  await page.goto("/login");
  const supported = await page.evaluate(() => "serviceWorker" in navigator);
  test.skip(!supported, "Service workers indisponibles dans ce navigateur");

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  try {
    await page.goto("/page-jamais-consultee", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Vous êtes hors ligne" }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("la home et le planning restent consultables hors ligne", async ({
  context,
  page,
}) => {
  test.skip(!pseudo || !password, "Identifiants RPGers requis");
  if (!pseudo || !password) return;

  await page.goto("/login");
  await page.getByLabel("Pseudo").fill(pseudo);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/");

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await page.goto("/planning");
  await expect(
    page.getByRole("heading", { name: "Mon planning" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Parties" })).toBeVisible();

  await context.setOffline(true);
  try {
    await page.goto("/planning", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Mon planning" }),
    ).toBeVisible();
    await expect(
      page.getByText("Hors ligne · consultation disponible"),
    ).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Parties" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
