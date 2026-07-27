import * as admin from "firebase-admin";

// Initialise Admin SDK once (shared across functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export { admin };
