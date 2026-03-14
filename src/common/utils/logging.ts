import { inspect } from "node:util";
import { formatError } from "./error-formatters";

// Helper to sanitize a string for single-line logging
const toSingleLine = (str: string) => str.replaceAll(/(\r\n|\n|\r|\\n|\\r|\\r\\n)/gm, " ");

// Tracks whether inline tick characters have been written without a trailing newline.
// When true, the next line-based log must prepend a newline to break away from the tick output.
let hasPendingTicks = false;

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

  console.error(`${flushTickPrefix()}${logMessage}`);
}

/**
 * Logs a warning message to the console, ensuring it is a single line.
 * Replaces newlines in the message and context with spaces.
 * Uses util.inspect for context serialization (handles circular references safely).
 * If inline tick characters have been printed, prepends a newline to break to a new line.
 * @param message The main warning message.
 * @param context Optional additional data to log, will be stringified.
 */
export function logWarn(message: string, context?: unknown): void {
  let logMessage = toSingleLine(message);

  if (context) {
    const contextString = inspect(context, { depth: 2, breakLength: Infinity });
    logMessage += ` | Context: ${toSingleLine(contextString)}`;
  }

  console.warn(`${flushTickPrefix()}${logMessage}`);
}

/**
 * Logs an informational message to the console.
 * If inline tick characters have been printed, prepends a newline to break to a new line.
 * @param message The informational message to log.
 */
export function logInfo(message: string): void {
  console.log(`${flushTickPrefix()}${message}`);
}

/**
 * Logs an output message directly to stdout without TTY newline prefix.
 * Use this for consecutive output lines in a multi-line block where the first line
 * has already been logged via logInfo (which handles the TTY newline break from event symbols).
 * @param message The message to output.
 */
export function logOutput(message: string): void {
  console.log(message);
}

/**
 * Logs an output message directly to stderr without TTY newline prefix.
 * Use this for consecutive error output lines (e.g., decorative error blocks)
 * where no TTY newline prefix is needed.
 * @param message The message to output.
 */
export function logOutputErr(message: string): void {
  console.error(message);
}

/**
 * Logs tabular data to the console using console.table.
 * @param data The data to display in table format.
 * @param columns Optional array of column names to display.
 */
export function logTable(data: unknown, columns?: string[]): void {
  if (columns) {
    console.table(data, columns);
  } else {
    console.table(data);
  }
}

/**
 * Prints a single event tick character for real-time progress indication.
 * In TTY mode, prints inline (no newline) via process.stdout.write and sets the pending ticks flag.
 * In non-TTY mode, falls back to line-based output via console.log.
 * This is required to enable debug mode in VS Code to take repeating new ticks, one per line, as
 * VS Code debug mode will then show them as a single tick with an occurrence number next to it.
 * @param ch The character or string to print.
 */
export function logTick(ch: string): void {
  if (process.stdout.isTTY) {
    process.stdout.write(ch);
    hasPendingTicks = true;
  } else {
    console.log(ch);
  }
}

/**
 * Returns a newline prefix if there are pending inline ticks that need to be terminated,
 * otherwise returns an empty string. Resets the pending ticks flag.
 */
function flushTickPrefix(): string {
  if (hasPendingTicks) {
    hasPendingTicks = false;
    return "\n";
  }

  return "";
}
