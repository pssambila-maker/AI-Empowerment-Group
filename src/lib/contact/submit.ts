// ─────────────────────────────────────────────────────────────────
// Contact form submission — writes to the `contactSubmissions`
// Firestore collection. No auth step: visitors are anonymous strangers,
// and the write is protected by strict schema validation in
// firestore.rules rather than by requiring a signed-in identity.
// ─────────────────────────────────────────────────────────────────

import { collection, addDoc, serverTimestamp, type Firestore } from "firebase/firestore";

export interface ContactSubmission {
  name: string;
  email: string;
  country: string;
  inquiry: string;
  message: string;
}

export async function submitContactForm(db: Firestore, submission: ContactSubmission): Promise<void> {
  await addDoc(collection(db, "contactSubmissions"), {
    ...submission,
    createdAt: serverTimestamp(),
  });
}
