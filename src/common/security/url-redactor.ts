/**
 * Generic URL redaction utility.
 * Removes username/password credentials while preserving protocol, host, port and path.
 * Falls back gracefully if parsing fails.
 */
import { logErr } from "../utils/logging";

const REDACTED_URL = "REDACTED_URL";
const REDACTED_CREDENTIALS = "REDACTED";

/**
 * Redacts credentials from a URL while preserving structure.
 * For MongoDB and generic URLs it masks username/password instead of removing them
 * to retain visibility that credentials were present.
 * Falls back to a constant if parsing fails (and logs the error).
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.username || parsed.password) {
      parsed.username = REDACTED_CREDENTIALS;
      parsed.password = REDACTED_CREDENTIALS;
    }

    return parsed.toString();
  } catch (error: unknown) {
    logErr("Could not parse URL for redaction", error);
    return REDACTED_URL;
  }
}
