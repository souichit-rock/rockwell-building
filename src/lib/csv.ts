import { todayISO } from "@/lib/dates";

export type CsvColumn<T> = { label: string; value: (row: T) => string | number | null | undefined };

// ponytail: no spreadsheet formula-injection guard on purpose; a prefix would corrupt phone numbers such as "+63 917 ...".
const cell = (v: string | number | null | undefined): string => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** UTF-8 BOM, header row, every field quoted, CRLF line ends (what Excel expects). Pure, so it can be checked without a browser. */
export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const lines = [columns.map((c) => cell(c.label)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** `rockwell-building-<register>-<yyyy-mm-dd>.csv` (Manila date). */
export const csvFileName = (register: string): string =>
  `rockwell-building-${register.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${todayISO()}.csv`;

/** Builds the CSV for `rows` and hands it to the browser as a download. */
export function downloadCsv<T>(register: string, columns: CsvColumn<T>[], rows: T[]): void {
  const url = URL.createObjectURL(new Blob([buildCsv(columns, rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = csvFileName(register);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
