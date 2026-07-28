import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getNextClassOccurrence,
  formatClassDateLabel,
  formatClassTimeLabel,
  buildGoogleCalendarUrl,
  buildIcsContent,
} from "./calendar";

// CLASS_SCHEDULE.nextClassDate (src/config/assessment.ts) is a fixed,
// manually-set date (currently 2026-08-16) — deliberately NOT computed from
// "today". If you change that config value, update the expected UTC
// timestamps below to match.

function mockNow(isoUtc: string) {
  vi.setSystemTime(new Date(isoUtc));
}

describe("getNextClassOccurrence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the fixed configured date converted to UTC (EDT, since August is within DST)", () => {
    mockNow("2026-07-28T12:00:00Z");
    const { start, end } = getNextClassOccurrence();
    // 2026-08-16, 9:00-11:00 AM EDT (UTC-4) == 13:00-15:00 UTC.
    expect(start.toISOString()).toBe("2026-08-16T13:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-16T15:00:00.000Z");
  });

  it("does not change based on the current date — this is the whole point of not auto-generating it", () => {
    mockNow("2026-01-01T00:00:00Z");
    const resultA = getNextClassOccurrence();
    mockNow("2026-12-31T23:59:00Z");
    const resultB = getNextClassOccurrence();
    expect(resultA.start.toISOString()).toBe(resultB.start.toISOString());
    expect(resultA.start.toISOString()).toBe("2026-08-16T13:00:00.000Z");
  });
});

describe("formatClassDateLabel / formatClassTimeLabel", () => {
  it("formats a date as a full weekday + month + day", () => {
    // 2026-08-16T13:00:00Z is 9 AM EDT — a Sunday.
    expect(formatClassDateLabel(new Date("2026-08-16T13:00:00Z"))).toBe("Sunday, August 16");
  });

  it("formats the fixed class time window, omitting :00 minutes", () => {
    expect(formatClassTimeLabel()).toBe("9 AM - 11 AM ET");
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("builds a calendar.google.com render URL with the occurrence's dates", () => {
    const url = buildGoogleCalendarUrl({
      start: new Date("2026-07-04T13:00:00Z"),
      end: new Date("2026-07-04T15:00:00Z"),
    });
    expect(url).toContain("https://calendar.google.com/calendar/render?");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toMatch(/dates=20260704T130000Z%2F20260704T150000Z/);
  });
});

describe("buildIcsContent", () => {
  it("produces a well-formed VCALENDAR block with matching DTSTART/DTEND", () => {
    const ics = buildIcsContent({
      start: new Date("2026-07-04T13:00:00Z"),
      end: new Date("2026-07-04T15:00:00Z"),
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("DTSTART:20260704T130000Z");
    expect(ics).toContain("DTEND:20260704T150000Z");
    expect(ics).toContain("aiempoweredgroup.com");
  });
});
