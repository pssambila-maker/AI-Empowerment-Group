// ─────────────────────────────────────────────────────────────────
// Writes/updates the signed-in user's profile document on login.
// merge:true means existing fields (e.g. membershipStatus, which is
// only ever written by the Stripe webhook function) are never overwritten.
// ─────────────────────────────────────────────────────────────────

import { doc, setDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import type { User } from "firebase/auth";

export async function upsertUserProfile(db: Firestore, user: User): Promise<void> {
  await setDoc(
    doc(db, "users", user.uid),
    {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
}
