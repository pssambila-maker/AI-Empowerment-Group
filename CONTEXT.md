# AI Empowerment Group — Project Context

**Last Updated:** 2026-03-25
**Project Phase:** Pre-build / Documentation

---

## 1. Who Is This For?

### The Consultant (Site Owner)

A high-end AI Strategy and Data Science Consultant with the following credentials:

- **Education:** Master's in Data Science; PhD journey in progress
- **Certification:** Cybersecurity 701 (CompTIA / equivalent)
- **Core Expertise:**
  - AI Strategy & LLM Training (teaching enterprise teams to work with AI)
  - Data Visualisation: Tableau Server, Tableau Desktop, Microsoft Power BI, Microsoft Fabric, Microsoft Foundry
  - Cyber Threat Hunting: security awareness, threat identification, protection frameworks

- **Teaching Philosophy:** Explain complex concepts at an 8th-grade reading level — approachable, jargon-free, results-focused.

### The Audience (Site Visitors)

| Persona | Description | Primary Goal |
|---|---|---|
| Enterprise Decision-Maker | C-suite / IT Director at a mid-large company | Wants AI strategy advice for their team |
| SMB Owner | Running a growing business, overwhelmed by AI options | Needs clear, simple guidance |
| Data Team Lead | Already technical, wants specialist Tableau/Power BI help | Looking for proof of expertise |
| Security-Conscious Client | Worried about cyber threats, needs awareness training | Wants trust and credentials |
| Returning Client | Has worked with consultant before | Wants portal access to reports/deliverables |

---

## 2. Brand & Design Context

### Design Philosophy

"Premium, Authoritative, Approachable." — Think high-end London tech consultancy. Clean, confident, not loud.

### Colour System

| Name | Hex | Role |
|---|---|---|
| Charcoal | `#2D2D2D` | Primary background, body text |
| Warm Gold | `#C9A84C` | Accents, CTA buttons, rule lines, hover states |
| Off-White | `#F5F5F0` | Section backgrounds, card surfaces |
| Mid-Grey | `#6B6B6B` | Secondary text, metadata |
| Error Red | `#CC3333` | Form errors, warnings |
| Success Green | `#2D7D32` | Form success states |

### Logo Colour Palette (extracted from confirmed asset)

The Neural Phoenix logo uses a **navy → cyan gradient** — separate from the site's Charcoal/Gold system. These colours appear in the logo only and should not be used for UI elements.

| Name | Approx Hex | Where |
|---|---|---|
| Logo Navy | `#1B2E6B` | Left wing, body, wordmark text |
| Logo Mid-Blue | `#1A6BBF` | Wing mid-point |
| Logo Cyan | `#00C8E8` | Right wing tips, terminal nodes |

**Background compatibility:** The logo was designed on white. On Charcoal backgrounds, the navy portions (`#1B2E6B`) will be low-contrast. **Use a white or light-coloured logo container, or obtain a white/transparent reversed version for dark backgrounds.** Do not apply CSS `invert` filters — it will break the gradient.

**Logo files needed:**
- `public/images/logo/neural-phoenix.png` — full logo (mark + wordmark), transparent background
- `public/images/logo/neural-phoenix-mark.png` — mark only, transparent background
- `public/images/logo/neural-phoenix-white.png` — reversed white version for dark backgrounds (request from designer)

### Typography

- **Headings:** Montserrat (700 weight) — commanding, modern
- **Body:** Inter (400/500) — clean, readable
- **Code/Data refs:** JetBrains Mono or similar monospace — signals technical depth

### Layout Pattern

- **Hero:** Split-column. Left: right-aligned text + vertical Warm Gold accent bar. Right: left-aligned text / image.
- **Cards:** Charcoal background with Gold border-left rule.
- **CTAs:** Warm Gold button, Charcoal text, subtle hover lift effect.

### Logo

- Name options: **"Neural Phoenix"** or **"Secure Spark"**
- Placement: Top-left nav + centered in hero section
- Status: Awaiting asset delivery from owner

---

## 3. Service Offerings Context

### AI Strategy & Training
- Teaching teams to use LLMs productively
- Prompt engineering workshops
- AI tool selection and governance frameworks
- Target: Enterprise HR, Operations, Marketing teams

### Data Visualisation
- Tableau Server & Desktop: dashboard builds, migrations, training
- Microsoft Power BI: report design, DAX, embedded analytics
- Microsoft Fabric: data pipeline and lakehouse setup
- Microsoft Foundry: enterprise data platform configuration
- Target: Data teams, analysts, BI managers

### Cyber Threat Hunting
- Security awareness training for non-technical staff
- Threat identification workshops
- Protection framework reviews
- Target: SMBs, teams handling sensitive data

---

## 4. Case Study Framework

Each case study follows this strict structure:

```
CHALLENGE:   What problem did the client face?
APPROACH:    What was the strategic/technical method used?
RESULT:      Measurable outcome (%, time saved, incidents prevented, etc.)
```

Example seed ideas:
- Migrating a legacy Tableau Server deployment to Tableau Cloud
- Building a Power BI executive dashboard from fragmented Excel data
- Running a phishing-awareness programme that reduced click-through rates by X%
- Training a marketing team to use LLMs, reducing content production time by Y%

---

## 5. Accessibility Context

The site must meet **WCAG 2.1 Level AA**. This is non-negotiable for a tech consultant — it signals professionalism and inclusivity.

Key requirements:
- All navigation usable by keyboard (Tab / Shift+Tab / Enter)
- ARIA roles and labels on nav, forms, modals
- Colour contrast ratio minimum 4.5:1 (Charcoal/Gold passes; verify)
- All images have descriptive `alt` text
- Forms have associated `<label>` elements and error announcements
- Dedicated `/accessibility` page in footer

---

## 6. Future Feature: Client Login Portal

**Phase 2 feature** — not in initial build but must be architecturally planned for.

**Purpose:** A paid-only, fully hidden messaging channel between the client and consultant. The portal does not exist — not even as a locked page — for users who have not paid.

**Pricing:** $750 per week, recurring weekly via Stripe subscription.

**Access rules:**
- `membershipStatus: "paid"` → Portal visible and accessible
- `membershipStatus: "inactive"` → Subscription lapsed page shown (reactivate prompt)
- No record / new user → Redirected to `/services` — portal route is invisible

**Portal feature (Phase 2):** Messaging channel only — direct text communication between client and consultant via Firestore real-time messages.

**Implementation Plan:**
- Auth: Firebase Authentication (Email/Password + Google OAuth)
- Payments: Stripe Checkout (weekly recurring subscription at $750/week)
- Webhook events handled: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- Protected routes: Astro middleware checks Firestore `membershipStatus` server-side
- Messaging: Firestore real-time collection `conversations/{uid}/messages`
- Database: Firestore for user profiles and message threads

**Impact on current build:**
- `/login` page placeholder should be built now (even if non-functional)
- Nav should include "Client Login" link from day one
- `/portal` route must be completely absent from nav/sitemap for non-paid users
- Route structure must reserve `/portal/*` namespace

---

## 7. Technical Constraints & Decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | Astro | Static output = fast, SEO-friendly; supports partial hydration for interactive components |
| CSS | Tailwind CSS | Design tokens map directly to brand system; no runtime overhead |
| Hosting | Firebase Hosting | Global CDN, preview channels, integrates with future Firebase Auth/Firestore |
| Forms | Firebase Cloud Functions | Server-side validation, no exposed API keys in client |
| Images | Astro Image component | Built-in optimization, WebP conversion, lazy loading |
| Analytics | Firebase Analytics | Already in ecosystem; free tier sufficient |

---

## 8. Content Status

| Section | Status |
|---|---|
| Hero headline | Defined: "Unleash the Strength of AI" |
| Bio copy | Awaiting owner input |
| Service descriptions | Seed content ready; needs owner review |
| Case studies | Needs 3–5 real or anonymised examples from owner |
| Testimonials | Awaiting quotes from owner |
| Logo assets | Awaiting file delivery |
| Contact form fields | Defined: Name, Email, Country, Inquiry Type, Message |
