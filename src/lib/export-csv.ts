/**
 * Export reports to CSV without spreadsheet parsing dependencies.
 * Neutralizes formula injection in spreadsheet applications.
 */
export function serializeCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "\uFEFF";
  const columns = Object.keys(rows[0]);
  const escapeCell = (value: unknown): string => {
    let text = value == null ? "" : String(value);
    if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return "\uFEFF" + [columns.map(escapeCell).join(","), ...rows.map(row =>
    columns.map(column => escapeCell(row[column])).join(",")
  )].join("\r\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  const blob = new Blob([serializeCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
