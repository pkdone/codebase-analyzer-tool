/**
 * Output configuration interface for type validation.
 * Ensures the configuration conforms to the expected structure at compile time.
 */
interface OutputConfig {
  readonly OUTPUT_DIR: string;
  readonly OUTPUT_SUMMARY_FILENAME: string;
  readonly OUTPUT_SUMMARY_HTML_FILE: string;
  readonly HTML_TEMPLATES_DIR: string;
  readonly HTML_MAIN_TEMPLATE_FILE: string;
  readonly externalAssets: {
    readonly MERMAID_CDN_UMD_URL: string;
    readonly MERMAID_UMD_FILENAME: string;
  };
}

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
} as const satisfies OutputConfig;
