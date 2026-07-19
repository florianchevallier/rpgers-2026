import { expect, test } from "@playwright/test";

test("la home répond et affiche le titre", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/.+/);
});
