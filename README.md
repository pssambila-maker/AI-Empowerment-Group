# AI Empowerment Group — Professional Consultancy Website

**Live Domain:** aiempoweredgroup.com
**Stack:** Astro · Firebase (Hosting, Auth, Firestore) · Stripe (backend built, not yet deployed)
**Status:** In development — core site, free AI Readiness assessment funnel, auth, and portal built; Stripe go-live pending

---

## Overview

A premium, multi-page consultancy website for an AI Strategy, Data Science, and Cybersecurity professional. The site is designed to communicate authority, approachability, and technical depth — targeting enterprise teams, SMBs, and individual clients seeking AI transformation services.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | [Astro](https://astro.build) | Static-first, fast, SEO-friendly |
| Styling | Scoped CSS + design tokens | CSS variables in `Layout.astro`, per-page `<style>` blocks |
| Hosting | [Firebase Hosting](https://firebase.google.com/docs/hosting) | Global CDN, preview channels, fast deploys |
| Auth | Firebase Authentication | Email/password + Google (client portal), email-link (assessment) |
| Payments | Stripe Checkout + Firebase Functions | Hosted payment page, webhook-driven member upgrade — built, not deployed |
| Forms | Firebase Cloud Functions (source) / direct Firestore write (currently live) | See "Contact form" note below |
| Database | Firestore | Leads, user profiles, membership status, portal messages |
| Analytics | Firebase Analytics | Page views, CTA tracking |

**Contact form note:** a proper server-side `submitContactFormFn` Cloud Function exists in `functions/src/` (validates input, writes to Firestore via Admin SDK), but it is **not currently deployed** and is deliberately named differently from `src/lib/contact/submit.ts`'s `submitContactForm` (the client-side function that's actually live) to avoid the two being confused during troubleshooting. `/contact` currently submits directly from the browser to the `contactSubmissions` Firestore collection, validated by `firestore.rules` schema checks rather than a Cloud Function. Deploying the function and switching `/contact` to call it is a drop-in upgrade — no rearchitecting needed.

---

## Brand Design System

| Token | Value | Usage |
|---|---|---|
| `color-charcoal` | `#2D2D2D` | Backgrounds, body text |
| `color-gold` | `#C9A84C` | Accents, CTA buttons, borders |
| `font-primary` | Inter / Montserrat | Headings and body |
| `layout` | Split-column hero | Left: right-aligned + gold bars; Right: left-aligned text |

---

## Site Structure

```
/                        → Homepage (Hero, Services preview, CTA)
/bio                     → The Expert (Authority page)
/services                → Service offerings (AI, Data Viz, Cyber)
/case-studies            → Challenge → Approach → Result cards
/testimonials            → Client & colleague quotes grid
/assessment              → Free AI Readiness Scorecard (lead-gen funnel)
/contact                 → Accessible tab-navigable inquiry form
/login                   → Client portal login (email/password + Google)
/success                 → Post-checkout confirmation (verifies subscription)
/payment-cancelled       → User cancelled checkout page
/portal                  → Protected client portal (paid members only)
/accessibility           → WCAG 2.1 statement (footer link)
/admin                   → Owner-only dashboard (leads, class registrations, contact inquiries, each with CSV export; free-class date/time/join-link editor) — not linked in nav, no public entry point
```

---

## Project Structure

```
ai-empowerment-group/
├── src/
│   ├── components/
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── HowIWork.astro
│   │   ├── NeuralPhoenixLogo.astro
│   │   └── assessment/           # One component per funnel step
│   ├── config/
│   │   └── assessment.ts         # Questions, scoring, and DEFAULT_CLASS_SCHEDULE (fallback only —
│   │                             # the live schedule lives in Firestore, editable from /admin)
│   ├── lib/
│   │   ├── firebase/client.ts    # Shared Firebase app/auth/db/functions init
│   │   ├── assessment/           # Scoring, calendar, email templates, leads, mail, auth, classSchedule
│   │   │                         # (scoring.ts, calendar.ts, emailTemplates.ts, classSchedule.ts have *.test.ts alongside)
│   │   ├── portal/                # Profile upsert, membership check, messaging
│   │   └── contact/               # Contact form submission
│   ├── layouts/
│   │   └── Layout.astro          # Base layout: nav/footer + global design tokens
│   └── pages/
│       ├── index.astro
│       ├── bio.astro
│       ├── services.astro
│       ├── case-studies.astro
│       ├── testimonials.astro
│       ├── assessment.astro
│       ├── contact.astro
│       ├── login.astro           # Firebase Auth (email + Google)
│       ├── portal.astro          # Protected client portal + messaging
│       ├── success.astro         # Post-checkout verification
│       ├── payment-cancelled.astro
│       └── accessibility.astro
├── functions/             # Firebase Cloud Functions (TypeScript) — see deploy status above
│   └── src/
│       ├── index.ts
│       ├── firebase.ts              # Shared Admin SDK init
│       ├── submitContactFormFn.ts   # Stores contact enquiries in Firestore (not yet deployed)
│       ├── verifySubscription.ts    # Called by /success after checkout
│       ├── createCheckoutSession.ts # Creates Stripe Checkout session
│       └── stripeWebhook.ts         # Syncs membershipStatus from Stripe
├── public/
│   └── images/logo/       # Neural Phoenix assets
├── e2e/                   # Playwright end-to-end tests (see TESTING.md)
├── firestore.rules        # Firestore security rules (deployed via CLI)
├── firestore.rules.test.ts # Automated tests for the rules above (needs the emulator)
├── firebase.json
├── .firebaserc
├── astro.config.mjs
├── vitest.config.ts       # Pure unit tests
├── vitest.rules.config.ts # Firestore rules tests (separate — needs the emulator)
├── playwright.config.ts
├── TESTING.md             # What each test layer covers, how to run them
├── ARCHITECTURE.md        # Module map + troubleshooting playbook + expansion patterns
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project linked to `aiempoweredgroup.com`

### Installation

```bash
# Install site dependencies
npm install

# Install Cloud Functions dependencies (only needed if deploying functions)
npm install --prefix functions

# Configure environment (Firebase web config)
cp .env.example .env   # then fill in PUBLIC_FIREBASE_* values

# Run dev server
npm run dev
```

### Firebase Setup

```bash
# Login to Firebase
firebase login

# Deploy Firestore rules (the only thing that must always stay in sync with firestore.rules)
firebase deploy --only firestore:rules

# Run a preview deploy of the site
npm run build && firebase hosting:channel:deploy preview

# Deploy site + Firestore rules + functions (once ready to go live with Stripe)
npm run build && firebase deploy --only hosting,firestore:rules,functions
```

### Stripe Setup (go-live checklist)

1. Create the **AI Empowerment Training** product in the Stripe Dashboard
   with a recurring **weekly** price of $750, and copy its Price ID into
   `functions/.env` (see `functions/.env.example`).
2. Set the secrets:
   `firebase functions:secrets:set STRIPE_SECRET_KEY` and
   `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`.
3. Add a webhook endpoint in Stripe (Developers → Webhooks) pointing at the
   deployed `stripeWebhook` function URL, subscribed to:
   `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.deleted`.
4. Deploy `functions/` (`firebase deploy --only functions`). The membership
   gate in `/portal` is already enforced — once the webhook starts writing
   `membershipStatus: "paid"`, access unlocks automatically with no further
   code changes.

---

## Testing

Three layers — unit tests (`npm test`), Firestore rules tests (`npm run test:rules`, needs a JDK), and end-to-end tests (`npm run test:e2e`, drives a real browser against a real dev server). See **`TESTING.md`** for what each covers and when to add to which.

For troubleshooting a specific problem or figuring out the right pattern to follow when adding a feature, see **`ARCHITECTURE.md`** — it's a module-by-module map plus a playbook of real issues this project hit (repo/production drift, silently-failing Firestore writes, a `hidden`-attribute CSS gotcha, email deliverability) and how they were actually diagnosed.

---

## Accessibility Standards

This site targets **WCAG 2.1 Level AA** compliance:

- Full keyboard / tab navigation
- ARIA labels on all interactive elements
- Sufficient colour contrast (Charcoal/Gold pairing verified)
- Screen-reader-friendly form error states
- Dedicated `/accessibility` statement page

---

## Roadmap

| Phase | Milestone | Status |
|---|---|---|
| 0 | Documentation (README, Flow, Context, Guide) | Done |
| 1 | Project scaffold + design system | Done |
| 2 | Core 7 pages built | Done |
| 3 | Free AI Readiness assessment funnel | Done — live |
| 4 | Accessibility audit + QA | In Progress |
| 5 | Client login portal (Firebase Auth) | Done |
| 6 | Contact form Cloud Function | Built — not deployed (client-side write is live instead) |
| 7 | Stripe Checkout + webhook integration | Built — needs Stripe Dashboard config + deploy |
| 8 | Paid member portal (`/portal` protected route) | Gate enforced; unlocks once Stripe is live |

---

## Contact

For project inquiries: use the `/contact` form on the live site.
