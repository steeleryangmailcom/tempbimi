import fs from "fs";
import { parse } from "csv-parse/sync";
import { ContactInput } from "./types";

/**
 * Parse a CSV file with columns: name, company
 * Supports headers or headerless (auto-detected).
 */
export function parseCsvFile(filePath: string): ContactInput[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const records: string[][] = parse(raw, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (records.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Check if first row is a header
  const firstRow = records[0].map((s) => s.toLowerCase());
  const hasHeader =
    firstRow.includes("name") && firstRow.includes("company");

  const dataRows = hasHeader ? records.slice(1) : records;

  let nameIdx = 0;
  let companyIdx = 1;

  if (hasHeader) {
    nameIdx = firstRow.indexOf("name");
    companyIdx = firstRow.indexOf("company");
  }

  return dataRows
    .filter((row) => row[nameIdx] && row[companyIdx])
    .map((row) => ({
      name: row[nameIdx].trim(),
      company: row[companyIdx].trim(),
    }));
}
