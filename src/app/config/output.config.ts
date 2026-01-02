/**
 * Output configuration for the application.
 * This is a global configuration used by multiple components (reporting, tasks, insights).
 */
export const outputConfig = {
  OUTPUT_DIR: "output",
  OUTPUT_SUMMARY_FILENAME: "codebase-report",
  OUTPUT_SUMMARY_HTML_FILE: "codebase-report.html",
  HTML_TEMPLATES_DIR: "templates",
  HTML_MAIN_TEMPLATE_FILE: "main.ejs",

  /**
   * External asset URLs and filenames for downloading dependencies.
   * These may change (e.g., version bumps) and are grouped with other configurable paths.
   */
  externalAssets: {
    MERMAID_CDN_UMD_URL: "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
    MERMAID_UMD_FILENAME: "mermaid.min.js",
  },
} as const;
