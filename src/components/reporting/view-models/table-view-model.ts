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
 * View model for table data that pre-processes data for display
 */
export class TableViewModel<T extends DisplayableTableRow = DisplayableTableRow> {
  private readonly data: T[];
  private readonly headers: string[];

  constructor(data: T[]) {
    this.data = data;
    this.headers = this.data.length > 0 ? Object.keys(this.data[0]) : [];
  }

  /**
   * Get the display headers for the table
   */
  getDisplayHeaders(): string[] {
    return this.headers.map((header) => convertToDisplayName(header));
  }

  /**
   * Get the column classes for each header.
   * Returns empty strings - CSS classes should be applied directly in templates.
   * @deprecated This method is kept for backward compatibility but returns empty strings.
   * CSS classes should be applied directly in EJS templates based on the specific table being rendered.
   */
  getColumnClasses(): string[] {
    return this.headers.map(() => "");
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
        // Handle primitives with proper type checking before conversion
        const content =
          typeof item === "string"
            ? item
            : typeof item === "number" || typeof item === "boolean"
              ? String(item)
              : item === null || item === undefined
                ? ""
                : typeof item === "object"
                  ? JSON.stringify(item)
                  : typeof item === "bigint" || typeof item === "symbol"
                    ? String(item)
                    : JSON.stringify(item);
        return {
          type: "primitive" as const,
          content,
        };
      }
    });
  }
}
