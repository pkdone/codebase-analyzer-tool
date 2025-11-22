/**
 * Constants used in HTML report generation
 */

// Define base directory names once
const DIRECTORIES = {
  CHARTS: "charts",
  DEPENDENCY_TREES: "dependency-trees",
} as const;

export const htmlReportConstants = {
  /**
   * Directory paths used in HTML report structure
   */
  paths: {
    CHARTS_DIR: `${DIRECTORIES.CHARTS}/`,
    DEPENDENCY_TREES_DIR: `${DIRECTORIES.DEPENDENCY_TREES}/`,
  },

  /**
   * Directory names (without trailing slash)
   */
  directories: DIRECTORIES,

  /**
   * Column headers for data tables
   */
  columnHeaders: {
    FILE_TYPE: "File Type",
    FILES_COUNT: "Files Count",
    LINES_COUNT: "Lines Count",
    CLASSPATH: "Classpath",
    DEPENDENCIES_COUNT: "Dependencies Count",
  },

  /**
   * HTML template strings
   */
  html: {
    LINK_TEMPLATE: (href: string, text: string, target = "_blank"): string =>
      `<a href="${href}" target="${target}">${text}</a>`,
  },

  /**
   * URL protocols
   */
  protocols: {
    FILE_PROTOCOL: "file://",
  },
} as const;
