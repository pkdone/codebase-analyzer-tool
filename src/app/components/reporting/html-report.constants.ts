/**
 * Constants used in HTML report generation.
 * Contains structural constants like directory names, column headers, and HTML templates.
 * Note: External asset URLs/paths are in output.config.ts since they may need versioning updates.
 */

// Define base directory names once
const DIRECTORIES = {
  ASSETS: "assets",
} as const;

export const htmlReportConstants = {
  /**
   * Directory paths used in HTML report structure
   */
  paths: {
    ASSETS_DIR: `${DIRECTORIES.ASSETS}/`,
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
