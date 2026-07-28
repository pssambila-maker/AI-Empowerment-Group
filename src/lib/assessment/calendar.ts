// ─────────────────────────────────────────────────────────────────
// Free-class scheduling helpers — computes the next occurrence of the
// recurring class (see src/config/assessment.ts -> CLASS_SCHEDULE) and
// builds Google Calendar / .ics links for it.
// ─────────────────────────────────────────────────────────────────

import { CLASS_SCHEDULE } from "../../config/assessment";

export interface ClassOccurrence {
  start: Date;
  end: Date;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Returns the UTC ms offset added to an Eastern wall-clock time to get UTC (300 = EST, 240 = EDT). */
function getEasternUtcOffsetMinutes(year: number, month1to12: number, day: number): number {
  const dstStart = nthSundayUtc(year, 3, 2);  // 2nd Sunday in March
  const dstEnd = nthSundayUtc(year, 11, 1);   // 1st Sunday in November
  const current = Date.UTC(year, month1to12 - 1, day);
  const isDst = current >= dstStart && current < dstEnd;
  return isDst ? 240 : 300;
}

/** UTC ms timestamp (midnight) of the nth Sunday of the given month. */
function nthSundayUtc(year: number, month1to12: number, n: number): number {
  const first = new Date(Date.UTC(year, month1to12 - 1, 1));
  const daysUntilSunday = (7 - first.getUTCDay()) % 7;
  const day = 1 + daysUntilSunday + (n - 1) * 7;
  return Date.UTC(year, month1to12 - 1, day);
}

/** Reads the current date/time as seen in the configured class timezone. */
function getNowInClassTimezone(): { year: number; month: number; day: number; weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLASS_SCHEDULE.timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
  };
}

/** Computes the start/end (as UTC Date objects) of the next occurrence of the recurring class. */
export function getNextClassOccurrence(): ClassOccurrence {
  const now = getNowInClassTimezone();

  let daysUntil = (CLASS_SCHEDULE.dayOfWeek - now.weekday + 7) % 7;

  // If the class is today but has already started, jump to next week's session.
  if (daysUntil === 0) {
    const nowMinutes = now.hour * 60 + now.minute;
    const startMinutes = CLASS_SCHEDULE.startHour * 60 + CLASS_SCHEDULE.startMinute;
    if (nowMinutes >= startMinutes) {
      daysUntil = 7;
    }
  }

  const baseUtc = Date.UTC(now.year, now.month - 1, now.day) + daysUntil * 86_400_000;
  const target = new Date(baseUtc);
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const targetDay = target.getUTCDate();

  const offsetMinutes = getEasternUtcOffsetMinutes(targetYear, targetMonth, targetDay);

  const startUtcMs =
    Date.UTC(targetYear, targetMonth - 1, targetDay, CLASS_SCHEDULE.startHour, CLASS_SCHEDULE.startMinute) +
    offsetMinutes * 60_000;
  const endUtcMs =
    Date.UTC(targetYear, targetMonth - 1, targetDay, CLASS_SCHEDULE.endHour, CLASS_SCHEDULE.endMinute) +
    offsetMinutes * 60_000;

  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

/** e.g. "Saturday, June 14" — formatted in the class's timezone. */
export function formatClassDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLASS_SCHEDULE.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatHour(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const mm = minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`;
  return `${h12}${mm} ${ampm}`;
}

/** e.g. "9:00 AM - 11:00 AM ET" — built from CLASS_SCHEDULE, timezone-agnostic of "now". */
export function formatClassTimeLabel(): string {
  const start = formatHour(CLASS_SCHEDULE.startHour, CLASS_SCHEDULE.startMinute);
  const end = formatHour(CLASS_SCHEDULE.endHour, CLASS_SCHEDULE.endMinute);
  return `${start} - ${end} ${CLASS_SCHEDULE.timezoneLabel}`;
}

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Builds a "Add to Google Calendar" link for the given occurrence. */
export function buildGoogleCalendarUrl({ start, end }: ClassOccurrence): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: CLASS_SCHEDULE.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details: `${CLASS_SCHEDULE.description}\n\nJoin link: ${CLASS_SCHEDULE.joinLink}`,
    location: CLASS_SCHEDULE.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Builds a downloadable .ics file (string content) for the given occurrence. */
export function buildIcsContent({ start, end }: ClassOccurrence): string {
  const uid = `${start.getTime()}-ai-empowerment-group@aiempoweredgroup.com`;
  const dtstamp = toIcsUtc(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Empowerment Group//Assessment//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${CLASS_SCHEDULE.title}`,
    `DESCRIPTION:${CLASS_SCHEDULE.description}\\n\\nJoin link: ${CLASS_SCHEDULE.joinLink}`,
    `LOCATION:${CLASS_SCHEDULE.location}`,
    `URL:${CLASS_SCHEDULE.joinLink}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
