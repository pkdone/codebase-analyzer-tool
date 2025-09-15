import { convertToDisplayName } from "../../../common/utils/text-utils";

/**
 * Interface for a table row that can be displayed
 */
export type DisplayableTableRow = Record<string, unknown>;

/**
 * Interface for processed table cell data
 */
export interface ProcessedTableCell {
  type: 'text' | 'link' | 'code' | 'list';
  content: string | ProcessedListItem[];
}

/**
 * Interface for processed list items
 */
export interface ProcessedListItem {
  type: 'object' | 'primitive';
  content: string | Record<string, string>;
}

/**
 * View model for table data that pre-processes data for display
 */
export class TableViewModel {
  private readonly data: DisplayableTableRow[];
  private readonly headers: string[];

  constructor(data: DisplayableTableRow[]) {
    this.data = data;
    this.headers = this.data.length > 0 ? Object.keys(this.data[0]) : [];
  }

  /**
   * Get the display headers for the table
   */
  getDisplayHeaders(): string[] {
    return this.headers.map(header => convertToDisplayName(header));
  }

  /**
   * Get processed rows ready for display
   */
  getProcessedRows(): ProcessedTableCell[][] {
    return this.data.map(row => this.processRow(row));
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
  private processRow(row: DisplayableTableRow): ProcessedTableCell[] {
    return this.headers.map(key => this.processCell(key, row[key]));
  }

  /**
   * Process a single cell value into display format
   */
  private processCell(key: string, value: unknown): ProcessedTableCell {
    if (key === 'link' && typeof value === 'string') {
      return {
        type: 'link',
        content: value
      };
    }

    if (key === 'codeExample' && typeof value === 'string') {
      return {
        type: 'code',
        content: value
      };
    }

    if (Array.isArray(value) && value.length > 0) {
      return {
        type: 'list',
        content: this.processArrayValue(value)
      };
    }

    if (value === null || value === undefined) {
      return {
        type: 'text',
        content: ''
      };
    }
    
    if (typeof value === 'object') {
      return {
        type: 'text', 
        content: JSON.stringify(value)
      };
    }
    
    if (typeof value === 'string') {
      return {
        type: 'text',
        content: value
      };
    }
    
    return {
      type: 'text',
      content: typeof value === 'number' || typeof value === 'boolean' ? 
        String(value) : JSON.stringify(value)
    };
  }

  /**
   * Process array values into structured list items
   */
  private processArrayValue(value: unknown[]): ProcessedListItem[] {
    return value.map(item => {
      if (item && typeof item === 'object' && item.constructor === Object) {
        const objectItem = item as Record<string, unknown>;
        const processedKeys = Object.keys(objectItem).reduce<Record<string, string>>((acc, itemKey) => {
          acc[convertToDisplayName(itemKey)] = String(objectItem[itemKey]);
          return acc;
        }, {});

        return {
          type: 'object' as const,
          content: processedKeys
        };
      } else {
        return {
          type: 'primitive' as const,
          content: String(item)
        };
      }
    });
  }
}
