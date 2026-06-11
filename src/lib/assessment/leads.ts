// ─────────────────────────────────────────────────────────────────
// Writes completed assessment results to the `leads` Firestore collection.
// Requires the user to be signed in (via email-link auth, see ./auth.ts) —
// see firestore.rules for the matching security rule.
// ─────────────────────────────────────────────────────────────────

import { collection, addDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import type { AssessmentRole, ScoreCategory } from "../../config/assessment";

export interface LeadRecord {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: AssessmentRole;
  score: number;
  category: ScoreCategory;
  checkedIndexes: number[];
  choiceAnswers: Record<number, number>;
}

export async function saveLead(db: Firestore, lead: LeadRecord): Promise<void> {
  await addDoc(collection(db, "leads"), {
    ...lead,
    createdAt: serverTimestamp(),
  });
}
