import { describe, expect, it } from "vitest";
import { serializeCsv } from "@/lib/export-csv";

describe("CSV report export security", () => {
  it("exports column labels and cells in an Excel compatible UTF-8 CSV", () => {
    expect(serializeCsv([{ Cliente: "José", Total: 1200 }])).toBe(
      "\uFEFF\"Cliente\",\"Total\"\r\n\"José\",\"1200\""
    );
  });
  it("escapes quotes, commas and line breaks", () => {
    expect(serializeCsv([{ Cliente: 'Lu,"cía\nGómez' }])).toContain(
      '"Lu,""cía\nGómez"'
    );
  });
  it.each(["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\t=1+1", "  =HYPERLINK(A1)"])(
    "neutralizes spreadsheet formulas: %s",
    (payload) => {
      const output = serializeCsv([{ Cliente: payload }]);
      expect(output).toContain('"'+ "'" + payload.replace(/"/g, '""') + '"');
    }
  );
  it("handles an empty report", () => {
    expect(serializeCsv([])).toBe("\uFEFF");
  });
});
