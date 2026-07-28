// ─────────────────────────────────────────────────────────────────
// Records a clean, dedicated entry for "who registered for the free
// class" — separate from `mail` (which is just the outgoing-email queue
// for the Trigger Email extension, not meant to be read as a report).
//
// To see who's registered: Firebase Console -> Firestore Database ->
// classRegistrations collection.
// ─────────────────────────────────────────────────────────────────

import { collection, addDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import type { AssessmentRole } from "../../config/assessment";

export interface ClassRegistration {
  uid: string;
  email: string;
  fullName: string;
  score: number;
  role: AssessmentRole;
  /** ISO string of the class occurrence this person registered for. */
  classDate: string;
}

export async function saveClassRegistration(db: Firestore, registration: ClassRegistration): Promise<void> {
  await addDoc(collection(db, "classRegistrations"), {
    ...registration,
    registeredAt: serverTimestamp(),
  });
}
