import { inspect } from "node:util";
import { formatError } from "./error-formatters";

// Helper to sanitize a string for single-line logging
const toSingleLine = (str: string) => str.replace(/(\r\n|\n|\r|\\n|\\r|\\r\\n)/gm, " ");

/**
 * Logs an error message to the console as a single line, including error details.
 * Replaces newlines in the message and error with spaces.
 * Uses formatError for proper error formatting (handles Error instances, plain objects, and circular references).
 * @param message The main error message.
 * @param error The error to log.
 */
export function logOneLineError(message: string, error: unknown): void {
  let logMessage = toSingleLine(message);
  const errorString = formatError(error);
  logMessage += ` | Error: ${toSingleLine(errorString)}`;
  console.error(logMessage);
}

/**
 * Logs a warning message to the console, ensuring it is a single line.
 * Replaces newlines in the message and context with spaces.
 * Uses util.inspect for context serialization (handles circular references safely).
 * @param message The main warning message.
 * @param context Optional additional data to log, will be stringified.
 */
export function logOneLineWarning(message: string, context?: unknown): void {
  let logMessage = toSingleLine(message);

  if (context) {
    const contextString = inspect(context, { depth: 2, breakLength: Infinity });
    logMessage += ` | Context: ${toSingleLine(contextString)}`;
  }

  console.warn(logMessage);
}
