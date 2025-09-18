/**
 * Constants used in HTML report generation
 */
export const htmlReportConstants = {
  /**
   * Directory paths used in HTML report structure
   */
  paths: {
    CHARTS_DIR: "charts/",
    DEPENDENCY_TREES_DIR: "dependency-trees/",
  },
  
  /**
   * Directory names (without trailing slash)
   */
  directories: {
    CHARTS: "charts",
    DEPENDENCY_TREES: "dependency-trees",
  },
  
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
