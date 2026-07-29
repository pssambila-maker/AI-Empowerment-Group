// ─────────────────────────────────────────────────────────────────
// Free-class scheduling helpers — computes the occurrence of the
// configured class and builds Google Calendar / .ics links for it.
//
// Pure functions: the schedule is passed in as data (see ClassSchedule
// below), not imported from a constant — the real schedule lives in
// Firestore (src/lib/assessment/classSchedule.ts), editable from /admin.
// ─────────────────────────────────────────────────────────────────

export interface ClassSchedule {
  year: number;
  month: number;
  day: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  /** IANA timezone used for offset calculation (handles EST/EDT). */
  timezone: string;
  timezoneLabel: string;
  title: string;
  description: string;
  location: string;
  joinLink: string;
}

export interface ClassOccurrence {
  start: Date;
  end: Date;
}

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

/**
 * Computes the start/end (as UTC Date objects) of the configured class date —
 * NOT computed from "today". `schedule` normally comes from Firestore (see
 * classSchedule.ts), letting this stay a pure, easily-tested function.
 */
export function getNextClassOccurrence(schedule: ClassSchedule): ClassOccurrence {
  const { year, month, day } = schedule;
  const offsetMinutes = getEasternUtcOffsetMinutes(year, month, day);

  const startUtcMs =
    Date.UTC(year, month - 1, day, schedule.startHour, schedule.startMinute) + offsetMinutes * 60_000;
  const endUtcMs =
    Date.UTC(year, month - 1, day, schedule.endHour, schedule.endMinute) + offsetMinutes * 60_000;

  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

/** e.g. "Saturday, June 14" — formatted in the class's timezone. */
export function formatClassDateLabel(date: Date, schedule: ClassSchedule): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: schedule.timezone,
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

/** e.g. "9:00 AM - 11:00 AM ET" — built from the schedule, timezone-agnostic of "now". */
export function formatClassTimeLabel(schedule: ClassSchedule): string {
  const start = formatHour(schedule.startHour, schedule.startMinute);
  const end = formatHour(schedule.endHour, schedule.endMinute);
  return `${start} - ${end} ${schedule.timezoneLabel}`;
}

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Builds a "Add to Google Calendar" link for the given occurrence. */
export function buildGoogleCalendarUrl({ start, end }: ClassOccurrence, schedule: ClassSchedule): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: schedule.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details: `${schedule.description}\n\nJoin link: ${schedule.joinLink}`,
    location: schedule.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Builds a downloadable .ics file (string content) for the given occurrence. */
export function buildIcsContent({ start, end }: ClassOccurrence, schedule: ClassSchedule): string {
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
    `SUMMARY:${schedule.title}`,
    `DESCRIPTION:${schedule.description}\\n\\nJoin link: ${schedule.joinLink}`,
    `LOCATION:${schedule.location}`,
    `URL:${schedule.joinLink}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
