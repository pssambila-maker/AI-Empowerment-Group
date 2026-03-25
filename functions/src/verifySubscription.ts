import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialise Admin SDK once (shared across functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface VerifySubscriptionResponse {
  status: "active" | "inactive" | "pending" | "not_found";
  firstName: string;
}

/**
 * verifySubscription
 *
 * Called by the /success page immediately after a Stripe Checkout redirect.
 * Checks the authenticated user's Firestore profile for membershipStatus.
 *
 * Returns:
 *   status    — "active" | "inactive" | "pending" | "not_found"
 *   firstName — extracted from Firebase Auth displayName or Firestore profile
 *
 * The /success page retries up to 5 times (3s apart) if status is not yet
 * "active", to account for Stripe webhook processing delay.
 */
export const verifySubscription = functions.https.onCall(
  async (data, context): Promise<VerifySubscriptionResponse> => {

    // ── Auth guard ──
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to verify your subscription."
      );
    }

    const uid = context.auth.uid;

    // ── Fetch user profile from Firestore ──
    const userDoc = await db.collection("users").doc(uid).get();

    // ── Resolve first name ──
    // Priority: Firebase Auth displayName → Firestore firstName field → fallback
    let firstName = "there";

    try {
      const authUser = await admin.auth().getUser(uid);
      if (authUser.displayName) {
        firstName = authUser.displayName.split(" ")[0];
      }
    } catch {
      // Auth lookup failed — non-fatal, continue with fallback
    }

    if (!userDoc.exists) {
      // Document doesn't exist yet — webhook hasn't written it
      return { status: "pending", firstName };
    }

    const userData = userDoc.data()!;

    // Override firstName from Firestore if available and Auth name was empty
    if (firstName === "there" && userData.firstName) {
      firstName = userData.firstName;
    } else if (firstName === "there" && userData.displayName) {
      firstName = (userData.displayName as string).split(" ")[0];
    }

    const membershipStatus = userData.membershipStatus as string | undefined;

    switch (membershipStatus) {
      case "paid":
        return { status: "active", firstName };

      case "inactive":
        return { status: "inactive", firstName };

      case undefined:
      case null:
        // Document exists but webhook hasn't updated membershipStatus yet
        return { status: "pending", firstName };

      default:
        return { status: "not_found", firstName };
    }
  }
);
