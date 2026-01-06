/**
 * Constants used in HTML report generation.
 * Contains structural constants like column headers and HTML templates.
 * Note: Asset paths and directory names are centralized in output.config.ts.
 */

export const htmlReportConstants = {
  /**
   * Column headers for data tables
   */
  columnHeaders: {
    FILE_TYPE: "File Type",
    FILES_COUNT: "Files Count",
    LINES_COUNT: "Lines Count",
  },
} as const;
