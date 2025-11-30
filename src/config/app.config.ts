/**
 * Application-wide configuration
 * Contains fundamental constants used across multiple domains
 */
export const appConfig = {
  /**
   * Standard MIME type for JSON content
   */
  MIME_TYPE_JSON: "application/json",

  /**
   * MIME type wildcard for accepting any content type
   */
  MIME_TYPE_ANY: "*/*",

  /**
   * UTF-8 encoding constant for file I/O operations
   */
  UTF8_ENCODING: "utf8",
} as const;
