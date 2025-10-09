import { convertToDisplayName } from "../../../common/utils/text-utils";

/**
 * Interface for a table row that can be displayed
 */
export type DisplayableTableRow = Record<string, unknown>;

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
   * This logic was previously embedded in the EJS template.
   */
  private determineColumnClass(headerName: string, columnIndex: number): string {
    const headerLower = headerName.toLowerCase();

    // Check for numeric columns (highest priority after specific keywords)
    if (
      headerLower.includes("count") ||
      headerLower.includes("total") ||
      headerLower.includes("number") ||
      headerLower.includes("#") ||
      headerLower === "complexity"
    ) {
      return "col-narrow numeric";
    }

    // Check for description-like columns (before short column check)
    // Use word boundaries or endings to avoid false matches
    if (
      headerLower.includes("description") ||
      headerLower.includes("details") ||
      headerLower === "content" ||
      headerLower.endsWith("content") ||
      headerLower.includes("summary") ||
      headerLower.includes("comment") ||
      headerLower.includes("note")
    ) {
      return "col-description";
    }

    // Check for data-rich columns that need more space (before short column check)
    if (
      headerLower.includes("entities") ||
      headerLower.includes("endpoints") ||
      headerLower.includes("operations") ||
      headerLower.includes("methods") ||
      headerLower.includes("attributes") ||
      headerLower.includes("properties") ||
      headerLower.includes("fields")
    ) {
      return "col-wide";
    }

    // Check for small identifier columns
    if (
      headerLower.includes("type") ||
      headerLower.includes("category") ||
      headerLower.includes("status") ||
      headerLower.includes("level")
    ) {
      return "col-small";
    }

    // Check for very short column names (but not if they might be wide or already handled)
    if (headerLower.length <= 4 && !headerLower.includes("name") && !headerLower.includes("text")) {
      return "col-small";
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
