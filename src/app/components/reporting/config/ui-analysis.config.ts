/**
 * Configuration for UI analysis data provider.
 * Contains tuning parameters for UI technology analysis and JSP metrics.
 */

/**
 * Tag library type enumeration for consistent classification.
 */
export type TagLibraryType = "JSTL" | "Spring" | "Custom" | "Other";

/**
 * Tag library detection patterns used to classify tag libraries by their URI.
 * These patterns are used to identify standard vs custom tag libraries in JSP files.
 */
export const TAG_LIBRARY_PATTERNS = {
  /** JSTL (JavaServer Pages Standard Tag Library) pattern */
  JSTL: "java.sun.com/jsp/jstl",
  /** Spring Framework tag library pattern */
  SPRING: "springframework.org",
  /** Custom tag library indicators (application-specific) */
  CUSTOM_WEB_INF: "/WEB-INF/",
  CUSTOM_KEYWORD: "custom",
} as const;

/**
 * CSS class mappings for tag library badges in the UI.
 */
export const TAG_LIBRARY_BADGE_CLASSES: Record<TagLibraryType, string> = {
  JSTL: "badge-info",
  Spring: "badge-info",
  Custom: "badge-warning",
  Other: "badge-secondary",
} as const;

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

export const uiAnalysisConfig = {
  /**
   * Maximum number of top scriptlet files to include in the analysis
   */
  TOP_FILES_LIMIT: 10,

  /**
   * Threshold for identifying files with high scriptlet count.
   * Files exceeding this threshold are flagged as having high scriptlet usage.
   */
  HIGH_SCRIPTLET_THRESHOLD: 10,
} as const;
