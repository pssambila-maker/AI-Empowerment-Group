# AI Empowerment Group — Professional Consultancy Website

**Live Domain:** aiempowermentgroup.com
**Stack:** Astro · Tailwind CSS · Firebase Hosting
**Status:** Pre-build / Planning Phase

---

## Overview

A premium, multi-page consultancy website for an AI Strategy, Data Science, and Cybersecurity professional. The site is designed to communicate authority, approachability, and technical depth — targeting enterprise teams, SMBs, and individual clients seeking AI transformation services.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | [Astro](https://astro.build) | Static-first, fast, SEO-friendly |
| Styling | [Tailwind CSS](https://tailwindcss.com) | Utility-first, easy design system tokens |
| Hosting | [Firebase Hosting](https://firebase.google.com/docs/hosting) | Global CDN, preview channels, fast deploys |
| Auth (Future) | Firebase Authentication | Google/Email login for client portal |
| Payments | Stripe Checkout + Firebase Functions | Hosted payment page, webhook-driven member upgrade |
| Forms | Astro + Firebase Functions | Contact form with server-side validation |
| Database | Firestore | User profiles, membership status, client portal data |
| Analytics | Firebase Analytics | Page views, CTA tracking |

---

## Brand Design System

| Token | Value | Usage |
|---|---|---|
| `color-charcoal` | `#2D2D2D` | Backgrounds, body text |
| `color-gold` | `#C9A84C` | Accents, CTA buttons, borders |
| `font-primary` | Inter / Montserrat | Headings and body |
| `layout` | Split-column hero | Left: right-aligned + gold bars; Right: left-aligned text |

---

## Site Structure (7 Pages)

```
/                        → Homepage (Hero, Services preview, CTA)
/bio                     → The Expert (Authority page)
/services                → Service offerings (AI, Data Viz, Cyber)
/case-studies            → Challenge → Approach → Result cards
/testimonials            → Client & colleague quotes grid
/contact                 → Accessible tab-navigable inquiry form
/login                   → Client portal login (Phase 2)
/payment-success         → Post-purchase confirmation page
/payment-cancelled       → User cancelled checkout page
/portal                  → Protected client portal (paid members only)
/accessibility           → WCAG 2.1 statement (footer link)
```

---

## Project Structure (Post-Scaffold)

```
ai-empowerment-group/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── HeroSplit.astro
│   │   ├── ServiceCard.astro
│   │   ├── CaseStudyCard.astro
│   │   └── TestimonialGrid.astro
│   ├── layouts/
│   │   └── Layout.astro  # Base layout with nav/footer
│   ├── pages/
│   │   ├── index.astro
│   │   ├── bio.astro
│   │   ├── services.astro
│   │   ├── case-studies.astro
│   │   ├── testimonials.astro
│   │   ├── contact.astro
│   │   ├── login.astro
│   │   └── accessibility.astro
│   └── styles/
│       └── global.css
├── public/
│   ├── images/
│   │   └── logo/         # Neural Phoenix / Secure Spark assets
│   └── favicon.ico
├── firebase.json
├── .firebaserc
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project linked to `aiempowermentgroup.com`

### Installation

```bash
# Clone / initialize the project
npm create astro@latest ai-empowerment-group

# Navigate into project
cd ai-empowerment-group

# Install dependencies
npm install

# Add Tailwind integration
npx astro add tailwind

# Run dev server
npm run dev
```

### Firebase Setup

```bash
# Login to Firebase
firebase login

# Initialize hosting in project root
firebase init hosting

# Run a preview deploy
firebase hosting:channel:deploy preview

# Deploy to production
firebase deploy --only hosting
```

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
| 0 | Documentation (README, Flow, Context, Guide) | In Progress |
| 1 | Project scaffold + design system | Pending |
| 2 | Core 7 pages built | Pending |
| 3 | Accessibility audit + QA | Pending |
| 4 | Firebase deploy + preview channel | Pending |
| 5 | Client login portal (Firebase Auth) | Future |
| 6 | Stripe Checkout + webhook integration | Future |
| 7 | Paid member portal (/portal protected route) | Future |

---

## Contact

For project inquiries: use the `/contact` form on the live site.
