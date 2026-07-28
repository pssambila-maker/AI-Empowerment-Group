// ─────────────────────────────────────────────────────────────────
// Single source of truth for who can access /admin.
//
// IMPORTANT: this email is ALSO hardcoded in firestore.rules (Firestore
// rules can't import from TypeScript). If you ever change this, update
// both places — search firestore.rules for "isAdmin()".
// ─────────────────────────────────────────────────────────────────

export const ADMIN_EMAIL = "eus.java@gmail.com";
