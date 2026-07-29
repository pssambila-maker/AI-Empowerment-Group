// ─────────────────────────────────────────────────────────────────
// Pure CSV serialization for the /admin page's "Download CSV" buttons.
// No Firestore/DOM dependency — just data in, CSV string out.
// ─────────────────────────────────────────────────────────────────

export interface CsvColumn<T> {
  key: keyof T;
  label: string;
  /** Optional transform, e.g. formatting a Date before stringifying. */
  format?: (value: T[keyof T], row: T) => string;
}

function escapeCsvField(value: string): string {
  // Quote any field containing a comma, quote, or newline; escape quotes by doubling them.
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = row[c.key];
        const value = c.format ? c.format(raw, row) : raw == null ? "" : String(raw);
        return escapeCsvField(value);
      })
      .join(","),
  );
  return [header, ...lines].join("\r\n");
}
