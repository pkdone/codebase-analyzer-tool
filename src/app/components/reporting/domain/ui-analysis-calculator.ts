/**
 * Domain logic for UI analysis calculations.
 * This module contains the business logic for JSP technical debt analysis and
 * tag library classification, separate from the configuration constants which
 * remain in ui-analysis.config.ts.
 */

import {
  DebtLevel,
  DEBT_THRESHOLDS,
  TAG_LIBRARY_PATTERNS,
  type TagLibraryType,
} from "../config/ui-analysis.config";

/**
 * Calculates the technical debt level for a JSP file based on
 * its total scriptlet blocks (scriptlets + expressions + declarations).
 * This is business/domain logic that determines the severity of technical debt.
 *
 * @param totalScriptletBlocks - Total count of scriptlet blocks in the file
 * @returns The debt level classification
 */
export function calculateDebtLevel(totalScriptletBlocks: number): DebtLevel {
  if (totalScriptletBlocks > DEBT_THRESHOLDS.VERY_HIGH) {
    return DebtLevel.VERY_HIGH;
  }

  if (totalScriptletBlocks > DEBT_THRESHOLDS.HIGH) {
    return DebtLevel.HIGH;
  }

  if (totalScriptletBlocks > DEBT_THRESHOLDS.MODERATE) {
    return DebtLevel.MODERATE;
  }

  return DebtLevel.LOW;
}

/**
 * Determines the type of a tag library based on its URI.
 * @param uri - The tag library URI to classify
 * @returns The classified tag library type
 */
export function classifyTagLibrary(uri: string): TagLibraryType {
  if (uri.includes(TAG_LIBRARY_PATTERNS.JSTL)) {
    return "JSTL";
  }
  if (uri.includes(TAG_LIBRARY_PATTERNS.SPRING)) {
    return "Spring";
  }
  if (
    uri.includes(TAG_LIBRARY_PATTERNS.CUSTOM_WEB_INF) ||
    uri.includes(TAG_LIBRARY_PATTERNS.CUSTOM_KEYWORD)
  ) {
    return "Custom";
  }
  return "Other";
}
