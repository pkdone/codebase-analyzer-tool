import { formatErrorMessageAndDetail, formatError } from "./error-formatters";

/**
 * Type guard to check if a value is an error-like object (Error instance or object with message property)
 */
function isErrorLike(value: unknown): value is Error | { message: unknown } {
  return (
    value instanceof Error ||
    (typeof value === "object" && value !== null && Object.hasOwn(value, "message"))
  );
}

/**
 * Log an error message and the error stack to the console.
 */
export function logErrorMsgAndDetail(msg: string | null, error: unknown): void {
  console.error(formatErrorMessageAndDetail(msg, error));
}

/**
 * Log a thrown error object and its stack to the console.
 */
export function logThrownError(error: unknown): void {
  logErrorMsgAndDetail(null, error);
}

/**
 * Log an string msg flagged as an error.
 */
export function logErrorMsg(errMsg: string): void {
  console.error(errMsg);
}

/**
 * Logs a warning message to the console, ensuring it is a single line.
 * Replaces newlines in the message and context with spaces.
 * Uses formatError for Error objects and objects with message properties, JSON.stringify for others.
 * @param message The main warning message.
 * @param context Optional additional data to log, will be stringified.
 */
export function logSingleLineWarning(message: string, context?: unknown): void {
  let logMessage = message.replace(/(\r\n|\n|\r)/gm, " ");
  if (context) {
    // Use formatError for Error objects and objects with message properties, JSON.stringify for others
    // This maintains backward compatibility with existing tests while using unified error formatting
    const contextString = isErrorLike(context) ? formatError(context) : JSON.stringify(context);

    // Replace newlines in the details string as well
    const singleLineContext = contextString
      .replace(/(\r\n|\n|\r)/gm, " ")
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\r\\n/g, " ");
    logMessage += ` | Context: ${singleLineContext}`;
  }
  console.warn(logMessage);
}

/**
 * Logs a JSON processing warning with resource name prefix.
 * @param resourceName The name of the resource being processed
 * @param message The warning message
 * @param context Optional additional context to log
 */
export function logJsonProcessingWarning(
  resourceName: string,
  message: string,
  context?: unknown,
): void {
  logSingleLineWarning(`[${resourceName}] ${message}`, context);
}
