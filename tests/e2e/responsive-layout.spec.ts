import { expect, test } from "@playwright/test";

test.describe("responsive table list layout", () => {
  test("room metadata wraps inside its desktop grid column", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 688, height: 800 });
    await page.goto("/dev/design");

    const metadata = page.locator('.table-card[href="/tables/6038"] > div > p');
    await expect(metadata).toHaveCount(1);

    const roomName = metadata.locator("span").last();

    const dimensions = await roomName.evaluate((element) => ({
      height: element.clientHeight,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
      parentClientWidth: element.parentElement?.clientWidth ?? 0,
      parentScrollWidth: element.parentElement?.scrollWidth ?? 0,
    }));
    expect(dimensions.parentScrollWidth).toBeLessThanOrEqual(
      dimensions.parentClientWidth,
    );
    expect(dimensions.height).toBeGreaterThan(dimensions.lineHeight);
  });

  test("mobile cards show every known participant", async ({ page }) => {
    await page.setViewportSize({ width: 344, height: 800 });
    await page.goto("/dev/design");

    const players = page
      .locator('.table-card[href="/tables/6038"]')
      .getByRole("list", { name: "Joueur·euse·s inscrit·e·s" });
    await expect(players).toContainText("Ana");
    await expect(players).toContainText("Basile");
    await expect(players).toContainText("Chloé");
    await expect(players).not.toContainText("autre");
  });

  test("sticky day heading sits directly below the mobile navbar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 344, height: 800 });
    await page.goto("/dev/design");

    const heading = page.locator(".day-heading-sticky");
    await expect(heading).toHaveCount(2);
    await expect(heading.first()).toHaveCSS("top", "56px");
  });
});
