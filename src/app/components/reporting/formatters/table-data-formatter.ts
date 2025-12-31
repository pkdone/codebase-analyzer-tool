import { convertToDisplayName } from "../../../../common/utils/text-utils";

/**
 * Interface for processed table cell data.
 * This is a pure data transfer object (DTO) containing display-ready cell content.
 */
export interface ProcessedTableCell {
  readonly type: "text" | "link" | "code" | "list";
  readonly content: string | readonly ProcessedListItem[];
  readonly columnClass?: string;
}

/**
 * Interface for processed list items within a table cell.
 */
export interface ProcessedListItem {
  readonly type: "object" | "primitive";
  readonly content: string | Readonly<Record<string, string>>;
}

/**
 * Stateless utility module for formatting table cell values.
 * This module is responsible for presentation logic - converting raw data values
 * into display-ready formats. It separates formatting concerns from the TableViewModel,
 * which is now a pure data structure.
 *
 * Key responsibilities:
 * - Determine cell type (text, link, code, list) based on field name and value
 * - Convert values to display strings
 * - Process arrays into structured list items
 */

/**
 * Process a single cell value into display format.
 * Determines the appropriate cell type and formats the content accordingly.
 *
 * @param key - The column/field name (used to detect special types like 'link', 'codeExample')
 * @param value - The raw cell value to format
 * @returns A ProcessedTableCell ready for template rendering
 */
export function formatCell(key: string, value: unknown): ProcessedTableCell {
  // Handle special column types
  if (key === "link" && typeof value === "string") {
    return {
      type: "link",
      content: value,
    };
  }

  if (key === "codeExample" && typeof value === "string") {
    return {
      type: "code",
      content: value,
    };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return {
      type: "list",
      content: formatArrayValue(value),
    };
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return {
      type: "text",
      content: "",
    };
  }

  // Handle objects (non-array)
  if (typeof value === "object") {
    return {
      type: "text",
      content: JSON.stringify(value),
    };
  }

  // Handle strings
  if (typeof value === "string") {
    return {
      type: "text",
      content: value,
    };
  }

  // Handle other primitives (number, boolean, bigint, symbol)
  return {
    type: "text",
    content:
      typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value),
  };
}

/**
 * Process array values into structured list items for display.
 * Handles both plain objects and primitive values.
 *
 * @param values - The array of values to process
 * @returns An array of ProcessedListItem ready for template rendering
 */
export function formatArrayValue(values: readonly unknown[]): ProcessedListItem[] {
  return values.map((item) => {
    // Check for plain objects (not arrays, not null, not class instances)
    if (item && typeof item === "object" && item.constructor === Object) {
      const objectItem = item as Record<string, unknown>;
      const processedKeys = Object.fromEntries(
        Object.entries(objectItem).map(([key, val]) => [
          convertToDisplayName(key),
          typeof val === "object" && val !== null ? JSON.stringify(val) : String(val),
        ]),
      );

      return {
        type: "object" as const,
        content: processedKeys,
      };
    }

    // Handle all other values (primitives, dates, class instances, etc.)
    const content = formatPrimitiveValue(item);
    return {
      type: "primitive" as const,
      content,
    };
  });
}

/**
 * Format a primitive or non-plain-object value to a display string.
 *
 * @param value - The value to format
 * @returns A string representation suitable for display
 */
export function formatPrimitiveValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint" || typeof value === "symbol") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Process a complete row of data into display-ready format.
 *
 * @param headers - The column keys in order
 * @param row - The row data object
 * @returns An array of ProcessedTableCell for each column
 */
export function formatRow(headers: readonly string[], row: Record<string, unknown>): ProcessedTableCell[] {
  return headers.map((key) => formatCell(key, row[key]));
}

