import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getNextClassOccurrence,
  formatClassDateLabel,
  formatClassTimeLabel,
  buildGoogleCalendarUrl,
  buildIcsContent,
} from "./calendar";

// CLASS_SCHEDULE (src/config/assessment.ts) is Saturday 9:00-11:00 AM
// America/New_York. These tests pin "now" to specific real dates that are
// known to fall on either side of the US DST transition, since that's the
// one part of this logic that's genuinely easy to get wrong.

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

  it("finds the upcoming Saturday from a weekday, during EST (winter, UTC-5)", () => {
    // Monday 2026-03-02 — before that year's DST start (2nd Sunday of March = 2026-03-08).
    mockNow("2026-03-02T15:00:00Z");
    const { start, end } = getNextClassOccurrence();
    // Expect Saturday 2026-03-07, 9:00 AM EST == 14:00 UTC.
    expect(start.toISOString()).toBe("2026-03-07T14:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-07T16:00:00.000Z");
  });

  it("finds the upcoming Saturday from a weekday, during EDT (summer, UTC-4)", () => {
    // Wednesday 2026-07-01 — clearly within DST.
    mockNow("2026-07-01T15:00:00Z");
    const { start } = getNextClassOccurrence();
    // Expect Saturday 2026-07-04, 9:00 AM EDT == 13:00 UTC.
    expect(start.toISOString()).toBe("2026-07-04T13:00:00.000Z");
  });

  it("stays on the same Saturday if it's Saturday and class hasn't started yet", () => {
    // Saturday 2026-07-04, 08:00 EDT == 12:00 UTC (one hour before the 9 AM start).
    mockNow("2026-07-04T12:00:00Z");
    const { start } = getNextClassOccurrence();
    expect(start.toISOString()).toBe("2026-07-04T13:00:00.000Z");
  });

  it("rolls over to next Saturday if it's Saturday and class has already started", () => {
    // Saturday 2026-07-04, 10:00 EDT == 14:00 UTC (an hour after the 9 AM start).
    mockNow("2026-07-04T14:00:00Z");
    const { start } = getNextClassOccurrence();
    expect(start.toISOString()).toBe("2026-07-11T13:00:00.000Z");
  });
});

describe("formatClassDateLabel / formatClassTimeLabel", () => {
  it("formats a date as a full weekday + month + day", () => {
    // 2026-07-04T13:00:00Z is 9 AM EDT on a Saturday.
    expect(formatClassDateLabel(new Date("2026-07-04T13:00:00Z"))).toBe("Saturday, July 4");
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
