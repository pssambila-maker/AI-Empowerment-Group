import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin, db } from "./firebase";

const ALLOWED_INQUIRIES = ["ai-strategy", "data-viz", "cyber", "general"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactFormData {
  name?: unknown;
  email?: unknown;
  country?: unknown;
  inquiry?: unknown;
  message?: unknown;
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `Missing required field: ${field}.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpsError("invalid-argument", `Field ${field} is too long.`);
  }
  return trimmed;
}

/**
 * submitContactFormFn
 *
 * Server-side alternative to src/lib/contact/submit.ts's client-side write —
 * NOT currently deployed or called by /contact (see README.md). Named
 * distinctly from that client-side function to avoid the two being confused
 * for one another during troubleshooting.
 *
 * Would be called by the public /contact page (no auth required). Validates
 * the enquiry server-side and stores it in the `contactSubmissions`
 * collection, which is only readable/writable via the Admin SDK (locked
 * down in firestore.rules).
 *
 * Notification emails can be layered on top with the "Trigger Email"
 * Firebase Extension watching this collection, without changing this code.
 */
export const submitContactFormFn = onCall(async (request) => {
  const data = (request.data ?? {}) as ContactFormData;

  const name = requireString(data.name, "name", 200);
  const email = requireString(data.email, "email", 320);
  const country = requireString(data.country, "country", 100);
  const inquiry = requireString(data.inquiry, "inquiry", 50);
  const message = requireString(data.message, "message", 5000);

  if (!EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "Please provide a valid email address.");
  }
  if (!ALLOWED_INQUIRIES.includes(inquiry)) {
    throw new HttpsError("invalid-argument", "Unknown inquiry type.");
  }
  if (message.length < 10) {
    throw new HttpsError("invalid-argument", "Message must be at least 10 characters.");
  }

  await db.collection("contactSubmissions").add({
    name,
    email,
    country,
    inquiry,
    message,
    status: "new",
    uid: request.auth?.uid ?? null,
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});
