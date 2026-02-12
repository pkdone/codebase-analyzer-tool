/**
 * Types for the UI analysis (server-side UI technologies) report section.
 */

import type { TagLibraryType } from "./ui-analysis.config";

/**
 * UI Framework detected in the project.
 */
export interface UiFramework {
  name: string;
  version?: string;
  configFiles: string[];
}

/**
 * Detected tag library usage in JSP files.
 * Represents any detected tag library (JSTL, Spring, Custom, or Other).
 * Raw data type without presentation fields.
 */
export interface DetectedTagLibraryData {
  prefix: string;
  uri: string;
  usageCount: number;
  /** Tag library type classification (e.g., "JSTL", "Spring", "Custom", "Other") */
  tagType: TagLibraryType;
}

/**
 * Detected tag library with presentation fields for HTML rendering.
 */
export interface DetectedTagLibrary extends DetectedTagLibraryData {
  /** CSS class for the tag type badge */
  tagTypeClass: string;
}

/**
 * JSP file metrics for scriptlet analysis.
 * Raw data type without presentation fields.
 */
export interface JspFileMetricsData {
  filePath: string;
  scriptletCount: number;
  expressionCount: number;
  declarationCount: number;
  totalScriptletBlocks: number;
}

/**
 * JSP file metrics with presentation fields for HTML rendering.
 */
export interface JspFileMetrics extends JspFileMetricsData {
  /** Debt level label (e.g., "Very High", "High", "Moderate", "Low") */
  debtLevel: string;
  /** CSS class for the debt level badge */
  debtLevelClass: string;
}

/**
 * Raw UI technology analysis data without presentation fields.
 * Returned by the data provider, containing only domain data.
 */
export interface UiTechnologyAnalysisData {
  frameworks: UiFramework[];
  totalJspFiles: number;
  totalScriptlets: number;
  totalExpressions: number;
  totalDeclarations: number;
  averageScriptletsPerFile: number;
  filesWithHighScriptletCount: number;
  detectedTagLibraries: DetectedTagLibraryData[];
  topScriptletFiles: JspFileMetricsData[];
}

/**
 * UI technology analysis with presentation fields for HTML rendering.
 * Prepared by the section's prepareHtmlData() method.
 */
export interface UiTechnologyAnalysis {
  frameworks: UiFramework[];
  totalJspFiles: number;
  totalScriptlets: number;
  totalExpressions: number;
  totalDeclarations: number;
  averageScriptletsPerFile: number;
  filesWithHighScriptletCount: number;
  detectedTagLibraries: DetectedTagLibrary[];
  topScriptletFiles: JspFileMetrics[];
  /** CSS class for total scriptlets warning display */
  totalScriptletsCssClass: string;
  /** CSS class for files with high scriptlet count warning display */
  filesWithHighScriptletCountCssClass: string;
  /** Flag indicating whether to show the high debt alert */
  showHighDebtAlert: boolean;
  /** Pre-computed insight text about scriptlet usage level */
  scriptletUsageInsight: string;
}
