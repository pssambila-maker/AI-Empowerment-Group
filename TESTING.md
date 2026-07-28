# Testing

Three independent layers, covering different things. Run them in this order when in doubt — cheapest/fastest first.

## 1. Unit tests — `npm test`

Pure-function tests, no network, no emulator, no external services. Runs in under a second.

```bash
npm test          # single run
npm run test:watch  # re-runs on file change, useful while editing
```

**What's covered:** `src/lib/assessment/scoring.ts` (score math, band boundaries, needle angle), `src/lib/assessment/calendar.ts` (the DST-aware "next Saturday 9am Eastern" logic — the single most bug-prone piece of pure logic in this codebase, tested across both EST and EDT and both sides of the "is it already past start time" edge case), `src/lib/assessment/emailTemplates.ts` (HTML-escaping, name handling).

**When to add a test here:** any time you add a new pure function to `src/lib/**` — something that takes inputs and returns an output with no Firebase/DOM/network calls. If it's pure, it's cheap to test and there's no excuse not to.

## 2. Firestore rules tests — `npm run test:rules`

Tests `firestore.rules` directly against a real (local, emulated) Firestore instance — the actual security boundary of this app. This is what used to only get checked by hand (or by a one-off agent) against the live project; now it's automated and repeatable.

**Prerequisite: a JDK (11+).** The Firestore emulator is a Java process. If `java -version` fails, install one — e.g. `winget install Microsoft.OpenJDK.21` on Windows, or download a Temurin build from https://adoptium.net if your environment can't run installers. This only matters for this one command; it's not needed for `npm test`, `npm run test:e2e`, `npm run dev`, or `npm run build`.

```bash
npm run test:rules
```

This one command (`firebase emulators:exec`) starts the Firestore emulator, runs the test file, and shuts the emulator down again — no separate terminal needed.

**What's covered:** every collection in `firestore.rules` — `leads`, `mail`, `users` (including the protected-fields check that stops a client from self-granting `membershipStatus: "paid"`), `conversations/{uid}/messages`, `contactSubmissions` — both the "this should be allowed" and "this should be denied" side of each rule, plus IDOR checks (can user B read/write user A's data) and the default-deny catch-all.

**When to add a test here:** any time you change `firestore.rules` — add a new collection, change a field requirement, adjust the protected-fields list. If a rule isn't tested here, the only way anyone finds out it's wrong is a live incident (see: this project's contact form silently failing for however long the rules were undeployed) or another manual pentest.

**A note on the test file's structure:** `testEnv.withSecurityRulesDisabled(async (ctx) => { ... })` is how you seed data as an all-powerful admin (bypassing the rules) to set up a scenario before testing a client's restricted access to it. The setup **must** happen inside that callback, fully awaited — don't extract `ctx.firestore()` and use it after the callback returns; that was a real bug caught while writing this suite (see git history on `firestore.rules.test.ts` if you want the exact story).

## 3. End-to-end tests — `npm run test:e2e`

Real Chromium, driven by Playwright, against a real `astro dev` instance (auto-started). These hit the **real Firebase project** configured in `.env` — a valid contact-form submission in these tests writes a real (obviously-labeled) document to production Firestore.

```bash
npm run test:e2e
```

**What's covered:** the contact form (valid submission actually succeeds, invalid one is blocked client-side), login (wrong credentials handled cleanly, the low-friction links for non-clients), the **open-redirect regression guard** (creates a disposable test account, logs in for real with a malicious `?redirect=` param, confirms the browser actually lands on `/portal` and not the attacker's URL — this is the single most important test in the whole suite, since this exact vulnerability class was found live in production during this project's security audit), the assessment funnel's flow order (Gateway → Email verification → Profile → Questions, in that specific order — deliberately pinned down since a *different* flow order was live in production at one point from a change that was deployed but never committed to git), both protected routes (`/portal`, `/success`) redirecting safely when signed out, the custom 404 page, the case-studies/testimonials anonymization disclaimer, and a full sweep confirming no page renders a `$`-prefixed price anywhere.

**When to add a test here:** any time you touch a flow a real visitor goes through end-to-end — a new page in a funnel, a new form, a new redirect. If you can't explain the user-visible behavior in one sentence, it probably doesn't need an E2E test; if you can, and getting it wrong would be visibly broken or a security problem, it does.

**Cleanup:** tests that create real data use obviously-fake identities (`e2e-test-suite@example.com`, `e2e-redirect-test-*@example.com`) and delete their own disposable auth accounts in a `finally` block. The one thing that's NOT cleaned up automatically is the contact-form test's Firestore document (`contactSubmissions` denies client-side deletes by design, same as it would for a real visitor) — check the Firebase Console occasionally and delete test submissions if they pile up.

## What's still manual (be honest about this)

There is no CI pipeline running any of this automatically on push/PR — these all currently rely on someone remembering to run them locally. If you set up GitHub Actions (or similar) later, `npm test` and `npm run test:e2e` are the two to wire in first (rules tests need the JDK step too, which is more setup for a CI runner). Also, none of this replaces a real security review before a significant change — `web-pentest` (a Claude Code skill, not part of this repo) exists for a deeper, adversarial pass when it matters.
