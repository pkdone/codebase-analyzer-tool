/**
 * Constants used in HTML report generation
 */

// Define base directory names once
const DIRECTORIES = {
  CHARTS: "charts",
} as const;

export const htmlReportConstants = {
  /**
   * Directory paths used in HTML report structure
   */
  paths: {
    CHARTS_DIR: `${DIRECTORIES.CHARTS}/`,
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
  },

  /**
   * HTML template strings
   */
  html: {
    LINK_TEMPLATE: (href: string, text: string, target = "_blank"): string =>
      `<a href="${href}" target="${target}">${text}</a>`,
  },
} as const;
