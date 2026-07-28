import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
};

test.describe("/assessment", () => {
  test("starts at the gateway, then shows the email-verification step first", async ({ page }) => {
    // This repo's assessment flow order is deliberately Gateway -> Email
    // verification -> Profile -> Questions -> Results (see
    // SITE_IMPROVEMENT_PLAN.md §0.4 for why — a different, more elaborate
    // flow order was live in production at one point from an undeployed
    // change, and this test pins down which order this codebase actually
    // implements so that's never ambiguous again.
    await page.goto("/assessment");
    await expect(page.locator("#assessment-gateway")).toBeVisible();
    await expect(page.locator("#assessment-email-gate")).toBeHidden();

    await page.click("#gateway-individual");

    await expect(page.locator("#assessment-email-gate")).toBeVisible();
    await expect(page.locator("#assessment-profile-form")).toBeHidden();
    await expect(page.locator("#assessment-questions")).toBeHidden();
  });

  test("validates the email field before allowing a sign-in link request", async ({ page }) => {
    await page.goto("/assessment");
    await page.click("#gateway-individual");
    await page.fill("#assessment-email", "not-an-email");
    await page.click("#send-link-btn");
    await expect(page.locator("#assessment-email-error")).toBeVisible();
  });

  test("skips email re-verification for an already-signed-in user, even clicking immediately (auth-restore race guard)", async ({ page }) => {
    // Firebase restores a persisted session from IndexedDB asynchronously on
    // every page load. A prior version of selectRole() read auth.currentUser
    // synchronously with no wait for that restore, so a click landing in that
    // ~tens-of-ms window would silently (and incorrectly) fall through to
    // the email gate for a user who was actually already signed in. This
    // test clicks with zero added delay — no waitForTimeout anywhere before
    // the click — specifically to catch that race if it ever comes back.
    const email = `e2e-race-guard-${Date.now()}@example.com`;
    const password = "E2eRaceGuard123!";
    const app = initializeApp(firebaseConfig, `e2e-race-guard-${Date.now()}`);
    const auth = getAuth(app);
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await page.goto("/login");
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.click("#login-btn");
      await page.waitForURL(/\/portal/, { timeout: 10000 });

      await page.goto("/assessment");
      await page.click("#gateway-individual"); // deliberately no delay before this click

      await expect(page.locator("#assessment-email-gate")).toBeHidden();
      await expect(page.locator("#assessment-profile-form")).toBeVisible();
      await expect(page.locator("#profile-email")).toHaveValue(email);
    } finally {
      await deleteUser(cred.user).catch(() => {});
      await deleteApp(app).catch(() => {});
    }
  });
});
