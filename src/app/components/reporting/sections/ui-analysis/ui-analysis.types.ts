/**
 * Types for the UI analysis (server-side UI technologies) report section.
 */

/**
 * Interface for UI technology analysis information
 */
export interface UiTechnologyAnalysis {
  frameworks: {
    name: string;
    version?: string;
    configFiles: string[];
  }[];
  totalJspFiles: number;
  totalScriptlets: number;
  totalExpressions: number;
  totalDeclarations: number;
  averageScriptletsPerFile: number;
  filesWithHighScriptletCount: number;
  customTagLibraries: {
    prefix: string;
    uri: string;
    usageCount: number;
    /** Pre-computed tag library type (e.g., "JSTL", "Spring", "Custom", "Other") */
    tagType: string;
    /** Pre-computed CSS class for the tag type badge */
    tagTypeClass: string;
  }[];
  topScriptletFiles: {
    filePath: string;
    scriptletCount: number;
    expressionCount: number;
    declarationCount: number;
    totalScriptletBlocks: number;
    /** Pre-computed debt level label (e.g., "Very High", "High", "Moderate", "Low") */
    debtLevel: string;
    /** Pre-computed CSS class for the debt level badge */
    debtLevelClass: string;
  }[];
  /** Pre-computed CSS class for total scriptlets warning display */
  totalScriptletsCssClass: string;
  /** Pre-computed CSS class for files with high scriptlet count warning display */
  filesWithHighScriptletCountCssClass: string;
  /** Pre-computed flag indicating whether to show the high debt alert */
  showHighDebtAlert: boolean;
}
