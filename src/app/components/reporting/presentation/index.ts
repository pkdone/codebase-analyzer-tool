/**
 * Presentation module for reporting.
 *
 * This module consolidates all presentation-related utilities for the reporting module:
 * - Presentation helpers: Mapping domain values to UI labels and CSS classes
 * - Table view model: Data structure for table display with formatting
 * - Table data formatter: Cell type detection and value formatting
 */

// Presentation helpers
export {
  getCouplingLevelPresentation,
  getDebtLevelPresentation,
  getTotalScriptletsCssClass,
  getFilesWithHighScriptletCountCssClass,
  shouldShowHighDebtAlert,
  getBomConflictsCssClass,
  getCodeSmellRecommendation,
  getScriptletUsageInsight,
  uiAnalysisConfig,
  type CouplingLevelPresentation,
  type DebtLevelPresentation,
} from "./presentation-helpers";

// Table presentation
export {
  TableViewModel,
  type DisplayableTableRow,
  type ProcessedTableCell,
  type ProcessedListItem,
} from "./table-view-model";

export { formatRow } from "./table-data-formatter";
