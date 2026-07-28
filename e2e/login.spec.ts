import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
};

test.describe("/login", () => {
  test("shows a clean error on wrong credentials, not a crash", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "nobody-e2e-test@example.com");
    await page.fill("#password", "definitely-wrong-password");
    await page.click("#login-btn");
    await expect(page.locator("#login-error")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#login-error")).toContainText("Invalid email or password");
  });

  test("has low-friction links for non-clients instead of a dead end", async ({ page }) => {
    await page.goto("/login");
    const forgotLink = page.locator(".forgot-link");
    await expect(forgotLink.locator('a[href="/services"]')).toBeVisible();
    await expect(forgotLink.locator('a[href="/assessment"]')).toBeVisible();
  });

  test("only allows same-origin ?redirect= targets after a real successful login (open-redirect regression guard)", async ({ page }) => {
    // This is the exact vulnerability class found live during this project's
    // security audit: the code once assigned window.location.href to the raw
    // ?redirect= value with no validation, which was exploitable via
    // ?redirect=javascript:... immediately after a real login. A fix exists
    // in source, but it was previously deployed inconsistently with what's
    // in git — so this test drives a REAL login through the actual UI and
    // checks where the browser actually ends up, rather than re-testing the
    // validation logic in isolation (which would pass even if the page never
    // called it).
    const email = `e2e-redirect-test-${Date.now()}@example.com`;
    const password = "E2eTestPass123!";

    const app = initializeApp(firebaseConfig, `e2e-login-${Date.now()}`);
    const auth = getAuth(app);
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await page.goto("/login?redirect=https://evil.example.com/phishing");
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.click("#login-btn");

      await page.waitForURL((url) => url.pathname !== "/login", { timeout: 10000 });
      expect(page.url()).toContain("/portal");
      expect(page.url()).not.toContain("evil.example.com");
    } finally {
      await deleteUser(cred.user).catch(() => {});
      await deleteApp(app).catch(() => {});
    }
  });
});
