import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import Stripe from "stripe";
import { db } from "./firebase";
import { stripeSecretKey } from "./createCheckoutSession";

const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

/**
 * stripeWebhook
 *
 * Receives Stripe events, verifies the signature, and keeps
 * users/{uid}.membershipStatus in sync:
 *
 *   checkout.session.completed   → "paid"   (initial subscription)
 *   invoice.paid                 → "paid"   (renewal / reactivation)
 *   invoice.payment_failed       → "inactive"
 *   customer.subscription.deleted→ "inactive"
 *
 * Configure the endpoint in the Stripe Dashboard (Developers → Webhooks)
 * pointing at this function's URL with the four event types above.
 */
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const stripe = new Stripe(stripeSecretKey.value());
    const signature = req.headers["stripe-signature"];

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature as string,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      logger.warn("Webhook signature verification failed", err);
      res.status(400).send("Invalid signature");
      return;
    }

    // Map a Stripe customer ID back to the Firebase user that owns it
    async function uidForCustomer(customerId: string): Promise<string | null> {
      const snap = await db
        .collection("users")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();
      return snap.empty ? null : snap.docs[0].id;
    }

    async function setMembership(uid: string, status: "paid" | "inactive", extra: Record<string, unknown> = {}) {
      await db.collection("users").doc(uid).set(
        { membershipStatus: status, membershipUpdatedAt: new Date(), ...extra },
        { merge: true }
      );
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const uid = session.client_reference_id ?? session.metadata?.firebaseUID;
          if (!uid) {
            logger.error("checkout.session.completed without a Firebase UID", { sessionId: session.id });
            break;
          }
          await setMembership(uid, "paid", {
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
            stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          });
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          const uid = customerId ? await uidForCustomer(customerId) : null;
          if (uid) await setMembership(uid, "paid");
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          const uid = customerId ? await uidForCustomer(customerId) : null;
          if (uid) await setMembership(uid, "inactive");
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
          const uid = await uidForCustomer(customerId);
          if (uid) await setMembership(uid, "inactive");
          break;
        }

        default:
          // Unhandled event type — acknowledge so Stripe stops retrying
          break;
      }
    } catch (err) {
      logger.error("Webhook handler failed", { eventType: event.type }, err);
      // 500 so Stripe retries the event
      res.status(500).send("Handler error");
      return;
    }

    res.status(200).send("ok");
  }
);
