// ─────────────────────────────────────────────────────────────────
// Email-link (passwordless) sign-in for the assessment flow.
//
// Requires "Email link (passwordless sign-in)" to be enabled in
// Firebase Console -> Authentication -> Sign-in method.
// ─────────────────────────────────────────────────────────────────

import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import type { AssessmentRole } from "../../config/assessment";

const STORAGE_EMAIL_KEY = "assessment.emailForSignIn";
const STORAGE_ROLE_KEY = "assessment.role";

/** Sends the sign-in link and remembers the email/role for when the user returns. */
export async function requestEmailLink(auth: Auth, email: string, role: AssessmentRole): Promise<void> {
  const url = new URL(window.location.href);
  url.searchParams.set("role", role);

  await sendSignInLinkToEmail(auth, email, {
    url: url.toString(),
    handleCodeInApp: true,
  });

  window.localStorage.setItem(STORAGE_EMAIL_KEY, email);
  window.localStorage.setItem(STORAGE_ROLE_KEY, role);
}

/** True if the current URL is a Firebase email sign-in link. */
export function isEmailLinkUrl(auth: Auth): boolean {
  return isSignInWithEmailLink(auth, window.location.href);
}

export interface CompletedSignIn {
  credential: UserCredential;
  email: string;
  role: AssessmentRole;
}

/**
 * Completes sign-in using the link in the current URL.
 * Returns null if the stored email is missing (e.g. link opened on a different device);
 * the caller should then prompt the user to re-enter their email.
 */
export async function completeEmailLinkSignIn(auth: Auth, fallbackEmail?: string): Promise<CompletedSignIn | null> {
  const storedEmail = window.localStorage.getItem(STORAGE_EMAIL_KEY);
  const email = storedEmail ?? fallbackEmail;

  if (!email) {
    return null;
  }

  const credential = await signInWithEmailLink(auth, email, window.location.href);

  const role = (window.localStorage.getItem(STORAGE_ROLE_KEY) as AssessmentRole | null) ?? "individual";

  window.localStorage.removeItem(STORAGE_EMAIL_KEY);
  window.localStorage.removeItem(STORAGE_ROLE_KEY);

  // Clean the sign-in params out of the URL without reloading the page.
  const cleanUrl = new URL(window.location.href);
  ["apiKey", "oobCode", "mode", "lang", "continueUrl"].forEach((p) => cleanUrl.searchParams.delete(p));
  window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);

  return { credential, email, role };
}
