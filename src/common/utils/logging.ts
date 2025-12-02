import { formatErrorMessageAndDetail, formatError } from "./error-formatters";

/**
 * Type guard to check if a value is a primitive (not an object)
 */
function isPrimitive(value: unknown): value is string | number | boolean | symbol | bigint {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  );
}

/**
 * Log an error message and the error stack to the console.
 */
export function logError(msg: string, error: unknown): void {
  console.error(formatErrorMessageAndDetail(msg, error));
}

/**
 * Logs a warning message to the console, ensuring it is a single line.
 * Replaces newlines in the message and context with spaces.
 * Uses formatError for all objects (handles Error instances, plain objects, and circular references safely).
 * Uses String() for primitives.
 * @param message The main warning message.
 * @param context Optional additional data to log, will be stringified.
 */
export function logOneLineWarning(message: string, context?: unknown): void {
  let logMessage = message.replace(/(\r\n|\n|\r)/gm, " ");

  if (context) {
    // Use formatError for all objects (handles Error instances, plain objects, and circular references safely)
    // Use String() for primitives
    const contextString = isPrimitive(context) ? String(context) : formatError(context);

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
