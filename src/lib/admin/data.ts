// ─────────────────────────────────────────────────────────────────
// Read-only queries for the /admin page. Firestore rules restrict all
// three of these to the one hardcoded admin email (see firestore.rules'
// isAdmin() and src/config/admin.ts) — any other signed-in user gets
// permission-denied, not empty results.
// ─────────────────────────────────────────────────────────────────

import { collection, query, orderBy, limit, getDocs, type Firestore } from "firebase/firestore";

const RECENT_LIMIT = 200;

export interface LeadRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  score: number;
  category: string;
  createdAt: Date | null;
}

export interface ClassRegistrationRow {
  id: string;
  fullName: string;
  email: string;
  score: number;
  role: string;
  classDate: string;
  registeredAt: Date | null;
}

export interface ContactSubmissionRow {
  id: string;
  name: string;
  email: string;
  country: string;
  inquiry: string;
  message: string;
  createdAt: Date | null;
}

export async function fetchLeads(db: Firestore): Promise<LeadRow[]> {
  const snap = await getDocs(query(collection(db, "leads"), orderBy("createdAt", "desc"), limit(RECENT_LIMIT)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      fullName: data.fullName ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      role: data.role ?? "",
      score: data.score ?? 0,
      category: data.category ?? "",
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
}

export async function fetchClassRegistrations(db: Firestore): Promise<ClassRegistrationRow[]> {
  const snap = await getDocs(
    query(collection(db, "classRegistrations"), orderBy("registeredAt", "desc"), limit(RECENT_LIMIT)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      fullName: data.fullName ?? "",
      email: data.email ?? "",
      score: data.score ?? 0,
      role: data.role ?? "",
      classDate: data.classDate ?? "",
      registeredAt: data.registeredAt?.toDate?.() ?? null,
    };
  });
}

export async function fetchContactSubmissions(db: Firestore): Promise<ContactSubmissionRow[]> {
  const snap = await getDocs(
    query(collection(db, "contactSubmissions"), orderBy("createdAt", "desc"), limit(RECENT_LIMIT)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name ?? "",
      email: data.email ?? "",
      country: data.country ?? "",
      inquiry: data.inquiry ?? "",
      message: data.message ?? "",
      createdAt: data.createdAt?.toDate?.() ?? null,
    };
  });
}
