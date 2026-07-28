import { test, expect } from "@playwright/test";

// These tests hit the real Firestore project configured in .env — a valid
// submission writes a real document to contactSubmissions. Use an
// obviously-fake identity so it's easy to spot and delete in the Console.

test.describe("/contact", () => {
  test("shows the direct contact details", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator('a[href="mailto:info@estaiconsulting.com"]')).toBeVisible();
    await expect(page.locator('a[href="tel:+12489430589"]')).toBeVisible();
  });

  test("blocks submission client-side when required fields are missing", async ({ page }) => {
    await page.goto("/contact");
    await page.click("#submit-btn");
    await expect(page.locator("#name-error")).not.toBeEmpty();
    await expect(page.locator("#form-success")).toBeHidden();
  });

  test("submits successfully with valid data", async ({ page }) => {
    await page.goto("/contact");
    await page.fill("#name", "E2E Test Suite");
    await page.fill("#email", "e2e-test-suite@example.com");
    await page.selectOption("#country", "United Kingdom");
    await page.selectOption("#inquiry", "general");
    await page.fill("#message", "Automated end-to-end test submission — safe to delete.");
    await page.click("#submit-btn");
    await expect(page.locator("#form-success")).toBeVisible({ timeout: 10000 });
  });
});
