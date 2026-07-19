import { expect, test } from "@playwright/test";

/**
 * Parcours critique E2E (plan §3.2 — le filet de sécurité pour J-3).
 * Nécessite un vrai compte : RPGERS_PSEUDO / RPGERS_PASSWORD dans l'env.
 * Sans identifiants, le test est skippé (pas de faux échec en CI).
 *
 * ⚠️ S'inscrit/se désinscrit à une VRAIE tablée avec places libres — à lancer
 * consciemment (la désinscription remet les choses en place).
 */
const pseudo = process.env.RPGERS_PSEUDO;
const password = process.env.RPGERS_PASSWORD;

test.skip(
  !pseudo || !password,
  "Identifiants RPGers requis (RPGERS_PSEUDO/RPGERS_PASSWORD)",
);

test("login → filtrer → fiche → s'inscrire → planning → se désinscrire", async ({
  page,
}) => {
  // 1. login
  await page.goto("/login");
  await page.getByLabel("Pseudo").fill(pseudo!);
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: /Entrer dans la taverne/ }).click();
  await expect(page).toHaveURL("/");

  // 2. la liste affiche des tablées groupées par jour
  await expect(page.getByRole("heading", { name: /Jour I —/ })).toBeVisible();

  // 3. filtre « Places libres »
  await page.getByRole("button", { name: "Places libres" }).click();
  await expect(page).toHaveURL(/free=true/);

  // 4. ouvrir une fiche tablée
  await page
    .getByRole("link")
    .filter({ hasText: /places|menée par/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/tables\/\d+/);

  // 5. « Autour de la table » : les inscrits apparaissent (pseudos ou compteur
  // dégradé) dès qu'il y a au moins une inscription confirmée
  const seats = page.getByText(/(\d+) inscrit·e·s/);
  if (await seats.isVisible().catch(() => false)) {
    const count = Number(
      (await seats.textContent())?.match(/(\d+) inscrit·e·s/)?.[1] ?? 0,
    );
    if (count > 0) {
      await expect(
        page.getByRole("heading", { name: "Autour de la table" }),
      ).toBeVisible();
    }
  }

  // 6. s'inscrire (si possible) puis se désinscrire
  const registerBtn = page.getByRole("button", { name: /^S'inscrire/ });
  if (await registerBtn.isVisible().catch(() => false)) {
    await registerBtn.click();
    await expect(
      page.getByRole("button", { name: /Se désinscrire/ }),
    ).toBeVisible({ timeout: 10_000 });

    // 7. visible dans le planning
    await page.goto("/planning");
    await expect(
      page.getByRole("heading", { name: "Mes Parties" }),
    ).toBeVisible();

    // 8. retour fiche → désinscription
    await page.goBack();
    await page.getByRole("button", { name: /Se désinscrire/ }).click();
    await expect(page.getByRole("button", { name: /^S'inscrire/ })).toBeVisible(
      { timeout: 10_000 },
    );
  }
});
