# AI Empowerment Group — Stripe Payments Integration

**Version:** 1.0
**Last Updated:** 2026-03-25
**Scope:** Stripe Checkout + Firebase webhook for training/service purchases

---

## The Golden Rule of Payments

> **Your website never touches a credit card number. Ever.**

Stripe hosts the payment page. Your site only creates a checkout session and receives a confirmation. This protects you and your clients — and keeps you PCI-DSS compliant by default.

---

## How It Works (Plain English)

```
1. User clicks "Buy Training" on your site
2. Your Firebase Function creates a Stripe Checkout Session
3. User is redirected to Stripe's secure, hosted payment page
4. User enters card details directly on Stripe's servers (not yours)
5. Payment succeeds → Stripe fires a webhook event to your Firebase Function
6. Your Firebase Function verifies the webhook signature (security check)
7. Firestore is updated: user profile → membershipStatus: "paid"
8. User is redirected to /portal (now unlocked)
```

---

## Architecture Overview

```
Browser (Astro)
    │
    │  POST /create-checkout-session
    ▼
Firebase Function: createCheckoutSession
    │
    │  Stripe API call
    ▼
Stripe Checkout (Stripe-hosted page)
    │
    │  Payment complete → webhook POST
    ▼
Firebase Function: stripeWebhook
    │
    │  Verify signature → update Firestore
    ▼
Firestore: users/{uid} → { membershipStatus: "paid" }
    │
    │  User redirected
    ▼
/portal (protected route — unlocked for paid members)
```

---

## Products / Pricing Structure

| Product | Type | Price | Billing | Stripe Price ID |
|---|---|---|---|---|
| AI Empowerment Training | Recurring subscription | $750 | Weekly | `price_XXXXXX` |

> **How it works:** Clients pay $750 on signup. Stripe automatically charges the same card every 7 days. They retain portal access (messaging channel) as long as the subscription is active. If they cancel or a payment fails, Firestore is updated and portal access is revoked.

> Fill in the Stripe Price ID after creating the product in the Stripe Dashboard. Set billing interval to **Weekly** when creating the price.

---

## File Structure (Additions to Project)

```
ai-empowerment-group/
├── functions/                        # Firebase Cloud Functions
│   ├── src/
│   │   ├── createCheckoutSession.ts  # Creates Stripe session → returns URL
│   │   └── stripeWebhook.ts          # Receives Stripe events → updates Firestore
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── pages/
│   │   ├── payment-success.astro     # Shown after successful payment
│   │   └── payment-cancelled.astro   # Shown if user cancels on Stripe page
│   └── components/
│       └── BuyButton.astro           # Reusable "Buy Training" button component
└── .env                              # Stripe keys (NEVER commit this file)
```

---

## Environment Variables

Store these in `.env` (local) and Firebase Functions config (production). **Never hardcode keys.**

```bash
# .env (local development only — add to .gitignore)
STRIPE_SECRET_KEY=sk_test_...          # From Stripe Dashboard → Developers → API Keys
STRIPE_WEBHOOK_SECRET=whsec_...        # From Stripe Dashboard → Webhooks → Signing secret
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Safe to expose in frontend

# Firebase Functions environment (production)
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

---

## Firebase Function: createCheckoutSession

**Trigger:** HTTPS callable (from browser)
**What it does:** Creates a Stripe Checkout Session and returns the redirect URL

```typescript
// functions/src/createCheckoutSession.ts

import * as functions from "firebase-functions";
import Stripe from "stripe";

const stripe = new Stripe(functions.config().stripe.secret_key);

export const createCheckoutSession = functions.https.onCall(
  async (data, context) => {
    // Require the user to be logged in
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to purchase."
      );
    }

    const { priceId } = data; // e.g. "price_XXXXXX"

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",              // Weekly recurring billing
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://aiempowermentgroup.com/payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://aiempowermentgroup.com/payment-cancelled",
      subscription_data: {
        metadata: {
          firebaseUID: context.auth.uid, // Link subscription back to Firebase user
        },
      },
      metadata: {
        firebaseUID: context.auth.uid,
      },
    });

    return { url: session.url };
  }
);
```

---

## Firebase Function: stripeWebhook

**Trigger:** HTTPS request (from Stripe — not the browser)
**What it does:** Receives payment confirmation, verifies it's real, upgrades user in Firestore

```typescript
// functions/src/stripeWebhook.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(functions.config().stripe.secret_key);
const db = admin.firestore();

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = functions.config().stripe.webhook_secret;

  let event: Stripe.Event;

  // CRITICAL: Always verify the webhook signature
  // This proves the request genuinely came from Stripe, not an attacker
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).send("Webhook Error: Invalid signature");
    return;
  }

  // Subscription activated — first payment succeeded
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const firebaseUID = session.metadata?.firebaseUID;

    if (firebaseUID) {
      await db.collection("users").doc(firebaseUID).update({
        membershipStatus: "paid",
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        accessRevokedAt: null,
      });
      console.log(`User ${firebaseUID} subscribed — portal access granted.`);
    }
  }

  // Subscription renewed — weekly charge succeeded
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const firebaseUID = subscription.metadata?.firebaseUID;

    if (firebaseUID) {
      await db.collection("users").doc(firebaseUID).update({
        membershipStatus: "paid",
        lastRenewedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Payment failed or subscription cancelled — revoke portal access
  if (
    event.type === "invoice.payment_failed" ||
    event.type === "customer.subscription.deleted"
  ) {
    const obj = event.data.object as Stripe.Invoice | Stripe.Subscription;
    const subscriptionId =
      "subscription" in obj ? obj.subscription as string : obj.id;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const firebaseUID = subscription.metadata?.firebaseUID;

    if (firebaseUID) {
      await db.collection("users").doc(firebaseUID).update({
        membershipStatus: "inactive",
        accessRevokedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`User ${firebaseUID} — portal access revoked.`);
    }
  }

  res.status(200).send("OK");
});
```

---

## Frontend: BuyButton Component

```astro
---
// src/components/BuyButton.astro
export interface Props {
  priceId: string;
  label?: string;
}
const { priceId, label = "Buy Training" } = Astro.props;
---

<button
  class="bg-gold text-charcoal font-semibold px-6 py-3 rounded hover:brightness-110 transition"
  data-price-id={priceId}
  id="buy-btn"
  aria-label={label}
>
  {label}
</button>

<script>
  import { getFunctions, httpsCallable } from "firebase/functions";

  const btn = document.getElementById("buy-btn");
  btn?.addEventListener("click", async () => {
    const priceId = btn.dataset.priceId;
    const functions = getFunctions();
    const createSession = httpsCallable(functions, "createCheckoutSession");

    btn.textContent = "Redirecting to payment...";
    btn.setAttribute("disabled", "true");

    try {
      const result = await createSession({ priceId });
      const { url } = result.data as { url: string };
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (err) {
      btn.textContent = "Error — please try again";
      btn.removeAttribute("disabled");
    }
  });
</script>
```

---

## Stripe Dashboard Setup (One-time)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Create your products under **Products → Add Product**
3. For each product, copy the **Price ID** (starts with `price_`)
4. Go to **Developers → Webhooks → Add Endpoint**
5. Set the endpoint URL to: `https://us-central1-YOUR_PROJECT.cloudfunctions.net/stripeWebhook`
6. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
7. Copy the **Signing Secret** (`whsec_...`) — this goes into your Firebase config

---

## Testing Payments (Before Going Live)

Use Stripe's test mode — no real money moves.

**Test card numbers:**

| Scenario | Card Number | Expiry | CVC |
|---|---|---|---|
| Payment succeeds | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| Payment declined | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| 3D Secure required | `4000 0025 0000 3155` | Any future date | Any 3 digits |

**Test the webhook locally:**

```bash
# Install Stripe CLI
stripe login

# Forward Stripe webhooks to your local Firebase emulator
stripe listen --forward-to localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook
```

---

## Security Checklist

- [ ] Stripe Secret Key is in Firebase Functions config — never in frontend code
- [ ] Webhook signature is verified on every incoming webhook request
- [ ] Firebase UID is passed as metadata, never trusted from client alone
- [ ] `.env` file is in `.gitignore`
- [ ] Switch from `sk_test_` to `sk_live_` keys only after full testing
- [ ] Firestore rules prevent users from writing their own `membershipStatus`

---

## Firestore Security Rule (Important)

Prevent users from self-granting paid access by locking down the `membershipStatus` field:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own profile
      allow read: if request.auth.uid == userId;

      // Users can write their own profile BUT cannot set membershipStatus
      // Only the Firebase Function (admin SDK) can write membershipStatus
      allow write: if request.auth.uid == userId
        && !("membershipStatus" in request.resource.data);
    }
  }
}
```

---

## Roadmap for Payments

| Step | Task | Status |
|---|---|---|
| 1 | Create products in Stripe Dashboard | Pending |
| 2 | Add Stripe SDK to Firebase Functions | Pending |
| 3 | Build `createCheckoutSession` function | Pending |
| 4 | Build `stripeWebhook` function | Pending |
| 5 | Build `BuyButton` component | Pending |
| 6 | Build `/payment-success` and `/payment-cancelled` pages | Pending |
| 7 | Configure Firestore security rules | Pending |
| 8 | Test with Stripe test cards | Pending |
| 9 | Register webhook in Stripe Dashboard | Pending |
| 10 | Switch to live keys + final QA | Pending |
