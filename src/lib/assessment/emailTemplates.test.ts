import { describe, it, expect } from "vitest";
import { buildClassInviteEmail } from "./emailTemplates";
import type { ClassSchedule } from "./calendar";

const occurrence = {
  start: new Date("2026-07-04T13:00:00Z"),
  end: new Date("2026-07-04T15:00:00Z"),
};

const schedule: ClassSchedule = {
  year: 2026,
  month: 7,
  day: 4,
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

describe("buildClassInviteEmail", () => {
  it("uses only the first name, even when given a full name", () => {
    const { text } = buildClassInviteEmail({ name: "Jane Doe", score: 72, occurrence, schedule });
    expect(text.startsWith("Hi Jane,")).toBe(true);
  });

  it("falls back to 'there' when no name is given", () => {
    const { text } = buildClassInviteEmail({ name: "", score: 50, occurrence, schedule });
    expect(text.startsWith("Hi there,")).toBe(true);
  });

  it("includes the score in both text and HTML bodies", () => {
    const { text, html } = buildClassInviteEmail({ name: "Sam", score: 88, occurrence, schedule });
    expect(text).toContain("88/100");
    expect(html).toContain("88/100");
  });

  it("HTML-escapes the name so it can't break out of the markup", () => {
    const { html } = buildClassInviteEmail({
      name: '<img src=x onerror=alert(1)> Evil',
      score: 10,
      occurrence,
      schedule,
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("does not escape the plain-text body (no HTML there to break)", () => {
    const { text } = buildClassInviteEmail({ name: "O'Brien", score: 60, occurrence, schedule });
    expect(text.startsWith("Hi O'Brien,")).toBe(true);
  });

  it("includes the schedule's join link in both bodies", () => {
    const { text, html } = buildClassInviteEmail({ name: "Sam", score: 60, occurrence, schedule });
    expect(text).toContain("zoom.us");
    expect(html).toContain("zoom.us");
  });

  it("reflects a different join link when the schedule provides one", () => {
    const customSchedule: ClassSchedule = { ...schedule, joinLink: "https://zoom.us/s/different-link" };
    const { text } = buildClassInviteEmail({ name: "Sam", score: 60, occurrence, schedule: customSchedule });
    expect(text).toContain("https://zoom.us/s/different-link");
  });
});
