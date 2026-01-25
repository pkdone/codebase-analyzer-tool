/**
 * Table presentation module.
 *
 * This module consolidates table-related functionality:
 * - TableViewModel: Data structure for table data with formatting coordination
 * - Table formatting utilities: Cell type detection and value formatting
 */

export {
  TableViewModel,
  type DisplayableTableRow,
  type TableCellValue,
  type ProcessedTableCell,
  type ProcessedListItem,
} from "./table-view-model";

export { formatRow } from "./table-data-formatter";
