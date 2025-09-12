import { logErrorMsgAndDetail } from "./error-utils";

// Exported constants
export const REDACTED_URL = "REDACTED_URL";
export const REDACTED_CREDENTIALS = "REDACTED";

/**
 * Redacts sensitive credentials from a MongoDB connection string.
 *
 * @param url The MongoDB connection string.
 * @returns A redacted connection string.
 */
export function redactUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.username || parsedUrl.password) {
      parsedUrl.username = REDACTED_CREDENTIALS;
      parsedUrl.password = REDACTED_CREDENTIALS;
    }
    return parsedUrl.toString();
  } catch (error: unknown) {
    logErrorMsgAndDetail("Could not parse URL for redaction", error);
    return REDACTED_URL;
  }
}
