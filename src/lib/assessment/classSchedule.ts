// ─────────────────────────────────────────────────────────────────
// The recurring class's date/time/join-link, stored in Firestore
// (config/classSchedule) instead of hardcoded in source — lets the site
// owner update it from /admin without a code change or redeploy.
//
// Read access: any signed-in user (the assessment funnel always requires
// sign-in before this is needed). Write access: admin only. See
// firestore.rules' isAdmin() and the "config/{docId}" match block.
//
// Falls back to src/config/assessment.ts's DEFAULT_CLASS_SCHEDULE if the
// Firestore document doesn't exist yet (e.g. before it's ever been saved
// from /admin).
// ─────────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import { DEFAULT_CLASS_SCHEDULE } from "../../config/assessment";
import type { ClassSchedule } from "./calendar";

const CONFIG_COLLECTION = "config";
const CLASS_SCHEDULE_DOC_ID = "classSchedule";

export async function fetchClassSchedule(db: Firestore): Promise<ClassSchedule> {
  // Never let a read failure (rules not yet deployed, offline, etc.) break
  // the assessment funnel's results screen — fall back to the hardcoded
  // default and let the site keep working with a stale-but-valid schedule.
  let data: Partial<ClassSchedule> = {};
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, CLASS_SCHEDULE_DOC_ID));
    data = snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error("fetchClassSchedule: falling back to DEFAULT_CLASS_SCHEDULE", err);
  }

  return {
    year: data.year ?? DEFAULT_CLASS_SCHEDULE.year,
    month: data.month ?? DEFAULT_CLASS_SCHEDULE.month,
    day: data.day ?? DEFAULT_CLASS_SCHEDULE.day,
    startHour: data.startHour ?? DEFAULT_CLASS_SCHEDULE.startHour,
    startMinute: data.startMinute ?? DEFAULT_CLASS_SCHEDULE.startMinute,
    endHour: data.endHour ?? DEFAULT_CLASS_SCHEDULE.endHour,
    endMinute: data.endMinute ?? DEFAULT_CLASS_SCHEDULE.endMinute,
    timezone: data.timezone ?? DEFAULT_CLASS_SCHEDULE.timezone,
    timezoneLabel: data.timezoneLabel ?? DEFAULT_CLASS_SCHEDULE.timezoneLabel,
    title: data.title ?? DEFAULT_CLASS_SCHEDULE.title,
    description: data.description ?? DEFAULT_CLASS_SCHEDULE.description,
    location: data.location ?? DEFAULT_CLASS_SCHEDULE.location,
    joinLink: data.joinLink ?? DEFAULT_CLASS_SCHEDULE.joinLink,
  };
}

/** Admin-only write (enforced by firestore.rules) — used by /admin's Class Schedule form. */
export async function saveClassSchedule(db: Firestore, schedule: ClassSchedule): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, CLASS_SCHEDULE_DOC_ID), {
    ...schedule,
    updatedAt: serverTimestamp(),
  });
}
