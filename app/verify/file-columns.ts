"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";

export type FileColumnInfo = {
  fileName: string;
  headers: string[];
  columnCount: number;
};

export type FileColumnOption = {
  value: string;
  label: string;
};

export class FileColumnError extends Error {
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

const SUPPORTED_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);

const toColumnLetters = (index: number) => {
  let value = index + 1;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
};

const normalizeHeader = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const trimmed = String(value).trim();
  return trimmed.startsWith("\ufeff") ? trimmed.slice(1) : trimmed;
};

const summarizeCsvErrors = (errors: Papa.ParseError[]) =>
  errors.map(({ code, message, row, type }) => ({ code, message, row, type }));

const parseCsvHeaders = async (file: File) => {
  const text = await file.text();
  if (!text.trim()) {
    throw new FileColumnError("CSV file is empty.");
  }
  const parsed = Papa.parse<string[]>(text, { preview: 1, skipEmptyLines: "greedy" });
  const firstRow = Array.isArray(parsed.data?.[0]) ? parsed.data[0] : [];
  if (!firstRow.length) {
    if (parsed.errors?.length) {
      throw new FileColumnError("Unable to parse CSV headers.", { errors: summarizeCsvErrors(parsed.errors) });
    }
    throw new FileColumnError("CSV file is empty.");
  }
  if (parsed.errors?.length) {
    console.warn("verify.file_columns.csv_parse_warning", {
      errors: summarizeCsvErrors(parsed.errors),
      meta: parsed.meta,
    });
  }
  const headers = firstRow.map((value) => normalizeHeader(value));
  return { headers, columnCount: headers.length };
};

const parseSpreadsheetHeaders = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetNames = workbook.SheetNames ?? [];
  if (sheetNames.length === 0) {
    throw new FileColumnError("Spreadsheet has no sheets.");
  }
  if (sheetNames.length > 1) {
    throw new FileColumnError("Multiple sheets detected. Please upload one sheet per file.", {
      sheet_count: sheetNames.length,
    });
  }
  const sheet = workbook.Sheets[sheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, blankrows: false });
  const firstRow = Array.isArray(rows?.[0]) ? rows[0] : [];
  if (!firstRow.length) {
    throw new FileColumnError("Spreadsheet is empty.");
  }
  const headers = firstRow.map((value) => normalizeHeader(value));
  return { headers, columnCount: headers.length };
};

const getExtension = (fileName: string) => {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

export const readFileColumnInfo = async (file: File): Promise<FileColumnInfo> => {
  const extension = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new FileColumnError("Unsupported file type.", { extension });
  }
  const { headers, columnCount } =
    extension === "csv" ? await parseCsvHeaders(file) : await parseSpreadsheetHeaders(file);
  return {
    fileName: file.name,
    headers,
    columnCount,
  };
};

export const buildColumnOptions = (info: FileColumnInfo, firstRowHasLabels: boolean): FileColumnOption[] => {
  const options: FileColumnOption[] = [];
  const { headers, columnCount } = info;
  for (let index = 0; index < columnCount; index += 1) {
    const letter = toColumnLetters(index);
    const header = normalizeHeader(headers[index]);
    const label = firstRowHasLabels && header ? `${header} (${letter})` : letter;
    options.push({ value: letter, label });
  }
  return options;
};
