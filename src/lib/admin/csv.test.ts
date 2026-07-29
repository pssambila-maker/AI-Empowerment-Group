import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

interface Row {
  name: string;
  score: number;
  note: string;
}

describe("toCsv", () => {
  it("produces a header row followed by one row per record", () => {
    const rows: Row[] = [
      { name: "Alice", score: 72, note: "ok" },
      { name: "Bob", score: 55, note: "fine" },
    ];
    const csv = toCsv(rows, [
      { key: "name", label: "Name" },
      { key: "score", label: "Score" },
      { key: "note", label: "Note" },
    ]);
    expect(csv).toBe("Name,Score,Note\r\nAlice,72,ok\r\nBob,55,fine");
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const rows: Row[] = [{ name: 'Smith, "Jane"', score: 1, note: "line1\nline2" }];
    const csv = toCsv(rows, [
      { key: "name", label: "Name" },
      { key: "score", label: "Score" },
      { key: "note", label: "Note" },
    ]);
    expect(csv).toBe('Name,Score,Note\r\n"Smith, ""Jane""",1,"line1\nline2"');
  });

  it("supports a format function, e.g. for dates", () => {
    const rows = [{ when: new Date("2026-08-16T13:00:00Z") }];
    const csv = toCsv(rows, [
      { key: "when", label: "When", format: (v) => (v as Date).toISOString() },
    ]);
    expect(csv).toBe("When\r\n2026-08-16T13:00:00.000Z");
  });

  it("renders null/undefined values as an empty field", () => {
    const rows = [{ name: "Alice", note: null as unknown as string }];
    const csv = toCsv(rows, [
      { key: "name", label: "Name" },
      { key: "note", label: "Note" },
    ]);
    expect(csv).toBe("Name,Note\r\nAlice,");
  });

  it("handles an empty row set (header only)", () => {
    const csv = toCsv<Row>([], [{ key: "name", label: "Name" }]);
    expect(csv).toBe("Name");
  });
});
