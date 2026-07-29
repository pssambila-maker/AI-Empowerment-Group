// ─────────────────────────────────────────────────────────────────
// Triggers the "free class" invite email by writing to the `mail`
// Firestore collection. The Firebase "Trigger Email" extension
// (firestore-send-email) watches this collection and sends the
// message via your configured SMTP provider.
//
// Setup required in Firebase Console:
//   1. Install the "Trigger Email" extension, collection = `mail`
//   2. Configure SMTP (e.g. Gmail App Password)
// ─────────────────────────────────────────────────────────────────

import { collection, addDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import { getNextClassOccurrence, type ClassSchedule } from "./calendar";
import { buildClassInviteEmail } from "./emailTemplates";

export interface ClassInviteRequest {
  to: string;
  name: string;
  score: number;
  schedule: ClassSchedule;
}

export async function sendClassInviteEmail(db: Firestore, { to, name, score, schedule }: ClassInviteRequest): Promise<void> {
  const occurrence = getNextClassOccurrence(schedule);
  const { subject, text, html } = buildClassInviteEmail({ name, score, occurrence, schedule });

  await addDoc(collection(db, "mail"), {
    to: [to],
    message: { subject, text, html },
    createdAt: serverTimestamp(),
  });
}
