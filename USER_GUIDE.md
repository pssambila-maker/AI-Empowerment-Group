# AI Empowerment Group — User Guide

**Version:** 1.0
**Last Updated:** 2026-03-25
**Audience:** Site Owner / Content Manager

---

## Part 1: Navigating the Site (Visitor's Perspective)

### How the site is organised

The website has 7 main pages, all accessible from the top navigation bar:

| Page | What it does |
|---|---|
| **Home** | First impression — hero headline, services preview, call-to-action |
| **Bio** | Your credentials, journey, and authority as an expert |
| **Services** | Detailed breakdown of AI Strategy, Data Visualisation, and Cyber services |
| **Case Studies** | Real examples of your work in a Challenge → Approach → Result format |
| **Testimonials** | Quotes from clients and colleagues |
| **Contact** | Inquiry form for prospective clients |
| **Login** | *(Phase 2)* Existing client portal access |

The **Accessibility Statement** is linked in the footer (not the main nav).

### All "Schedule a Consultation" buttons go to the Contact page.

No matter where a visitor is on the site, every call-to-action button routes them to `/contact`. This is by design.

---

## Part 2: Using the Contact Form

Visitors fill in the following fields:

1. **Full Name** — required
2. **Email Address** — required, must be a valid format
3. **Country** — dropdown, required
4. **Nature of Inquiry** — dropdown selector, options include:
   - AI Strategy & Training
   - Data Visualisation
   - Cyber Threat Hunting
   - General Enquiry
5. **Message** — required, open text area

**Keyboard users:** Every field is reachable using the Tab key. No mouse required.

**After submitting:**
- If there are errors: the problem field is highlighted and a message explains what to fix.
- If successful: a green confirmation banner appears — "Thank you! We'll be in touch within 24 hours."

---

## Part 3: Managing Your Content (Owner Guide)

### Updating Bio / Services / Testimonials

Content is stored in Astro page files (`.astro`) or Markdown files (`.md`) inside the `src/pages/` or `src/content/` directories. To update text:

1. Open the relevant file (e.g., `src/pages/bio.astro`)
2. Find the text between the HTML tags
3. Edit and save
4. Re-deploy (see Part 4)

> No coding knowledge is required for text changes — the content sections are clearly marked with comments like `<!-- EDIT: Bio paragraph below -->`.

### Adding a New Case Study

Case studies live in `src/content/case-studies/`. To add one:

1. Duplicate an existing case study file (e.g., `tableau-migration.md`)
2. Rename it (e.g., `powerbi-dashboard.md`)
3. Fill in the three sections:

```markdown
---
title: "Your Case Study Title"
sector: "data"        # options: data | ai | cyber
icon: "chart"         # options: chart | shield | brain
---

## The Challenge
Describe the client's problem here.

## The Strategic Approach
Explain what you did and why.

## The Result
State the measurable outcome. Use numbers where possible.
```

4. Save and re-deploy.

### Adding a Testimonial

Testimonials live in `src/content/testimonials/`. To add one:

1. Duplicate an existing testimonial file
2. Fill in:

```markdown
---
name: "Client Name"
role: "Job Title"
company: "Company Name"
---

"The quote text goes here."
```

3. Save and re-deploy.

---

## Part 4: Deploying Updates

### First time setup (one-off)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Link to your project
firebase use --add
```

### Every time you make a change

```bash
# Build the site
npm run build

# Deploy to a preview URL first (for testing)
firebase hosting:channel:deploy preview

# If preview looks good, deploy to live site
firebase deploy --only hosting
```

### Where to find the preview URL

After running the preview deploy command, Firebase prints a URL like:
`https://aiempowermentgroup--preview-abc123.web.app`

Share this with anyone who needs to review changes before they go live.

---

## Part 5: Client Login Portal (Phase 2 — Not Yet Live)

### How access works

The portal is **completely hidden** from anyone who has not paid. There is no locked page, no "upgrade" wall — the route simply does not exist for non-paying users. They are redirected away from it automatically.

| User state | What they see |
|---|---|
| Paid + active subscription | Full portal with messaging channel |
| Subscription cancelled or payment failed | "Subscription lapsed" page with reactivate button |
| Not paid / new user | Redirected to /services — portal is invisible |

### Pricing

- **$750 per week**, billed automatically every 7 days via Stripe
- Client enters card details once on Stripe's secure page — you never see their card number
- Access is granted immediately after first payment
- If a weekly payment fails, Stripe retries and access is revoked if it cannot collect

### What the portal contains

**One feature: a direct messaging channel with you (the consultant).**

Clients type messages in the portal. You receive them and reply. All messages are stored securely in Firebase.

### As the site owner, you will be able to:
- Reply to client messages from a consultant-side admin view (or via Firebase Console initially)
- See which clients are active subscribers
- Cancel or pause a client's subscription from the Stripe Dashboard if needed

### As a client, they will be able to:
- Log in at `aiempowermentgroup.com/login`
- Use their email/password or Google account
- Send and receive messages with you directly in the portal

---

## Part 6: Accessibility — What This Means for You

The site is built to **WCAG 2.1 Level AA** standards. In plain terms:

- **Keyboard navigation:** Every part of the site works without a mouse
- **Screen readers:** All images have descriptions; all forms are labelled
- **Colour contrast:** Text is always readable against its background
- **Error messages:** If a form goes wrong, it tells you exactly what to fix

You do not need to do anything to maintain this — it is built into the site. However, **if you add new content** (images, links, form fields), make sure to:

- Add `alt="description"` to every image
- Add a `<label>` to every form field
- Do not use colour alone to convey meaning (e.g., don't just turn text red to show an error — also add a text message)

---

## Part 7: Getting Help

| Problem | Solution |
|---|---|
| Site looks broken after an edit | Run `npm run build` again and check for error messages in the terminal |
| Firebase deploy fails | Run `firebase login` to re-authenticate, then try again |
| Contact form stops working | Check Firebase Functions logs in the Firebase Console |
| Need to add a new page | Contact your developer — new pages require code changes |
| Forgot login credentials | Use the "Forgot Password" link on the `/login` page (Phase 2) |

---

## Appendix: Glossary

| Term | Meaning |
|---|---|
| Astro | The framework used to build the site — generates fast, static HTML pages |
| Firebase | Google's hosting and backend platform — where the site lives |
| Preview channel | A temporary test version of the site, separate from the live version |
| WCAG 2.1 | Web Content Accessibility Guidelines — international standard for accessible websites |
| Tailwind CSS | The styling system used — controls colours, spacing, fonts |
| Firestore | Firebase's database — used in Phase 2 for client portal data |
