// ─────────────────────────────────────────────────────────────────
// Reads the paid-membership gate for the client portal.
// membershipStatus is only ever written by the Stripe webhook function
// (see STRIPE_INTEGRATION.md) — never trust a client-writable value here.
// ─────────────────────────────────────────────────────────────────

import { doc, getDoc, type Firestore } from "firebase/firestore";

export type MembershipStatus = "paid" | "inactive" | "none";

export async function getMembershipStatus(db: Firestore, uid: string): Promise<MembershipStatus> {
  const snap = await getDoc(doc(db, "users", uid));
  const status = snap.exists() ? (snap.data().membershipStatus as string | undefined) : undefined;

  if (status === "paid") return "paid";
  if (status === "inactive") return "inactive";
  return "none";
}
