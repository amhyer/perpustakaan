/**
 * CSV Utilities — Parse & generate CSV files.
 *
 * Sprint K - Bulk Operations & Data Management.
 *
 * Pure TypeScript, no external dependencies.
 * Supports:
 * - RFC 4180 compliant parsing
 * - Quoted fields with embedded commas, newlines, quotes
 * - Escaped quotes (double-double-quote convention)
 * - Custom delimiters
 * - Streaming large files
 * - Type coercion helpers
 */

import { logger } from "@/lib/logger";

// ===== Types =====

export interface ParseOptions {
  /** Field delimiter (default: comma) */
  delimiter?: string;
  /** Line ending (default: \n) */
  lineEnding?: string;
  /** Skip first row (default: true if headers provided) */
  skipHeader?: boolean;
  /** Trim whitespace from values */
  trim?: boolean;
  /** Skip empty rows */
  skipEmpty?: boolean;
}

export interface GenerateOptions {
  /** Field delimiter (default: comma) */
  delimiter?: string;
  /** Line ending (default: \n) */
  lineEnding?: string;
  /** Include headers (default: true) */
  includeHeaders?: boolean;
}

export type CsvValue = string | number | boolean | Date | null | undefined;

// ===== Parser =====

/**
 * Parse CSV string into array of objects.
 *
 * @param csv Raw CSV string
 * @param options Parse options
 * @returns Array of row objects
 *
 * @example
 *   const rows = parseCSV(csvString);
 *   // [{ name: "John", age: 30 }, ...]
 */
export function parseCSV<T extends Record<string, any> = Record<string, string>>(
  csv: string,
  options: ParseOptions = {}
): T[] {
  const { delimiter = ",", lineEnding = "\n", skipEmpty = true, trim = true } = options;

  const lines = splitLines(csv, lineEnding);
  if (lines.length === 0) return [];

  // First row is headers
  const headers = parseLine(lines[0], delimiter).map((h) =>
    trim ? h.trim() : h
  );

  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (skipEmpty && !line.trim()) continue;

    const values = parseLine(line, delimiter);
    const row: any = {};
    headers.forEach((header, idx) => {
      let value: any = values[idx] ?? "";
      if (trim && typeof value === "string") {
        value = value.trim();
      }
      row[header] = value;
    });
    rows.push(row as T);
  }

  return rows;
}

/**
 * Split CSV into lines, respecting quoted multi-line fields.
 */
function splitLines(csv: string, lineEnding: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if (
      !inQuotes &&
      csv.startsWith(lineEnding, i)
    ) {
      lines.push(current);
      current = "";
      i += lineEnding.length - 1;
    } else if (
      !inQuotes &&
      (char === "\n" || char === "\r") &&
      !csv.startsWith(lineEnding, i)
    ) {
      // Handle \r\n (Windows) and \r (Mac) — treat \r as line ending if not followed by \n
      if (char === "\r" && next !== "\n") {
        lines.push(current);
        current = "";
      } else if (char === "\n") {
        // Already handled by lineEnding check above
      }
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Parse single CSV line into values, respecting quotes.
 */
function parseLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

// ===== Generator =====

/**
 * Generate CSV string from array of objects.
 *
 * @param data Array of row objects
 * @param columns Optional explicit column order
 * @param options Generation options
 * @returns CSV string
 */
export function generateCSV(
  data: CsvValue[][] | Record<string, CsvValue>[],
  columns?: string[],
  options: GenerateOptions = {}
): string {
  const {
    delimiter = ",",
    lineEnding = "\n",
    includeHeaders = true,
  } = options;

  if (data.length === 0) {
    return includeHeaders && columns ? columns.join(delimiter) + lineEnding : "";
  }

  // Detect columns from data
  const cols = columns || (Array.isArray(data[0]) ? [] : Object.keys(data[0]));

  const lines: string[] = [];

  // Headers
  if (includeHeaders && cols.length > 0) {
    lines.push(cols.map(escapeField).join(delimiter));
  }

  // Data rows
  for (const row of data) {
    const values = Array.isArray(row) ? row : cols.map((c) => (row as any)[c]);
    lines.push(values.map(escapeField).join(delimiter));
  }

  return lines.join(lineEnding) + lineEnding;
}

/**
 * Escape a field for CSV output.
 * Quotes if contains delimiter, quote, or newline.
 */
function escapeField(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ===== Type Coercion =====

/**
 * Coerce a string value to a specific type.
 * Returns the original string if coercion fails.
 */
export function coerceValue(value: string, type: "string" | "number" | "boolean" | "date"): any {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  switch (type) {
    case "string":
      return trimmed;
    case "number":
      const num = Number(trimmed);
      return isNaN(num) ? null : num;
    case "boolean":
      const lower = trimmed.toLowerCase();
      if (["true", "1", "yes", "y"].includes(lower)) return true;
      if (["false", "0", "no", "n"].includes(lower)) return false;
      return null;
    case "date":
      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? null : date;
    default:
      return trimmed;
  }
}

// ===== Validation =====

export interface ValidationResult {
  valid: boolean;
  rowIndex: number;
  errors: string[];
  warnings: string[];
}

/**
 * Validate CSV row against expected schema.
 */
export function validateRow(
  row: Record<string, any>,
  schema: Record<string, "string" | "number" | "boolean" | "date">,
  requiredFields: string[] = [],
  rowIndex: number = 0
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of requiredFields) {
    if (!row[field] || String(row[field]).trim() === "") {
      errors.push(`Field "${field}" wajib diisi`);
    }
  }

  // Coerce and validate types
  for (const [field, type] of Object.entries(schema)) {
    const value = row[field];
    if (value === undefined || value === null || value === "") continue;
    const coerced = coerceValue(String(value), type);
    if (coerced === null) {
      errors.push(`Field "${field}" harus berupa ${type}, got: "${value}"`);
    } else {
      row[field] = coerced;
    }
  }

  return {
    valid: errors.length === 0,
    rowIndex,
    errors,
    warnings,
  };
}

// ===== Streaming (for large files) =====

/**
 * Parse CSV in chunks (for large files).
 * Calls onChunk for each batch of rows.
 */
export function parseCSVStream(
  csv: string,
  onChunk: (rows: Record<string, any>[]) => void | Promise<void>,
  options: ParseOptions & { chunkSize?: number } = {}
): Promise<void> {
  const { chunkSize = 100, ...parseOptions } = options;
  const rows = parseCSV(csv, parseOptions);

  return (async () => {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await onChunk(chunk);
    }
  })();
}

// ===== Browser Download =====

/**
 * Trigger download of CSV file in browser.
 */
export function downloadCSV(csv: string, filename: string): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Log CSV import/export operation.
 */
export function logCsvOperation(
  operation: "import" | "export",
  rowCount: number,
  filename: string,
  userId?: string
): void {
  logger.info(`CSV ${operation}`, {
    rowCount,
    filename,
    userId,
  });
}
