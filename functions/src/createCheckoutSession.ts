import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import Stripe from "stripe";
import { db } from "./firebase";

export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripePriceId = defineString("STRIPE_PRICE_ID");
const siteUrl = defineString("SITE_URL", {
  default: "https://aiempowermentgroup.com",
});

/**
 * createCheckoutSession
 *
 * Called by the /portal page when an authenticated user clicks
 * "Start Subscription" / "Reactivate". Creates a Stripe Checkout Session
 * for the weekly training subscription and returns its hosted URL.
 *
 * The Firebase UID travels with the session (client_reference_id and
 * metadata) so the webhook can map the payment back to the right user.
 */
export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to start a subscription."
      );
    }

    const uid = request.auth.uid;
    const stripe = new Stripe(stripeSecretKey.value());

    // Reuse the Stripe customer if this user already has one
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    let customerId = userSnap.data()?.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: request.auth.token.email ?? undefined,
        metadata: { firebaseUID: uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePriceId.value(), quantity: 1 }],
      client_reference_id: uid,
      metadata: { firebaseUID: uid },
      success_url: `${siteUrl.value()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl.value()}/payment-cancelled`,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Stripe did not return a checkout URL.");
    }

    return { url: session.url };
  }
);
