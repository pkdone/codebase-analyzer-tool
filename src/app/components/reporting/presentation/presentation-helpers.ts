/**
 * View helper utilities for mapping domain values to presentation concerns.
 * Extracts presentation logic from EJS templates to enable pre-computation
 * and easier testing.
 *
 * IMPORTANT: This module should NOT contain business logic (thresholds, calculations).
 * Business logic belongs in the data providers. This module only maps domain
 * enum values to presentation-specific strings (labels and CSS classes).
 *
 * CSS/badge mapping functions are in css-mappers.ts.
 * Text generation functions are in insight-text-generators.ts.
 */

import { uiAnalysisConfig } from "../config/ui-analysis.config";

// Re-export CSS/badge mapping functions
export {
  getCouplingLevelPresentation,
  getDebtLevelPresentation,
  getTotalScriptletsCssClass,
  getFilesWithHighScriptletCountCssClass,
  shouldShowHighDebtAlert,
  getBomConflictsCssClass,
  type CouplingLevelPresentation,
  type DebtLevelPresentation,
} from "./css-mappers";

// Re-export text generation functions
export { getCodeSmellRecommendation, getScriptletUsageInsight } from "./insight-text-generators";

// Re-export config for tests
export { uiAnalysisConfig };
