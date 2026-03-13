import { inspect } from "node:util";
import { formatError } from "./error-formatters";

// Helper to sanitize a string for single-line logging
const toSingleLine = (str: string) => str.replaceAll(/(\r\n|\n|\r|\\n|\\r|\\r\\n)/gm, " ");

/**
 * Logs an error message to the console as a single line, including error details.
 * Replaces newlines in the message and error with spaces.
 * Uses formatError for proper error formatting (handles Error instances, plain objects, and circular references).
 * In TTY mode, prepends a newline to ensure the message starts on a new line (since event symbols
 * are printed without newlines). In non-TTY mode, no prefix is needed as all output is line-based.
 * @param message The main error message.
 * @param error The error to log.
 */
export function logErr(message: string, error: unknown): void {
  let logMessage = toSingleLine(message);
  const errorString = formatError(error);
  logMessage += ` | Error: ${toSingleLine(errorString)}`;

  if (process.stdout.isTTY) {
    console.error(`\n${logMessage}`);
  } else {
    console.error(logMessage);
  }
}

/**
 * Logs a warning message to the console, ensuring it is a single line.
 * Replaces newlines in the message and context with spaces.
 * Uses util.inspect for context serialization (handles circular references safely).
 * In TTY mode, prepends a newline to ensure the message starts on a new line (since event symbols
 * are printed without newlines). In non-TTY mode, no prefix is needed as all output is line-based.
 * @param message The main warning message.
 * @param context Optional additional data to log, will be stringified.
 */
export function logWarn(message: string, context?: unknown): void {
  let logMessage = toSingleLine(message);

  if (context) {
    const contextString = inspect(context, { depth: 2, breakLength: Infinity });
    logMessage += ` | Context: ${toSingleLine(contextString)}`;
  }

  if (process.stdout.isTTY) {
    console.warn(`\n${logMessage}`);
  } else {
    console.warn(logMessage);
  }
}

/**
 * Logs an informational message to the console.
 * In TTY mode, prepends a newline to ensure the message starts on a new line (since event symbols
 * are printed without newlines). In non-TTY mode, no prefix is needed as all output is line-based.
 * @param message The informational message to log.
 */
export function logInfo(message: string): void {
  if (process.stdout.isTTY) {
    console.log(`\n${message}`);
  } else {
    console.log(message);
  }
}
