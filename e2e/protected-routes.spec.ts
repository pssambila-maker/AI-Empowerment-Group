import { test, expect } from "@playwright/test";

test.describe("protected routes redirect safely when signed out", () => {
  test("/portal redirects to /login with a relative redirect param", async ({ page }) => {
    await page.goto("/portal");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    const redirect = url.searchParams.get("redirect") || "";
    expect(redirect.startsWith("/")).toBe(true);
    expect(redirect.startsWith("//")).toBe(false);
  });

  test("/success redirects to /login with a relative redirect param", async ({ page }) => {
    await page.goto("/success");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    const redirect = url.searchParams.get("redirect") || "";
    expect(redirect.startsWith("/")).toBe(true);
    expect(redirect.startsWith("//")).toBe(false);
  });
});
