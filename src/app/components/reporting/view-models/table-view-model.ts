import { convertToDisplayName } from "../../../../common/utils/text-utils";
import {
  formatRow,
  type ProcessedTableCell,
  type ProcessedListItem,
} from "../formatters/table-data-formatter";

// Re-export formatter types for convenience (used by tests and other consumers)
export type { ProcessedTableCell, ProcessedListItem };

/**
 * Interface for a table row that can be displayed
 */
export type DisplayableTableRow = Record<string, unknown>;

/**
 * Type guard to check if a value is a valid DisplayableTableRow
 */
export function isDisplayableTableRow(value: unknown): value is DisplayableTableRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if an array contains valid DisplayableTableRow items
 */
export function isDisplayableTableRowArray(value: unknown): value is DisplayableTableRow[] {
  return Array.isArray(value) && value.every(isDisplayableTableRow);
}

/**
 * View model for table data that serves as a pure data structure.
 *
 * This class holds table data and delegates formatting to the TableDataFormatter.
 * It is responsible for:
 * - Storing the table data
 * - Extracting headers from the data
 * - Coordinating with the formatter for display-ready output
 *
 * Formatting logic (how values are converted to display strings, determining cell
 * types like link/code/text) is handled by the TableDataFormatter module.
 */
export class TableViewModel<T extends DisplayableTableRow = DisplayableTableRow> {
  private readonly data: readonly T[];
  private readonly headers: readonly string[];

  constructor(data: readonly T[]) {
    this.data = data;
    this.headers = this.data.length > 0 ? Object.keys(this.data[0]) : [];
  }

  /**
   * Get the display headers for the table.
   * Converts camelCase headers to Display Case.
   */
  getDisplayHeaders(): string[] {
    return this.headers.map((header) => convertToDisplayName(header));
  }

  /**
   * Get processed rows ready for display.
   * Delegates formatting to the TableDataFormatter.
   */
  getProcessedRows(): ProcessedTableCell[][] {
    return this.data.map((row) => formatRow(this.headers, row));
  }

  /**
   * Check if there is any data to display
   */
  hasData(): boolean {
    return this.data.length > 0;
  }

  /**
   * Get the raw headers (column keys)
   */
  getRawHeaders(): readonly string[] {
    return this.headers;
  }

  /**
   * Get the raw data
   */
  getRawData(): readonly T[] {
    return this.data;
  }
}
