# AI Empowered Group — Site Improvement Plan

**Written:** 2026-07-28
**Audience:** an engineering agent with no prior context on this project — read this whole document before touching anything.
**Source of findings:** an independent critique agent browsed the live production site (https://aiempoweredgroup.com/) and reported the issues below. This plan translates those findings into concrete fixes against this repository.

---

## 0. Essential context — read this first

1. **This repo (`d:\AIEmpowerment`, Astro) is the source for `aiempoweredgroup.com`, deployed via Firebase Hosting to project `ai-empowerment-group`.** Domain note: `aiempoweredgroup.com` ("empowered") is the real site. `aiempowermentgroup.com` ("empowerment") is an unrelated old Vercel site — ignore it, do not confuse the two.

2. **The live site and this git repo have diverged for the assessment funnel specifically.** An earlier AI session built and deployed a more advanced version of `/assessment` (flow order: Gateway → Profile → Questions → Email verification → Results, with per-error-code messaging) directly to Firebase Hosting, but **never committed that source to git**. It is genuinely unrecoverable — only the compiled/minified JS exists, on the live server. This repo's own `/assessment` source has a *different, simpler* flow order (Gateway → Email verification → Profile → Questions → Results).

3. **Direct consequence of #2, verified by comparing this repo's source against the critique's findings:** several reported "bugs" do not actually exist in this repo — they are broken *only* in the diverged live version:
   - Logo alt text: **present and correct** in this repo (`Nav.astro`, `Footer.astro`, `NeuralPhoenixLogo.astro` all have `alt="AI Empowerment Group"`). The live site's missing alt text is a symptom of the diverged build, not a defect here.
   - Assessment "3 Key Insights" showing empty: **this repo's `src/config/assessment.ts` has real, populated `insights` text for every score band.** The live site rendering them empty is again a defect specific to the diverged build.
   - **Implication: simply redeploying this repo's `dist/` to Hosting will silently fix both of the above**, as a side effect, with no additional code change needed.

4. **The trade-off this creates, and the first real decision point:** redeploying this repo reverts the assessment funnel to this repo's flow order (email-verification-before-questions), losing the live version's more advanced (questions-before-email) UX. Two paths:
   - **Path A (recommended, faster):** accept the reversion now to eliminate the empty-insights/missing-alt-text defects immediately; treat re-adding the "answer questions before verifying email" flow as a separate, later UX improvement task, designed and built fresh in this repo (not reconstructed from minified JS).
   - **Path B (slower, more faithful):** before deploying anything, first reconstruct the live flow order in this repo's `src/lib/assessment/controller.ts` / `src/components/assessment/*`, using what can be partially recovered from the deployed JS (fetchable at `https://aiempoweredgroup.com/_astro/hoisted.*.js` — grep for `assessment-gateway`, `awaitingEmailConfirmation`, the `Ee()`-equivalent progress-check function, and the friendly per-error-code strings) as a reference, then deploy the reconciled version.
   - **Do not silently pick one — this needs the site owner's explicit call before any hosting deploy happens.** Everything below assumes Path A unless told otherwise, since it's lower-risk and faster to ship, but flag this decision before executing.

5. **Nothing in this repo has been deployed to Hosting recently** (the last hosting deploy, 2026-07-24, is the diverged version described above). `firestore.rules` deploys are current as of this session. Any `firebase deploy --only hosting` (or `hosting,firestore:rules,functions`) is a real, visible production change — confirm with the site owner immediately before running it, the same way past Firestore rules deploys and `git push` were confirmed individually in this project's history.

---

## 1. Fixes resolved automatically by deploying this repo (Path A)

No code changes needed beyond what's already in this repo — just requires the hosting deploy (see §0.5 on confirming first):

- Missing logo alt text → already correct here.
- Empty assessment "3 Key Insights" → already has real content here.
- Portal messaging XSS (innerHTML → textContent), open-redirect fix on `/login`/`/success`, re-enabled membership gate — already committed this session, just needs deploying.

## 2. Concrete code/content fixes needed in this repo (not yet done)

Work through these in the repo, verify each with a real build (`npm run build`) and, once deployed, a **direct re-check against the live URL** (don't trust local-only verification — see §0.3, drift has bitten this project twice already).

### 2.1 Add a custom 404 page
No `src/pages/404.astro` exists — confirmed absent. Astro serves its default bare 404 for any unmatched route, which is the "dead end with no way back" the critique hit.
**Fix:** create `src/pages/404.astro` using `Layout.astro`, with a clear "Page not found" message, and links back to `/`, `/services`, `/assessment`, `/contact`. Keep it consistent with the site's charcoal/gold visual language — this is a real product page, not a throwaway.

### 2.2 Pricing — DECIDED: remove entirely, do not show anywhere
Site owner's explicit instruction: no prices should appear anywhere on the site. **Already done** (2026-07-28): removed the `$750 / week` line from `/contact`'s info panel, the `$750 / week` price badge and its now-unused CSS from `/portal`, the `$750/week` text from the portal's "Reactivate" button, and the `$750 weekly` mention from `/success`'s billing note. Billing-cadence language ("weekly subscription", "billed via Stripe") was kept where it didn't state a dollar figure. **If any future work touches these pages, do not reintroduce a price** — inquiries about cost should be handled off-site (contact form / direct conversation), not published.

### 2.3 Direct contact channel
`/contact` (`src/pages/contact.astro`) has no direct email/phone shown — everything routes through the form. Security-conscious enterprise buyers often want a verifiable direct channel before filling out a form.
**Fix:** needs a real email address and/or phone number from the site owner — **do not fabricate one**. Once provided, add it near the contact form (e.g., in the `.contact-info` aside alongside "Response time" / "Consultation" / "Training retainer" details).

### 2.4 Login page self-serve path
"Not a client yet?" on `/login` (`src/pages/login.astro`) links only to `/contact`, a dead end for someone who just wants to explore services.
**Fix:** change that link to `/services`, or add a secondary link to the free `/assessment` — a much lower-friction next step for someone not ready to talk to a consultant yet.

### 2.5 "Deep Dive → Blueprint → Shield" naming
In `src/components/HowIWork.astro` — "Shield" doesn't parallel "Deep Dive"/"Blueprint" stylistically; reads as a forced alliterative flourish for the security-specific step.
**Fix:** this is a brand-voice call, not an objective bug — propose 2-3 alternative three-step names to the site owner (e.g., "Discover → Design → Defend", or keep as-is if they like it) rather than silently renaming it.

## 3. Content/credibility work — needs the site owner, cannot be done by an agent alone

These are the single biggest credibility problems the critique found, and they require **real business input**, not just code changes. Flag this distinction clearly — don't attempt to invent names, companies, or quotes to "solve" these.

### 3.1 Case studies (`src/pages/case-studies.astro`)
All examples are fully anonymized ("a mid-size logistics firm," "a marketing department of 18 people") paired with suspiciously precise stats (68%, 34%→6%), which reads as fabricated to a skeptical buyer.
**Two real options, present both to the owner:**
- **Best:** get permission from 2-3 real past clients to use their name/company/a quote, even briefly. Far more credible than anything anonymized.
- **Interim, doable today without new input:** explicitly label the existing case studies "Illustrative scenario — client details anonymized for confidentiality" so the anonymization reads as a deliberate professional choice rather than an unexplained gap.

### 3.2 Testimonials (`src/pages/testimonials.astro`)
None of the testimonials have a person's actual name — only role + sector. Same problem as case studies, same two options: get real named testimonials, or explicitly label the current ones as illustrative until real ones are collected.

---

## 4. Suggested execution order

1. **Get the site owner's decision on §0.4** (Path A vs Path B for the assessment flow) before doing anything else — it determines whether step 6 below is "just deploy" or "reconstruct the flow first, then deploy."
2. Build `src/pages/404.astro` (§2.1) — self-contained, no dependencies, do this regardless of the Path A/B decision.
3. Fix the login self-serve link (§2.4) — trivial, one-line change.
4. Present the pricing (§2.2), direct-contact (§2.3), and "Shield" naming (§2.5) items to the site owner as open questions needing their input — do not guess at answers.
5. Present the case-study/testimonial options (§3.1, §3.2) to the site owner — implement whichever they choose (real content, or the interim anonymization label, or both in sequence).
6. Once §0.4 is decided: either deploy as-is (Path A) or reconstruct the flow order first (Path B), then run `npm run build` and confirm cleanly, then **explicitly confirm with the site owner** before `firebase deploy --only hosting` (and `firestore:rules`/`functions` if anything in those changed).
7. **After deploying, re-verify directly against `https://aiempoweredgroup.com/` — do not assume local build success means production is fixed.** This project has hit repo/production drift twice already; treat "looks right in `npm run dev`" as necessary but not sufficient.
8. Optional but recommended: re-run an independent critique pass against the live site after deploying, the same way the original critique was produced, to confirm the fixes actually landed as intended rather than trusting self-assessment.

---

## 5. Explicitly out of scope for this plan

- Stripe/payments integration — deliberately deferred by the site owner in an earlier session; do not bundle it into this work.
- Custom SMTP / custom Auth-action domain for emails — separate, already-discussed thread; not part of this critique-driven fix pass.
