import { test, expect } from "@playwright/test";

test.describe("miscellaneous pages", () => {
  test("unknown routes hit the custom 404 page with real navigation links", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-e2e");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("main")).toContainText(/page not found/i);
    await expect(page.getByRole("main").getByRole("link", { name: /home/i })).toBeVisible();
    await expect(page.getByRole("main").locator('a[href="/services"]')).toBeVisible();
    await expect(page.getByRole("main").locator('a[href="/assessment"]')).toBeVisible();
    await expect(page.getByRole("main").locator('a[href="/contact"]')).toBeVisible();
  });

  test("case studies and testimonials show the anonymization disclaimer", async ({ page }) => {
    await page.goto("/case-studies");
    await expect(page.locator(".anon-notice")).toContainText(/anonymized/i);

    await page.goto("/testimonials");
    await expect(page.locator(".anon-notice")).toContainText(/anonymized/i);
  });

  test("no page renders a dollar-amount price anywhere", async ({ page }) => {
    const pages = [
      "/", "/bio", "/services", "/case-studies", "/testimonials",
      "/contact", "/login", "/portal", "/success", "/payment-cancelled", "/accessibility",
    ];
    for (const path of pages) {
      await page.goto(path);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText, `unexpected price-like text on ${path}`).not.toMatch(/\$\d/);
    }
  });
});
