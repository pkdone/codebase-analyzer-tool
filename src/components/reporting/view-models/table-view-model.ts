import { convertToDisplayName } from "../../../common/utils/text-utils";

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
 * Interface for processed table cell data
 */
export interface ProcessedTableCell {
  type: "text" | "link" | "code" | "list";
  content: string | ProcessedListItem[];
  columnClass?: string;
}

/**
 * Interface for processed list items
 */
export interface ProcessedListItem {
  type: "object" | "primitive";
  content: string | Record<string, string>;
}

/**
 * Rule for classifying columns based on header patterns
 */
interface ColumnClassificationRule {
  /** Test function to check if the rule applies to a header */
  test: (headerLower: string) => boolean;
  /** CSS class to apply if the test passes */
  class: string;
  /** Optional description of the rule for documentation */
  description?: string;
}

/**
 * View model for table data that pre-processes data for display
 */
export class TableViewModel<T extends DisplayableTableRow = DisplayableTableRow> {
  /**
   * Declarative rules for column classification based on header names.
   * Rules are evaluated in order, and the first matching rule determines the column class.
   */
  private static readonly COLUMN_CLASSIFICATION_RULES: readonly ColumnClassificationRule[] = [
    // Numeric columns (highest priority)
    {
      test: (h) =>
        h.includes("count") ||
        h.includes("total") ||
        h.includes("number") ||
        h.includes("#") ||
        h === "complexity",
      class: "col-narrow numeric",
      description: "Numeric data columns",
    },
    // Description-like columns
    {
      test: (h) =>
        h.includes("description") ||
        h.includes("details") ||
        h === "content" ||
        h.endsWith("content") ||
        h.includes("summary") ||
        h.includes("comment") ||
        h.includes("note"),
      class: "col-description",
      description: "Long text or description fields",
    },
    // Data-rich columns that need more space
    {
      test: (h) =>
        h.includes("entities") ||
        h.includes("endpoints") ||
        h.includes("operations") ||
        h.includes("methods") ||
        h.includes("attributes") ||
        h.includes("properties") ||
        h.includes("fields"),
      class: "col-wide",
      description: "Columns with complex or structured data",
    },
    // Small identifier columns
    {
      test: (h) =>
        h.includes("type") || h.includes("category") || h.includes("status") || h.includes("level"),
      class: "col-small",
      description: "Short identifier or category columns",
    },
    // Very short column names
    {
      test: (h) => h.length <= 4 && !h.includes("name") && !h.includes("text"),
      class: "col-small",
      description: "Short column names",
    },
  ] as const;

  private readonly data: T[];
  private readonly headers: string[];
  private readonly columnClasses: string[];

  constructor(data: T[]) {
    this.data = data;
    this.headers = this.data.length > 0 ? Object.keys(this.data[0]) : [];
    this.columnClasses = this.headers.map((header, index) =>
      this.determineColumnClass(header, index),
    );
  }

  /**
   * Get the display headers for the table
   */
  getDisplayHeaders(): string[] {
    return this.headers.map((header) => convertToDisplayName(header));
  }

  /**
   * Get the column classes for each header
   */
  getColumnClasses(): string[] {
    return this.columnClasses;
  }

  /**
   * Get processed rows ready for display
   */
  getProcessedRows(): ProcessedTableCell[][] {
    return this.data.map((row) => this.processRow(row));
  }

  /**
   * Check if there is any data to display
   */
  hasData(): boolean {
    return this.data.length > 0;
  }

  /**
   * Process a single row into display-ready format
   */
  private processRow(row: T): ProcessedTableCell[] {
    return this.headers.map((key) => this.processCell(key, row[key]));
  }

  /**
   * Process a single cell value into display format
   */
  private processCell(key: string, value: unknown): ProcessedTableCell {
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

    if (Array.isArray(value)) {
      return {
        type: "list",
        content: this.processArrayValue(value),
      };
    }

    if (value === null || value === undefined) {
      return {
        type: "text",
        content: "",
      };
    }

    if (typeof value === "object") {
      return {
        type: "text",
        content: JSON.stringify(value),
      };
    }

    if (typeof value === "string") {
      return {
        type: "text",
        content: value,
      };
    }

    return {
      type: "text",
      content:
        typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value),
    };
  }

  /**
   * Process array values into structured list items
   */
  private processArrayValue(value: unknown[]): ProcessedListItem[] {
    return value.map((item) => {
      if (item && typeof item === "object" && item.constructor === Object) {
        const objectItem = item as Record<string, unknown>;
        const processedKeys = Object.fromEntries(
          Object.entries(objectItem).map(([key, value]) => [
            convertToDisplayName(key),
            typeof value === "object" && value !== null ? JSON.stringify(value) : String(value),
          ]),
        );

        return {
          type: "object" as const,
          content: processedKeys,
        };
      } else {
        return {
          type: "primitive" as const,
          content: String(item),
        };
      }
    });
  }

  /**
   * Determine the CSS class for a column based on its header name and content.
   * Uses declarative rules for a cleaner, more maintainable approach.
   */
  private determineColumnClass(headerName: string, columnIndex: number): string {
    const headerLower = headerName.toLowerCase();

    // Apply declarative rules in order
    for (const rule of TableViewModel.COLUMN_CLASSIFICATION_RULES) {
      if (rule.test(headerLower)) {
        return rule.class;
      }
    }

    // Check content length and complexity to determine if it's a wide column
    const hasComplexContent = this.hasComplexContentInColumn(columnIndex);
    if (hasComplexContent) {
      return "col-wide";
    }

    // Default to medium
    return "col-medium";
  }

  /**
   * Check if a column has complex content that requires more space
   */
  private hasComplexContentInColumn(columnIndex: number): boolean {
    if (this.data.length === 0 || columnIndex >= this.headers.length) {
      return false;
    }

    const headerKey = this.headers[columnIndex];
    const sampleSize = Math.min(3, this.data.length);
    const sampleRows = this.data.slice(0, sampleSize);

    return sampleRows.some((row) => {
      const cellValue = row[headerKey];
      if (!cellValue) return false;

      // Check for list-type content
      if (Array.isArray(cellValue) && cellValue.length > 1) {
        return true;
      }

      // Check for long text content - only convert primitives to string
      if (typeof cellValue === "string") {
        if (cellValue.length > 100) {
          return true;
        }

        // Check for structured content indicators
        if (
          cellValue.includes("•") ||
          cellValue.includes("|") ||
          (cellValue.includes(":") && cellValue.length > 30)
        ) {
          return true;
        }
      }

      return false;
    });
  }
}
