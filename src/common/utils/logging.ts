import { formatErrorMessageAndDetail } from "./error-formatters";

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
 * @param message The main warning message.
 * @param context Optional additional data to log, will be stringified.
 */
export function logSingleLineWarning(message: string, context?: unknown): void {
  let logMessage = message.replace(/(\r\n|\n|\r)/gm, " ");
  if (context) {
    let contextString = JSON.stringify(context);
    // Replace actual newlines
    contextString = contextString.replace(/(\r\n|\n|\r)/gm, " ");
    // Replace escaped newlines in JSON strings (\\n becomes space)
    contextString = contextString.replace(/\\n/g, " ");
    // Also handle other escaped whitespace
    contextString = contextString.replace(/\\r/g, " ");
    contextString = contextString.replace(/\\r\\n/g, " ");
    logMessage += ` | Context: ${contextString}`;
  }
  console.warn(logMessage);
}
