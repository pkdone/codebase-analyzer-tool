/**
 * Application-wide configuration
 * Contains fundamental constants used across multiple domains
 */
export const appConfig = {
  /**
   * UTF-8 encoding constant for file I/O and HTTP operations
   */
  UTF8_ENCODING: "utf8",

  /**
   * Standard MIME type for JSON content
   */
  MIME_TYPE_JSON: "application/json",

  /**
   * MIME type wildcard for accepting any content type
   */
  MIME_TYPE_ANY: "*/*",
} as const;
