import { describe, it, expect } from "vitest";
import { buildClassInviteEmail } from "./emailTemplates";

const occurrence = {
  start: new Date("2026-07-04T13:00:00Z"),
  end: new Date("2026-07-04T15:00:00Z"),
};

describe("buildClassInviteEmail", () => {
  it("uses only the first name, even when given a full name", () => {
    const { text } = buildClassInviteEmail({ name: "Jane Doe", score: 72, occurrence });
    expect(text.startsWith("Hi Jane,")).toBe(true);
  });

  it("falls back to 'there' when no name is given", () => {
    const { text } = buildClassInviteEmail({ name: "", score: 50, occurrence });
    expect(text.startsWith("Hi there,")).toBe(true);
  });

  it("includes the score in both text and HTML bodies", () => {
    const { text, html } = buildClassInviteEmail({ name: "Sam", score: 88, occurrence });
    expect(text).toContain("88/100");
    expect(html).toContain("88/100");
  });

  it("HTML-escapes the name so it can't break out of the markup", () => {
    const { html } = buildClassInviteEmail({
      name: '<img src=x onerror=alert(1)> Evil',
      score: 10,
      occurrence,
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("does not escape the plain-text body (no HTML there to break)", () => {
    const { text } = buildClassInviteEmail({ name: "O'Brien", score: 60, occurrence });
    expect(text.startsWith("Hi O'Brien,")).toBe(true);
  });

  it("includes the configured join link in both bodies", () => {
    const { text, html } = buildClassInviteEmail({ name: "Sam", score: 60, occurrence });
    expect(text).toContain("zoom.us");
    expect(html).toContain("zoom.us");
  });
});
