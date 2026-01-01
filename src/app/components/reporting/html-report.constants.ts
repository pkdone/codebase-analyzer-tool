/**
 * Constants used in HTML report generation
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

  /**
   * External asset URLs for downloading dependencies
   */
  externalAssets: {
    MERMAID_CDN_UMD_URL: "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
    MERMAID_UMD_FILENAME: "mermaid.min.js",
  },
} as const;
