import { describe, it, expect } from "vitest";
import {
  getNextClassOccurrence,
  formatClassDateLabel,
  formatClassTimeLabel,
  buildGoogleCalendarUrl,
  buildIcsContent,
  type ClassSchedule,
} from "./calendar";

// All of these functions are pure — the schedule is passed in as data
// (this used to be sourced from a hardcoded config constant; it's now
// fetched from Firestore in production so /admin can edit it without a
// redeploy — see classSchedule.ts — but that has zero bearing on these
// functions, which just take whatever schedule they're given).

const TEST_SCHEDULE: ClassSchedule = {
  year: 2026,
  month: 8,
  day: 16, // a Sunday
  startHour: 9,
  startMinute: 0,
  endHour: 11,
  endMinute: 0,
  timezone: "America/New_York",
  timezoneLabel: "ET",
  title: "Free AI Class — AI Empowerment Group",
  description: "Test description",
  location: "Zoom",
  joinLink: "https://zoom.us/test",
};

describe("getNextClassOccurrence", () => {
  it("converts the configured date/time to UTC (EDT, since August is within DST)", () => {
    const { start, end } = getNextClassOccurrence(TEST_SCHEDULE);
    // 2026-08-16, 9:00-11:00 AM EDT (UTC-4) == 13:00-15:00 UTC.
    expect(start.toISOString()).toBe("2026-08-16T13:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-16T15:00:00.000Z");
  });

  it("correctly uses EST (UTC-5) for a date outside DST", () => {
    const winterSchedule: ClassSchedule = { ...TEST_SCHEDULE, year: 2026, month: 3, day: 7 };
    const { start } = getNextClassOccurrence(winterSchedule);
    // 2026-03-07 is before that year's DST start (2nd Sunday of March = 2026-03-08).
    expect(start.toISOString()).toBe("2026-03-07T14:00:00.000Z");
  });

  it("depends only on the schedule passed in, not on the current date", () => {
    // No system-time mocking needed at all — that's the whole point of
    // this being a pure function over explicit data instead of "today".
    const resultA = getNextClassOccurrence(TEST_SCHEDULE);
    const resultB = getNextClassOccurrence(TEST_SCHEDULE);
    expect(resultA.start.toISOString()).toBe(resultB.start.toISOString());
  });
});

describe("formatClassDateLabel / formatClassTimeLabel", () => {
  it("formats a date as a full weekday + month + day", () => {
    // 2026-08-16T13:00:00Z is 9 AM EDT — a Sunday.
    expect(formatClassDateLabel(new Date("2026-08-16T13:00:00Z"), TEST_SCHEDULE)).toBe("Sunday, August 16");
  });

  it("formats the schedule's time window, omitting :00 minutes", () => {
    expect(formatClassTimeLabel(TEST_SCHEDULE)).toBe("9 AM - 11 AM ET");
  });

  it("includes minutes when they're non-zero", () => {
    const schedule: ClassSchedule = { ...TEST_SCHEDULE, startMinute: 30 };
    expect(formatClassTimeLabel(schedule)).toBe("9:30 AM - 11 AM ET");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("builds a calendar.google.com render URL with the occurrence's dates", () => {
    const url = buildGoogleCalendarUrl(
      { start: new Date("2026-07-04T13:00:00Z"), end: new Date("2026-07-04T15:00:00Z") },
      TEST_SCHEDULE,
    );
    expect(url).toContain("https://calendar.google.com/calendar/render?");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toMatch(/dates=20260704T130000Z%2F20260704T150000Z/);
  });
});

describe("buildIcsContent", () => {
  it("produces a well-formed VCALENDAR block with matching DTSTART/DTEND", () => {
    const ics = buildIcsContent(
      { start: new Date("2026-07-04T13:00:00Z"), end: new Date("2026-07-04T15:00:00Z") },
      TEST_SCHEDULE,
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("DTSTART:20260704T130000Z");
    expect(ics).toContain("DTEND:20260704T150000Z");
    expect(ics).toContain("aiempoweredgroup.com");
  });
});
