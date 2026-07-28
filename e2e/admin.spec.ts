import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
};

// Note: this suite cannot test the POSITIVE case (the real admin account
// signing in and actually seeing data) — that needs the real owner's
// password, which isn't available to tests. firestore.rules.test.ts covers
// the admin-allowed path directly against the emulator instead. This suite
// covers what's testable end-to-end: unauthenticated and non-admin denial.

test.describe("/admin", () => {
  test("redirects to /login when not signed in", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = new URL(page.url());
    expect(url.searchParams.get("redirect")).toBe("/admin");
  });

  test("shows 'Not Authorized' for a signed-in user who isn't the admin", async ({ page }) => {
    const email = `e2e-not-admin-${Date.now()}@example.com`;
    const password = "E2eNotAdmin123!";
    const app = initializeApp(firebaseConfig, `e2e-not-admin-${Date.now()}`);
    const auth = getAuth(app);
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await page.goto("/login");
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.click("#login-btn");
      await page.waitForURL(/\/portal/, { timeout: 10000 });

      await page.goto("/admin");
      await expect(page.locator("#state-denied")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("#state-denied")).toContainText(/not authorized/i);
      await expect(page.locator("#state-admin")).toBeHidden();
    } finally {
      await deleteUser(cred.user).catch(() => {});
      await deleteApp(app).catch(() => {});
    }
  });
});
