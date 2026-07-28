# Architecture, Troubleshooting & Expansion Guide

This is the deep-dive companion to `README.md`. Read `README.md` first for the stack and page list; this document is for "something's broken, where do I look" and "I want to add X, what pattern do I follow."

---

## 1. Module map — what to touch for a given change

| You want to change... | Touch this, nothing else |
|---|---|
| An assessment question, its points, or the score-band insights/labels | `src/config/assessment.ts` only |
| How the score is calculated | `src/lib/assessment/scoring.ts` |
| The recurring class's day/time/join link | `src/config/assessment.ts`'s `CLASS_SCHEDULE` |
| The class-invite email's copy | `src/lib/assessment/emailTemplates.ts` |
| Assessment funnel screen order/wiring | `src/lib/assessment/controller.ts` |
| One funnel step's markup/styling | `src/components/assessment/*.astro` (one file per step) |
| Portal membership/paywall logic | `src/lib/portal/membership.ts` |
| Portal messaging (send/subscribe) | `src/lib/portal/messaging.ts` |
| What happens to a user's profile doc on login | `src/lib/portal/profile.ts` |
| Contact form validation/submission | `src/lib/contact/submit.ts` + `src/pages/contact.astro` |
| Firebase app/auth/db/functions initialization | `src/lib/firebase/client.ts` — **the only place this should ever be called**; every page imports from here |
| Any Firestore access-control rule | `firestore.rules` (single file, Firestore doesn't support splitting it) |
| A Cloud Function's behavior | `functions/src/*.ts` (see §4 — most of these aren't deployed yet) |

If a change to one of these areas requires touching a *different* area not listed as its pair above, stop and ask whether you're accidentally duplicating logic that should be shared instead.

---

## 2. Troubleshooting playbook

Real scenarios hit during this project's build-out, and how they were actually diagnosed — not hypothetical advice.

### "A form/feature works locally but not in production" (or vice versa)

**Check first: is your local `git log` actually what's deployed?** This project spent a significant chunk of time on exactly this — an earlier session built and deployed a materially different version of the assessment funnel directly to Firebase Hosting, and never committed it to git. Local testing looked fine (tested a simpler flow), production had a different, undocumented flow with its own bugs.

How to check: fetch the live site's JS bundle for the page in question and grep it for a string you know is (or isn't) in your local source. If the live bundle doesn't contain something you just added and just deployed, the deploy didn't actually go out, or went to the wrong Hosting target. If it contains something you've never seen in your source, someone deployed from a different checkout — go find that checkout before making further changes, don't just overwrite it.

### "A Firestore write silently fails, no error shown to the user"

Almost certainly `firestore.rules` denying the write, and the calling code swallowing the error (several of this app's writes are deliberately fire-and-forget — e.g. `persistLead()` in `controller.ts` — so a failed save doesn't interrupt someone's on-screen results). This is a real design tradeoff (good UX, bad observability), and it already caused a real incident: `firestore.rules` had a full ruleset written for `leads`/`mail` that was **never actually deployed**, so real assessment completions were being silently lost the entire time.

How to check: run `npm run test:rules` — this exercises every collection's actual allow/deny behavior against the real rules file. If you suspect the deployed rules don't match this repo's `firestore.rules`, don't assume — pull the actual document count from Firebase Console → Firestore → the collection in question, or write a throwaway script hitting the real project with a real auth'd user and see what error code comes back (`permission-denied` means the rule is live and rejecting; anything else is a different problem).

### "The hidden attribute doesn't actually hide something"

If a component sets `display: X` unconditionally in its own `<style>` block (not gated by `:not([hidden])`), the browser's built-in `[hidden] { display: none }` rule loses — author-origin CSS always beats the user-agent stylesheet regardless of specificity. This bit `ProfileForm.astro` and `ResultsPanel.astro` for real (both set `display: flex` unconditionally); it's now fixed globally via a `[hidden] { display: none !important; }` rule in `Layout.astro`, so this shouldn't recur, but if you ever see two funnel steps rendering on top of each other, this class of bug is the first thing to suspect.

### "A sign-in email is landing in Spam"

Two independent things affect this, check both:
1. **Project branding**: Firebase Console → Project Settings → General → "Public-facing name". If unset, every auth email shows the raw `project-XXXXXXX` string, which reads as generic/spammy. This was the actual root cause once.
2. **Sender domain reputation**: `firebaseapp.com` is shared across every Firebase project on Earth — a recipient's mail provider may have already learned to distrust it from unrelated senders (or from your own earlier test emails). Firebase Console → Authentication → Templates → SMTP settings lets you send through your own domain instead, which is the durable fix; "Report not spam" on a specific recipient's inbox is a workaround for that one mailbox, not a systemic fix.

### "auth/unauthorized-continue-uri" or "auth/unauthorized-domain" errors

The domain the sign-in-link request came from (or the `continueUrl` passed to it) isn't in Firebase Console → Authentication → Settings → Authorized domains. Note: **Firebase Hosting's connected custom domain and Auth's authorized-domains list are two separate settings** — connecting a domain in Hosting does not automatically authorize it for Auth. This project has two similarly-named domains in play historically (`aiempoweredgroup.com`, the real one, vs. `aiempowermentgroup.com`, an unrelated old site) — if you ever see a "wrong site" surprise, check which exact domain you're looking at character-by-character before assuming a deeper bug.

### "I changed something and I'm not sure what else it touches"

Run all three test layers (`npm test && npm run test:rules && npm run test:e2e` — see `TESTING.md`) before trusting a change, especially anything touching `firestore.rules`, `lib/firebase/client.ts`, or any page's redirect logic. This project has a specific, real regression class to guard against: an open-redirect fix existed in source for a while before actually being deployed, and the live site was vulnerable that whole time. `e2e/login.spec.ts`'s redirect test exists specifically so that can't happen silently again — if you ever touch redirect logic anywhere, make sure that test (or an equivalent) still passes.

---

## 3. Expansion patterns

### Adding a new page

1. `src/pages/newpage.astro` using `Layout.astro`.
2. If it needs Firebase, import from `src/lib/firebase/client.ts` — never call `initializeApp` directly in a page again (this repo had that duplicated across three pages at one point; it's the reason `client.ts` exists as a hard rule now, not a suggestion).
3. Add it to `Nav.astro`'s `navLinks` array if it should appear in navigation.
4. If it's a dead-end for some users (like `/login`'s old "Not a client yet?" link, which used to just go to `/contact`), give it a real next step, not a shrug.

### Adding a new Firestore-backed feature

1. Design the collection schema, then write its `firestore.rules` block **before** writing any code that uses it — this project's biggest recurring risk has been code shipping ahead of (or without) matching rules.
2. Write the rules tests for it in `firestore.rules.test.ts` alongside the rule itself — both the allow and deny cases.
3. Put the read/write logic in its own `src/lib/<feature>/` module (see the pattern in `lib/assessment/`, `lib/portal/`, `lib/contact/`) — not inline in a page's `<script>` block.
4. Run `npm run test:rules` before deploying the rules, and actually deploy the rules (`firebase deploy --only firestore:rules`) — don't assume writing the file is enough. This project's contact form and portal both had *correct* rules sitting undeployed for a real stretch of time.

### Adding a new funnel step (assessment-style, multi-screen flow)

Follow the assessment funnel's exact pattern: one `.astro` component per screen in `components/<feature>/`, all screens rendered into the page with `hidden` on all but the first, a single `controller.ts` managing a `state` object and a `showSection(id)` helper that sets `hidden` on every screen except the target. Keep config (copy, scoring, schedules — anything a non-engineer might reasonably want to tweak) in a dedicated `config/<feature>.ts`, separate from the logic that consumes it.

### Adding a new Cloud Function

`functions/src/index.ts` re-exports everything; add your function there. If it needs a secret (API keys, webhook secrets), use `defineSecret`/`defineString` from `firebase-functions/params` (see `createCheckoutSession.ts`) — **and know that Firebase loads the entire functions codebase to analyze exports before deploying even one function**, so a `defineSecret()` call anywhere in the codebase that references a secret not yet set in Secret Manager will block deploying *any* function from that codebase, not just the one that needs it. Run `firebase functions:secrets:set NAME` before your first deploy that touches a new secret.

Also: if you're building a server-side alternative to something that already has a client-side implementation (this repo has exactly one such pair: `submitContactFormFn` in `functions/src/`, dormant, vs. `submitContactForm` in `src/lib/contact/submit.ts`, live), **name them differently on purpose** — a same-named pair caused real confusion risk here and was deliberately renamed once discovered.

---

## 4. Current deployment state (check before assuming)

As of this writing: `hosting` and `firestore.rules` are deployed and match this repo. **`functions/` is not deployed** — none of `verifySubscription`, `submitContactFormFn`, `createCheckoutSession`, `stripeWebhook` are live, because Stripe secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) haven't been set in this Firebase project yet, and Firebase's codebase-wide analysis step means *no* function in this codebase can deploy until they are (see §3 above). This state can and will go stale — don't trust this paragraph, run `firebase functions:list` against the real project to check current reality.
