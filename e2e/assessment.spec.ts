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

  test("checklist and choice-question options render themed (not unstyled defaults), and change color when selected", async ({ page }) => {
    // Regression guard for a real bug: .checklist-item and .choice-option
    // are created dynamically in controller.ts via document.createElement,
    // not present in QuestionFlow.astro's own template — Astro's scoped-CSS
    // attribute is only ever applied to elements that exist in the template
    // at build time, so those rules silently never matched these elements,
    // falling back to unstyled browser defaults (plain checkboxes, default
    // white/gray buttons) despite the CSS looking correct in source.
    const email = `e2e-question-style-${Date.now()}@example.com`;
    const password = "E2eQuestionStyle123!";
    const app = initializeApp(firebaseConfig, `e2e-question-style-${Date.now()}`);
    const auth = getAuth(app);
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    try {
      await page.goto("/login");
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.click("#login-btn");
      await page.waitForURL(/\/portal/, { timeout: 10000 });

      await page.goto("/assessment");
      await page.click("#gateway-individual"); // already signed in -> lands directly on profile form
      await page.fill("#profile-fullname", "Question Style Check");
      await page.click("#profile-submit-btn");

      const item = page.locator(".checklist-item").first();
      await expect(item).toBeVisible();
      const uncheckedStyle = await item.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(uncheckedStyle).toBe("rgb(45, 45, 45)"); // var(--color-charcoal), NOT browser-default transparent/white

      await item.locator("input[type=checkbox]").check();
      await page.waitForTimeout(250); // let the 0.15s border-color transition finish before reading it
      const checkedStyle = await page
        .locator(".checklist-item", { has: page.locator("input:checked") })
        .first()
        .evaluate((el) => getComputedStyle(el).borderColor);
      expect(checkedStyle).toContain("201, 168, 76"); // gold border once checked — visibly different from unchecked

      await page.click("#checklist-next-btn");
      const option = page.locator(".choice-option").first();
      await expect(option).toBeVisible();
      const unselectedBg = await option.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(unselectedBg).toBe("rgb(45, 45, 45)");

      await option.click();
      const selected = page.locator(".choice-option.selected").first();
      await expect(selected).toBeVisible();
      await page.waitForTimeout(250); // let the 0.15s background transition finish before reading it
      const selectedBg = await selected.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(selectedBg).not.toBe(unselectedBg); // visibly changed color once selected
    } finally {
      await deleteUser(cred.user).catch(() => {});
      await deleteApp(app).catch(() => {});
    }
  });
});
